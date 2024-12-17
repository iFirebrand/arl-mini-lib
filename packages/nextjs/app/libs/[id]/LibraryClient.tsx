"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { checkIfLocationMatches } from "../../../components/maps/checkIfLocationMatches";
import Scan from "./App";
import { EarnPoints } from "./EarnPoints";
import { fetchBookData } from "./fetchBookData";
import { saveBookToDatabase } from "./saveBookToDatabase";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import { useBankedPoints } from "~~/app/contexts/BankedPointsContext";
import { usePoints } from "~~/app/contexts/PointsContext";
import { handlePoints } from "~~/app/utils/points/handlePoints";

interface LibraryClientProps {
  library: {
    id: string;
    locationName: string;
    latitude: number;
    longitude: number;
  } | null;
  isbn13s: { updatedAt: Date; isbn13: string }[];
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

export default function LibraryClient({ library, isbn13s }: LibraryClientProps) {
  const [isAtLibrary, setIsAtLibrary] = useState(false);
  const [scannedBooks, setScannedBooks] = useState<BookInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [bookRecencyBonus, setBookRecencyBonus] = useState(0);
  const [newBookPoints, setNewBookPoints] = useState(0);

  const { address } = useAccount();
  const { addPoints } = usePoints();
  const { setBankedPointsTotal } = useBankedPoints();

  const addPointsForBook = (amount: number) => {
    handlePoints(address, amount, "ADD_BOOK", addPoints, setBankedPointsTotal);
  };

  const failedAttemptsBonusThreshold = 10;
  const handleAddPointsForBook = () => {
    let totalPoints = 0;
    if (failedAttempts === failedAttemptsBonusThreshold) {
      totalPoints = totalPoints + 5;
    } else if (scannedBooks.length === 2) {
      totalPoints = 20;
    } else if (scannedBooks.length === 3) {
      totalPoints = 30;
    }
    totalPoints = totalPoints + bookRecencyBonus;
    addPointsForBook(totalPoints);
  };

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
    console.log(isbn13s);
  }, [library, isbn13s]);

  const handleScan = async (isbn: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      if (!library) return;
      const bookData: BookInfo | null = await fetchBookData(isbn, library.id);

      if (!bookData) {
        setFailedAttempts(prev => prev + 1);
        toast.error("Not found. Try again? Newer books only for now.");
        return;
      }

      if (scannedBooks.some(book => book.isbn13 === bookData.isbn13)) {
        toast.error("Book already scanned. Try another.");
        return;
      }

      let bookRecencyStatus = 0;
      const scannedBook = isbn13s.find(book => book.isbn13 === bookData.isbn13);
      if (scannedBook) {
        const timeDifference = new Date().getTime() - new Date(scannedBook.updatedAt).getTime();
        const daysDifference = timeDifference / (1000 * 3600 * 24);
        if (daysDifference >= 1 && daysDifference <= 7) {
          bookRecencyStatus = 1;
        } else if (daysDifference >= 8 && daysDifference <= 14) {
          bookRecencyStatus = 2;
        } else if (daysDifference >= 15 && daysDifference <= 21) {
          bookRecencyStatus = 3;
        } else if (daysDifference >= 22 && daysDifference <= 28) {
          bookRecencyStatus = 4;
        } else if (daysDifference > 29) {
          bookRecencyStatus = 5;
        }
      } else {
        setNewBookPoints(5);
      }
      setBookRecencyBonus(bookRecencyStatus);

      await saveBookToDatabase(bookData);
      setScannedBooks(prev => [...prev, bookData]);

      handleAddPointsForBook();

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
            {
              <EarnPoints
                failedAttempts={failedAttempts}
                failedAttemptsBonusThreshold={failedAttemptsBonusThreshold}
                bookRecencyBonus={bookRecencyBonus}
                newBookPoints={newBookPoints}
                booksScanned={scannedBooks.length}
              />
            }
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
