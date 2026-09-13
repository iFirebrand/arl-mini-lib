"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Container } from "~~/components/ui/Page";
import { PLACEHOLDER_LIBRARY_IMAGE, safeImageSrc } from "~~/lib/media";

type Library = {
  id: string;
  locationName: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  bookCount: number;
};

interface BrowseClientProps {
  libraries: Library[];
  librariesCount: number;
}

// Leaflet needs the browser. Defined once here: creating it inside the component would remount
// the map on every render.
const BrowseMap = dynamic(() => import("../../components/maps/BrowseMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-base-300" />,
});

// Centered on Arlington.
const POSITION = [38.883839, -77.107249];

const books = (count: number) => (count === 1 ? "1 book" : `${count} books`);

export default function BrowseClient({ libraries, librariesCount }: BrowseClientProps) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? libraries.filter(library => library.locationName.toLowerCase().includes(needle)) : libraries;
  }, [libraries, query]);

  return (
    <Container className="flex flex-col gap-6 py-6 sm:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Discovered Mini Libraries ({librariesCount})
        </h1>
        <p className="text-base-content/75">
          Every little library people have mapped so far. Tap one to see which books are on its shelves.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div
          id="map"
          className="relative z-10 h-[45vh] min-h-[280px] overflow-hidden rounded-box border border-base-300/70 shadow-card lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]"
        >
          <BrowseMap libraries={libraries} position={POSITION} />
        </div>

        <div className="flex flex-col gap-3">
          <label className="input input-bordered flex items-center gap-2 rounded-full bg-base-100">
            <MagnifyingGlassIcon className="h-4 w-4 opacity-60" aria-hidden="true" />
            <input
              id="library-filter"
              type="search"
              className="grow"
              placeholder="Filter by name"
              value={query}
              onChange={event => setQuery(event.target.value)}
              aria-label="Filter libraries by name"
            />
          </label>
          {shown.length === 0 && <p className="px-2 text-base-content/70">No library matches “{query}”.</p>}
          <ul className="flex flex-col divide-y divide-base-300/70 overflow-hidden rounded-box border border-base-300/70 bg-base-100 shadow-card">
            {shown.map(library => (
              <li key={library.id} className="flex items-center gap-3 p-3">
                <Image
                  src={safeImageSrc(library.imageUrl, PLACEHOLDER_LIBRARY_IMAGE)}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-xl bg-base-300 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Link href={`/browse/${library.id}`} className="line-clamp-2 font-semibold hover:underline">
                    {library.locationName}
                  </Link>
                  <p className="text-sm text-base-content/65">{books(library.bookCount)}</p>
                </div>
                <Link href={`/browse/${library.id}`} className="btn btn-sm btn-primary rounded-full">
                  Browse Books
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  );
}
