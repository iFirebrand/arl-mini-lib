"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Container, PageHeader } from "~~/components/ui/Page";
import { PLACEHOLDER_LIBRARY_IMAGE, safeImageSrc } from "~~/lib/media";

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
  <article className="flex h-full flex-col overflow-hidden rounded-box border border-base-300/70 bg-base-100 shadow-card">
    <Image
      src={safeImageSrc(library.imageUrl, PLACEHOLDER_LIBRARY_IMAGE)}
      alt={`${library.locationName} library`}
      width={560}
      height={420}
      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
      className="aspect-4/3 h-auto w-full bg-base-300 object-cover"
    />
    <div className="flex flex-1 flex-col gap-3 p-5">
      <h2 className="text-2xl font-semibold leading-tight">{library.locationName}</h2>
      <p className="flex-1 leading-relaxed text-base-content/80">
        {library.description ||
          "This mini library could use a few more books in its online catalog to find its character. Scan a few next time you pass by."}
      </p>
      <Link href={`/browse/${library.id}`} className="btn btn-primary w-fit rounded-full">
        View Catalog
      </Link>
    </div>
  </article>
);

export default function PersonalityClient({
  totalLibraries,
  librariesWithDescriptionCount,
  libraryDescriptions,
}: PersonalityClientProps) {
  return (
    <Container className="pb-12">
      <PageHeader eyebrow="Libraries with character" title="Every shelf has a personality">
        {librariesWithDescriptionCount} of {totalLibraries} libraries have enough books cataloged to have one. A few
        scanned books is all it takes.
      </PageHeader>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {libraryDescriptions.map(library => (
          <LibraryItem key={library.id} library={library} />
        ))}
      </div>
    </Container>
  );
}
