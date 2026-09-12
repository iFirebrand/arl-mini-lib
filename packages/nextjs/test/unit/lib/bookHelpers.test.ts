import { bookInfo, jsonResponse, openLibraryResponse } from "../../fixtures/openLibrary";
import { describe, expect, it, vi } from "vitest";
import { fetchBookData } from "~~/app/libs/[id]/fetchBookData";
import { saveBookToDatabase } from "~~/app/libs/[id]/saveBookToDatabase";

describe("fetchBookData", () => {
  it("asks our OpenLibrary proxy for the ISBN", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(openLibraryResponse));
    vi.stubGlobal("fetch", fetchMock);

    await fetchBookData("9780063345164", "lib_1");

    expect(fetchMock).toHaveBeenCalledWith("/api/openlibrary?isbn=9780063345164");
  });

  it("maps the first OpenLibrary record into the shape saved to the database", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(openLibraryResponse)));

    const result = await fetchBookData("9780063345164", "lib_1");

    expect(result).toEqual({ ...bookInfo, updatedAt: expect.any(String) });
  });

  it("joins multiple authors and tolerates missing optional fields", async () => {
    const record = openLibraryResponse.records["/books/OL50548140M"];
    const sparse = {
      records: {
        k: {
          recordURL: record.recordURL,
          data: {
            title: "Good Omens",
            authors: [{ name: "Terry Pratchett" }, { name: "Neil Gaiman" }],
            identifiers: { isbn_13: ["9780060853983"] },
          },
        },
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(sparse)));

    const result = await fetchBookData("9780060853983", "lib_1");

    expect(result).toMatchObject({
      title: "Good Omens",
      authors: "Terry Pratchett, Neil Gaiman",
      thumbnail: "",
      description: "",
      isbn13: "9780060853983",
    });
  });

  it("returns null when OpenLibrary has no record for the ISBN", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ records: {} })));

    expect(await fetchBookData("0000000000000", "lib_1")).toBeNull();
  });

  it("returns null when the proxy returns an error body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "boom" }, 500)));

    expect(await fetchBookData("9780063345164", "lib_1")).toBeNull();
  });

  it("propagates network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(fetchBookData("9780063345164", "lib_1")).rejects.toThrow("Failed to fetch");
  });
});

describe("saveBookToDatabase", () => {
  it("sends only the ISBN and library to /api/saveBook", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "item_1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await saveBookToDatabase(bookInfo);

    expect(fetchMock).toHaveBeenCalledWith("/api/saveBook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isbn: bookInfo.isbn13, libraryId: bookInfo.libraryId }),
    });
  });

  it("returns the points the server awarded", async () => {
    const award = { pointsAwarded: 5, total: 45, newBooksThisVisit: 1 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ id: "item_1", award }, 201)));

    expect(await saveBookToDatabase(bookInfo)).toEqual(award);
  });

  it("returns null when no points were awarded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ id: "item_1", award: null }, 200)));

    expect(await saveBookToDatabase(bookInfo)).toBeNull();
  });

  it("throws when the API responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Failed to save book" }, 500)));

    await expect(saveBookToDatabase(bookInfo)).rejects.toThrow("Save book API failed with status: 500");
  });
});
