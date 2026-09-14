import { bookInfo, jsonResponse } from "../../fixtures/openLibrary";
import { describe, expect, it, vi } from "vitest";
import { fetchBookData } from "~~/app/libs/[id]/fetchBookData";
import { saveBookToDatabase } from "~~/app/libs/[id]/saveBookToDatabase";

describe("fetchBookData", () => {
  const { libraryId, ...bookDetails } = bookInfo;

  it("asks our book lookup for the ISBN", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ book: bookDetails }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchBookData("9780063345164", libraryId);

    expect(fetchMock).toHaveBeenCalledWith("/api/book?isbn=9780063345164");
  });

  it("adds the library and a timestamp to the book the server found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ book: bookDetails })));

    expect(await fetchBookData("9780063345164", libraryId)).toEqual({ ...bookInfo, updatedAt: expect.any(String) });
  });

  it("returns null when no catalog has the book", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ book: null })));

    expect(await fetchBookData("0000000000000", libraryId)).toBeNull();
  });

  it("throws when the lookup fails, so the page doesn't call it not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Could not reach the book catalogs" }, 502)),
    );

    await expect(fetchBookData("9780063345164", libraryId)).rejects.toThrow("status: 502");
  });

  it("propagates network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(fetchBookData("9780063345164", libraryId)).rejects.toThrow("Failed to fetch");
  });
});

describe("saveBookToDatabase", () => {
  it("sends only the ISBN, library and how the book was found to /api/saveBook", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "item_1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await saveBookToDatabase({ isbn13: bookInfo.isbn13, libraryId: bookInfo.libraryId, via: "camera" });

    expect(fetchMock).toHaveBeenCalledWith("/api/saveBook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isbn: bookInfo.isbn13, libraryId: bookInfo.libraryId, via: "camera" }),
    });
  });

  it("sends the OpenLibrary edition of a searched book without an ISBN", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "item_1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await saveBookToDatabase({ isbn13: null, editionKey: "OL6014553M", libraryId: "lib_1", via: "search" });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      editionKey: "OL6014553M",
      libraryId: "lib_1",
      via: "search",
    });
  });

  it("returns the points the server awarded for a new book", async () => {
    const award = { pointsAwarded: 5, total: 45, newBooksThisVisit: 1 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ id: "item_1", award }, 201)));

    expect(await saveBookToDatabase({ isbn13: bookInfo.isbn13, libraryId: "lib_1", via: "typed" })).toEqual({
      added: true,
      award,
    });
  });

  it("says when the library already had the book", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ id: "item_1", award: null }, 200)));

    expect(await saveBookToDatabase({ isbn13: bookInfo.isbn13, libraryId: "lib_1", via: "camera" })).toEqual({
      added: false,
      award: null,
    });
  });

  it("throws when the API responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Failed to save book" }, 500)));

    await expect(saveBookToDatabase({ isbn13: bookInfo.isbn13, libraryId: "lib_1", via: "camera" })).rejects.toThrow(
      "Save book API failed with status: 500",
    );
  });
});
