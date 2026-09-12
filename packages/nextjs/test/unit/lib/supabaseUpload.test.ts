import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ storage: { from: storage.from } }),
}));

const { uploadToSupabase } = await import("~~/lib/supabase");

const makeFile = (name: string, type: string, size = 1024) => {
  const file = new File(["x"], name, { type });
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

  it("uploads into library-images/uploads with a unique, space-free name and returns the public URL", async () => {
    const url = await uploadToSupabase(makeFile("my library photo.jpg", "image/jpeg"));

    expect(storage.from).toHaveBeenCalledWith("library-images");
    const [path, , options] = storage.upload.mock.calls[0];
    expect(path).toMatch(/^uploads\/[0-9a-f-]{36}-my_library_photo\.jpg$/);
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

  it("rejects files over 10 MB before uploading", async () => {
    // The error message says 2MB, but the enforced limit is 10 MB.
    await expect(uploadToSupabase(makeFile("a.jpg", "image/jpeg", 10 * 1024 * 1024 + 1))).rejects.toThrow(
      "File size exceeds",
    );
    await expect(uploadToSupabase(makeFile("a.jpg", "image/jpeg", 10 * 1024 * 1024))).resolves.toBeTruthy();
  });

  it("surfaces storage errors", async () => {
    storage.upload.mockResolvedValue({ data: null, error: { message: "Bucket not found" } });

    await expect(uploadToSupabase(makeFile("a.jpg", "image/jpeg"))).rejects.toThrow("Upload failed: Bucket not found");
  });
});
