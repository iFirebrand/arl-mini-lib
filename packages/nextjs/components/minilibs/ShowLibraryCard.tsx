import Image from "next/image";
import Link from "next/link";
import { QrCodeIcon } from "@heroicons/react/24/outline";
import { PLACEHOLDER_LIBRARY_IMAGE, safeImageSrc } from "~~/lib/media";

interface LibraryCard {
  id: string;
  locationName: string;
  description: string | null;
  imageUrl: string | null;
}

// A library with its photo and the two things to do next: scan its books or browse its catalog.
export const ShowLibraryCard = ({
  existingLibrary,
  eyebrow,
}: {
  existingLibrary: LibraryCard | null;
  eyebrow?: string;
}) => {
  if (!existingLibrary) return <div></div>;
  return (
    <article className="grid overflow-hidden rounded-box border border-base-300/70 bg-base-100 text-left shadow-card md:grid-cols-2">
      <Image
        src={safeImageSrc(existingLibrary.imageUrl, PLACEHOLDER_LIBRARY_IMAGE)}
        alt={`${existingLibrary.locationName} library image`}
        width={640}
        height={480}
        sizes="(min-width: 768px) 480px, 100vw"
        className="aspect-4/3 h-full w-full bg-base-300 object-cover"
      />
      <div className="flex flex-col gap-4 p-6 sm:p-8">
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-link">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl sm:leading-10">
          {existingLibrary.locationName}
        </h1>
        <p className="leading-relaxed text-base-content/80">
          {existingLibrary.description ||
            "This mini library is brimming with potential but could use a few more books in its online catalog to truly shine! Cataloging just a handful of titles can help capture the mood and unique offerings of this space. Scan a few books to help activate AI narrative for this library and bring its story to life!"}
        </p>
        <div className="mt-auto flex flex-wrap gap-2">
          <Link href={`/libs/${existingLibrary.id}`} className="btn btn-neutral rounded-full">
            <QrCodeIcon className="h-5 w-5" aria-hidden="true" />
            Scan books
          </Link>
          <Link href={`/browse/${existingLibrary.id}`} className="btn btn-primary rounded-full">
            View Catalog
          </Link>
        </div>
      </div>
    </article>
  );
};
