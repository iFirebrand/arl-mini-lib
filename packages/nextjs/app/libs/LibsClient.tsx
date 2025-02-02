"use client";

import React from "react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { checkLibraryExists, createLibrary } from "../../actions/actions";
import { AddLibraryForm } from "../../components/forms/AddLibraryForm";
import { handleGeoLocation } from "../../components/maps/handleGeoLocation";
import { useBankedPoints } from "../contexts/BankedPointsContext";
import { usePoints } from "../contexts/PointsContext";
import { handlePoints } from "../utils/points/handlePoints";
import confetti from "canvas-confetti";
import { useAccount } from "wagmi";
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

export default function LibsClient() {
  const { address } = useAccount();
  const { addPoints } = usePoints();
  const { setBankedPointsTotal } = useBankedPoints();
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(false);
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const [libraryExists, setLibraryExists] = useState<boolean>(false);
  const [existingLibrary, setExistingLibrary] = useState<ExistingLibrary | null>(null);
  const [isGeolocationRequested, setIsGeolocationRequested] = useState(false);

  // Dynamically import the Map component to avoid SSR issues
  const Map = dynamic(() => import("../../components/maps/Map"), { ssr: false });

  const handleConfettiAction = () => {
    // Fire the confetti with options
    confetti({
      particleCount: 600,
      spread: 180,
      startVelocity: 400,
      decay: 0.5,
      scalar: 1.2,
      origin: { y: 0.5, x: 0.5 }, // Position the confetti to start lower on the screen
    });
  };

  useEffect(() => {
    // Get URL parameters on the client side
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get("latitude");
    const long = urlParams.get("longitude");

    if (lat && long) {
      setLatitude(lat);
      setLongitude(long);
      setIsGeolocationAvailable(true);
    }

    // Check if the library already exists based on the location name
    const checkExistingLibrary = async () => {
      if (latitude && longitude) {
        const result = await checkLibraryExists(latitude, longitude);
        if (result === "not found") {
          setLibraryExists(false);
          setExistingLibrary(null);
        } else {
          setLibraryExists(true);
          setExistingLibrary(result as ExistingLibrary);
        }
      }
    };

    checkExistingLibrary(); // Call the function to check for existing library
  }, [latitude, longitude]); // Add latitude and longitude as dependencies

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!formData.get("locationName")) {
      alert("Location Name is required.");
      return;
    }

    try {
      const newLibrary = await createLibrary(formData);
      handlePoints(address, 50, "CREATE_LIBRARY", addPoints, setBankedPointsTotal);

      if (newLibrary.id) {
        // handleConfettiAction();
        window.location.href = `/profile?libraryId=${newLibrary.id}`;
      }
    } catch (error) {
      console.error("Error creating library:", error);
      alert("Failed to create library. Please try again.");
    }
  };

  const handleGeoLocationClick = () => {
    setIsGeolocationRequested(true);
    handleGeoLocation("/libs");
  };

  return (
    <>
      {libraryExists && existingLibrary && (
        <div className="text-center">
          <ShowLibraryCard existingLibrary={existingLibrary} />
        </div>
      )}
      {!libraryExists && isGeolocationAvailable && (
        <>
          {handleConfettiAction()}
          <h1 className="text-xl font-semibold text-center">New library discovered. Add it!</h1>
        </>
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
            <a className="link" href="/browse">
              browse
            </a>{" "}
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
