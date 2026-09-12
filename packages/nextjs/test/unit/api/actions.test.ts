// @vitest-environment node
import { prismaMock } from "../../mocks/prisma";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("../../mocks/prisma")).prismaMock }));

// Account creation and point awards have their own tests (accounts.test.ts, integration).
const accounts = vi.hoisted(() => ({ getOrCreateAccount: vi.fn(), awardPoints: vi.fn() }));
vi.mock("~~/lib/accounts", () => ({ ...accounts, CREATE_LIBRARY_POINTS: 50 }));

// Server actions rate-limit by client IP; give every call its own IP unless a test pins one.
const client = vi.hoisted(() => ({ ip: "", counter: 0 }));
vi.mock("next/headers", () => ({
  headers: () => new Headers({ "x-forwarded-for": client.ip || `10.3.0.${++client.counter}` }),
}));

const actions = await import("~~/actions/actions");

const libraryRow = {
  id: "lib_1",
  locationName: "Maple St Little Library",
  imageUrl: "https://example.test/lib.jpg",
  active: true,
  latitude: 38.88,
  longitude: -77.1,
  description: null,
};

const formData = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
};

beforeEach(() => {
  client.ip = "";
  accounts.getOrCreateAccount.mockReset().mockResolvedValue({ id: "acc_1" });
  accounts.awardPoints
    .mockReset()
    .mockImplementation(async (_id, _action, points) => ({ pointsAwarded: points, total: 100 }));
  Object.values(prismaMock).forEach(model => Object.values(model).forEach(fn => fn.mockReset()));
});

describe("createLibrary", () => {
  // NEXT_PUBLIC_SUPABASE_URL is http://supabase.test in unit tests.
  const OWN_IMAGE = "http://supabase.test/storage/v1/object/public/library-images/uploads/abc-lib.jpg";
  const fields = { locationName: "Maple St", latitude: "38.8812", longitude: "-77.1043", imageUrl: OWN_IMAGE };

  it("parses coordinates from the form and returns the new id", async () => {
    prismaMock.library.create.mockResolvedValue({ id: "lib_new" });

    expect(await actions.createLibrary(formData(fields))).toEqual({ id: "lib_new", pointsAwarded: 50, total: 100 });
    expect(accounts.awardPoints).toHaveBeenCalledWith("acc_1", "CREATE_LIBRARY", 50, { libraryId: "lib_new" });
    expect(prismaMock.library.create).toHaveBeenCalledWith({
      data: { locationName: "Maple St", latitude: 38.8812, longitude: -77.1043, imageUrl: OWN_IMAGE },
      select: { id: true },
    });
  });

  it("still creates the library when this connection can't get a new account", async () => {
    prismaMock.library.create.mockResolvedValue({ id: "lib_new" });
    accounts.getOrCreateAccount.mockResolvedValue(null);

    expect(await actions.createLibrary(formData(fields))).toEqual({ id: "lib_new", pointsAwarded: 0, total: 0 });
    expect(accounts.awardPoints).not.toHaveBeenCalled();
  });

  it("awards nothing when the library fails to save", async () => {
    prismaMock.library.create.mockRejectedValue(new Error("connection refused"));

    await actions.createLibrary(formData(fields));

    expect(accounts.awardPoints).not.toHaveBeenCalled();
  });

  it("trims the name and allows a library without a photo", async () => {
    prismaMock.library.create.mockResolvedValue({ id: "lib_new" });

    await actions.createLibrary(formData({ ...fields, locationName: "  Maple St  ", imageUrl: "" }));

    expect(prismaMock.library.create.mock.calls[0][0].data).toMatchObject({ locationName: "Maple St", imageUrl: null });
  });

  it.each([
    ["an empty name", { locationName: "   " }, "Library name must be 1 to 80 characters"],
    ["a name over 80 characters", { locationName: "x".repeat(81) }, "Library name must be 1 to 80 characters"],
    ["a missing latitude", { latitude: "" }, "A valid location is required"],
    ["a latitude out of range", { latitude: "91" }, "A valid location is required"],
    ["a non-numeric longitude", { longitude: "west" }, "A valid location is required"],
    [
      "a photo from another site",
      { imageUrl: "https://example.com/x.jpg" },
      "Library photos must be uploaded through the app",
    ],
    [
      "a script URL as the photo",
      { imageUrl: "javascript:alert(1)" },
      "Library photos must be uploaded through the app",
    ],
  ])("rejects %s without writing", async (_label, override, error) => {
    expect(await actions.createLibrary(formData({ ...fields, ...override }))).toEqual({ error });
    expect(prismaMock.library.create).not.toHaveBeenCalled();
  });

  it("limits each connection to 10 new libraries an hour", async () => {
    prismaMock.library.create.mockResolvedValue({ id: "lib_new" });
    client.ip = "192.0.2.10";
    for (let i = 0; i < 10; i++) {
      expect(await actions.createLibrary(formData(fields))).toMatchObject({ id: "lib_new" });
    }
    expect(await actions.createLibrary(formData(fields))).toEqual({
      error: "Too many new libraries from this connection. Try again later.",
    });
  });

  it("reports a duplicate library on a unique constraint violation", async () => {
    prismaMock.library.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "6.0.1" }),
    );

    expect(await actions.createLibrary(formData(fields))).toEqual({
      error: "Library with this location already exists",
    });
  });

  it("returns a generic error for anything else", async () => {
    prismaMock.library.create.mockRejectedValue(new Error("connection refused"));

    expect(await actions.createLibrary(formData(fields))).toEqual({ error: "Failed to create library" });
  });
});

