"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { InformationCircleIcon, MapIcon } from "@heroicons/react/24/outline";

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
        <div className="container mx-auto">
          <div className="overflow-x-auto">
            <table className="table">
              <tbody>
                {/* Dynamic rows from libraries */}
                {libraries.map(library => (
                  <tr key={library.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar">
                          <div className="mask mask-squircle h-12 w-12">
                            <InformationCircleIcon className="h-12 w-12" />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold">
                            {library.locationName.length > 50
                              ? `${library.locationName.substring(0, 50)}...`
                              : library.locationName}
                          </div>
                          <div className="text-sm opacity-50">{library.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>onboarding</td>
                    <td>
                      <a href={`http://localhost:3000/browse/${library.id}`} className="btn btn-accent">
                        Browse Books
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
