// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.hoisted(() => vi.fn());
vi.mock("~~/lib/supabase", () => ({ MAX_UPLOAD_BYTES: 10 * 1024 * 1024, uploadToSupabase: upload }));

const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));
vi.mock("next/headers", () => ({ headers: () => requestHeaders.current }));

const { POST } = await import("~~/app/api/upload/route");

const URL_RESULT = "http://supabase.test/storage/v1/object/public/library-images/uploads/abc-lib.jpg";
let ipCounter = 0;

const postUpload = (
  body: BodyInit | null,
  { referer = "https://arlib.me/libs", ip = `10.2.0.${++ipCounter}`, contentType }: Record<string, string> = {},
) => {
  requestHeaders.current = new Headers(referer ? { referer } : {});
  const headers: Record<string, string> = { "x-forwarded-for": ip };
  if (contentType) headers["content-type"] = contentType;
  return POST(new Request("https://arlib.me/api/upload", { method: "POST", body, headers }));
};

const formWith = (file: File | string) => {
  const form = new FormData();
  form.append("file", file);
  return form;
};

const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "lib.jpg", { type: "image/jpeg" });

describe("POST /api/upload", () => {
  beforeEach(() => {
    upload.mockReset();
    upload.mockResolvedValue(URL_RESULT);
  });

  it("stores the file and returns its public URL", async () => {
    const res = await postUpload(formWith(jpeg()));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ url: URL_RESULT });
    expect(upload.mock.calls[0][0]).toBeInstanceOf(File);
    expect(upload.mock.calls[0][0].name).toBe("lib.jpg");
  });

  it("rejects other sites", async () => {
    const res = await postUpload(formWith(jpeg()), { referer: "https://evil.example.com/" });
    expect(res.status).toBe(403);
    expect(upload).not.toHaveBeenCalled();
  });

  it("requires a file field", async () => {
    expect((await postUpload(formWith("not a file"))).status).toBe(400);
    expect((await postUpload(new FormData())).status).toBe(400);
  });

  it("rejects a body that is not a form", async () => {
    const res = await postUpload(JSON.stringify({ file: "x" }), { contentType: "application/json" });
    expect(res.status).toBe(400);
  });

  it("rejects files over 10 MB without uploading", async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" });
    const res = await postUpload(formWith(big));
    expect(res.status).toBe(413);
    expect(upload).not.toHaveBeenCalled();
  });

  it("returns 400 for unsupported images", async () => {
    upload.mockRejectedValue(new Error("File type not supported. Allowed types: JPEG, PNG, GIF"));
    const res = await postUpload(formWith(jpeg()));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/File type not supported/);
  });

  it("hides storage details when the upload fails", async () => {
    upload.mockRejectedValue(new Error("Upload failed: Invalid API key"));
    const res = await postUpload(formWith(jpeg()));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Upload failed" });
  });

  it("rate-limits an IP after 10 uploads a minute", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await postUpload(formWith(jpeg()), { ip: "192.0.2.50" })).status).toBe(201);
    }
    expect((await postUpload(formWith(jpeg()), { ip: "192.0.2.50" })).status).toBe(429);
  });
});
