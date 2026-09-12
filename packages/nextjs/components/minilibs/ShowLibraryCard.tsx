import Image from "next/image";
import { PLACEHOLDER_LIBRARY_IMAGE, safeImageSrc } from "~~/lib/media";

interface LibraryCard {
  id: string;
  locationName: string;
  description: string | null;
  imageUrl: string | null;
}

export const ShowLibraryCard = ({ existingLibrary }: { existingLibrary: LibraryCard | null }) => {
  if (!existingLibrary) return <div></div>;
  return (
    <div className="hero bg-base-200 min-h-screen">
      <div className="hero-content flex-col lg:flex-row">
        <Image
          src={safeImageSrc(existingLibrary.imageUrl, PLACEHOLDER_LIBRARY_IMAGE)}
          alt={`${existingLibrary.locationName} library image`}
          width={384}
          height={384}
          className="rounded-lg shadow-2xl"
        />
        <div>
          <h1 className="text-5xl font-bold">{existingLibrary.locationName}</h1>
          <p className="py-6">
            {existingLibrary.description ||
              "This mini library is brimming with potential but could use a few more books in its online catalog to truly shine! Cataloging just a handful of titles can help capture the mood and unique offerings of this space. Scan a few books to help activate AI narrative for this library and bring its story to life!"}
          </p>

          <a href={`/browse/${existingLibrary.id}`} className="btn btn-primary">
            View Catalog
          </a>
        </div>
      </div>
    </div>
  );
};
