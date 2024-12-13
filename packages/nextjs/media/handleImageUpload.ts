import { uploadToSupabase } from "../lib/supabase";
import imageCompression from "browser-image-compression";

export const handleImageUpload = async (file: File) => {
  const options = {
    maxWidthOrHeight: 640,
    useWebWorker: true,
  };
  try {
    const compressedFile = await imageCompression(file, options);
    const url = await uploadToSupabase(compressedFile);
    return url;
  } catch (error) {
    console.error("Error compressing image:", error);
  }
};
