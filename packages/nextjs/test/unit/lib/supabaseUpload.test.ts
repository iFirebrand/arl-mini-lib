// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  from: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    storage.createClient(...args);
    return { storage: { from: storage.from } };
  },
}));

const { uploadToSupabase } = await import("~~/lib/supabase");

const SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/gif": [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
};

const makeFile = (name: string, type: string, { size = 1024, bytes = SIGNATURES[type] ?? [0x3c, 0x68] } = {}) => {
  const file = new File([new Uint8Array([...bytes, 0, 0, 0, 0])], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("uploadToSupabase", () => {
  beforeEach(() => {
    storage.from.mockReturnValue({ upload: storage.upload, getPublicUrl: storage.getPublicUrl });
    storage.upload.mockImplementation(async (path: string) => ({ data: { path }, error: null }));
    storage.getPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `http://supabase.test/storage/v1/object/public/library-images/${path}` },
    }));
  });

  it("uses the server-only secret key, never a browser key", async () => {
    await uploadToSupabase(makeFile("a.jpg", "image/jpeg"));

    expect(storage.createClient).toHaveBeenCalledWith("http://supabase.test", "sb_secret_test", expect.any(Object));
  });

  it("uploads into library-images/uploads with a unique, safe name and returns the public URL", async () => {
    const url = await uploadToSupabase(makeFile("my library/../photo 1.jpg", "image/jpeg"));

    expect(storage.from).toHaveBeenCalledWith("library-images");
    const [path, , options] = storage.upload.mock.calls[0];
    expect(path).toMatch(/^uploads\/[0-9a-f-]{36}-my_library_.._photo_1\.jpg$/);
    expect(options).toEqual({ contentType: "image/jpeg" });
    expect(url).toBe(`http://supabase.test/storage/v1/object/public/library-images/${path}`);
  });

  it.each(["image/jpeg", "image/png", "image/gif"])("accepts %s", async type => {
    await expect(uploadToSupabase(makeFile("a", type))).resolves.toContain("library-images");
  });

  it("rejects unsupported file types before uploading", async () => {
    await expect(uploadToSupabase(makeFile("a.webp", "image/webp"))).rejects.toThrow("File type not supported");
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects a file whose contents don't match its claimed type", async () => {
    const html = makeFile("a.jpg", "image/jpeg", { bytes: [...Buffer.from("<html><script>")] });

    await expect(uploadToSupabase(html)).rejects.toThrow("File type not supported");
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects files over 10 MB before uploading", async () => {
    await expect(uploadToSupabase(makeFile("a.jpg", "image/jpeg", { size: 10 * 1024 * 1024 + 1 }))).rejects.toThrow(
      "File size exceeds 10MB limit",
    );
    await expect(uploadToSupabase(makeFile("a.jpg", "image/jpeg", { size: 10 * 1024 * 1024 }))).resolves.toBeTruthy();
  });

  it("surfaces storage errors", async () => {
    storage.upload.mockResolvedValue({ data: null, error: { message: "Bucket not found" } });

    await expect(uploadToSupabase(makeFile("a.jpg", "image/jpeg"))).rejects.toThrow("Upload failed: Bucket not found");
  });

  it("fails clearly when the secret key is not configured", async () => {
    vi.resetModules();
    const saved = process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    try {
      const fresh = await import("~~/lib/supabase");
      await expect(fresh.uploadToSupabase(makeFile("a.jpg", "image/jpeg"))).rejects.toThrow(
        "Missing Supabase environment variables",
      );
    } finally {
      process.env.SUPABASE_SECRET_KEY = saved;
    }
  });
});
