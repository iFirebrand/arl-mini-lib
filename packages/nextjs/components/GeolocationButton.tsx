"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPinIcon } from "@heroicons/react/24/solid";
import { handleGeoLocation } from "~~/components/maps/handleGeoLocation";

// Asks for the phone's position, then opens /libs, which finds the library there or offers to add it.
export const GeolocationButton = ({
  label = "I'm at a library",
  className = "",
}: {
  label?: string;
  className?: string;
}) => {
  const router = useRouter();
  const [requested, setRequested] = useState(false);

  return (
    <button
      type="button"
      className={`btn btn-neutral rounded-full px-6 ${className}`}
      onClick={() => {
        setRequested(true);
        handleGeoLocation("/libs", url => router.push(url));
      }}
    >
      {requested ? (
        <span className="loading loading-spinner loading-sm" aria-hidden="true" />
      ) : (
        <MapPinIcon className="h-5 w-5" aria-hidden="true" />
      )}
      {requested ? "Finding you…" : label}
    </button>
  );
};
