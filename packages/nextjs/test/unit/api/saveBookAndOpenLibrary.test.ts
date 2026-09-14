// @vitest-environment node
import { googleBooksResponse } from "../../fixtures/googleBooks";
import { bookInfo, jsonResponse, openLibraryResponse } from "../../fixtures/openLibrary";
import { prismaMock } from "../../mocks/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("../../mocks/prisma")).prismaMock }));

const requestHeaders = vi.hoisted(() => ({ current: new Headers({ referer: "https://arlib.me/libs/lib_1" }) }));
vi.mock("next/headers", () => ({ headers: () => requestHeaders.current }));

const accounts = vi.hoisted(() => ({
  getOrCreateAccount: vi.fn(),
  newBookPoints: vi.fn(),
  searchedBookPoints: vi.fn(),
  awardPoints: vi.fn(),
}));
vi.mock("~~/lib/accounts", () => accounts);

const { POST: saveBook } = await import("~~/app/api/saveBook/route");
const { GET: bookLookup } = await import("~~/app/api/book/route");

const { libraryId, ...storedFields } = bookInfo;
let ipCounter = 0;

describe("POST /api/saveBook", () => {
  beforeEach(() => {
    requestHeaders.current = new Headers({ referer: "https://arlib.me/libs/lib_1" });
    prismaMock.library.findFirst.mockReset().mockResolvedValue({ id: "lib_1" });
    prismaMock.item.findFirst.mockReset().mockResolvedValue(null);
    prismaMock.item.create.mockReset().mockImplementation(async ({ data }) => ({ id: "item_1", ...data }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(openLibraryResponse)));
    accounts.getOrCreateAccount.mockReset().mockResolvedValue({ id: "acc_1" });
    accounts.newBookPoints.mockReset().mockResolvedValue({ points: 5, newBooksThisVisit: 1 });
    accounts.searchedBookPoints.mockReset().mockResolvedValue(2);
    accounts.awardPoints.mockReset().mockResolvedValue({ pointsAwarded: 5, total: 45 });
  });

  const post = (body: unknown, ip = `10.4.0.${++ipCounter}`) =>
    saveBook(
      new Request("https://arlib.me/api/saveBook", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: JSON.stringify(body),
      }),
    );

  it("looks the book up itself and stores OpenLibrary's details", async () => {
    const res = await post({ isbn: "978-0-06-334516-4", libraryId: "lib_1" });

    expect(res.status).toBe(201);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("https://openlibrary.org/api/volumes/brief/isbn/9780063345164.json");
    expect(prismaMock.item.create).toHaveBeenCalledWith({
      data: { ...storedFields, addedVia: null, library: { connect: { id: libraryId } } },
    });
  });

  it("keeps how the book was found, if it's one we know", async () => {
    vi.mocked(fetch).mockImplementation(async () => jsonResponse(openLibraryResponse));
    await post({ isbn: "9780063345164", libraryId: "lib_1", via: "photo" });
    await post({ isbn: "9780063345164", libraryId: "lib_1", via: "<script>" });

    expect(prismaMock.item.create.mock.calls.map(([{ data }]) => data.addedVia)).toEqual(["photo", null]);
  });

  it("awards the server's points for a new book and reports them", async () => {
    const res = await post({ isbn: "9780063345164", libraryId: "lib_1" });

    expect((await res.json()).award).toEqual({ pointsAwarded: 5, total: 45, newBooksThisVisit: 1 });
    expect(accounts.newBookPoints).toHaveBeenCalledWith("acc_1", "lib_1");
    expect(accounts.awardPoints).toHaveBeenCalledWith("acc_1", "ADD_BOOK", 5, { libraryId: "lib_1", itemId: "item_1" });
  });

  it("ignores any points the browser claims", async () => {
    await post({ isbn: "9780063345164", libraryId: "lib_1", points: 1_000_000, pointActions: [{ points: 999 }] });
    expect(accounts.awardPoints.mock.calls[0][2]).toBe(5);
  });

  it("saves the book without points when this connection can't get a new account", async () => {
    accounts.getOrCreateAccount.mockResolvedValue(null);
    const res = await post({ isbn: "9780063345164", libraryId: "lib_1" });

    expect(res.status).toBe(201);
    expect((await res.json()).award).toBeNull();
    expect(accounts.awardPoints).not.toHaveBeenCalled();
  });

  it("ignores book details sent by the browser", async () => {
    await post({
      ...bookInfo,
      itemInfo: "javascript:alert(document.domain)",
      thumbnail: "https://example.com/x.jpg",
      title: "<img src=x onerror=alert(1)>",
      isbn13: "9780063345164",
    });

    const saved = prismaMock.item.create.mock.calls[0][0].data;
    expect(saved).toMatchObject({ title: "The Wager", itemInfo: bookInfo.itemInfo, thumbnail: bookInfo.thumbnail });
  });

  it("returns the existing entry instead of adding a duplicate", async () => {
    prismaMock.item.findFirst.mockResolvedValue({ id: "item_old", ...storedFields, libraryId: "lib_1" });

    const res = await post({ isbn: "9780063345164", libraryId: "lib_1" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "item_old", award: null });
    expect(prismaMock.item.create).not.toHaveBeenCalled();
    expect(accounts.awardPoints).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing ISBN", { libraryId: "lib_1" }],
    ["a malformed ISBN", { isbn: "../../people", libraryId: "lib_1" }],
    ["a missing library", { isbn: "9780063345164" }],
    ["an oversized library id", { isbn: "9780063345164", libraryId: "x".repeat(65) }],
  ])("rejects %s", async (_label, body) => {
    expect((await post(body)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown library without calling OpenLibrary", async () => {
    prismaMock.library.findFirst.mockResolvedValue(null);
    expect((await post({ isbn: "9780063345164", libraryId: "nope" })).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 404 when OpenLibrary has no such book", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ records: {} }));
    expect((await post({ isbn: "9780063345164", libraryId: "lib_1" })).status).toBe(404);
    expect(prismaMock.item.create).not.toHaveBeenCalled();
  });

  it("falls back to Google Books when OpenLibrary has no match", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-google-books-key");
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ records: {} }))
      .mockResolvedValueOnce(jsonResponse(googleBooksResponse));

    const res = await post({ isbn: "9780063345164", libraryId: "lib_1" });

    expect(res.status).toBe(201);
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toMatch(
      /^https:\/\/www\.googleapis\.com\/books\/v1\/volumes\?q=isbn:9780063345164&/,
    );
    expect(prismaMock.item.create.mock.calls[0][0].data).toMatchObject({
      title: "The Wager",
      thumbnail: "https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1",
      itemInfo: "https://books.google.com/books?id=abc",
    });
    vi.unstubAllEnvs();
  });

  it("returns 502 when OpenLibrary is down", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("down", { status: 503 }));
    expect((await post({ isbn: "9780063345164", libraryId: "lib_1" })).status).toBe(502);
  });

  it("returns 500 when the write fails", async () => {
    prismaMock.item.create.mockRejectedValue(new Error("connection refused"));
    const res = await post({ isbn: "9780063345164", libraryId: "lib_1" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to save book" });
  });

  describe("a book found by title search", () => {
    const edition = {
      records: {
        OL6014553M: {
          recordURL: "http://openlibrary.org/books/OL6014553M/Controversial_essays",
          data: {
            title: "Controversial essays",
            authors: [{ name: "John Hanbury Angus Sparrow" }],
            cover: { medium: "https://covers.openlibrary.org/b/id/10066834-M.jpg" },
            identifiers: { openlibrary: ["OL6014553M"], lccn: ["66071398"] },
          },
        },
      },
    };

    it("looks up a book without an ISBN by its OpenLibrary edition and stores it under that", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(edition));

      const res = await post({ editionKey: "OL6014553M", libraryId: "lib_1", title: "Spoofed" });

      expect(res.status).toBe(201);
      expect(vi.mocked(fetch).mock.calls[0][0]).toBe("https://openlibrary.org/api/volumes/brief/olid/OL6014553M.json");
      expect(prismaMock.item.findFirst).toHaveBeenCalledWith({
        where: { libraryId: "lib_1", editionKey: "OL6014553M" },
      });
      expect(prismaMock.item.create.mock.calls[0][0].data).toMatchObject({
        title: "Controversial essays",
        isbn13: null,
        editionKey: "OL6014553M",
        addedVia: "search",
        itemInfo: "https://openlibrary.org/books/OL6014553M/Controversial_essays",
      });
    });

    it("awards the searched-book points, never the scanning ones", async () => {
      const res = await post({ isbn: "9780063345164", libraryId: "lib_1", via: "search" });

      expect((await res.json()).award).toEqual({ pointsAwarded: 5, total: 45, searchLimitReached: false });
      expect(accounts.searchedBookPoints).toHaveBeenCalledWith("acc_1", "lib_1");
      expect(accounts.newBookPoints).not.toHaveBeenCalled();
      expect(accounts.awardPoints).toHaveBeenCalledWith("acc_1", "ADD_SEARCHED_BOOK", 2, {
        libraryId: "lib_1",
        itemId: "item_1",
      });
    });

    it("says when the day's searched books at this library have used up their points", async () => {
      accounts.searchedBookPoints.mockResolvedValue(0);
      accounts.awardPoints.mockResolvedValue({ pointsAwarded: 0, total: 60 });
      vi.mocked(fetch).mockResolvedValue(jsonResponse(edition));

      const res = await post({ editionKey: "OL6014553M", libraryId: "lib_1" });

      expect(res.status).toBe(201);
      expect((await res.json()).award).toEqual({ pointsAwarded: 0, total: 60, searchLimitReached: true });
    });

    it.each([
      ["a malformed edition id", { editionKey: "../../people", libraryId: "lib_1" }],
      ["a work id instead of an edition", { editionKey: "OL4316364W", libraryId: "lib_1" }],
    ])("rejects %s", async (_label, body) => {
      expect((await post(body)).status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("returns 404 when OpenLibrary doesn't have that edition", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ records: {} }));
      expect((await post({ editionKey: "OL6014553M", libraryId: "lib_1" })).status).toBe(404);
    });

    it("returns 502 when OpenLibrary is down", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("down", { status: 503 }));
      expect((await post({ editionKey: "OL6014553M", libraryId: "lib_1" })).status).toBe(502);
    });
  });

  it("rejects other sites", async () => {
    requestHeaders.current = new Headers({ referer: "https://evil.example.com/" });
    expect((await post({ isbn: "9780063345164", libraryId: "lib_1" })).status).toBe(403);
  });

  it("rate-limits an IP after 30 books a minute", async () => {
    for (let i = 0; i < 30; i++) await post({ isbn: "9780063345164", libraryId: "lib_1" }, "192.0.2.77");
    expect((await post({ isbn: "9780063345164", libraryId: "lib_1" }, "192.0.2.77")).status).toBe(429);
  });
});

describe("GET /api/book", () => {
  const get = (query: string) =>
    bookLookup(
      new Request(`https://arlib.me/api/book${query}`, { headers: { "x-forwarded-for": `10.5.0.${++ipCounter}` } }),
    );

  it("requires an ISBN", async () => {
    const res = await get("");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "ISBN is required" });
  });

  it("rejects malformed ISBNs without calling any catalog", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await get("?isbn=..%2F..%2Fpeople")).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the book in the shape we store, cached at the edge for a day", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(openLibraryResponse)));

    const res = await get("?isbn=9780063345164");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ book: storedFields });
    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
  });

  it("answers null, cached for an hour, when no catalog has the book", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ records: {} })));

    const res = await get("?isbn=9780063345164");

    expect(await res.json()).toEqual({ book: null });
    expect(res.headers.get("cache-control")).toContain("s-maxage=3600");
  });

  it("returns 502 when the catalogs can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("down", { status: 503 })));

    const res = await get("?isbn=9780063345164");

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Could not reach the book catalogs" });
  });
});
