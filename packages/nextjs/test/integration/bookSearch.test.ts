import { jsonResponse, openLibraryResponse } from "../fixtures/openLibrary";
import { appPrisma, createTestLibrary, resetDatabase, testPrisma } from "./db";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("./db")).appPrisma }));

// One browser: cookies set by a response are sent with the next request.
const browser = vi.hoisted(() => ({
  jar: null as null | ReturnType<typeof import("../mocks/cookies").createCookieJar>,
}));
vi.mock("next/headers", async () => {
  browser.jar = (await import("../mocks/cookies")).createCookieJar();
  return { headers: () => new Headers({ referer: "http://localhost:3000/libs/abc" }), cookies: () => browser.jar };
});

const accounts = await import("~~/lib/accounts");
const actions = await import("~~/actions/actions");
const { POST: saveBook } = await import("~~/app/api/saveBook/route");
const { POST: lookupMiss } = await import("~~/app/api/lookupMiss/route");

let ipCounter = 0;
const record = openLibraryResponse.records["/books/OL50548140M"];

// OpenLibrary lookups by ISBN answer with the fixture renumbered to that ISBN; lookups by edition
// id answer with an old edition that has no ISBN.
const stubOpenLibrary = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const isbn = url.match(/isbn\/(\d+)\.json/)?.[1];
      if (isbn) {
        return jsonResponse({
          records: {
            [isbn]: { ...record, data: { ...record.data, title: `Book ${isbn}`, identifiers: { isbn_13: [isbn] } } },
          },
        });
      }
      const edition = url.match(/olid\/(OL\d+M)\.json/)?.[1] ?? "";
      return jsonResponse({
        records: {
          [edition]: {
            recordURL: `http://openlibrary.org/books/${edition}/Old_Book`,
            data: {
              title: `Old book ${edition}`,
              authors: [{ name: "A. Writer" }],
              identifiers: { openlibrary: [edition], lccn: ["66071398"] },
            },
          },
        },
      });
    }),
  );

const post = async (body: object) =>
  saveBook(
    new Request("http://localhost:3000/api/saveBook", {
      method: "POST",
      headers: { "x-forwarded-for": `10.8.0.${++ipCounter}` },
      body: JSON.stringify(body),
    }),
  );

const sessionAccount = async () => {
  const account = await accounts.getSessionAccount();
  if (!account) throw new Error("No account in the session cookie");
  return account;
};

beforeEach(async () => {
  await resetDatabase();
  browser.jar?.clear();
  stubOpenLibrary();
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => Promise.all([testPrisma.$disconnect(), appPrisma.$disconnect()]));

describe("adding a book found by title search", () => {
  it("adds a book without an ISBN by its OpenLibrary edition, for 2 points", async () => {
    const library = await createTestLibrary();

    const res = await post({ editionKey: "OL6014553M", libraryId: library.id, via: "search" });

    expect(res.status).toBe(201);
    expect((await res.json()).award).toMatchObject({ pointsAwarded: 2, total: 2, searchLimitReached: false });
    expect(await testPrisma.item.findFirstOrThrow()).toMatchObject({
      title: "Old book OL6014553M",
      authors: "A. Writer",
      isbn13: null,
      editionKey: "OL6014553M",
      addedVia: "search",
      itemInfo: "https://openlibrary.org/books/OL6014553M/Old_Book",
    });
    const account = await sessionAccount();
    expect(await testPrisma.pointEvent.findMany({ where: { accountId: account.id } })).toEqual([
      expect.objectContaining({ action: "ADD_SEARCHED_BOOK", points: 2, libraryId: library.id }),
    ]);
    // The catalog links to the edition's OpenLibrary page, since there's no ISBN to link by.
    expect(await actions.getItemsByLibraryId(library.id)).toEqual([
      expect.objectContaining({ itemInfo: "https://openlibrary.org/books/OL6014553M/Old_Book" }),
    ]);
  });

  it("doesn't add the same edition to a library twice", async () => {
    const library = await createTestLibrary();
    await post({ editionKey: "OL6014553M", libraryId: library.id });

    const again = await post({ editionKey: "OL6014553M", libraryId: library.id });

    expect(again.status).toBe(200);
    expect((await again.json()).award).toBeNull();
    expect(await testPrisma.item.count()).toBe(1);
    expect((await sessionAccount()).points).toBe(2);
  });

  it("pays 2 for a searched book with an ISBN, without moving the scanning multiplier", async () => {
    const library = await createTestLibrary();

    const searched = await (await post({ isbn: "9780000000001", libraryId: library.id, via: "search" })).json();
    const scans = [];
    for (const isbn of ["9780000000002", "9780000000003", "9780000000004"]) {
      scans.push((await (await post({ isbn, libraryId: library.id, via: "camera" })).json()).award.pointsAwarded);
    }

    expect(searched.award.pointsAwarded).toBe(2);
    expect(scans).toEqual([5, 5, 5]);
    expect((await sessionAccount()).points).toBe(17);
  });

  it("pays for only 10 searched books per library a day, but still adds the rest", async () => {
    const library = await createTestLibrary();

    const awards = [];
    for (let i = 1; i <= 11; i++) {
      awards.push((await (await post({ editionKey: `OL${i}M`, libraryId: library.id })).json()).award);
    }

    expect(awards.map(award => award.pointsAwarded)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0]);
    expect(awards[10].searchLimitReached).toBe(true);
    expect(await testPrisma.item.count()).toBe(11);
    // Another library starts its own count.
    const other = await createTestLibrary({ locationName: "Oak St" });
    expect((await (await post({ editionKey: "OL99M", libraryId: other.id })).json()).award.pointsAwarded).toBe(2);
  });

  it("records how each book was added", async () => {
    const library = await createTestLibrary();
    await post({ isbn: "9780000000001", libraryId: library.id, via: "camera" });
    await post({ isbn: "9780000000002", libraryId: library.id, via: "photo" });
    await post({ isbn: "9780000000003", libraryId: library.id, via: "typed" });
    await post({ isbn: "9780000000004", libraryId: library.id, via: "carrier pigeon" });

    const items = await testPrisma.item.findMany({ orderBy: { isbn13: "asc" }, select: { addedVia: true } });
    expect(items.map(item => item.addedVia)).toEqual(["camera", "photo", "typed", null]);
  });
});

describe("noting books no catalog could find", () => {
  const report = (body: object) =>
    lookupMiss(
      new Request("http://localhost:3000/api/lookupMiss", {
        method: "POST",
        headers: { "x-forwarded-for": `10.9.0.${++ipCounter}` },
        body: JSON.stringify(body),
      }),
    );

  it("keeps the ISBN or the search, and the library, as the app's role", async () => {
    const library = await createTestLibrary();

    expect((await report({ kind: "isbn", isbn: "0-06-334516-1", libraryId: library.id })).status).toBe(204);
    expect((await report({ kind: "search", title: "Old book", author: "", libraryId: library.id })).status).toBe(204);

    const misses = await testPrisma.lookupMiss.findMany({ orderBy: { createdAt: "asc" } });
    expect(misses).toEqual([
      expect.objectContaining({ kind: "isbn", query: "9780063345164", libraryId: library.id }),
      expect.objectContaining({ kind: "search", query: "Old book", libraryId: library.id }),
    ]);
  });
});
