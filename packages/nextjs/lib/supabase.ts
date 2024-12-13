import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_KEY || "");

// Constants for file validation
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

/**
 * Uploads a file to Supabase storage with validation
 * @param file File to upload
 * @returns Promise containing the file path
 * @throws Error if file validation fails or upload fails
 */
async function uploadToSupabase(file: File): Promise<string> {
  // File validation
  if (file.size > MAX_SIZE) {
    throw new Error("File size exceeds 2MB limit");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("File type not supported. Allowed types: JPEG, PNG, GIF");
  }

  // Create unique filename with sanitized original filename
  const sanitizedFileName = file.name.replace(/\s+/g, "_");
  const uniqueFileName = `${uuidv4()}-${sanitizedFileName}`;

  // Upload file
  const { data, error } = await supabase.storage.from("library-images").upload(`uploads/${uniqueFileName}`, file, {
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
  const { data } = supabase.storage.from("library-images").getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Failed to get public URL");
  }

  return data.publicUrl;
}

export { uploadToSupabase, getPublicUrl };
