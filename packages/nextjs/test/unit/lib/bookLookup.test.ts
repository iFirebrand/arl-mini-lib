// @vitest-environment node
import { googleBooksResponse } from "../../fixtures/googleBooks";
import { jsonResponse, openLibraryResponse } from "../../fixtures/openLibrary";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findBook } from "~~/lib/bookLookup";
import { googleBooksUrlFor, parseGoogleBooksResponse } from "~~/lib/googleBooks";
import { parseOpenLibraryResponse } from "~~/lib/openLibrary";

const volume = googleBooksResponse.items[0].volumeInfo;
const withVolume = (info: object) => ({ items: [{ volumeInfo: { ...volume, ...info } }] });
const NOT_IN_OPENLIBRARY = () => jsonResponse({ records: {} });
const DOWN = () => new Response("down", { status: 503 });

describe("parseGoogleBooksResponse", () => {
  it("maps a volume, upgrading Google's links to https", () => {
    expect(parseGoogleBooksResponse(googleBooksResponse, "9780063345164")).toEqual({
      title: "The Wager",
      authors: "David Grann",
      thumbnail: "https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1",
      description: "A Tale of Shipwreck, Mutiny and Murder",
      isbn13: "9780063345164",
      itemInfo: "https://books.google.com/books?id=abc",
    });
  });

  it("matches a volume that lists only an ISBN-10", () => {
    const data = withVolume({ industryIdentifiers: [{ type: "ISBN_10", identifier: "0063345161" }] });
    expect(parseGoogleBooksResponse(data, "9780063345164")).toMatchObject({ isbn13: "9780063345164" });
  });

  it("skips near matches that don't carry the ISBN", () => {
    const other = { volumeInfo: { ...volume, title: "Another Book", industryIdentifiers: [] } };
    const data = { items: [other, ...googleBooksResponse.items] };
    expect(parseGoogleBooksResponse(data, "9780063345164")).toMatchObject({ title: "The Wager" });
    expect(parseGoogleBooksResponse({ items: [other] }, "9780063345164")).toBeNull();
  });

  it("drops links and covers that aren't Google Books'", () => {
    const data = withVolume({
      imageLinks: { thumbnail: "https://example.com/x.jpg" },
      infoLink: "javascript:alert(document.domain)",
    });
    expect(parseGoogleBooksResponse(data, "9780063345164")).toMatchObject({ thumbnail: "", itemInfo: "" });
  });

  it.each([
    ["no items", {}],
    ["null", null],
    ["no title", withVolume({ title: "" })],
    ["a null identifier", { items: [{ volumeInfo: { ...volume, industryIdentifiers: [null] } }] }],
  ])("returns null for %s", (_label, data) => {
    expect(parseGoogleBooksResponse(data, "9780063345164")).toBeNull();
  });

  it("requests only the fields we store, with the key", () => {
    const url = new URL(googleBooksUrlFor("9780063345164", "k&y"));
    expect(url.searchParams.get("q")).toBe("isbn:9780063345164");
    expect(url.searchParams.get("key")).toBe("k&y");
    expect(url.searchParams.get("fields")).toContain("industryIdentifiers");
  });
});

describe("parseOpenLibraryResponse", () => {
  it("converts an ISBN-10 when the record has no ISBN-13", () => {
    const data = { records: { k: { data: { title: "Old Book", identifiers: { isbn_10: ["0306406152"] } } } } };
    expect(parseOpenLibraryResponse(data)).toMatchObject({ title: "Old Book", isbn13: "9780306406157" });
  });
});

describe("findBook", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-google-books-key");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const catalogsAsked = () => fetchMock.mock.calls.map(([url]) => new URL(String(url)).hostname);

  it("uses OpenLibrary when it has the book, without asking Google", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(openLibraryResponse));
    expect(await findBook("9780063345164")).toMatchObject({ title: "The Wager" });
    expect(catalogsAsked()).toEqual(["openlibrary.org"]);
  });

  it("asks Google Books when OpenLibrary has no match", async () => {
    fetchMock.mockResolvedValueOnce(NOT_IN_OPENLIBRARY()).mockResolvedValueOnce(jsonResponse(googleBooksResponse));
    expect(await findBook("0063345161")).toMatchObject({ isbn13: "9780063345164" });
    expect(catalogsAsked()).toEqual(["openlibrary.org", "www.googleapis.com"]);
  });

  it("asks Google Books when OpenLibrary is down", async () => {
    fetchMock.mockResolvedValueOnce(DOWN()).mockResolvedValueOnce(jsonResponse(googleBooksResponse));
    expect(await findBook("9780063345164")).toMatchObject({ title: "The Wager" });
  });

  it("returns null, and logs only the ISBN, when neither catalog has the book", async () => {
    fetchMock.mockResolvedValueOnce(NOT_IN_OPENLIBRARY()).mockResolvedValueOnce(jsonResponse({}));
    expect(await findBook("9780063345164")).toBeNull();
    expect(console.warn).toHaveBeenCalledWith("Book not found in any catalog: 9780063345164");
  });

  it("throws when OpenLibrary is down and Google Books can't confirm the book is missing", async () => {
    fetchMock.mockResolvedValueOnce(DOWN()).mockResolvedValueOnce(DOWN());
    await expect(findBook("9780063345164")).rejects.toThrow("OpenLibrary");
  });

  it("returns null when OpenLibrary has no match and Google Books is down", async () => {
    fetchMock.mockResolvedValueOnce(NOT_IN_OPENLIBRARY()).mockResolvedValueOnce(DOWN());
    expect(await findBook("9780063345164")).toBeNull();
  });

  it("only uses OpenLibrary without a Google Books key", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "");
    fetchMock.mockResolvedValueOnce(NOT_IN_OPENLIBRARY());
    expect(await findBook("9780063345164")).toBeNull();
    expect(catalogsAsked()).toEqual(["openlibrary.org"]);
  });
});
