import React, { useState } from "react";
import { handleImageUpload } from "~~/media/handleImageUpload";

type AddLibraryFormProps = {
  isGeolocationAvailable: boolean;
  latitude: string | null;
  longitude: string | null;
  libraryExists: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export const AddLibraryForm = ({
  isGeolocationAvailable,
  latitude,
  longitude,
  libraryExists,
  onSubmit,
}: AddLibraryFormProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setFileName(file.name);
      setIsUploading(true);
      try {
        const url = await handleImageUpload(file);
        if (!url) {
          throw new Error("Failed to upload image - no URL returned");
        }
        setImageUrl(url);
      } catch (error) {
        console.error("Error uploading image:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imageUrl) {
      console.error("No image URL available");
      return;
    }

    // Set the hidden input value before submitting
    const imageUrlInput = e.currentTarget.querySelector('input[name="imageUrl"]') as HTMLInputElement;
    if (imageUrlInput) {
      imageUrlInput.value = imageUrl;
    }

    // Debug log
    const formData = new FormData(e.currentTarget);
    console.log("Form data being submitted:", Object.fromEntries(formData));

    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-y-2 w-[300px]">
      <input
        type="text"
        name="locationName"
        placeholder="Choose a nice name. It will be reviewed."
        className="px-2 py-1 rounded-sm"
      />

      <div className="flex flex-col gap-y-1">
        <input
          type="file"
          onChange={handleFileSelect}
          accept="image/*"
          className="file-input file-input-bordered w-full"
        />
        {isUploading && (
          <div className="flex items-center gap-2">
            <span className="loading loading-spinner loading-sm"></span>
            <span className="text-sm">Uploading...</span>
          </div>
        )}
        {!isUploading && fileName && <span className="text-sm text-green-600">✓ {fileName}</span>}
      </div>

      <input type="hidden" id="latitude" name="latitude" value={isGeolocationAvailable ? (latitude ?? "") : ""} />
      <input type="hidden" id="longitude" name="longitude" value={isGeolocationAvailable ? (longitude ?? "") : ""} />
      <input type="hidden" name="imageUrl" value={imageUrl} />

      <button
        type="submit"
        className={`bg-blue-500 py-2 text-white rounded-sm ${
          libraryExists || !isGeolocationAvailable || isUploading ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={libraryExists || !isGeolocationAvailable || isUploading}
      >
        Add Library
      </button>
      {!isGeolocationAvailable && <p className="text-red-500">Enable geolocation please.</p>}
    </form>
  );
};
