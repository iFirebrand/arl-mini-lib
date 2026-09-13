"use client";

import React from "react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkLibraryExists, createLibrary } from "../../actions/actions";
import { AddLibraryForm } from "../../components/forms/AddLibraryForm";
import confetti from "canvas-confetti";
import { toast } from "react-hot-toast";
import { MapPinIcon } from "@heroicons/react/24/outline";
import { GeolocationButton } from "~~/components/GeolocationButton";
import { ShowLibraryCard } from "~~/components/minilibs/ShowLibraryCard";
import { Container } from "~~/components/ui/Page";

type ExistingLibrary = {
  locationName: string;
  id: string;
  imageUrl: string | null;
  active: boolean;
  latitude: number;
  longitude: number;
  description: string | null;
};

// Leaflet needs the browser. Defined once here: creating it inside the component would remount
// the map on every render.
const Map = dynamic(() => import("../../components/maps/Map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-base-300" />,
});

const celebrateNewLibrary = () => {
  confetti({
    particleCount: 600,
    spread: 180,
    startVelocity: 400,
    decay: 0.5,
    scalar: 1.2,
    origin: { y: 0.5, x: 0.5 }, // Position the confetti to start lower on the screen
    colors: ["#0057B7", "#FFDD00", "#93BBFB"],
  });
};

// latitude and longitude come from the URL (see app/libs/page.tsx).
export default function LibsClient({ latitude, longitude }: { latitude: string | null; longitude: string | null }) {
  const router = useRouter();
  const isGeolocationAvailable = Boolean(latitude && longitude);
  // Until the server answers, we don't know whether this spot already has a library.
  const [status, setStatus] = useState<"checking" | "found" | "new">("checking");
  const [existingLibrary, setExistingLibrary] = useState<ExistingLibrary | null>(null);

  useEffect(() => {
    if (!latitude || !longitude) return;
    let active = true;
    // Is there already a library at this spot?
    checkLibraryExists(latitude, longitude)
      .then(result => {
        if (!active) return;
        if (result === "not found") {
          setExistingLibrary(null);
          setStatus("new");
          celebrateNewLibrary();
        } else {
          setExistingLibrary(result as ExistingLibrary);
          setStatus("found");
        }
      })
      .catch(() => {
        if (active) setStatus("new");
      });
    return () => {
      active = false;
    };
  }, [latitude, longitude]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!formData.get("locationName")) {
      toast.error("Give the library a name first.");
      return;
    }

    try {
      const newLibrary = await createLibrary(formData);
      if (!("id" in newLibrary)) {
        toast.error(newLibrary.error ?? "Failed to create library. Please try again.");
        return;
      }

      // The server awarded the points with the library; the next page shows the new total.
      router.push(`/profile?libraryId=${newLibrary.id}`);
    } catch (error) {
      console.error("Error creating library:", error);
      toast.error("Failed to create library. Please try again.");
    }
  };

  if (!isGeolocationAvailable) {
    return (
      <Container width="narrow" className="flex flex-col items-center gap-5 py-12 text-center sm:py-16">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-content">
          <MapPinIcon className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Please enable geolocation to identify a library</h1>
        <p className="max-w-md text-lg text-base-content/75">
          Standing at a mini library? Share your location and we&apos;ll find it on the map, or help you add it if
          it&apos;s new.
        </p>
        <GeolocationButton label="Use my location" className="btn-lg" />
        <p className="max-w-md text-sm text-base-content/65">
          If nothing happens, check that location is on for your browser: Settings › Privacy › Location Services ›
          Safari or Chrome › While Using the App, with Precise Location on.
        </p>
        <p className="text-base-content/75">
          Not at a library? You can{" "}
          <Link className="text-link underline" href="/browse">
            browse
          </Link>{" "}
          the map to find a discovered library.
        </p>
      </Container>
    );
  }

  if (status === "found" && existingLibrary) {
    return (
      <Container className="py-8 sm:py-12">
        <ShowLibraryCard existingLibrary={existingLibrary} eyebrow="You're at" />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-8 sm:py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {status === "checking" ? "Looking for a library here…" : "New library discovered. Add it!"}
        </h1>
        <p className="text-base-content/75">
          {status === "checking"
            ? "Checking the map around your location."
            : "Nobody has mapped a library at this spot yet. Two quick steps and it's on the map."}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div
          id="map"
          className="relative z-10 h-[35vh] min-h-[240px] overflow-hidden rounded-box border border-base-300/70 shadow-card lg:h-[440px]"
        >
          <Map latitude={latitude} longitude={longitude} />
        </div>
        {status === "new" && (
          <div className="rounded-box border border-base-300/70 bg-base-100 p-5 shadow-card sm:p-6">
            <AddLibraryForm
              isGeolocationAvailable={isGeolocationAvailable}
              latitude={latitude}
              longitude={longitude}
              libraryExists={false}
              onSubmit={handleSubmit}
            />
          </div>
        )}
      </div>
    </Container>
  );
}
