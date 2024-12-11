"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

type Library = {
  id: string;
  locationName: string;
  latitude: number;
  longitude: number;
};

interface LibsClientProps {
  libraries: Library[];
  librariesCount: number;
}

export default function BrowseClient({ libraries, librariesCount }: LibsClientProps) {
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(true);
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  // const [libraryExists, setLibraryExists] = useState<boolean>(false);

  // Dynamically import the Map component to avoid SSR issues
  const BrowseMap = dynamic(() => import("../../components/maps/BrowseMap"), { ssr: false });

  const position = [38.883839, -77.107249]; // Centered at the given latitude and longitude

  return (
    <>
      <main className="flex flex-col items-center gap-y-5 pt-24 text-center">
        <h1 className="text-3xl font-semibold">Discovered Mini Libraries ({librariesCount})</h1>

        <div className="container mx-auto">
          <div id="map" style={{ height: "33vh", width: "100%" }}>
            <BrowseMap libraries={libraries} position={position} />
          </div>
        </div>
        <ul className="border-t border-b border-black/10 py-5 leading-8">
          {libraries.map(library => (
            <li key={library.id} className="flex flex-col items-center justify-center px-5">
              <span className="text-lg font-semibold">{library.locationName}</span>
              <div className="flex gap-4 mt-4">
                <a href={`/browse/${library.id}`} className="btn btn-accent">
                  Browse
                </a>
              </div>
              {/* {library.id} */}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