describe("checkLibraryExists", () => {
  it("searches a ±0.00036° box (~40 m) around the coordinates", async () => {
    prismaMock.library.findFirst.mockResolvedValue(null);

    await actions.checkLibraryExists("38.88", "-77.1");

    const { where } = prismaMock.library.findFirst.mock.calls[0][0];
    const [{ latitude }, { longitude }] = where.AND;
    expect(latitude.gte).toBeCloseTo(38.87964, 8);
    expect(latitude.lte).toBeCloseTo(38.88036, 8);
    expect(longitude.gte).toBeCloseTo(-77.10036, 8);
    expect(longitude.lte).toBeCloseTo(-77.09964, 8);
  });

  it("returns the library when one is nearby", async () => {
    prismaMock.library.findFirst.mockResolvedValue(libraryRow);
    expect(await actions.checkLibraryExists("38.88", "-77.1")).toEqual(libraryRow);
  });

  it('returns "not found" when nothing is nearby', async () => {
    prismaMock.library.findFirst.mockResolvedValue(null);
    expect(await actions.checkLibraryExists("38.88", "-77.1")).toBe("not found");
  });

  it("throws a friendly error when the query fails", async () => {
    prismaMock.library.findFirst.mockRejectedValue(new Error("boom"));
    await expect(actions.checkLibraryExists("38.88", "-77.1")).rejects.toThrow("Error checking library existence");
  });
});

describe("library lookups", () => {
  it("getLibraryData returns the library or 'not found'", async () => {
    prismaMock.library.findFirst.mockResolvedValueOnce(libraryRow).mockResolvedValueOnce(null);

    expect(await actions.getLibraryData("lib_1")).toEqual(libraryRow);
    expect(await actions.getLibraryData("missing")).toBe("not found");
  });

  it("getLibraryDescription returns only the description", async () => {
    prismaMock.library.findFirst.mockResolvedValue({ description: "Cozy and full of mysteries" });

    expect(await actions.getLibraryDescription("lib_1")).toEqual({ description: "Cozy and full of mysteries" });
  });

  it("getLibrariesWithDescriptionCount counts libraries with a description", async () => {
    prismaMock.library.findMany.mockResolvedValue([libraryRow, libraryRow]);

    expect(await actions.getLibrariesWithDescriptionCount()).toBe(2);
    expect(prismaMock.library.findMany).toHaveBeenCalledWith({ where: { description: { not: null } } });
  });

  it("getManyLibraryDescriptions renames id to libraryId", async () => {
    prismaMock.library.findMany.mockResolvedValue([
      { id: "lib_1", description: "Cozy", locationName: "Maple", imageUrl: null },
    ]);

    expect(await actions.getManyLibraryDescriptions()).toEqual([
      { libraryId: "lib_1", description: "Cozy", locationName: "Maple", imageUrl: null },
    ]);
  });
});

