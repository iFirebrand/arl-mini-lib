import { bookInfo, jsonResponse, openLibraryResponse } from "../fixtures/openLibrary";
import { appPrisma, createTestLibrary, resetDatabase, testPrisma } from "./db";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("./db")).appPrisma }));
vi.mock("next/headers", async () => {
  const jar = (await import("../mocks/cookies")).createCookieJar();
  return { headers: () => new Headers({ referer: "http://localhost:3000/libs/abc" }), cookies: () => jar };
});

const actions = await import("~~/actions/actions");
const { POST: saveBook } = await import("~~/app/api/saveBook/route");

const postBook = (body: unknown) =>
  saveBook(new Request("http://localhost:3000/api/saveBook", { method: "POST", body: JSON.stringify(body) }));

const libraryForm = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
};

const OWN_IMAGE = "http://supabase.test/storage/v1/object/public/library-images/uploads/abc-lib.jpg";

beforeEach(async () => {
  await resetDatabase();
  // /api/saveBook looks books up on OpenLibrary; answer with a recorded response.
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => jsonResponse(openLibraryResponse)),
  );
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => Promise.all([testPrisma.$disconnect(), appPrisma.$disconnect()]));

describe("adding a library", () => {
  it("creates it and finds it again from a nearby location", async () => {
    const created = await actions.createLibrary(
      libraryForm({
        locationName: "Maple St",
        latitude: "38.883839",
        longitude: "-77.107249",
        imageUrl: OWN_IMAGE,
      }),
    );
    expect(created).toMatchObject({ id: expect.any(String) });
    const id = (created as { id: string }).id;

    // ~33 m away: inside the ±0.00036° lookup box.
    expect(await actions.checkLibraryExists("38.884139", "-77.107249")).toMatchObject({
      id,
      locationName: "Maple St",
      imageUrl: OWN_IMAGE,
      active: true,
    });
    // ~55 m away: outside it.
    expect(await actions.checkLibraryExists("38.884339", "-77.107249")).toBe("not found");

    expect(await actions.getLibraryData(id)).toMatchObject({ id, latitude: 38.883839, longitude: -77.107249 });
    expect(await actions.totalLibraryCount()).toBe(1);
  });

  it("only counts libraries created in the last 7 days as new", async () => {
    await createTestLibrary();
    await createTestLibrary({ createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) });

    expect(await actions.getNewLibrariesCount()).toBe(1);
  });

  it("reports libraries that have a personality description", async () => {
    const described = await createTestLibrary({ description: "Cozy, heavy on mysteries" });
    await createTestLibrary({ locationName: "Oak St" });

    expect(await actions.getLibrariesWithDescriptionCount()).toBe(1);
    expect(await actions.getManyLibraryDescriptions()).toEqual([
      {
        libraryId: described.id,
        description: "Cozy, heavy on mysteries",
        locationName: "Maple St Little Library",
        imageUrl: null,
      },
    ]);
    expect(await actions.getLibraryDescription(described.id)).toEqual({ description: "Cozy, heavy on mysteries" });
  });
});

describe("cataloging books", () => {
  it("saves a scanned book to its library and lists it everywhere books appear", async () => {
    const library = await createTestLibrary();

    // Only the ISBN is sent; the details below come from the server's own lookup.
    const res = await postBook({ isbn: bookInfo.isbn13, libraryId: library.id });
    expect(res.status).toBe(201);
    expect(await postBook({ isbn: bookInfo.isbn13, libraryId: library.id })).toHaveProperty("status", 200);

    expect(await actions.bookCount(library.id)).toBe(1);
    expect(await actions.totalBookCount()).toBe(1);
    expect(await actions.getISBN13ByLibraryId(library.id)).toEqual([
      { isbn13: bookInfo.isbn13, updatedAt: expect.any(Date) },
    ]);
    expect(await actions.getItemsByLibraryId(library.id)).toEqual([
      {
        title: "The Wager",
        coverUrl: bookInfo.thumbnail,
        itemInfo: `https://openlibrary.org/isbn/${bookInfo.isbn13}`,
        updatedAt: expect.any(Date),
      },
    ]);
    expect(await actions.getLast50Books()).toEqual([
      expect.objectContaining({ title: "The Wager", libraryId: library.id, libraryName: library.locationName }),
    ]);
  });

  it("confirming a book resets its last-seen time so the recency bonus starts over", async () => {
    const library = await createTestLibrary();
    const other = await createTestLibrary({ locationName: "Oak St" });
    const stale = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await testPrisma.item.createMany({
      data: [
        { title: "The Wager", isbn13: bookInfo.isbn13, libraryId: library.id, updatedAt: stale },
        { title: "The Wager", isbn13: bookInfo.isbn13, libraryId: other.id, updatedAt: stale },
      ],
    });

    expect(await actions.confirmBookInLibrary(library.id, bookInfo.isbn13)).toMatchObject({ confirmed: true });

    const [confirmed] = await actions.getISBN13ByLibraryId(library.id);
    expect(Date.now() - confirmed.updatedAt.getTime()).toBeLessThan(60_000);
    const [untouched] = await actions.getISBN13ByLibraryId(other.id);
    expect(untouched.updatedAt).toEqual(stale);

    expect(await actions.confirmBookInLibrary(library.id, "0000000000000")).toMatchObject({ confirmed: false });
  });

  it("stores OpenLibrary's details, not the ones a caller sends", async () => {
    const library = await createTestLibrary();

    await postBook({
      ...bookInfo,
      itemInfo: "javascript:alert(document.domain)",
      title: "Spoofed",
      libraryId: library.id,
    });

    const [item] = await testPrisma.item.findMany();
    expect(item).toMatchObject({ title: "The Wager", itemInfo: bookInfo.itemInfo, thumbnail: bookInfo.thumbnail });
  });

  it("refuses to save a book for a library that does not exist", async () => {
    const res = await postBook({ isbn: bookInfo.isbn13, libraryId: "does-not-exist" });

    expect(res.status).toBe(404);
    expect(await testPrisma.item.count()).toBe(0);
  });

  it("returns the most recent 50 books, newest first", async () => {
    const library = await createTestLibrary();
    const base = Date.now() - 60 * 60 * 1000;
    await testPrisma.item.createMany({
      data: Array.from({ length: 55 }, (_, i) => ({
        title: `Book ${i}`,
        libraryId: library.id,
        createdAt: new Date(base + i * 1000),
      })),
    });

    const books = await actions.getLast50Books();

    expect(books).toHaveLength(50);
    expect(books[0].title).toBe("Book 54");
    expect(books[49].title).toBe("Book 5");
  });

  it("pages a library's books 50 at a time", async () => {
    const library = await createTestLibrary();
    await testPrisma.item.createMany({
      data: Array.from({ length: 60 }, (_, i) => ({ title: `Book ${i}`, libraryId: library.id })),
    });

    expect(await actions.getItemsByLibraryId(library.id, 1)).toHaveLength(50);
    expect(await actions.getItemsByLibraryId(library.id, 2)).toHaveLength(10);
  });
});
