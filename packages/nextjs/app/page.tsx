"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { InformationCircleIcon, MapIcon } from "@heroicons/react/24/outline";
import { handleGeoLocation } from "~~/components/maps/handleGeoLocation";

const Home: NextPage = () => {
  const [isGeolocationRequested, setIsGeolocationRequested] = useState(false);

  const handleGeoLocationClick = () => {
    setIsGeolocationRequested(true);
    handleGeoLocation("/libs");
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-2">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-4xl font-bold">Arlington Mini Libraries</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            <p className="my-2 font-medium">Discover, view books, curate, get points</p>
          </div>
          <div className="w-full max-w-3xl mx-auto mt-8 px-4">
            <div className="aspect-w-9 aspect-h-19">
              <iframe
                className="w-full h-full rounded-lg"
                src="https://www.youtube.com/embed/EH-OhAvPn_g?autoplay=0"
                title="Arlington Mini Libraries Introduction"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <p></p>
          </div>

          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <span className="loading loading-ring loading-lg"></span>
              <p className="mb-2">In front of a library? </p>
              <button className="btn btn-accent mt-4" onClick={handleGeoLocationClick}>
                {isGeolocationRequested ? (
                  <>
                    Getting Location <span className="loading loading-ring loading-lg"></span>
                  </>
                ) : (
                  "Enable Geolocation"
                )}
              </button>
              <p className="mt-2">Browser location service must be enabled in settings</p>
            </div>

            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MapIcon className="h-8 w-8 fill-secondary" />
              <p className="mb-2">See all mapped libraries</p>
              <a href="/browse" className="btn btn-accent mt-4">
                Browse Libs
              </a>
              <p className="mt-2">This list is updated in real-time as people add libraries</p>
            </div>

            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <InformationCircleIcon className="h-8 w-8 fill-secondary" />
              <p className="mb-2">About ARLib.me</p>
              <a href="/about" className="btn btn-accent mt-4">
                Learn More
              </a>
              <p className="mt-2">Why? Catalog. Map. Sponsor. Quests & points.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
