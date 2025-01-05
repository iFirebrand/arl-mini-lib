"use client";

import React from "react";
import Image from "next/image";

interface PersonalityClientProps {
  totalLibraries: number;
  librariesWithDescriptionCount: number;
  libraryDescriptions: Library[];
}

interface Library {
  id: string;
  imageUrl?: string;
  locationName: string;
  description?: string;
}

const LibraryItem: React.FC<{ library: Library }> = ({ library }) => (
  <div key={library.id} className="flex flex-col items-start mb-6">
    <Image
      src={
        library.imageUrl ||
        "https://dtmqxpohipopgolmirik.supabase.co/storage/v1/object/public/library-images/site-images/placeholder-library.jpeg?t=2024-12-15T15%3A45%3A04.162Z"
      }
      alt={`${library.locationName} library image`}
      width={384}
      height={384}
      className="max-w-sm rounded-lg shadow-2xl mb-4"
    />
    <div className="text-left h-40">
      <h1 className="text-5xl font-bold">{library.locationName}</h1>
      <p className="py-6">
        {library.description ||
          "This mini library is brimming with potential but could use a few more books in its online catalog to truly shine! Cataloging just a handful of titles can help capture the mood and unique offerings of this space. Scan a few books to help activate AI narrative for this library and bring its story to life!"}
      </p>
      <a href={`/browse/${library.id}`} className="btn btn-primary">
        View Catalog
      </a>
    </div>
  </div>
);

export default function PersonalityClient({
  totalLibraries,
  librariesWithDescriptionCount,
  libraryDescriptions,
}: PersonalityClientProps) {
  return (
    <main>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-center">
            Out of {totalLibraries} Libraries {librariesWithDescriptionCount} have a Character 😅
          </h1>
        </div>

        <div className="hero bg-base-200 min-h-screen">
          <div className="hero-content flex-col lg:flex-row">
            {libraryDescriptions.map(library => {
              console.log(library.id);
              return <LibraryItem key={library.id} library={library} />;
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
