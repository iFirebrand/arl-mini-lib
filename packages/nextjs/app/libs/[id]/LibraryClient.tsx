"use client";

import { useEffect, useState } from "react";
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
  const [userLocation, setUserLocation] = useState<GeolocationPosition | null>(null);
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
          setUserLocation(position);
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
      <h1 className="text-2xl font-semibold">{library.locationName}</h1>
      {isAtLibrary ? (
        <Scan libraryId={library.id} />
      ) : (
        <p>
          Physical presence in front of a library is required. You need to be within 20 feet of the library to scan
          books. Is precise location enabled? 📲 Settings {">"} General {">"} Privacy {">"} Location Services {">"}{" "}
          Chrome or Safari {">"} Allow Location Access While Using App {">"} Precise location. 😮‍💨
        </p>
      )}
    </div>
  );
}
