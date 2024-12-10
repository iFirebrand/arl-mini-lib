"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import debounce from "lodash.debounce";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

interface ScanProps {
  libraryId: string;
}

interface BookInfo {
  title: string;
  imageLinks?: {
    thumbnail?: string;
  };
}

interface BookData {
  title: string;
  authors?: string;
  thumbnail?: string;
  description?: string;
  isbn10: string;
}

function Scan({ libraryId }: ScanProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [bookDataList, setBookDataList] = useState<BookInfo[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const apiKey = "AIzaSyA8Y5xWU_S2NaN6NPYgxV_XFS_8iv5OVfk";

  const handleScanToggle = () => {
    setIsScanning(!isScanning);
  };

  const fetchBookData = async (isbn: string) => {
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`);
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const bookInfo = data.items[0].volumeInfo;

        const isBookAlreadyScanned = bookDataList.some(book => book.title === bookInfo.title);
        if (!isBookAlreadyScanned) {
          await saveBookToDatabase(
            {
              title: bookInfo.title,
              authors: bookInfo.authors?.join(", "),
              thumbnail: bookInfo.imageLinks?.thumbnail,
              description: bookInfo.description,
              isbn10: isbn,
            },
            libraryId,
          );

          setBookDataList(prev => [...prev, bookInfo]);
          setScannedCount(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error("Error fetching book data:", error);
    }
  };

  const saveBookToDatabase = async (book: BookData, libraryId: string) => {
    await fetch("/api/saveBook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...book, libraryId }),
    });
  };

  const handleUpdate = useRef(
    debounce((err, result) => {
      if (result?.getText()) {
        const text = result.getText();
        console.log(text);
        fetchBookData(text);
        setToastMessage(`ISBN scanned successfully! ${text}`);
        setTimeout(() => setToastMessage(""), 3000);
      }
    }, 900),
  ).current;

  return (
    <>
      <button className="btn btn-accent mt-4" onClick={handleScanToggle}>
        {isScanning ? "Stop Scanning" : "Start Scanning"}
      </button>
      {isScanning && <BarcodeScannerComponent width={500} height={500} onUpdate={handleUpdate} />}
      <p>Scanned Books: {scannedCount}</p>
      <div>
        {bookDataList.map((book, index) => (
          <div key={index}>
            <h2>{book.title}</h2>
            <Image src={book.imageLinks?.thumbnail || "/placeholder.jpg"} alt={book.title} width={128} height={192} />
          </div>
        ))}
      </div>

      {toastMessage && (
        <div className="toast toast-top toast-center">
          <div className="alert alert-success">
            <div>
              <span>{toastMessage}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Scan;
