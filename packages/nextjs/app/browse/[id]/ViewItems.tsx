"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getItemsByLibraryId } from "../../../actions/actions";

export default function ViewItems({ libraryId }: { libraryId: string }) {
  const [items, setItems] = useState<Array<{ title: string; coverUrl: string }>>([]);
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
        <tbody>
          {/* Dynamic rows from items */}
          {items.map((item, index) => (
            <tr key={index}>
              <td>
                <div className="flex items-center gap-3">
                  <div className="avatar">
                    <div className="h-20 w-16">
                      <Image src={item.coverUrl} alt={item.title} width={80} height={120} className="object-cover" />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold">{item.title}</div>
                  </div>
                </div>
              </td>
              <td>last scan to be updated</td>
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
    </div>
  );
}