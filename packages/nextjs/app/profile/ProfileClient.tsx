"use client";

import React from "react";
import { useEffect, useState } from "react";
import { getLibraryData } from "../../actions/actions";
import { ShowLibraryCard } from "~~/components/minilibs/ShowLibraryCard";

type ExistingLibrary = {
  locationName: string;
  id: string;
  imageUrl: string | null;
  active: boolean;
  latitude: number;
  longitude: number;
};

export default function ProfileClient() {
  const [existingLibrary, setExistingLibrary] = useState<ExistingLibrary | null>(null);

  useEffect(() => {
    // Get URL parameters on the client side
    const urlParams = new URLSearchParams(window.location.search);
    const urlLibraryId = urlParams.get("libraryId");

    if (urlLibraryId) {
      // Fetch library data
      const fetchLibraryData = async () => {
        try {
          const result = await getLibraryData(urlLibraryId);
          setExistingLibrary(result as ExistingLibrary);
        } catch (error) {
          console.error("Error fetching library data:", error);
        }
      };

      fetchLibraryData();
    }
  }, []);

  return (
    <>
      <main>
        <div className="text-center">
          <ShowLibraryCard existingLibrary={existingLibrary} />
        </div>
      </main>
    </>
  );
}
