"use client";

import React, { useState } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

function Scan() {
  const [barcode, setBarcode] = useState("Not Found");
  const [isScanning, setIsScanning] = useState(false);
  const [bookData, setBookData] = useState(null);
  const apiKey = "AIzaSyA8Y5xWU_S2NaN6NPYgxV_XFS_8iv5OVfk";

  const handleScanToggle = () => {
    setIsScanning(!isScanning); // Toggle scanning state
    if (isScanning) {
      setBarcode("Not Found"); // Reset barcode when stopping the scan
      setBookData(null); // Reset book data
    }
  };

  const fetchBookData = async isbn => {
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`);
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        setBookData(data.items[0].volumeInfo); // Get the first book's info
      } else {
        setBookData(null); // No book found
      }
    } catch (error) {
      console.error("Error fetching book data:", error);
      setBookData(null); // Handle error
    }
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
              setBarcode(result.text); // Store the result in the state
              console.log(result.text); // Log the result to the console
              fetchBookData(result.text); // Fetch book data using the scanned barcode
              setIsScanning(false); // Stop scanning after capturing the QR code
            } else {
              setBarcode("Not Found");
            }
          }}
        />
      )}
      <p>{barcode}</p>
      {bookData && (
        <div>
          <h2>{bookData.title}</h2>
          <p>{bookData.authors?.join(", ")}</p>
          <img src={bookData.imageLinks?.thumbnail} alt={bookData.title} />
          <p>{bookData.description}</p>
          <a href={bookData.infoLink} target="_blank" rel="noopener noreferrer">
            More Info
          </a>
        </div>
      )}
    </>
  );
}

export default Scan;
