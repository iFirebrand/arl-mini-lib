"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { CurrencyDollarIcon, HomeIcon, MagnifyingGlassIcon, NewspaperIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            {/* <span className="block text-2xl mb-2">Arlib</span> */}
            <span className="block text-4xl font-bold">Arlington Mini Libraries</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            <p className="my-2 font-medium">Discover libs, their contents, or curate them</p>
          </div>

          {/* <p className="text-center text-lg">Get started by editing </p> */}
        </div>

        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <HomeIcon className="h-8 w-8 fill-secondary" />
              <p>
                Find{" "}
                <Link href="/libs" passHref className="link">
                  lib
                </Link>
              </p>
            </div>
            {/* <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <CurrencyDollarIcon className="h-8 w-8 fill-secondary" />
              <p>
                Your can sponsor seeding this{" "}
                <Link href="/about" passHref className="link">
                  site
                </Link>
              </p>
            </div> */}
            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
              <p className="my-2 font-medium">
                Discover the hidden gems in your neighborhood! ARLib makes it easy to find, catalog, and share mini
                libraries near you. Use your phone to map libraries, scan books, and explore what’s available—all while
                building a community of readers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
