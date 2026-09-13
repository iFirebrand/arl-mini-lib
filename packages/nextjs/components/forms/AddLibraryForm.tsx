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
  const [uploadFailed, setUploadFailed] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setFileName(file.name);
      setImageUrl("");
      setUploadFailed(false);
      setIsUploading(true);
      try {
        const url = await handleImageUpload(file);
        if (!url) {
          throw new Error("Failed to upload image - no URL returned");
        }
        setImageUrl(url);
      } catch (error) {
        console.error("Error uploading image:", error);
        setUploadFailed(true);
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
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="locationName" className="font-semibold">
          1. Name it
        </label>
        <input
          id="locationName"
          type="text"
          name="locationName"
          maxLength={80}
          placeholder="Choose a lib name. Be nice."
          className="input input-bordered w-full bg-base-100"
        />
        <p className="text-sm text-base-content/65">A street corner or a landmark works well, like “Maple St & 5th”.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="libraryPhoto" className="font-semibold">
          2. Snap a photo of the library
        </label>
        <input
          id="libraryPhoto"
          type="file"
          onChange={handleFileSelect}
          accept="image/*"
          className="file-input file-input-bordered w-full bg-base-100"
        />
        {isUploading && (
          <div className="flex items-center gap-2" role="status">
            <span className="loading loading-spinner loading-sm"></span>
            <span className="text-sm">Uploading...</span>
          </div>
        )}
        {!isUploading && imageUrl && (
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">✓ {fileName}</span>
        )}
        {!isUploading && uploadFailed && (
          <span className="text-sm font-medium text-error">
            Upload failed. Please try another photo (JPEG, PNG or GIF).
          </span>
        )}
      </div>

      <input type="hidden" id="latitude" name="latitude" value={isGeolocationAvailable ? (latitude ?? "") : ""} />
      <input type="hidden" id="longitude" name="longitude" value={isGeolocationAvailable ? (longitude ?? "") : ""} />
      <input type="hidden" name="imageUrl" value={imageUrl} />

      <button
        type="submit"
        className="btn btn-neutral btn-lg w-full rounded-full"
        disabled={libraryExists || !isGeolocationAvailable || isUploading}
      >
        Add Library
      </button>
      <p className="-mt-2 text-center text-sm text-base-content/65">3. Add it to the map and earn 50 points.</p>
      {!isGeolocationAvailable && <p className="text-error">Enable geolocation please.</p>}
    </form>
  );
};
