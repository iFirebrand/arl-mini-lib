"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { checkIfLocationMatches } from "../../../components/maps/checkIfLocationMatches";
import Scan from "./App";
import { Award, EarnPoints } from "./EarnPoints";
import { fetchBookData } from "./fetchBookData";
import { saveBookToDatabase } from "./saveBookToDatabase";
import { getBookRecencyBonus } from "./scoring";
import Confetti from "react-dom-confetti";
import { toast } from "react-hot-toast";
import { confirmBookInLibrary } from "~~/actions/actions";
import { useAccountContext } from "~~/app/contexts/AccountContext";

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

// Matches MULTIPLIER_AFTER on the server: new books after the first three in a visit earn double.
const MULTIPLIER_AFTER = 3;

export default function LibraryClient({ library, isbn13s }: LibraryClientProps) {
  const [isAtLibrary, setIsAtLibrary] = useState(false);
  const [scannedBooks, setScannedBooks] = useState<BookInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBookTitle, setCurrentBookTitle] = useState("");
  // Everything below comes from the server's response; the browser never decides points.
  const [lastAward, setLastAward] = useState<Award | null>(null);
  const [pointsThisVisit, setPointsThisVisit] = useState(0);
  const [newBooksThisVisit, setNewBooksThisVisit] = useState(0);
  const { account, refresh, setPoints } = useAccountContext();

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

  const handleConfettiAction = () => {
    setIsExploding(true);
    setTimeout(() => {
      setIsExploding(false);
    }, 3000);
  };

  const recordAward = (kind: Award["kind"], points: number, total?: number) => {
    setLastAward({ kind, points });
    if (points <= 0) return;
    setPointsThisVisit(previous => previous + points);
    // The first award creates the account; load it so the header shows it.
    if (account && total !== undefined) setPoints(total);
    else refresh();
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
  }, [library, isbn13s]);

  const handleScan = async (isbn: string) => {
    if (isProcessing || isLoading) return;

    setIsProcessing(true);
    setIsLoading(true);
    setLastAward(null);

    try {
      if (!library) return;
      const bookData: BookInfo | null = await fetchBookData(isbn, library.id);

      if (!bookData) {
        toast.error("Not found. Try again? Newer books only for now.");
        return;
      }

      setCurrentBookTitle(bookData.title);

      const alreadyScanned = scannedBooks.some(book => book.isbn13 === bookData.isbn13);
      const inLibrary = isbn13s.find(book => book.isbn13 === bookData.isbn13);

      if (alreadyScanned || (inLibrary && getBookRecencyBonus(inLibrary.updatedAt) === 0)) {
        toast("No more updates needed for this book.", {
          icon: "ℹ️",
        });
        return;
      }

      if (inLibrary) {
        // The library already has this book; confirming it's still on the shelf earns a bonus.
        const result = await confirmBookInLibrary(library.id, bookData.isbn13);
        if (!result.confirmed) {
          throw new Error("Could not confirm book");
        }
        recordAward("recency", result.pointsAwarded, result.total);
        setScannedBooks(prev => [...prev, bookData]);
        toast.success("Thanks for confirming this book is still here!");
        return;
      }

      const award = await saveBookToDatabase(bookData);
      setScannedBooks(prev => [...prev, bookData]);
      if (award) {
        setNewBooksThisVisit(award.newBooksThisVisit);
        recordAward("new", award.pointsAwarded, award.total);
        handleConfettiAction();
      }

      toast.success("Book added successfully!");
    } catch {
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

            <EarnPoints
              lastAward={lastAward}
              pointsThisVisit={pointsThisVisit}
              newBooksThisVisit={newBooksThisVisit}
              multiplierAfter={MULTIPLIER_AFTER}
            />
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
