import Image from "next/image";

export const ShowLibraryCard = ({ existingLibrary }: { existingLibrary: any }) => {
  console.log(`existing image url: ${existingLibrary.imageUrl}`);
  return (
    <div className="hero bg-base-200 min-h-screen">
      <div className="hero-content flex-col lg:flex-row">
        <Image
          src={existingLibrary.imageUrl || "https://img.daisyui.com/images/stock/photo-1635805737707-575885ab0820.webp"}
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
