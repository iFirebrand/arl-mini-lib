"use client";

import { HomeIcon } from "@heroicons/react/24/outline";

export default function Browse() {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <HomeIcon className="h-8 w-8 fill-secondary" />
            </div>
            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
              <p className="my-2 font-medium">
                This page is finding its meaning still. Will be used to browse books in libraries.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
