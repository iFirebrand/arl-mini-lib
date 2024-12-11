"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { checkLibraryExists, createLibrary } from "../../actions/actions";
import { handleGeoLocation } from "../../components/maps/handleGeoLocation";

type Library = {
  id: string;
  locationName: string;
};

interface LibsClientProps {
  libraries: Library[];
  librariesCount: number;
}

export default function LibsClient({ libraries, librariesCount }: LibsClientProps) {
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(false);
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const [libraryExists, setLibraryExists] = useState<boolean>(false);
  const [existingLibraryName, setExistingLibraryName] = useState<string | null>(null);

  // Dynamically import the Map component to avoid SSR issues
  const Map = dynamic(() => import("../../components/maps/Map"), { ssr: false });

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
        const exists = await checkLibraryExists(latitude, longitude); // Call the function to check existence
        if (exists == "an undiscovered 🤩") {
          setLibraryExists(false);
        } else {
          setLibraryExists(true);
          setExistingLibraryName(`${exists}`); // Set the existing library name
        }
      }
    };

    checkExistingLibrary(); // Call the function to check for existing library
  }, [latitude, longitude]); // Add latitude and longitude as dependencies

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission
    const formData = new FormData(event.currentTarget); // Use event.currentTarget instead of event.target

    // Basic validation
    if (!formData.get("locationName")) {
      alert("Location Name is required."); // Simple alert for validation
      return;
    }

    try {
      // Call createLibrary with form data
      await createLibrary(formData);
      window.location.reload(); // Reload the page after successful submission
    } catch (error) {
      console.error("Error creating library:", error); // Log error for debugging
      alert("Failed to create library. Please try again."); // Notify user of failure
    }
  };

  const handleGeoLocationClick = () => {
    handleGeoLocation("/libs");
  };

  return (
    <>
      {libraryExists &&
        existingLibraryName && ( // Display existing library name if it exists
          <h1 className="text-2xl font-semibold text-center">You are at {existingLibraryName} library</h1>
        )}
      {!libraryExists && isGeolocationAvailable && (
        <h1 className="text-xl font-semibold text-center">You discovered a new library. Book it!</h1>
      )}
      {isGeolocationAvailable ? (
        <div className="container mx-auto">
          <div id="map" style={{ height: "33vh", width: "75%" }}>
            <Map latitude={latitude} longitude={longitude} />
          </div>
        </div>
      ) : (
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold">Please enable geolocation to identify a library</h2>
          <p className="text-sm">
            {" "}
            Or you can just {""}
            <a href={`/browse}`} className="btn btn-accent">
              browse
            </a>{" "}
            {""} the map to find your library.
          </p>
        </div>
      )}
      {!isGeolocationAvailable && (
        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
              <p className="my-2 font-medium"></p>
              <button className="btn btn-accent mt-4" onClick={handleGeoLocationClick}>
                Enable Geolocation
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="flex flex-col items-center gap-y-5 pt-24 text-center">
        <h1 className="text-3xl font-semibold">Discovered Mini Libraries ({librariesCount})</h1>
        <ul className="border-t border-b border-black/10 py-5 leading-8">
          {libraries.map(library => (
            <li key={library.id} className="flex flex-col items-center justify-center px-5">
              <span className="text-lg font-semibold">{library.locationName}</span>
              <div className="flex gap-4 mt-4">
                <a href={`/libs/${library.id}`} className="btn btn-accent">
                  Add Books
                </a>
                <a href={`/browse/${library.id}`} className="btn btn-accent">
                  Browse
                </a>
              </div>
              {/* {library.id} */}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-col gap-y-2 w-[300px]">
          <input
            type="text"
            name="locationName"
            placeholder="Discover a new library to name it!"
            className="px-2 py-1 rounded-sm"
          />
          <input type="hidden" id="latitude" name="latitude" value={isGeolocationAvailable ? (latitude ?? "") : ""} />
          <input
            type="hidden"
            id="longitude"
            name="longitude"
            value={isGeolocationAvailable ? (longitude ?? "") : ""}
          />
          <button
            type="submit"
            className={`bg-blue-500 py-2 text-white rounded-sm ${libraryExists || !isGeolocationAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={libraryExists || !isGeolocationAvailable} // Disable button if library exists or geolocation is not available
          >
            Add Library
          </button>
          {!isGeolocationAvailable && <p className="text-red-500">Enable geolocation please.</p>}
        </form>
      </main>
    </>
  );
}
