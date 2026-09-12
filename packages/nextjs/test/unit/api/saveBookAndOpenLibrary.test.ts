// @vitest-environment node
import { bookInfo, jsonResponse, openLibraryResponse } from "../../fixtures/openLibrary";
import { prismaMock } from "../../mocks/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("../../mocks/prisma")).prismaMock }));

const { POST: saveBook } = await import("~~/app/api/saveBook/route");
const { GET: openLibrary } = await import("~~/app/api/openlibrary/route");

describe("POST /api/saveBook", () => {
  beforeEach(() => {
    prismaMock.item.create.mockReset();
  });

  const post = (body: unknown) =>
    saveBook(new Request("https://arlib.me/api/saveBook", { method: "POST", body: JSON.stringify(body) }));

  it("creates the item linked to its library and returns 201", async () => {
    prismaMock.item.create.mockResolvedValue({ id: "item_1", ...bookInfo });

    const res = await post(bookInfo);

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ id: "item_1", title: "The Wager" });
    const { libraryId, ...fields } = bookInfo;
    expect(prismaMock.item.create).toHaveBeenCalledWith({
      data: { ...fields, library: { connect: { id: libraryId } } },
    });
  });

  it("returns 500 when the library does not exist or the write fails", async () => {
    prismaMock.item.create.mockRejectedValue(new Error("No 'Library' record found for a nested connect"));

    const res = await post(bookInfo);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to save book" });
  });
});

describe("GET /api/openlibrary", () => {
  it("requires an ISBN", async () => {
    const res = await openLibrary(new Request("https://arlib.me/api/openlibrary"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "ISBN is required" });
  });

  it("proxies the OpenLibrary brief volumes API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(openLibraryResponse));
    vi.stubGlobal("fetch", fetchMock);

    const res = await openLibrary(new Request("https://arlib.me/api/openlibrary?isbn=9780063345164"));

    expect(fetchMock).toHaveBeenCalledWith("http://openlibrary.org/api/volumes/brief/isbn/9780063345164.json");
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
