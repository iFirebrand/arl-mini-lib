"use client";

import { useState } from "react";
import { handleGeoLocation } from "../components/maps/handleGeoLocation";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { HomeIcon, MapIcon } from "@heroicons/react/24/outline";

const Home: NextPage = () => {
  const [isGeolocationRequested, setIsGeolocationRequested] = useState(false);
  useAccount();

  const handleGeoLocationClick = () => {
    setIsGeolocationRequested(true);
    handleGeoLocation("/libs");
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-4xl font-bold">Arlington Mini Libraries</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            <p className="my-2 font-medium">Discover libs, their contents, and curate them</p>
          </div>
        </div>

        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MapIcon className="h-8 w-8 fill-secondary" />
              <p className="mb-2">See all mapped libraries</p>
              <a href="/browse" className="btn btn-accent mt-4">
                Browse Libs
              </a>
              <p className="mt-2">This list is updated in real-time as people add libraries</p>
            </div>

            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <HomeIcon className="h-8 w-8 fill-secondary" />
              <p className="mb-2">In front of a library? </p>
              <button className="btn btn-accent mt-4" onClick={handleGeoLocationClick}>
                {isGeolocationRequested ? (
                  <>
                    📡 Getting Location <span className="loading loading-spinner loading-xs"></span>
                  </>
                ) : (
                  "Enable Geolocation"
                )}
              </button>
              <p className="mt-2">Browser location service must be enabled in settings</p>
            </div>

            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
              <div className="card bg-base-100 shadow-lg p-6 max-w-md">
                <p className="text-lg font-semibold text-center">
                  Discover the hidden gems in your neighborhood! ARLib makes it easy to find, catalog, and share mini
                  libraries near you. Use your phone to map libraries, scan books, and explore what is available—all
                  while building a community of readers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
