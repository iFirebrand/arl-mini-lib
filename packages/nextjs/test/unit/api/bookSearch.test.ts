// @vitest-environment node
import { openLibrarySearchResponse } from "../../fixtures/bookSearch";
import { jsonResponse } from "../../fixtures/openLibrary";
import { prismaMock } from "../../mocks/prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("../../mocks/prisma")).prismaMock }));

const requestHeaders = vi.hoisted(() => ({ current: new Headers({ referer: "https://arlib.me/libs/lib_1" }) }));
vi.mock("next/headers", () => ({ headers: () => requestHeaders.current }));

const { GET: search } = await import("~~/app/api/book/search/route");
const { POST: lookupMiss } = await import("~~/app/api/lookupMiss/route");

let ipCounter = 0;
afterEach(() => vi.unstubAllGlobals());

describe("GET /api/book/search", () => {
  const get = (query: string, ip = `10.6.0.${++ipCounter}`) =>
    search(new Request(`https://arlib.me/api/book/search${query}`, { headers: { "x-forwarded-for": ip } }));

  it("returns matches, cached at the edge for a day", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(openLibrarySearchResponse));
    vi.stubGlobal("fetch", fetchMock);

    const res = await get("?title=stone%20fox&author=gardiner");

    expect(res.status).toBe(200);
    const { results } = await res.json();
    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({ title: "Stone Fox", isbn13: "9780064401326" });
    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("title")).toBe("stone fox");
    expect(url.searchParams.get("author")).toBe("gardiner");
  });

  it.each([
    ["no title", ""],
    ["a one-letter title", "?title=a"],
    ["only quotes", '?title=""'],
  ])("rejects %s without calling any catalog", async (_label, query) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect((await get(query)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 502 when the catalogs can't be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => new Response("down", { status: 503 })),
    );

    const res = await get("?title=stone%20fox");

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Could not reach the book catalogs" });
  });

  it("rate-limits an IP after 20 searches a minute", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => jsonResponse({ docs: [] })),
    );
    for (let i = 0; i < 20; i++) await get("?title=stone%20fox", "192.0.2.90");
    expect((await get("?title=stone%20fox", "192.0.2.90")).status).toBe(429);
  });
});

describe("POST /api/lookupMiss", () => {
  beforeEach(() => {
    requestHeaders.current = new Headers({ referer: "https://arlib.me/libs/lib_1" });
    prismaMock.library.findFirst.mockReset().mockResolvedValue({ id: "lib_1" });
    prismaMock.lookupMiss.createMany.mockReset().mockResolvedValue({ count: 1 });
  });

  const createMany = () => prismaMock.lookupMiss.createMany;

  const post = (body: unknown, ip = `10.6.1.${++ipCounter}`) =>
    lookupMiss(
      new Request("https://arlib.me/api/lookupMiss", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: JSON.stringify(body),
      }),
    );

  it("keeps an unknown ISBN as an ISBN-13", async () => {
    expect((await post({ kind: "isbn", isbn: "0-06-334516-1", libraryId: "lib_1" })).status).toBe(204);
    expect(createMany()).toHaveBeenCalledWith({
      data: [{ kind: "isbn", query: "9780063345164", libraryId: "lib_1" }],
    });
  });

  it("keeps a search as its cleaned title and author", async () => {
    await post({ kind: "search", title: '  Old  "book" ', author: "A. Writer", libraryId: "lib_1" });
    await post({ kind: "search", title: "Old book", author: "", libraryId: "lib_1" });

    expect(createMany().mock.calls.map(([{ data }]) => data[0].query)).toEqual(["Old book | A. Writer", "Old book"]);
  });

  it.each([
    ["an unknown kind", { kind: "other", isbn: "9780063345164", libraryId: "lib_1" }],
    ["a malformed ISBN", { kind: "isbn", isbn: "12345", libraryId: "lib_1" }],
    ["an empty search", { kind: "search", title: " ", libraryId: "lib_1" }],
    ["no library", { kind: "isbn", isbn: "9780063345164" }],
  ])("rejects %s", async (_label, body) => {
    expect((await post(body)).status).toBe(400);
    expect(createMany()).not.toHaveBeenCalled();
  });

  it("returns 404 for a library that isn't on the map", async () => {
    prismaMock.library.findFirst.mockResolvedValue(null);
    expect((await post({ kind: "isbn", isbn: "9780063345164", libraryId: "nope" })).status).toBe(404);
    expect(createMany()).not.toHaveBeenCalled();
  });

  it("rejects other sites", async () => {
    requestHeaders.current = new Headers({ referer: "https://evil.example.com/" });
    expect((await post({ kind: "isbn", isbn: "9780063345164", libraryId: "lib_1" })).status).toBe(403);
  });

  it("rate-limits an IP after 20 reports in 10 minutes", async () => {
    for (let i = 0; i < 20; i++) await post({ kind: "isbn", isbn: "9780063345164", libraryId: "lib_1" }, "192.0.2.91");
    expect((await post({ kind: "isbn", isbn: "9780063345164", libraryId: "lib_1" }, "192.0.2.91")).status).toBe(429);
  });
});
