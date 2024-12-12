"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Scan from "../../../app/scan/App";
import { checkIfLocationMatches } from "../../../components/maps/checkIfLocationMatches";

interface LibraryClientProps {
  library: {
    id: string;
    locationName: string;
    latitude: number;
    longitude: number;
  } | null;
}

export default function LibraryClient({ library }: LibraryClientProps) {
  const [isAtLibrary, setIsAtLibrary] = useState(false);

  useEffect(() => {
    const getPosition = (): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
    };

    const checkLocation = async () => {
      try {
        if (library) {
          const position = await getPosition();
          setIsAtLibrary(
            checkIfLocationMatches({
              libraryLatitude: library.latitude,
              libraryLongitude: library.longitude,
              userLatitude: position.coords.latitude,
              userLongitude: position.coords.longitude,
            }),
          );
        }
      } catch (error) {
        console.error("Geolocation error:", error);
      }
    };

    checkLocation();
  }, [library]);

  if (!library) return <div>Library not found</div>;

  return (
    <div className="flex flex-col items-center gap-y-5 pt-24 text-center">
      <h1 className="text-2xl font-semibold">Add to catalog at {library.locationName} library</h1>
      {isAtLibrary ? (
        <Scan libraryId={library.id} />
      ) : (
        <div className="flex justify-center">
          <div className="card bg-base-100 w-96 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">You must be at the library to scan</h2>
              <p>The scanning feature is activated when you are about 30 feet from the library.</p>
              <div className="card-actions justify-end">
                <Link href="/" className="btn btn-primary">
                  Back to Home
                </Link>
              </div>
            </div>
            <div className="card-body">
              <h2 className="card-title">Or try troubleshooting</h2>
              <p>
                Is precise location enabled on your phone? 📲 Settings {">"} General {">"} Privacy {">"} Location
                Services {">"} Chrome or Safari {">"} Allow Location Access While Using App {">"} Precise location 😮‍💨
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