describe("getItemsByLibraryId", () => {
  const updatedAt = new Date("2026-01-01T00:00:00Z");

  it("pages through items 50 at a time", async () => {
    prismaMock.item.findMany.mockResolvedValue([]);

    await actions.getItemsByLibraryId("lib_1");
    await actions.getItemsByLibraryId("lib_1", 3);

    expect(prismaMock.item.findMany.mock.calls[0][0]).toMatchObject({
      where: { libraryId: "lib_1" },
      skip: 0,
      take: 50,
    });
    expect(prismaMock.item.findMany.mock.calls[1][0]).toMatchObject({ skip: 100, take: 50 });
  });

  it("maps items for display and links to OpenLibrary by ISBN", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        title: "The Wager",
        thumbnail: "https://c/1.jpg",
        itemInfo: "https://ol/x",
        isbn13: "9780063345164",
        updatedAt,
      },
      { title: null, thumbnail: null, itemInfo: null, isbn13: null, updatedAt },
    ]);

    expect(await actions.getItemsByLibraryId("lib_1")).toEqual([
      {
        title: "The Wager",
        coverUrl: "https://c/1.jpg",
        itemInfo: "https://openlibrary.org/isbn/9780063345164",
        updatedAt,
      },
      { title: "", coverUrl: "", itemInfo: "#", updatedAt },
    ]);
  });

  it("returns an empty list instead of throwing on errors", async () => {
    prismaMock.item.findMany.mockRejectedValue(new Error("boom"));
    expect(await actions.getItemsByLibraryId("lib_1")).toEqual([]);
  });
});

describe("getISBN13ByLibraryId", () => {
  it("drops items without an ISBN", async () => {
    const updatedAt = new Date();
    prismaMock.item.findMany.mockResolvedValue([
      { isbn13: "9780063345164", updatedAt },
      { isbn13: null, updatedAt },
    ]);

    expect(await actions.getISBN13ByLibraryId("lib_1")).toEqual([{ isbn13: "9780063345164", updatedAt }]);
  });

  it("returns an empty list instead of throwing on errors", async () => {
    prismaMock.item.findMany.mockRejectedValue(new Error("boom"));
    expect(await actions.getISBN13ByLibraryId("lib_1")).toEqual([]);
  });
});

describe("confirmBookInLibrary", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const lastSeen = (daysAgo: number) => ({ id: "item_1", updatedAt: new Date(Date.now() - daysAgo * DAY) });

  it("refreshes a stale book and awards its recency bonus", async () => {
    const latest = lastSeen(10);
    prismaMock.item.findFirst.mockResolvedValue(latest);
    prismaMock.item.updateMany.mockResolvedValue({ count: 1 });

    expect(await actions.confirmBookInLibrary("lib_1", "9780063345164")).toEqual({
      confirmed: true,
      pointsAwarded: 2,
      total: 100,
    });
    expect(prismaMock.item.updateMany).toHaveBeenCalledWith({
      where: { libraryId: "lib_1", isbn13: "9780063345164", updatedAt: { lte: latest.updatedAt } },
      data: { updatedAt: expect.any(Date) },
    });
    expect(accounts.awardPoints).toHaveBeenCalledWith("acc_1", "CONFIRM_BOOK", 2, {
      libraryId: "lib_1",
      itemId: "item_1",
    });
  });

  it("awards nothing, and doesn't reset the clock, for a book confirmed within a day", async () => {
    prismaMock.item.findFirst.mockResolvedValue(lastSeen(0.5));

    expect(await actions.confirmBookInLibrary("lib_1", "9780063345164")).toEqual({ confirmed: true, pointsAwarded: 0 });
    expect(prismaMock.item.updateMany).not.toHaveBeenCalled();
    expect(accounts.awardPoints).not.toHaveBeenCalled();
  });

  it("awards nothing when a simultaneous scan already claimed the bonus", async () => {
    prismaMock.item.findFirst.mockResolvedValue(lastSeen(40));
    prismaMock.item.updateMany.mockResolvedValue({ count: 0 });

    expect(await actions.confirmBookInLibrary("lib_1", "9780063345164")).toEqual({ confirmed: true, pointsAwarded: 0 });
    expect(accounts.awardPoints).not.toHaveBeenCalled();
  });

  it("reports a book the library doesn't have", async () => {
    prismaMock.item.findFirst.mockResolvedValue(null);
    expect(await actions.confirmBookInLibrary("lib_1", "9780063345164")).toEqual({
      confirmed: false,
      pointsAwarded: 0,
    });
  });

  it("returns unconfirmed instead of throwing on errors", async () => {
    prismaMock.item.findFirst.mockRejectedValue(new Error("boom"));
    expect(await actions.confirmBookInLibrary("lib_1", "9780063345164")).toEqual({
      confirmed: false,
      pointsAwarded: 0,
    });
  });

  it("rejects malformed ISBNs without touching the database", async () => {
    expect(await actions.confirmBookInLibrary("lib_1", "not-an-isbn")).toEqual({ confirmed: false, pointsAwarded: 0 });
    expect(prismaMock.item.findFirst).not.toHaveBeenCalled();
  });
});

