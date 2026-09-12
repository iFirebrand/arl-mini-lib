"use client";

import React from "react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkLibraryExists, createLibrary } from "../../actions/actions";
import { AddLibraryForm } from "../../components/forms/AddLibraryForm";
import { handleGeoLocation } from "../../components/maps/handleGeoLocation";
import confetti from "canvas-confetti";
import { ShowLibraryCard } from "~~/components/minilibs/ShowLibraryCard";

type ExistingLibrary = {
  locationName: string;
  id: string;
  imageUrl: string | null;
  active: boolean;
  latitude: number;
  longitude: number;
  description: string | null;
  updatedAt: Date;
  createdAt: Date;
};

// Leaflet needs the browser. Defined once here: creating it inside the component would remount
// the map on every render.
const Map = dynamic(() => import("../../components/maps/Map"), { ssr: false });

const celebrateNewLibrary = () => {
  confetti({
    particleCount: 600,
    spread: 180,
    startVelocity: 400,
    decay: 0.5,
    scalar: 1.2,
    origin: { y: 0.5, x: 0.5 }, // Position the confetti to start lower on the screen
  });
};

// latitude and longitude come from the URL (see app/libs/page.tsx).
export default function LibsClient({ latitude, longitude }: { latitude: string | null; longitude: string | null }) {
  const router = useRouter();
  const isGeolocationAvailable = Boolean(latitude && longitude);
  const [libraryExists, setLibraryExists] = useState<boolean>(false);
  const [existingLibrary, setExistingLibrary] = useState<ExistingLibrary | null>(null);
  const [isGeolocationRequested, setIsGeolocationRequested] = useState(false);

  useEffect(() => {
    if (!latitude || !longitude) return;
    let active = true;
    // Is there already a library at this spot?
    checkLibraryExists(latitude, longitude).then(result => {
      if (!active) return;
      if (result === "not found") {
        setLibraryExists(false);
        setExistingLibrary(null);
        celebrateNewLibrary();
      } else {
        setLibraryExists(true);
        setExistingLibrary(result as ExistingLibrary);
      }
    });
    return () => {
      active = false;
    };
  }, [latitude, longitude]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!formData.get("locationName")) {
      alert("Location Name is required.");
      return;
    }

    try {
      const newLibrary = await createLibrary(formData);
      if (!("id" in newLibrary)) {
        alert(newLibrary.error ?? "Failed to create library. Please try again.");
        return;
      }

      // The server awarded the points with the library; the next page shows the new total.
      router.push(`/profile?libraryId=${newLibrary.id}`);
    } catch (error) {
      console.error("Error creating library:", error);
      alert("Failed to create library. Please try again.");
    }
  };

  const handleGeoLocationClick = () => {
    setIsGeolocationRequested(true);
    handleGeoLocation("/libs", url => router.push(url));
  };

  return (
    <>
      {libraryExists && existingLibrary && (
        <div className="text-center">
          <ShowLibraryCard existingLibrary={existingLibrary} />
        </div>
      )}
      {!libraryExists && isGeolocationAvailable && (
        <h1 className="text-xl font-semibold text-center">New library discovered. Add it!</h1>
      )}
      {isGeolocationAvailable ? (
        <div className="container mx-auto">
          <div id="map" style={{ height: "33vh", width: "100%", position: "relative", zIndex: 10 }}>
            <Map latitude={latitude} longitude={longitude} />
          </div>
        </div>
      ) : (
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold">Please enable geolocation to identify a library</h2>
          <p className="text-sm">
            {" "}
            Or you can {""}
            <Link className="link" href="/browse">
              browse
            </Link>{" "}
            {""} the map to find a discovered library
          </p>
        </div>
      )}
      {!isGeolocationAvailable && (
        <div className="bg-base-300 w-full py-6">
          <div className="flex justify-center">
            <button className="btn btn-accent" onClick={handleGeoLocationClick}>
              {isGeolocationRequested ? (
                <>
                  Getting Location <span className="loading loading-ring loading-lg"></span>
                </>
              ) : (
                "Enable Geolocation"
              )}
            </button>
          </div>
        </div>
      )}
      <main className="flex flex-col items-center gap-y-5 pt-24 text-center">
        {!libraryExists && isGeolocationAvailable && (
          <>
            <AddLibraryForm
              isGeolocationAvailable={isGeolocationAvailable}
              latitude={latitude}
              longitude={longitude}
              libraryExists={libraryExists}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </main>
    </>
  );
}
