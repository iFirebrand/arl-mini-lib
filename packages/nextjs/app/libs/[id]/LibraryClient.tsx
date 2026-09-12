"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { checkIfLocationMatches } from "../../../components/maps/checkIfLocationMatches";
import Scan from "./App";
import { EarnPoints } from "./EarnPoints";
import { fetchBookData } from "./fetchBookData";
import { saveBookToDatabase } from "./saveBookToDatabase";
import { getBookRecencyBonus } from "./scoring";
import Confetti from "react-dom-confetti";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import { confirmBookInLibrary } from "~~/actions/actions";
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
  const [persistenceBonusAwarded, setPersistenceBonusAwarded] = useState(false);
  const [bookRecencyBonus, setBookRecencyBonus] = useState(0);
  const [newBookPoints, setNewBookPoints] = useState(0);
  const [currentBookTitle, setCurrentBookTitle] = useState("");
  const [level1MultiplierCount, setLevel1MultiplierCount] = useState(0);
  const [shouldAddPoints, setShouldAddPoints] = useState(false);
  const { address } = useAccount();
  const { addPoints } = usePoints();
  const { setBankedPointsTotal } = useBankedPoints();

  const [isExploding, setIsExploding] = useState(false);
  const targetRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);

  const config = {
    angle: 90, // Explodes straight upwards
    spread: 120, // Wider spread to resemble blooming petals
    startVelocity: 60, // Strong upward force
    elementCount: 150, // More confetti for a fuller effect
    dragFriction: 0.1, // Slower fall for a floaty effect
    duration: 4000, // Slightly longer for a dramatic bloom
    stagger: 0.05, // Faster successive particle release
    width: "10px", // Slightly smaller confetti for delicacy
    height: "10px",
    colors: ["#0057B7", "#FFDD00"],
  };

  useEffect(() => {
    if (newBookPoints === 5) {
      handleConfettiAction();
    }
  }, [newBookPoints]);

  const handleConfettiAction = () => {
    setIsExploding(true);
    setTimeout(() => {
      setIsExploding(false);
    }, 3000);
  };

  const addPointsForBook = useCallback(
    (amount: number) => {
      handlePoints(address, amount, "ADD_BOOK", addPoints, setBankedPointsTotal);
    },
    [address, addPoints, setBankedPointsTotal],
  );

  const level1MultiplierThreshold = 3;

  const failedAttemptsBonusThreshold = 10;

  const handleAddPointsForBook = useCallback(() => {
    let totalPoints = 0;

    // Awarded once per visit, with the first points earned after enough failed scans.
    if (failedAttempts >= failedAttemptsBonusThreshold && !persistenceBonusAwarded) {
      totalPoints += 5;
      setPersistenceBonusAwarded(true);
    }

    if (level1MultiplierCount <= level1MultiplierThreshold) {
      totalPoints += newBookPoints;
    } else {
      totalPoints += newBookPoints * 2;
    }

    totalPoints += bookRecencyBonus;

    addPointsForBook(Math.floor(Number(totalPoints)));
  }, [
    failedAttempts,
    persistenceBonusAwarded,
    level1MultiplierCount,
    newBookPoints,
    bookRecencyBonus,
    addPointsForBook,
  ]);

  useEffect(() => {
    if (shouldAddPoints) {
      handleAddPointsForBook();
      setShouldAddPoints(false);
    }
  }, [shouldAddPoints, handleAddPointsForBook]);

  useEffect(() => {
    console.log("State variables:", {
      failedAttempts,
      bookRecencyBonus,
      newBookPoints,
      level1MultiplierCount,
    });
  }, [failedAttempts, bookRecencyBonus, newBookPoints, level1MultiplierCount]);

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
  }, [library, isbn13s]);

  const handleScan = async (isbn: string) => {
    if (isProcessing || isLoading) return;

    setIsProcessing(true);
    setIsLoading(true);

    // Reset state variables
    setNewBookPoints(0);
    setBookRecencyBonus(0);

    try {
      if (!library) return;
      const bookData: BookInfo | null = await fetchBookData(isbn, library.id);

      if (!bookData) {
        setFailedAttempts(prev => prev + 1);
        toast.error("Not found. Try again? Newer books only for now.");
        return;
      }

      setCurrentBookTitle(bookData.title);

      const alreadyScanned = scannedBooks.some(book => book.isbn13 === bookData.isbn13);
      const inLibrary = isbn13s.find(book => book.isbn13 === bookData.isbn13);
      const recencyBonus = inLibrary ? getBookRecencyBonus(inLibrary.updatedAt) : 0;

      if (alreadyScanned || (inLibrary && recencyBonus === 0)) {
        toast("No more updates needed for this book.", {
          icon: "ℹ️",
        });
        return;
      }

      if (inLibrary) {
        // The library already has this book; reward confirming it's still on the shelf.
        if (!(await confirmBookInLibrary(library.id, bookData.isbn13))) {
          throw new Error("Could not confirm book");
        }
        setBookRecencyBonus(recencyBonus);
        setShouldAddPoints(true);
        setScannedBooks(prev => [...prev, bookData]);
        toast.success("Thanks for confirming this book is still here!");
        return;
      }

      // Points only once the book is saved.
      await saveBookToDatabase(bookData);
      setLevel1MultiplierCount(prev => prev + 1);
      setNewBookPoints(5);
      setShouldAddPoints(true);
      setScannedBooks(prev => [...prev, bookData]);

      toast.success("Book added successfully!");
    } catch (error) {
      toast.error("Error processing book");
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
    }
  };

  if (!library) return <div>Library not found</div>;

  return (
    <div className="flex flex-col items-center gap-y-5 pt-24 text-center px-[5%]">
      <h1 className="text-2xl font-semibold">Scan to catalog at {library.locationName} library</h1>
      {isAtLibrary ? (
        <div>
          <Scan onScan={handleScan} isLoading={isLoading} />
          <div ref={targetRef} className="flex flex-col items-center gap-y-5 pt-24 text-center px-[5%]">
            <h1 className="text-2xl font-semibold">Scanned Books: {scannedBooks.length} </h1>
            <div>
              <Confetti active={isExploding} config={config}></Confetti>
              <h2>{currentBookTitle}</h2>
            </div>

            {
              <EarnPoints
                failedAttempts={failedAttempts}
                failedAttemptsBonusThreshold={failedAttemptsBonusThreshold}
                bookRecencyBonus={bookRecencyBonus}
                newBookPoints={newBookPoints}
                booksScanned={scannedBooks.length}
                level1MultiplierCount={level1MultiplierCount}
                level1MultiplierThreshold={level1MultiplierThreshold}
              />
            }
          </div>
        </div>
      ) : (
        <div className="flex justify-center w-full">
          <div className="card bg-base-100 max-w-96 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">You must be at the library to scan</h2>
              <p>The scanning feature turns on when your phone&apos;s location shows you at the library.</p>
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