describe("getArlibSettings", () => {
  it("reads the settings row with id '1'", async () => {
    const settings = {
      id: "1",
      booksNeededToNameLibrary: 20,
      seasonEndsAt: new Date("2025-01-31"),
      totalItems: 0,
      totalLibraries: 0,
    };
    prismaMock.arlibSettings.findFirst.mockResolvedValue(settings);

    expect(await actions.getArlibSettings()).toEqual(settings);
    expect(prismaMock.arlibSettings.findFirst.mock.calls[0][0].where).toEqual({ id: "1" });
  });

  it("returns 'settings not found' when the row is missing", async () => {
    prismaMock.arlibSettings.findFirst.mockResolvedValue(null);
    expect(await actions.getArlibSettings()).toBe("settings not found");
  });
});

describe("stats", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts books, libraries and users", async () => {
    prismaMock.item.count.mockResolvedValueOnce(135).mockResolvedValueOnce(12);
    prismaMock.library.count.mockResolvedValue(60);
    prismaMock.account.count.mockResolvedValue(7);

    expect(await actions.totalBookCount()).toBe(135);
    expect(await actions.bookCount("lib_1")).toBe(12);
    expect(prismaMock.item.count).toHaveBeenLastCalledWith({ where: { libraryId: "lib_1" } });
    expect(await actions.totalLibraryCount()).toBe(60);
    expect(await actions.totalUserCount()).toBe(7);
  });

  it("getNewLibrariesCount looks back exactly 7 days and returns 0 on error", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T12:00:00Z"));
    prismaMock.library.count.mockResolvedValueOnce(3).mockRejectedValueOnce(new Error("boom"));

    expect(await actions.getNewLibrariesCount()).toBe(3);
    expect(prismaMock.library.count.mock.calls[0][0]).toEqual({
      where: { createdAt: { gt: new Date("2026-09-04T12:00:00Z") } },
    });
    expect(await actions.getNewLibrariesCount()).toBe(0);
  });

  it("getLast50Books flattens the library relation and fills blanks", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        title: "The Wager",
        thumbnail: null,
        sourceURL: null,
        itemInfo: "https://ol/x",
        library: { id: "lib_1", locationName: "Maple" },
      },
      { title: null, thumbnail: null, sourceURL: null, itemInfo: null, library: null },
    ]);

    expect(await actions.getLast50Books()).toEqual([
      {
        title: "The Wager",
        thumbnail: "",
        sourceURL: "",
        itemInfo: "https://ol/x",
        libraryId: "lib_1",
        libraryName: "Maple",
      },
      { title: "", thumbnail: "", sourceURL: "", itemInfo: "", libraryId: "", libraryName: "" },
    ]);
    expect(prismaMock.item.findMany.mock.calls[0][0]).toMatchObject({ take: 50, orderBy: { createdAt: "desc" } });
  });

  it("getTopUsers lists the 10 accounts with the most points, by pseudonym", async () => {
    prismaMock.account.findMany.mockResolvedValue([{ id: "a1", displayName: "Reader K7Q2M", points: 99 }]);

    expect(await actions.getTopUsers()).toEqual([{ id: "a1", displayName: "Reader K7Q2M", points: 99 }]);
    expect(prismaMock.account.findMany.mock.calls[0][0]).toMatchObject({
      where: { points: { gt: 0 } },
      orderBy: { points: "desc" },
      take: 10,
    });
  });
});

describe("recordVote", () => {
  it("stores the rating for the question", async () => {
    prismaMock.poll.create.mockResolvedValue({});

    await actions.recordVote("rewards-pool", 3);

    expect(prismaMock.poll.create).toHaveBeenCalledWith({ data: { questionId: "rewards-pool", rating: 3 } });
  });

  it("throws so the UI can show an error", async () => {
    prismaMock.poll.create.mockRejectedValue(new Error("boom"));
    await expect(actions.recordVote("rewards-pool", 3)).rejects.toThrow("Failed to record vote");
  });

  it.each([
    ["an unknown question", "free-money", 3],
    ["a rating above 4", "rewards-pool", 5],
    ["a rating of 0", "rewards-pool", 0],
    ["a fractional rating", "rewards-pool", 2.5],
  ])("rejects %s", async (_label, questionId, rating) => {
    await expect(actions.recordVote(questionId as string, rating as number)).rejects.toThrow("Invalid vote");
    expect(prismaMock.poll.create).not.toHaveBeenCalled();
  });

  it("limits each connection to 5 votes a minute", async () => {
    prismaMock.poll.create.mockResolvedValue({});
    client.ip = "192.0.2.11";
    for (let i = 0; i < 5; i++) await actions.recordVote("rewards-pool", 4);
    await expect(actions.recordVote("rewards-pool", 4)).rejects.toThrow("Too many votes");
  });
});
