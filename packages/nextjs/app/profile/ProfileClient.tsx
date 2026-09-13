"use client";

import React from "react";
import { useEffect, useState } from "react";
import { getLibraryData } from "../../actions/actions";
import { ShowLibraryCard } from "~~/components/minilibs/ShowLibraryCard";
import { Container } from "~~/components/ui/Page";

type ExistingLibrary = {
  locationName: string;
  id: string;
  imageUrl: string | null;
  active: boolean;
  latitude: number;
  longitude: number;
  description: string | null;
};

// Where you land after adding a library (?libraryId=…).
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
          if (result !== "not found") setExistingLibrary(result);
        } catch (error) {
          console.error("Error fetching library data:", error);
        }
      };

      fetchLibraryData();
    }
  }, []);

  return (
    <Container className="py-8 sm:py-12">
      <ShowLibraryCard existingLibrary={existingLibrary} eyebrow="On the map" />
    </Container>
  );
}
