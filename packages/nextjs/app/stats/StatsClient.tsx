"use client";

import React from "react";
import { useEffect } from "react";
import Image from "next/image";
import { BlockieAvatar } from "../../components/scaffold-eth/BlockieAvatar";

// import { getLibraryData } from "../../actions/actions";

interface StatsClientProps {
  last50Books: {
    title: string;
    thumbnail: string;
    sourceURL: string;
    libraryId: string;
    libraryName: string;
    itemInfo: string;
  }[];
  totalBooks: number;
  totalLibraries: number;
  totalUsers: number;
  newLibrariesCount: number;
  topUsers: {
    id: string;
    walletAddress: string | null;
    points: number;
  }[];
}

export default function StatsClient({
  last50Books,
  totalBooks,
  totalLibraries,
  totalUsers,
  topUsers,
  newLibrariesCount,
}: StatsClientProps) {
  useEffect(() => {
    // Get URL parameters on the client side
    const urlParams = new URLSearchParams(window.location.search);
    const urlLibraryId = urlParams.get("libraryId");

    if (urlLibraryId) {
      // Fetch library data
      const fetchLibraryData = async () => {
        try {
          // TODO: fetch stats
        } catch (error) {
          console.error("Error fetching library data:", error);
        }
      };

      fetchLibraryData();
    }
  }, []);

  return (
    <main>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-center">Latest Stats</h1>
        </div>
        <div className="stats stats-vertical lg:stats-horizontal shadow">
          <div className="stat">
            <div className="stat-title">Total Books</div>
            <div className="stat-value text-center">{totalBooks}</div>
            <div className="stat-desc">across all libraries</div>
          </div>

          <div className="stat">
            <div className="stat-title">New Libraries </div>
            <div className="stat-value text-center">{newLibrariesCount}</div>
            <div className="stat-desc">in the last 7 days</div>
          </div>
          <div className="stat">
            <div className="stat-title">Total Libraries</div>
            <div className="stat-value text-center">{totalLibraries}</div>
            <div className="stat-desc">on ARLib.me</div>
          </div>

          <div className="stat">
            <div className="stat-title">Users With Wallets</div>
            <div className="stat-value text-center">{totalUsers}</div>
            <div className="stat-desc">Wallets keep points</div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p></p>
          <div className="text-center">
            <div
              className="tooltip tooltip-top"
              data-tip="When you login your points are automatically moved into in your wallet."
            >
              <h1 className="text-xl font-semibold text-center">Top 10 Users With Points in Their Wallets</h1>
            </div>
          </div>

          <div className="flex">
            <div className="overflow-x-auto">
              <table className="table">
                {/* head */}
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Dynamically generated rows from topUsers */}
                  {topUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>{user.walletAddress && <BlockieAvatar address={user.walletAddress} size={24} />}</td>
                      <td>{user.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Chat bubble container */}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-center">
            <p></p>
            <h1 className="text-xl font-semibold text-center">Last 50 Books Added</h1>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              {/* head */}
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Library Name</th>
                  {/* <th>Reserved</th>
                  <th>Reserved 2</th> */}
                </tr>
              </thead>
              <tbody>
                {/* Dynamically generated rows from last50Books */}
                {last50Books.map(book => (
                  <tr key={book.title}>
                    <td>
                      <a href={book.itemInfo} target="_blank" rel="noopener noreferrer">
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="mask mask-squircle h-12 w-12">
                              <Image
                                src={book.thumbnail}
                                alt={`Thumbnail of ${book.title}`}
                                width={48}
                                height={48}
                                onError={e => {
                                  e.currentTarget.src =
                                    "https://dtmqxpohipopgolmirik.supabase.co/storage/v1/object/public/altbucket/ARLib.png";
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <a href={book.itemInfo} target="_blank" rel="noopener noreferrer" className="font-bold">
                              {book.title}
                            </a>
                          </div>
                        </div>
                      </a>
                    </td>
                    <td>
                      <a href={`/browse/${book.libraryId}`} className="text-blue-500 hover:underline">
                        {book.libraryName}
                      </a>
                    </td>
                    <td></td>
                    <th>{/* <button className="btn btn-ghost btn-xs">details</button> */}</th>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
