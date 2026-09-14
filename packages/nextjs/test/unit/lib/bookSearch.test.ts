// @vitest-environment node
import { googleBooksSearchResponse, openLibrarySearchResponse } from "../../fixtures/bookSearch";
import { jsonResponse } from "../../fixtures/openLibrary";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as client from "~~/app/libs/[id]/BookSearch";
import * as server from "~~/lib/accounts";
import {
  cleanQuery,
  googleBooksSearchUrl,
  openLibrarySearchUrl,
  parseGoogleBooksSearch,
  parseOpenLibrarySearch,
  searchBooks,
} from "~~/lib/bookSearch";
import { parseOpenLibraryEdition } from "~~/lib/openLibrary";

vi.mock("~~/lib/db", () => ({ default: {} }));

const DOWN = () => new Response("down", { status: 503 });

describe("cleanQuery", () => {
  it.each([
    ["  Stone   Fox ", "Stone Fox"],
    ['The "Wager"', "The Wager"],
    ["Line\nbreak\u0000", "Line break"],
    [42, ""],
  ])("cleans %j", (raw, clean) => {
    expect(cleanQuery(raw, 120)).toBe(clean);
  });

  it("caps the length", () => {
    expect(cleanQuery("x".repeat(500), 120)).toHaveLength(120);
  });
});

describe("parseOpenLibrarySearch", () => {
  it("takes each work's best edition: by ISBN when it has one, else by edition id", () => {
    expect(parseOpenLibrarySearch(openLibrarySearchResponse)).toEqual([
      {
        title: "Stone Fox",
        authors: "John Reynolds Gardiner",
        year: "2003",
        thumbnail: "https://covers.openlibrary.org/b/id/9531777-M.jpg",
        isbn13: "9780064401326",
        editionKey: "OL22253548M",
      },
      {
        title: "Controversial essays",
        authors: "John Hanbury Angus Sparrow",
        year: "1966",
        // The work's cover when the edition has none.
        thumbnail: "https://covers.openlibrary.org/b/id/10066834-M.jpg",
        isbn13: null,
        editionKey: "OL6014553M",
      },
      {
        title: "Heartbeat",
        authors: "Sharon Creech",
        year: "2004",
        thumbnail: "",
        isbn13: "9780060546359",
        editionKey: "OL3401345M",
      },
    ]);
  });

  it("falls back to the edition with a cover when OpenLibrary picked no best edition", () => {
    const data = { docs: [{ title: "Controversial essays", cover_edition_key: "OL5989014M", editions: { docs: [] } }] };
    expect(parseOpenLibrarySearch(data)).toEqual([expect.objectContaining({ isbn13: null, editionKey: "OL5989014M" })]);
  });

  it("skips works without a usable edition", () => {
    expect(
      parseOpenLibrarySearch({
        docs: [
          { title: "No editions" },
          { title: "Bad key", editions: { docs: [{ key: "/works/OL1W" }] } },
          { editions: { docs: [{ key: "/books/OL1M" }] } },
          null,
        ],
      }),
    ).toEqual([]);
  });

  it.each([null, {}, { docs: "nope" }])("returns nothing for %j", data => {
    expect(parseOpenLibrarySearch(data)).toEqual([]);
  });
});

describe("parseGoogleBooksSearch", () => {
  it("keeps volumes with an ISBN, upgrading covers to https", () => {
    expect(parseGoogleBooksSearch(googleBooksSearchResponse)).toEqual([
      {
        title: "Stone Fox",
        authors: "John Reynolds Gardiner",
        year: "1980",
        thumbnail: "https://books.google.com/books/content?id=qaPknQEACAAJ&img=1&zoom=1",
        isbn13: "9780690039849",
        editionKey: null,
      },
      {
        title: "Stone Fox",
        authors: "John Reynolds Gardiner",
        year: "2003",
        thumbnail: "",
        isbn13: "9780064401326",
        editionKey: null,
      },
    ]);
  });
});

describe("parseOpenLibraryEdition", () => {
  const edition = (key: string, identifiers: object) => ({
    records: { [key]: { recordURL: `http://openlibrary.org/books/${key}/X`, data: { title: "Old", identifiers } } },
  });

  it("maps an edition without an ISBN", () => {
    expect(parseOpenLibraryEdition(edition("OL6014553M", { openlibrary: ["OL6014553M"] }), "OL6014553M")).toEqual({
      title: "Old",
      authors: "",
      thumbnail: "",
      description: "",
      isbn13: null,
      editionKey: "OL6014553M",
      itemInfo: "https://openlibrary.org/books/OL6014553M/X",
    });
  });

  it("keeps the ISBN when the edition has one", () => {
    const data = edition("OL1M", { openlibrary: ["OL1M"], isbn_10: ["0064401324"] });
    expect(parseOpenLibraryEdition(data, "OL1M")).toMatchObject({ isbn13: "9780064401326", editionKey: "OL1M" });
  });

  it("returns null when the record is for a different edition", () => {
    expect(parseOpenLibraryEdition(edition("OL2M", { openlibrary: ["OL2M"] }), "OL1M")).toBeNull();
  });
});

