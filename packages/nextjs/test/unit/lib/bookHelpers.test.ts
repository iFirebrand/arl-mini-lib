import { bookInfo, jsonResponse } from "../../fixtures/openLibrary";
import { describe, expect, it, vi } from "vitest";
import { CatalogsUnavailableError, RETRY_DELAY_MS } from "~~/app/libs/[id]/catalogRetry";
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

  it("tries again once when the catalogs are down, then says they didn't answer", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ error: "Could not reach" }, 502));
    vi.stubGlobal("fetch", fetchMock);

    const lookup = fetchBookData("9780063345164", libraryId).catch(error => error);
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);

    expect(await lookup).toBeInstanceOf(CatalogsUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("finds the book on the second try", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce(jsonResponse({ book: bookDetails })),
    );

    const lookup = fetchBookData("9780063345164", libraryId);
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);

    expect(await lookup).toMatchObject({ title: "The Wager" });
    vi.useRealTimers();
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

  it("tries again once when the server's lookup failed (nothing was saved)", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "Could not reach the book catalogs" }, 502))
      .mockResolvedValueOnce(jsonResponse({ id: "item_1", award: null }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const save = saveBookToDatabase({ isbn13: bookInfo.isbn13, libraryId: "lib_1", via: "camera" });
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);

    expect(await save).toEqual({ added: true, award: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("doesn't retry a network error, since the book may already be saved", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveBookToDatabase({ isbn13: bookInfo.isbn13, libraryId: "lib_1", via: "camera" })).rejects.toThrow(
      "Failed to fetch",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the API responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Failed to save book" }, 500)));

    await expect(saveBookToDatabase({ isbn13: bookInfo.isbn13, libraryId: "lib_1", via: "camera" })).rejects.toThrow(
      "Save book API failed with status: 500",
    );
  });
});
