"use client";

import React from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getItemsByLibraryId } from "../../../actions/actions";

interface ViewItemsProps {
  libraryId: string;
  libraryData: {
    locationName: string;
    id: string;
    imageUrl: string | null;
    active: boolean;
    latitude: number;
    longitude: number;
    description: string | null;
  };
}

export default function ViewItems({ libraryId, libraryData }: ViewItemsProps) {
  const [items, setItems] = useState<Array<{ title: string; coverUrl: string; itemInfo: string; updatedAt: Date }>>([]);
  // const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchItems = async () => {
      // const newItems = await getItemsByLibraryId(libraryId, page);
      const newItems = await getItemsByLibraryId(libraryId);
      setItems(newItems);
    };
    fetchItems();
    // }, [libraryId, page]);
  }, [libraryId]);

  return (
    <div className="w-full flex flex-col gap-4">
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {/* Dynamic rows from items */}
          {items.map((item, index) => (
            <tr key={index}>
              <td>
                <div className="flex items-center gap-3">
                  <a
                    href={item.itemInfo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 hover:opacity-80"
                  >
                    <div className="avatar">
                      <div className="h-20 w-16">
                        <Image
                          src={
                            item.coverUrl && item.coverUrl !== "https://covers.openlibrary.org/b/id/-1-M.jpg"
                              ? item.coverUrl
                              : "https://dtmqxpohipopgolmirik.supabase.co/storage/v1/object/public/altbucket/ARLib.png"
                          }
                          alt={item.title}
                          width={80}
                          height={120}
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold">{item.title}</div>
                    </div>
                  </a>
                </div>
              </td>
              <td>
                🗓️ {""}
                {new Date(item.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "2-digit",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* <div className="flex justify-center items-center gap-4 mt-4">
        <button className="btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
          Previous
        </button>
        <button className="btn" onClick={() => setPage(p => p + 1)}>
          Next
        </button>
      </div> */}
      <div className="flex justify-center">
        <div className="card bg-base-100 w-96 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">🎉 You can improve the catalog!</h2>
            <p>
              Come to the library to add new or catalog existing books. Simply scan book barcodes with phone camera to
              refresh the catalog and earn points!
            </p>

            <div className="card-actions justify-end">
              <a href={`/libs/${libraryId}`} className="btn btn-primary">
                Add Books
              </a>
            </div>
          </div>
          <figure>
            <Image
              src={
                libraryData.imageUrl ||
                "https://dtmqxpohipopgolmirik.supabase.co/storage/v1/object/public/library-images/site-images/placeholder-library.jpeg?t=2024-12-15T15%3A45%3A04.162Z"
              }
              alt={`${libraryData.locationName} library image`}
              width={384}
              height={384}
              className="rounded-lg shadow-2xl"
            />
          </figure>
        </div>
      </div>
    </div>
  );
}
