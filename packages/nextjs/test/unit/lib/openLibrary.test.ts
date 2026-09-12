// @vitest-environment node
import { jsonResponse, openLibraryResponse } from "../../fixtures/openLibrary";
import { describe, expect, it, vi } from "vitest";
import { lookupBook, normalizeIsbn, parseOpenLibraryResponse } from "~~/lib/openLibrary";

const withRecord = (record: object) => ({ records: { "/books/X": record } });
const baseData = { title: "The Wager", identifiers: { isbn_13: ["9780063345164"] } };

describe("normalizeIsbn", () => {
  it.each([
    ["9780063345164", "9780063345164"],
    ["978-0-06-334516-4", "9780063345164"],
    [" 0306406152 ", "0306406152"],
    ["080442957x", "080442957X"],
  ])("accepts %j", (raw, isbn) => {
    expect(normalizeIsbn(raw)).toBe(isbn);
  });

  it.each(["", "12345", "97800633451641", "../../people", "978006334516a", 9780063345164, null])("rejects %j", raw => {
    expect(normalizeIsbn(raw)).toBeNull();
  });
});

describe("parseOpenLibraryResponse", () => {
  it("maps a record, upgrading OpenLibrary links to https", () => {
    const record = openLibraryResponse.records["/books/OL50548140M"];
    expect(
      parseOpenLibraryResponse({ records: { k: { ...record, recordURL: "http://openlibrary.org/books/OL1M/X" } } }),
    ).toEqual({
      title: "The Wager",
      authors: "David Grann",
      thumbnail: "https://covers.openlibrary.org/b/id/14348537-M.jpg",
      description: "A Tale of Shipwreck, Mutiny and Murder",
      isbn13: "9780063345164",
      itemInfo: "https://openlibrary.org/books/OL1M/X",
    });
  });

  it("drops links and covers that aren't OpenLibrary's", () => {
    const book = parseOpenLibraryResponse(
      withRecord({
        recordURL: "javascript:alert(document.domain)",
        data: { ...baseData, cover: { medium: "https://example.com/x.jpg" } },
      }),
    );
    expect(book).toMatchObject({ itemInfo: "", thumbnail: "" });
  });

  it("caps long text fields", () => {
    const book = parseOpenLibraryResponse(
      withRecord({ recordURL: "", data: { ...baseData, title: "T".repeat(5000), subtitle: "S".repeat(5000) } }),
    );
    expect(book?.title).toHaveLength(300);
    expect(book?.description).toHaveLength(1000);
  });

  it.each([
    ["no records", { records: {} }],
    ["an error body", { error: "boom" }],
    ["null", null],
    ["no title", withRecord({ data: { identifiers: { isbn_13: ["9780063345164"] } } })],
    ["no ISBN-13", withRecord({ data: { title: "X", identifiers: {} } })],
    ["a malformed ISBN", withRecord({ data: { title: "X", identifiers: { isbn_13: ["<script>"] } } })],
  ])("returns null for %s", (_label, data) => {
    expect(parseOpenLibraryResponse(data)).toBeNull();
  });
});

describe("lookupBook", () => {
  it("asks OpenLibrary over https", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(openLibraryResponse));
    vi.stubGlobal("fetch", fetchMock);

    expect(await lookupBook("9780063345164")).toMatchObject({ title: "The Wager" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://openlibrary.org/api/volumes/brief/isbn/9780063345164.json");
  });

  it("throws when OpenLibrary is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("down", { status: 503 })));
    await expect(lookupBook("9780063345164")).rejects.toThrow("status: 503");
  });
});
