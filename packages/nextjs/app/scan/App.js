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
      return cameras;
    };
    enableCamera()
      .then(disableCamera)
      .then(enumerateCameras)
      .then(cameras => setCameras(cameras))
      .then(() => Quagga.CameraAccess.disableTorch())
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
      try {
        const response = await fetch("/api/saveBook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...book, libraryId }),
        });
        if (!response.ok) {
          throw new Error(`Save book API failed with status: ${response.status}`);
        }
      } catch (error) {
        throw error;
      }
    },
    [libraryId],
  );

  const fetchBookData = useCallback(
    async isbn => {
      try {
        const response = await fetch(`/api/openlibrary?isbn=${isbn}`);
        const data = await response.json();

        if (data.records && Object.keys(data.records).length > 0) {
          const recordKey = Object.keys(data.records)[0];
          const record = data.records[recordKey];

          const bookInfo = {
            title: record.data.title,
            authors: record.data.authors?.map(author => author.name).join(", "),
            thumbnail: record.data.cover?.medium,
            description: record.data.subtitle || "",
            isbn13: isbn,
            itemInfo: record.recordURL,
            libraryId: libraryId,
          };

          await saveBookToDatabase(bookInfo);
          setResults(prev => [...prev, { codeResult: { code: isbn }, bookInfo }]);
        }
      } catch (error) {
        throw error;
      }
    },
    [saveBookToDatabase, libraryId, setResults],
  );

  const handleDetected = useCallback(
    async result => {
      if (isScanning) {
        return;
      }

      setIsScanning(true);

      try {
        await fetchBookData(result.code);
      } catch (error) {
        // Error handling remains silent
      } finally {
        setTimeout(() => {
          setIsScanning(false);
        }, 2000);
      }
    },
    [fetchBookData, isScanning],
  );

  const getSmiley = count => {
    if (count === 0) return "😐"; // Neutral face for 0
    if (count === 1) return "🙂"; // Slightly smiling face
    if (count === 2) return "😊"; // Slightly more smiling
    if (count === 3) return "😄"; // Happy face
    if (count === 4) return "😁"; // Grinning face
    if (count === 5) return "😂"; // Laughing face
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

        <button className="btn btn-accent mt-4" onClick={() => setScanning(!scanning)}>
          {scanning ? "Stop Scanning" : "Start Scanning"}
        </button>
        {scanning && (
          <button className="btn btn-accent mt-4" onClick={onTorchClick}>
            {torchOn ? "Turn Flashlight On" : "Flashlight Off"}
          </button>
        )}
        {/* <p>
          Books added: <span class="badge badge-info">📚 {results.length}</span>
          <span class="badge badge-info">{getSmiley(results.length)}</span>
        </p> */}
        <p className="text-2xl">
          Status:{" "}
          {results.length > 0
            ? results[results.length - 1].bookInfo
              ? results[results.length - 1].bookInfo.title
              : "Keep scanning book after book..."
            : "scan barcode to add book to catalog"}
          <span class="badge badge-info">{getSmiley(results.length)}</span>
          <span class="badge badge-info">📚 {results.length}</span>
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
            {cameras.length === 0 ? (
              <p>Finding Cameras. May ask for permission.</p>
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
            <BookList results={results} />
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
