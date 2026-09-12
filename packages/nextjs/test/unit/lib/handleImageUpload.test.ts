import { jsonResponse } from "../../fixtures/openLibrary";
import { beforeEach, describe, expect, it, vi } from "vitest";

const compress = vi.hoisted(() => vi.fn());
vi.mock("browser-image-compression", () => ({ default: compress }));

const { handleImageUpload } = await import("~~/media/handleImageUpload");

const URL_RESULT = "http://supabase.test/storage/v1/object/public/library-images/uploads/abc-lib.jpg";

describe("handleImageUpload", () => {
  beforeEach(() => {
    compress.mockReset();
    compress.mockImplementation(async (file: File) => new File(["small"], file.name, { type: file.type }));
  });

  it("compresses the photo and sends it to /api/upload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ url: URL_RESULT }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const url = await handleImageUpload(new File(["big photo"], "lib.jpg", { type: "image/jpeg" }));

    expect(url).toBe(URL_RESULT);
    expect(compress).toHaveBeenCalledWith(expect.any(File), { maxWidthOrHeight: 640, useWebWorker: true });
    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe("/api/upload");
    expect(init.method).toBe("POST");
    const sent = (init.body as FormData).get("file") as File;
    expect(sent.name).toBe("lib.jpg");
    // The compressed file ("small"), not the original ("big photo").
    expect(sent.size).toBe(5);
  });

  it("never sends a Supabase key from the browser", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ url: URL_RESULT }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await handleImageUpload(new File(["x"], "lib.jpg", { type: "image/jpeg" }));

    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
    expect(fetchMock.mock.calls.every(([endpoint]) => !String(endpoint).includes("supabase"))).toBe(true);
  });

  it("returns undefined when the server rejects the upload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "File type not supported" }, 400)));

    expect(await handleImageUpload(new File(["x"], "lib.jpg", { type: "image/jpeg" }))).toBeUndefined();
  });

  it("returns undefined when compression fails", async () => {
    compress.mockRejectedValue(new Error("not an image"));
    vi.stubGlobal("fetch", vi.fn());

    expect(await handleImageUpload(new File(["x"], "lib.txt", { type: "text/plain" }))).toBeUndefined();
  });
});
