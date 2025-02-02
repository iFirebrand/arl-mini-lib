import React from "react";
import { handleImageUpload } from "~~/media/handleImageUpload";

export default function UploadImage() {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (selectedFile) {
      const url = await handleImageUpload(selectedFile);
      console.log(url);
      setSelectedFile(null); // Reset after upload
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <input type="file" onChange={handleFileSelect} accept="image/*" />
      <button
        onClick={handleSubmit}
        disabled={!selectedFile}
        className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Upload Image
      </button>
    </div>
  );
}
