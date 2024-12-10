"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import BookList from "./BookList";
import Scanner from "./Scanner";
import Quagga from "@ericblade/quagga2";

const App = ({ libraryId }) => {
  const [scanning, setScanning] = useState(false); // toggleable state for "should render scanner"
  const [cameras, setCameras] = useState([]); // array of available cameras, as returned by Quagga.CameraAccess.enumerateVideoDevices()
  const [cameraId, setCameraId] = useState(null); // id of the active camera device
  const [cameraError, setCameraError] = useState(null); // error message from failing to access the camera
  const [results, setResults] = useState([]); // list of scanned results
  const [torchOn, setTorch] = useState(false); // toggleable state for "should torch be on"
  const scannerRef = useRef(null); // reference to the scanner element in the DOM
  const apiKey = "AIzaSyA8Y5xWU_S2NaN6NPYgxV_XFS_8iv5OVfk";
  const [isScanning, setIsScanning] = useState(false); // New state to track scanning status

  useEffect(() => {
    const enableCamera = async () => {
      await Quagga.CameraAccess.request(null, {});
    };
    const disableCamera = async () => {
      await Quagga.CameraAccess.release();
    };
    const enumerateCameras = async () => {
      const cameras = await Quagga.CameraAccess.enumerateVideoDevices();
      console.log("Cameras Detected: ", cameras);
      return cameras;
    };
    enableCamera()
      .then(disableCamera)
      .then(enumerateCameras)
      .then(cameras => setCameras(cameras))
      .then(() => Quagga.CameraAccess.disableTorch()) // disable torch at start, in case it was enabled before and we hot-reloaded
      .catch(err => setCameraError(err));
    return () => disableCamera();
  }, []);

  // provide a function to toggle the torch/flashlight
  const onTorchClick = useCallback(() => {
    const torch = !torchOn;
    setTorch(torch);
    if (torch) {
      Quagga.CameraAccess.enableTorch();
    } else {
      Quagga.CameraAccess.disableTorch();
    }
  }, [torchOn, setTorch]);

  const saveBookToDatabase = useCallback(
    async book => {
      console.log("saveBookToDatabase called", book, libraryId);
      await fetch("/api/saveBook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...book, libraryId }),
      });
    },
    [libraryId],
  );

  const fetchBookData = useCallback(
    async isbn => {
      try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const bookInfo = data.items[0].volumeInfo;
          // Check if the book has already been scanned
          const isBookAlreadyScanned = results.some(result => result.codeResult && result.codeResult.code === isbn);
          if (!isBookAlreadyScanned) {
            await saveBookToDatabase({
              title: bookInfo.title,
              authors: bookInfo.authors?.join(", "),
              thumbnail: bookInfo.imageLinks?.thumbnail,
              description: bookInfo.description,
              isbn10: isbn,
            });

            // Update results state directly instead of using a separate bookDataList
            setResults(prev => [...prev, { codeResult: { code: isbn }, bookInfo }]);
            // Increment scanned count directly
            setScannedCount(prev => prev + 1);
            console.log("Book added to results", bookInfo);
            console.log("Results", results);
            console.log("Books Already Scanned", isBookAlreadyScanned);
          }
        } // end of if - here we'll try with Library of Congress API
      } catch (error) {
        console.error("Error fetching book data:", error);
      }
    },
    [results, saveBookToDatabase],
  );

  const handleDetected = useCallback(
    result => {
      if (isScanning) return; // Prevent further scans if already scanning
      setIsScanning(true); // Set scanning status to true

      console.log("handleDetected called", result);
      setResults(prevResults => [...prevResults, result]);
      fetchBookData(result.code); // Call the book lookup function here

      // Pause for 2 seconds before allowing another scan
      setTimeout(() => {
        setIsScanning(false); // Reset scanning status after 2 seconds
      }, 2000);
    },
    [fetchBookData, isScanning], // Add isScanning to dependencies
  );

  const getSmiley = count => {
    if (count === 0) return "😐"; // Neutral face for 0
    if (count === 1) return "🙂"; // Slightly smiling face
    if (count === 2) return "😊"; // Slightly more smiling
    if (count === 3) return "😄"; // Happy face
    if (count === 4) return "😁"; // Grinning face
    if (count === 5) return "😆"; // Laughing face
    if (count === 6) return "😃"; // Big smile
    if (count === 7) return "😅"; // Sweaty smile
    if (count === 8) return "😇"; // Smiling with halo
    if (count === 9) return "😍"; // Heart eyes
    if (count === 10) return "🤩"; // Star-struck
    if (count === 11) return "🥳"; // Party face
    if (count === 12) return "😜"; // Winking face
    if (count === 13) return "😝"; // Stuck out tongue
    if (count === 14) return "😻"; // Heart eyes cat
    if (count === 15) return "🤗"; // Hugging face
    if (count === 16) return "🤯"; // Exploding head
    if (count === 17) return "😱"; // Screaming in fear
    if (count === 18) return "😲"; // Astonished face
    if (count === 19) return "😳"; // Flushed face
    return "🎉"; // Party popper for 20 or more
  };

  return (
    <>
      <div>
        {cameraError ? <p>Error starting camera. ${JSON.stringify(cameraError)} -- Do you give permssion?</p> : null}

        <button className="btn btn-accent mt-4" onClick={onTorchClick}>
          {torchOn ? "Flashlight On" : "Flashlight Off"}
        </button>
        <button className="btn btn-accent mt-4" onClick={() => setScanning(!scanning)}>
          {scanning ? "Stop Scanning" : "Start Scanning"}
        </button>
        <p>
          Books added: <span class="badge badge-info">{results.length}</span>
          <span class="badge badge-info">{getSmiley(results.length)}</span>
        </p>
        {scanning && (
          <div ref={scannerRef} style={{ position: "relative", border: "0px solid red", height: "25vh" }}>
            <canvas
              className="drawingBuffer"
              style={{
                position: "absolute",
                top: "0px",
                width: "100%",
                height: "100%",
                zIndex: -1,
              }}
              width="320"
              height="240"
            />

            <Scanner scannerRef={scannerRef} cameraId={cameraId} onDetected={handleDetected} />
          </div>
        )}
      </div>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            <BookList results={results} />
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
