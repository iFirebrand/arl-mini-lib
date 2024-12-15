"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { checkIfLocationMatches } from "../../../components/maps/checkIfLocationMatches";
import Scan from "./App";
import { EarnPoints } from "./EarnPoints";
import { fetchBookData } from "./fetchBookData";
import { saveBookToDatabase } from "./saveBookToDatabase";
import { toast } from "react-hot-toast";

interface LibraryClientProps {
  library: {
    id: string;
    locationName: string;
    latitude: number;
    longitude: number;
  } | null;
}

interface BookInfo {
  title: string;
  authors: string;
  thumbnail: string;
  description: string;
  isbn13: string;
  itemInfo: string;
  libraryId: string;
}

export default function LibraryClient({ library }: LibraryClientProps) {
  const [isAtLibrary, setIsAtLibrary] = useState(false);
  const [scannedBooks, setScannedBooks] = useState<BookInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const getPosition = (): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
    };

    const checkLocation = async () => {
      try {
        if (library) {
          const position = await getPosition();
          setIsAtLibrary(
            checkIfLocationMatches({
              libraryLatitude: library.latitude,
              libraryLongitude: library.longitude,
              userLatitude: position.coords.latitude,
              userLongitude: position.coords.longitude,
            }),
          );
        }
      } catch (error) {
        console.error("Geolocation error:", error);
      }
    };

    checkLocation();
  }, [library]);

  const handleScan = async (isbn: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      if (!library) return;
      const bookData: BookInfo | null = await fetchBookData(isbn, library.id);

      if (!bookData) {
        toast.error("Book not found");
        return;
      }

      await saveBookToDatabase(bookData);
      setScannedBooks(prev => [...prev, bookData]);
      toast.success("Book added successfully!");
    } catch (error) {
      toast.error("Error processing book");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!library) return <div>Library not found</div>;

  return (
    <div className="flex flex-col items-center gap-y-5 pt-24 text-center px-[5%]">
      <h1 className="text-2xl font-semibold">Add to catalog at {library.locationName} library</h1>
      {isAtLibrary ? (
        <div>
          <Scan onScan={handleScan} />
          <div className="flex flex-col items-center gap-y-5 pt-24 text-center px-[5%]">
            <h1 className="text-2xl font-semibold">Scanned Books: {scannedBooks.length} </h1>
            {scannedBooks.map((book, index) => (
              <div key={index}>
                <h2>{book.title}</h2>
              </div>
            ))}
            {scannedBooks.length === 0 && <EarnPoints />}
          </div>
        </div>
      ) : (
        <div className="flex justify-center w-full">
          <div className="card bg-base-100 max-w-96 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">You must be at the library to scan</h2>
              <p>The scanning feature is activated when you are about 30 feet from the library.</p>
              <div className="card-actions justify-end">
                <Link href="/" className="btn btn-primary">
                  Back to Home
                </Link>
              </div>
            </div>
            <div className="card-body">
              <h2 className="card-title">Or try troubleshooting</h2>
              <p>
                Is precise location enabled on your phone? 📲 Settings {">"} General {">"} Privacy {">"} Location
                Services {">"} Chrome or Safari {">"} Allow Location Access While Using App {">"} Precise location 😮‍💨
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
