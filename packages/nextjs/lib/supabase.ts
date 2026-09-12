import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import "server-only";

// Server-only. SUPABASE_SECRET_KEY bypasses all security rules, so it must never get a
// NEXT_PUBLIC_ prefix or be imported from browser code (the "server-only" import enforces that).
let client: SupabaseClient | undefined;

function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secretKey) {
      throw new Error("Missing Supabase environment variables");
    }
    client = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

// Constants for file validation
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

// The browser-supplied type can be anything, so check the file's first bytes as well.
const SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
};

async function hasImageSignature(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  return (SIGNATURES[file.type] ?? []).some(signature => signature.every((byte, i) => head[i] === byte));
}

/**
 * Uploads a file to Supabase storage with validation
 * @param file File to upload
 * @returns Promise containing the public URL
 * @throws Error if file validation fails or upload fails
 */
async function uploadToSupabase(file: File): Promise<string> {
  // File validation
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File size exceeds 10MB limit");
  }

  if (!ALLOWED_TYPES.includes(file.type) || !(await hasImageSignature(file))) {
    throw new Error("File type not supported. Allowed types: JPEG, PNG, GIF");
  }

  // Create unique filename with sanitized original filename
  const sanitizedFileName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-100);
  const uniqueFileName = `${randomUUID()}-${sanitizedFileName}`;

  // Upload file
  const { data, error } = await getSupabase().storage.from("library-images").upload(`uploads/${uniqueFileName}`, file, {
    contentType: file.type,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  if (!data?.path) {
    throw new Error("Upload failed: No path returned");
  }

  // Get and return the public URL instead of just the path
  return getPublicUrl(data.path);
}

/**
 * Gets the public URL for a file in Supabase storage
 * @param path File path in storage
 * @returns Public URL of the file
 */
function getPublicUrl(path: string): string {
  const { data } = getSupabase().storage.from("library-images").getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Failed to get public URL");
  }

  return data.publicUrl;
}

export { uploadToSupabase, getPublicUrl };