describe("search URLs", () => {
  it("asks OpenLibrary for each work's best edition, with the author only if given", () => {
    const url = new URL(openLibrarySearchUrl("Stone Fox", ""));
    expect(url.origin + url.pathname).toBe("https://openlibrary.org/search.json");
    expect(url.searchParams.get("title")).toBe("Stone Fox");
    expect(url.searchParams.has("author")).toBe(false);
    // Without the work's key, OpenLibrary leaves out the editions.
    expect(url.searchParams.get("fields")?.split(",")).toEqual(expect.arrayContaining(["key", "editions.isbn"]));
    expect(new URL(openLibrarySearchUrl("Stone Fox", "Gardiner")).searchParams.get("author")).toBe("Gardiner");
  });

  it("asks Google Books for title and author matches", () => {
    const url = new URL(googleBooksSearchUrl("Stone Fox", "Gardiner", "key123"));
    expect(url.searchParams.get("q")).toBe('intitle:"Stone Fox" inauthor:"Gardiner"');
    expect(url.searchParams.get("key")).toBe("key123");
  });
});

describe("searchBooks", () => {
  // Answers each catalog by URL, since both are asked at once.
  const catalogs = (openLibrary: () => Response, google: () => Response) =>
    vi.fn(async (url: string) => (url.startsWith("https://openlibrary.org/") ? openLibrary() : google()));

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("lists OpenLibrary's matches first, then Google Books' without repeats", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-key");
    const fetchMock = catalogs(
      () => jsonResponse(openLibrarySearchResponse),
      () => jsonResponse(googleBooksSearchResponse),
    );
    vi.stubGlobal("fetch", fetchMock);

    const results = await searchBooks("Stone Fox", "");

    // Google's 2003 edition has the same ISBN as OpenLibrary's first match.
    expect(results.map(result => result.isbn13 ?? result.editionKey)).toEqual([
      "9780064401326",
      "OL6014553M",
      "9780060546359",
      "9780690039849",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns at most 8 matches", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-key");
    const docs = Array.from({ length: 7 }, (_, i) => ({
      title: `Book ${i}`,
      editions: { docs: [{ key: `/books/OL${i + 1}M` }] },
    }));
    vi.stubGlobal(
      "fetch",
      catalogs(
        () => jsonResponse({ docs }),
        () => jsonResponse(googleBooksSearchResponse),
      ),
    );

    const results = await searchBooks("Book", "");

    expect(results).toHaveLength(8);
    expect(results[7]).toMatchObject({ isbn13: "9780690039849" });
  });

  it("uses Google Books alone when OpenLibrary is down", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      catalogs(DOWN, () => jsonResponse(googleBooksSearchResponse)),
    );

    expect(await searchBooks("Stone Fox", "")).toHaveLength(2);
  });

  it("uses OpenLibrary alone without a Google Books key", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "");
    const fetchMock = catalogs(() => jsonResponse(openLibrarySearchResponse), DOWN);
    vi.stubGlobal("fetch", fetchMock);

    expect(await searchBooks("Stone Fox", "")).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers with no matches when a catalog answered but found nothing", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      catalogs(DOWN, () => jsonResponse({})),
    );

    expect(await searchBooks("zzqx", "")).toEqual([]);
  });

  it("throws when no catalog answers", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-key");
    vi.stubGlobal("fetch", catalogs(DOWN, DOWN));

    await expect(searchBooks("Stone Fox", "")).rejects.toThrow("OpenLibrary search responded with status: 503");
  });

  it("throws when OpenLibrary is down and there's no Google Books key", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "");
    vi.stubGlobal("fetch", catalogs(DOWN, DOWN));

    await expect(searchBooks("Stone Fox", "")).rejects.toThrow();
  });
});

describe("searched-book points", () => {
  it("are described in the browser exactly as the server awards them", () => {
    expect(client.SEARCHED_BOOK_POINTS).toBe(server.SEARCHED_BOOK_POINTS);
    expect(client.SEARCHED_BOOKS_PER_LIBRARY_PER_DAY).toBe(server.SEARCHED_BOOKS_PER_LIBRARY_PER_DAY);
  });
});
