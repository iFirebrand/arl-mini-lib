"use client";

// Mark this component as a Client Component
import { useEffect, useState } from "react";
import Link from "next/link";
import { createLibrary } from "../../actions/actions";

export default function LibsClient({ libraries, librariesCount }) {
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

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
  }, []); // Empty dependency array to run only once on mount

  const handleSubmit = async event => {
    event.preventDefault(); // Prevent default form submission
    const formData = new FormData(event.target); // Get form data

    // Call createLibrary with form data
    await createLibrary(formData);
  };

  return (
    <>
      <div className="container mx-auto">Libs</div>
      <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
        <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            <p className="my-2 font-medium">{/* ... existing content ... */}</p>
            <button className="btn btn-accent mt-4">Add Library</button>
          </div>
        </div>
      </div>
      <main className="flex flex-col items-center gap-y-5 pt-24 text-center">
        <h1 className="text-3xl font-semibold">All Libraries ({librariesCount})</h1>
        <ul className="border-t border-b border-black/10 py-5 leading-8">
          {libraries.map(library => (
            <li key={library.id} className="flex items-center justify-between px-5">
              <Link href={`/libs/${library.id}`} className="underline">
                {library.locationName}
              </Link>{" "}
              {/* {library.id} */}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-col gap-y-2 w-[300px]">
          <input type="text" name="locationName" placeholder="Location Name" className="px-2 py-1 rounded-sm" />
          <input type="hidden" id="latitude" name="latitude" value={isGeolocationAvailable ? latitude : ""} />
          <input type="hidden" id="longitude" name="longitude" value={isGeolocationAvailable ? longitude : ""} />
          <button
            type="submit"
            className={`bg-blue-500 py-2 text-white rounded-sm ${isGeolocationAvailable ? "" : "opacity-50 cursor-not-allowed"}`}
            disabled={!isGeolocationAvailable}
          >
            Add Library
          </button>
          {!isGeolocationAvailable && (
            <p className="text-red-500">
              Geolocation must be enabled to take action. Try again.
              <button
                className="link"
                onClick={async () => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(position => {
                      const latitude = position.coords.latitude;
                      const longitude = position.coords.longitude;
                      window.location.href = `/libs?latitude=${latitude}&longitude=${longitude}`;
                    });
                  } else {
                    alert("Geolocation is not supported by this browser.");
                  }
                }}
              >
                via geolocation
              </button>
            </p>
          )}
        </form>
      </main>
    </>
  );
}
