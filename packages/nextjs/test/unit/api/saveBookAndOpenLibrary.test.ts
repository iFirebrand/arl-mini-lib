// @vitest-environment node
import { bookInfo, jsonResponse, openLibraryResponse } from "../../fixtures/openLibrary";
import { prismaMock } from "../../mocks/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("../../mocks/prisma")).prismaMock }));

const requestHeaders = vi.hoisted(() => ({ current: new Headers({ referer: "https://arlib.me/libs/lib_1" }) }));
vi.mock("next/headers", () => ({ headers: () => requestHeaders.current }));

const { POST: saveBook } = await import("~~/app/api/saveBook/route");
const { GET: openLibrary } = await import("~~/app/api/openlibrary/route");

const { libraryId, ...storedFields } = bookInfo;
let ipCounter = 0;

describe("POST /api/saveBook", () => {
  beforeEach(() => {
    requestHeaders.current = new Headers({ referer: "https://arlib.me/libs/lib_1" });
    prismaMock.library.findUnique.mockReset().mockResolvedValue({ id: "lib_1" });
    prismaMock.item.findFirst.mockReset().mockResolvedValue(null);
    prismaMock.item.create.mockReset().mockImplementation(async ({ data }) => ({ id: "item_1", ...data }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(openLibraryResponse)));
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
      data: { ...storedFields, library: { connect: { id: libraryId } } },
    });
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
    expect(await res.json()).toMatchObject({ id: "item_old" });
    expect(prismaMock.item.create).not.toHaveBeenCalled();
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
    prismaMock.library.findUnique.mockResolvedValue(null);
    expect((await post({ isbn: "9780063345164", libraryId: "nope" })).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 404 when OpenLibrary has no such book", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ records: {} }));
    expect((await post({ isbn: "9780063345164", libraryId: "lib_1" })).status).toBe(404);
    expect(prismaMock.item.create).not.toHaveBeenCalled();
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

  it("rejects other sites", async () => {
    requestHeaders.current = new Headers({ referer: "https://evil.example.com/" });
    expect((await post({ isbn: "9780063345164", libraryId: "lib_1" })).status).toBe(403);
  });

  it("rate-limits an IP after 30 books a minute", async () => {
    for (let i = 0; i < 30; i++) await post({ isbn: "9780063345164", libraryId: "lib_1" }, "192.0.2.77");
    expect((await post({ isbn: "9780063345164", libraryId: "lib_1" }, "192.0.2.77")).status).toBe(429);
  });
});

describe("GET /api/openlibrary", () => {
  it("requires an ISBN", async () => {
    const res = await openLibrary(new Request("https://arlib.me/api/openlibrary"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "ISBN is required" });
  });

  it("rejects malformed ISBNs without calling OpenLibrary", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await openLibrary(new Request("https://arlib.me/api/openlibrary?isbn=..%2F..%2Fpeople"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proxies the OpenLibrary brief volumes API over https", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(openLibraryResponse));
    vi.stubGlobal("fetch", fetchMock);

    const res = await openLibrary(new Request("https://arlib.me/api/openlibrary?isbn=9780063345164"));

    expect(fetchMock.mock.calls[0][0]).toBe("https://openlibrary.org/api/volumes/brief/isbn/9780063345164.json");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(openLibraryResponse);
  });

  it("returns 500 with the upstream status when OpenLibrary fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("down", { status: 503 })));

    const res = await openLibrary(new Request("https://arlib.me/api/openlibrary?isbn=9780063345164"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "OpenLibrary API responded with status: 503" });
  });
});
