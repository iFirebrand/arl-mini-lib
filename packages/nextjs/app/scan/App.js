"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Result from "./Result";
import Scanner from "./Scanner";
import Quagga from "@ericblade/quagga2";

const App = ({ libraryId }) => {
  console.log("App called with libraryId", libraryId);
  const [scanning, setScanning] = useState(false); // toggleable state for "should render scanner"
  const [cameras, setCameras] = useState([]); // array of available cameras, as returned by Quagga.CameraAccess.enumerateVideoDevices()
  const [cameraId, setCameraId] = useState(null); // id of the active camera device
  const [cameraError, setCameraError] = useState(null); // error message from failing to access the camera
  const [results, setResults] = useState([]); // list of scanned results
  const [torchOn, setTorch] = useState(false); // toggleable state for "should torch be on"
  const scannerRef = useRef(null); // reference to the scanner element in the DOM
  const apiKey = "AIzaSyA8Y5xWU_S2NaN6NPYgxV_XFS_8iv5OVfk";

  // at start, we need to get a list of the available cameras.  We can do that with Quagga.CameraAccess.enumerateVideoDevices.
  // HOWEVER, Android will not allow enumeration to occur unless the user has granted camera permissions to the app/page.
  // AS WELL, Android will not ask for permission until you actually try to USE the camera, just enumerating the devices is not enough to trigger the permission prompt.
  // THEREFORE, if we're going to be running in Android, we need to first call Quagga.CameraAccess.request() to trigger the permission prompt.
  // AND THEN, we need to call Quagga.CameraAccess.release() to release the camera so that it can be used by the scanner.
  // AND FINALLY, we can call Quagga.CameraAccess.enumerateVideoDevices() to get the list of cameras.

  // Normally, I would place this in an application level "initialization" event, but for this demo, I'm just going to put it in a useEffect() hook in the App component.

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
        console.log("fetchBookData called with isbn and data", isbn, data);
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
      console.log("handleDetected called", result);
      setResults(prevResults => [...prevResults, result]);
      fetchBookData(result.code); // Call the book lookup function here
    },
    [fetchBookData],
  );

  return (
    <div>
      {cameraError ? <p>ERROR INITIALIZING CAMERA ${JSON.stringify(cameraError)} -- DO YOU HAVE PERMISSION?</p> : null}

      <button className="btn btn-accent mt-4" onClick={onTorchClick}>
        {torchOn ? "Disable Flashlight" : "Enable Flashlight"}
      </button>
      <button className="btn btn-accent mt-4" onClick={() => setScanning(!scanning)}>
        {scanning ? "Stop Scanning" : "Start Scanning"}
      </button>
      <ul className="results">
        {results.map(
          result => result.codeResult && <Result key={result.codeResult.code} result={result} libraryId={libraryId} />,
        )}
      </ul>
      <div ref={scannerRef} style={{ position: "relative", border: "0px solid red" }}>
        {/* <video style={{ width: window.innerWidth, height: 480, border: '3px solid orange' }}/> */}
        <canvas
          className="drawingBuffer"
          style={{
            position: "absolute",
            top: "0px",
            // left: '0px',
            // height: '100%',
            // width: '100%',
            // border: "3px solid green",
          }}
          width="640"
          height="480"
        />
        {cameras.length === 0 ? (
          <p>Enumerating Cameras, browser may be prompting for permissions beforehand</p>
        ) : (
          <form>
            <select onChange={event => setCameraId(event.target.value)}>
              {cameras.map(camera => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || camera.deviceId}
                </option>
              ))}
            </select>
          </form>
        )}
        {scanning ? <Scanner scannerRef={scannerRef} cameraId={cameraId} onDetected={handleDetected} /> : null}
      </div>
    </div>
  );
};

export default App;
