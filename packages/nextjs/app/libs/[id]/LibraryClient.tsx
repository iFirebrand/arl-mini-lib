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
import { Container } from "~~/components/ui/Page";

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

  if (!library) {
    return (
      <Container width="narrow" className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">Library not found</h1>
        <p className="text-base-content/75">It may have been removed, or the link is incomplete.</p>
        <Link href="/browse" className="btn btn-primary rounded-full">
          See all libraries
        </Link>
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-6 sm:py-8">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-wider text-link">Scan to catalog</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{library.locationName}</h1>
      </div>

      {isAtLibrary ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="flex flex-col gap-3">
            <Scan onScan={handleScan} isLoading={isLoading} />
            <p className="text-sm text-base-content/65">
              Hold the barcode on the back of the book inside the frame, in good light. Books scan one at a time.
            </p>
          </div>

          <aside
            ref={targetRef}
            className="flex flex-col gap-4 rounded-box border border-base-300/70 bg-base-100 p-5 shadow-card lg:sticky lg:top-24"
          >
            <div>
              <Confetti active={isExploding} config={config}></Confetti>
              <h2 className="text-xl font-semibold">Scanned Books: {scannedBooks.length}</h2>
              {currentBookTitle && <p className="mt-1 text-base-content/75">Last: {currentBookTitle}</p>}
            </div>

            <EarnPoints
              lastAward={lastAward}
              pointsThisVisit={pointsThisVisit}
              newBooksThisVisit={newBooksThisVisit}
              multiplierAfter={MULTIPLIER_AFTER}
            />

            <Link href={`/browse/${library.id}`} className="text-sm font-medium text-link hover:underline">
              See this library&apos;s catalog
            </Link>
          </aside>
        </div>
      ) : (
        <div className="flex max-w-2xl flex-col gap-4 rounded-box border border-base-300/70 bg-base-100 p-6 shadow-card">
          <h2 className="text-2xl font-semibold">You must be at the library to scan</h2>
          <p className="text-base-content/80">
            The scanning feature turns on when your phone&apos;s location shows you at the library.
          </p>
          <div className="rounded-xl bg-base-200 p-4 text-sm text-base-content/80">
            <p className="font-semibold">Or try troubleshooting</p>
            <p className="mt-1">
              Is precise location enabled on your phone? Settings › Privacy › Location Services › Chrome or Safari ›
              While Using the App, with Precise Location on.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/browse/${library.id}`} className="btn btn-primary rounded-full">
              See the catalog
            </Link>
            <Link href="/" className="btn btn-ghost rounded-full">
              Back to Home
            </Link>
          </div>
        </div>
      )}
    </Container>
  );
}
