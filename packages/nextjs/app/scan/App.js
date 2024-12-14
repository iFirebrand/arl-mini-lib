"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import BookList from "./BookList";
import Scanner from "./Scanner";
import Quagga from "@ericblade/quagga2";
import { debounce } from "lodash";
import PropTypes from "prop-types";

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

          try {
            const bookInfo = {
              title: record.data.title,
              authors: record.data.authors?.map(author => author.name).join(", "),
              thumbnail: record.data.cover?.medium,
              description: record.data.subtitle || "",
              isbn13: record.data.identifiers.isbn_13[0],
              itemInfo: record.recordURL,
              libraryId: libraryId,
            };
            await saveBookToDatabase(bookInfo);
            setResults(prev => [...prev, { codeResult: { code: isbn }, bookInfo }]);
          } catch (error) {
            console.error("Error creating bookInfo:", error);
          }
        }
      } catch (error) {
        throw error;
      }
    },
    [saveBookToDatabase, libraryId, setResults],
  );

  const debouncedHandleDetected = useCallback(
    result => {
      if (isScanning || !result?.code) {
        console.log("not scanning or no code");
        return;
      }
      setIsScanning(true);

      const isDuplicate = results.some(r => r.codeResult.code === result.code);
      if (isDuplicate) {
        console.log("duplicate code");
        setIsScanning(false);
        return;
      }

      try {
        console.log("fetching book data");
        fetchBookData(result.code);
        console.log("book data fetched with code", result.code);
      } catch (error) {
        console.error("Error fetching book data:", error);
      } finally {
        console.log("setting isScanning to false after 3 seconds");
        setTimeout(() => {
          setIsScanning(false);
        }, 3000);
      }
    },
    [fetchBookData, isScanning, results, setIsScanning],
  );

  // Wrap the callback with debounce
  const debouncedHandler = debounce(debouncedHandleDetected, 1000);

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

  const handleProcessed = result => {
    const drawingCtx = Quagga.canvas.ctx.overlay;
    const drawingCanvas = Quagga.canvas.dom.overlay;

    // Ensure canvas is properly positioned
    if (drawingCanvas.style.position !== "absolute") {
      drawingCanvas.style.position = "absolute";
      drawingCanvas.style.top = "0";
      drawingCanvas.style.left = "0";
      drawingCanvas.style.zIndex = "2";
    }

    const width = parseInt(drawingCanvas.getAttribute("width"));
    const height = parseInt(drawingCanvas.getAttribute("height"));

    // Clear previous drawings
    drawingCtx.clearRect(0, 0, width, height);

    // Draw scanning guide rectangle
    const scanZoneSize = {
      width: Math.min(width * 0.8, 280), // 80% of width or max 280px
      height: Math.min(height * 0.3, 100), // 30% of height or max 100px
    };

    const scanZone = {
      x: (width - scanZoneSize.width) / 2,
      y: (height - scanZoneSize.height) / 2,
      width: scanZoneSize.width,
      height: scanZoneSize.height,
    };

    // Draw scanning guide
    drawingCtx.strokeStyle = "rgba(0, 255, 0, 0.8)";
    drawingCtx.lineWidth = 2;
    drawingCtx.beginPath();
    drawingCtx.rect(scanZone.x, scanZone.y, scanZone.width, scanZone.height);
    drawingCtx.stroke();

    // Add corner markers
    const cornerLength = 20;
    drawingCtx.beginPath();
    // Top-left
    drawingCtx.moveTo(scanZone.x, scanZone.y + cornerLength);
    drawingCtx.lineTo(scanZone.x, scanZone.y);
    drawingCtx.lineTo(scanZone.x + cornerLength, scanZone.y);
    // Top-right
    drawingCtx.moveTo(scanZone.x + scanZone.width - cornerLength, scanZone.y);
    drawingCtx.lineTo(scanZone.x + scanZone.width, scanZone.y);
    drawingCtx.lineTo(scanZone.x + scanZone.width, scanZone.y + cornerLength);
    // Bottom-right
    drawingCtx.moveTo(scanZone.x + scanZone.width, scanZone.y + scanZone.height - cornerLength);
    drawingCtx.lineTo(scanZone.x + scanZone.width, scanZone.y + scanZone.height);
    drawingCtx.lineTo(scanZone.x + scanZone.width - cornerLength, scanZone.y + scanZone.height);
    // Bottom-left
    drawingCtx.moveTo(scanZone.x + cornerLength, scanZone.y + scanZone.height);
    drawingCtx.lineTo(scanZone.x, scanZone.y + scanZone.height);
    drawingCtx.lineTo(scanZone.x, scanZone.y + scanZone.height - cornerLength);
    drawingCtx.stroke();

    if (result) {
      // Only draw detected boxes if they intersect with the scan zone
      if (result.boxes) {
        result.boxes
          .filter(box => box !== result.box)
          .forEach(box => {
            Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "purple", lineWidth: 2 });
          });
      }

      if (result.box) {
        Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "blue", lineWidth: 2 });
      }

      if (result.codeResult && result.codeResult.code) {
        // Draw the barcode line in green
        Quagga.ImageDebug.drawPath(result.line, { x: "x", y: "y" }, drawingCtx, { color: "green", lineWidth: 2 });
      }
    }
  };

  const defaultLocatorSettings = {
    patchSize: "medium",
    halfSample: true,
    willReadFrequently: true,
    debug: {
      showCanvas: true,
      showPatches: false, // Set to false to reduce visual noise
      showFoundPatches: false,
      showSkeleton: false,
      showLabels: false,
      showPatchLabels: false,
      showRemainingPatchLabels: false,
      boxFromPatches: {
        showTransformed: true,
        showTransformedBox: true,
        showBB: true,
      },
    },
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
            {torchOn ? "Turn Flashlight Off" : "Flashlight On"}
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
          <>
            <div
              ref={scannerRef}
              style={{
                position: "relative",
                width: "320px",
                height: "240px",
                margin: "0 auto",
                border: "2px solid #ccc",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {/* Video feed will be inserted here by Quagga */}
              <canvas
                className="drawingBuffer"
                style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  width: "100%",
                  height: "100%",
                  zIndex: 1,
                }}
                width="320"
                height="240"
              />
            </div>
            <Scanner
              scannerRef={scannerRef}
              cameraId={cameraId}
              onDetected={debouncedHandler}
              onProcessed={handleProcessed}
              locatorSettings={defaultLocatorSettings}
            />
          </>
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

App.propTypes = {
  libraryId: PropTypes.string.isRequired,
};

export default App;
