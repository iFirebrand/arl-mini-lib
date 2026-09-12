import imageCompression from "browser-image-compression";

// Shrinks the photo in the browser, then sends it to /api/upload, which stores it with the
// server-side Supabase key. Returns the public URL, or undefined when anything fails.
export const handleImageUpload = async (file: File) => {
  const options = {
    maxWidthOrHeight: 640,
    useWebWorker: true,
  };
  try {
    const compressedFile = await imageCompression(file, options);
    const body = new FormData();
    body.append("file", compressedFile, compressedFile.name || file.name);

    const response = await fetch("/api/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok || typeof data.url !== "string") {
      throw new Error(data.error || `Upload failed with status ${response.status}`);
    }
    return data.url as string;
  } catch (error) {
    console.error("Error uploading image:", error);
  }
};
