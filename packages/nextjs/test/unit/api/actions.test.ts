// @vitest-environment node
import { prismaMock } from "../../mocks/prisma";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("../../mocks/prisma")).prismaMock }));

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
  Object.values(prismaMock).forEach(model => Object.values(model).forEach(fn => fn.mockReset()));
});

describe("createLibrary", () => {
  const fields = { locationName: "Maple St", latitude: "38.8812", longitude: "-77.1043", imageUrl: "https://x/y.jpg" };

  it("parses coordinates from the form and returns the new id", async () => {
    prismaMock.library.create.mockResolvedValue({ id: "lib_new" });

    expect(await actions.createLibrary(formData(fields))).toEqual({ id: "lib_new" });
    expect(prismaMock.library.create).toHaveBeenCalledWith({
      data: { locationName: "Maple St", latitude: 38.8812, longitude: -77.1043, imageUrl: "https://x/y.jpg" },
      select: { id: true },
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
    prismaMock.user.count.mockResolvedValue(7);

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

  it("getTopUsers asks for the 10 highest point totals", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1", walletAddress: "0xabc", points: 99 }]);

    expect(await actions.getTopUsers()).toEqual([{ id: "u1", walletAddress: "0xabc", points: 99 }]);
    expect(prismaMock.user.findMany.mock.calls[0][0]).toMatchObject({ orderBy: { points: "desc" }, take: 10 });
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
});
