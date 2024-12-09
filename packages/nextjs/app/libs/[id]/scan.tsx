"use client";

import React, { useState } from "react";
import Image from "next/image";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

function Scan({ libraryId }) {
  const [isScanning, setIsScanning] = useState(false);
  const [bookDataList, setBookDataList] = useState([]);
  const [scannedCount, setScannedCount] = useState(0);
  const apiKey = "AIzaSyA8Y5xWU_S2NaN6NPYgxV_XFS_8iv5OVfk";

  const handleScanToggle = () => {
    setIsScanning(!isScanning);
  };

  const fetchBookData = async isbn => {
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

  const saveBookToDatabase = async (book, libraryId) => {
    await fetch("/api/saveBook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...book, libraryId }),
    });
  };

  return (
    <>
      <button onClick={handleScanToggle}>{isScanning ? "Stop Scanning" : "Start Scanning"}</button>
      {isScanning && (
        <BarcodeScannerComponent
          width={500}
          height={500}
          onUpdate={(err, result) => {
            if (result) {
              console.log(result.text);
              fetchBookData(result.text);
            }
          }}
        />
      )}
      <p>Scanned Books: {scannedCount}</p>
      <div>
        {bookDataList.map((book, index) => (
          <div key={index}>
            <h2>{book.title}</h2>
            <Image src={book.imageLinks?.thumbnail || "/placeholder.jpg"} alt={book.title} width={128} height={192} />
          </div>
        ))}
      </div>
    </>
  );
}

export default Scan;
