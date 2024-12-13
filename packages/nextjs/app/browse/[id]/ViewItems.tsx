"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getItemsByLibraryId } from "../../../actions/actions";

export default function ViewItems({ libraryId }: { libraryId: string }) {
  const [items, setItems] = useState<Array<{ title: string; coverUrl: string; itemInfo: string; updatedAt: Date }>>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchItems = async () => {
      const newItems = await getItemsByLibraryId(libraryId, page);
      setItems(newItems);
    };
    fetchItems();
  }, [libraryId, page]);

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
                        <Image src={item.coverUrl} alt={item.title} width={80} height={120} className="object-cover" />
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
      <div className="flex justify-center items-center gap-4 mt-4">
        <button className="btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
          Previous
        </button>
        <button className="btn" onClick={() => setPage(p => p + 1)}>
          Next
        </button>
      </div>
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
        </div>
      </div>
    </div>
  );
}
