"use client";

import { useCallback, useLayoutEffect } from "react";
import Quagga from "@ericblade/quagga2";
import PropTypes from "prop-types";

function getMedian(arr) {
  const newArr = [...arr]; // copy the array before sorting, otherwise it mutates the array passed in, which is generally undesireable
  newArr.sort((a, b) => a - b);
  const half = Math.floor(newArr.length / 2);
  if (newArr.length % 2 === 1) {
    return newArr[half];
  }
  return (newArr[half - 1] + newArr[half]) / 2;
}

function getMedianOfCodeErrors(decodedCodes) {
  const errors = decodedCodes.flatMap(x => x.error);
  const medianOfErrors = getMedian(errors);
  return medianOfErrors;
}

const defaultConstraints = {
  width: 640,
  height: 480,
};

const defaultLocatorSettings = {
  patchSize: "medium",
  halfSample: true,
  willReadFrequently: true,
  debug: {
    showCanvas: true,
    showPatches: true,
    showFoundPatches: true,
    showSkeleton: true,
    showLabels: true,
    showPatchLabels: true,
    showRemainingPatchLabels: true,
    boxFromPatches: {
      showTransformed: true,
      showTransformedBox: true,
      showBB: true,
    },
  },
};

const defaultDecoders = [
  "ean_reader", // For ISBN-13 (EAN-13)
  "ean_8_reader", // For shorter EAN codes
  "upc_reader", // For older ISBN-10 (UPC-A)
  "upc_e_reader", // For shorter UPC codes
];

const Scanner = ({
  onDetected,
  scannerRef,
  onScannerReady,
  cameraId,
  facingMode,
  constraints = defaultConstraints,
  locator = defaultLocatorSettings,
  decoders = defaultDecoders,
  locate = true,
}) => {
  const errorCheck = useCallback(
    result => {
      console.log("🎯 Scan attempt detected");

      if (!onDetected) {
        console.log("❌ No onDetected handler found");
        return;
      }

      const err = getMedianOfCodeErrors(result.codeResult.decodedCodes);
      console.log("📊 Error rate:", err);

      // Add frequency filtering
      if (!window.barcodeHistory) {
        console.log("📝 Initializing barcode history");
        window.barcodeHistory = [];
      }

      window.barcodeHistory.push({
        code: result.codeResult.code,
        timestamp: Date.now(),
      });
      console.log("📚 Current code:", result.codeResult.code);
      console.log("🗄️ History length:", window.barcodeHistory.length);

      // Keep only last 3 seconds of history
      window.barcodeHistory = window.barcodeHistory.filter(item => Date.now() - item.timestamp < 3000);
      console.log("🧹 Cleaned history length:", window.barcodeHistory.length);

      // Count occurrences of this code in recent history
      const frequency = window.barcodeHistory.filter(item => item.code === result.codeResult.code).length;
      console.log("🔄 Frequency of this code:", frequency);

      if (err < 0.25 && frequency >= 1) {
        console.log("✅ VALID SCAN! Code:", result.codeResult.code);
        onDetected({ code: result.codeResult.code });
      } else {
        console.log("❌ Scan rejected. Error rate or frequency too high");
      }
    },
    [onDetected],
  );

  const handleProcessed = result => {
    const drawingCtx = Quagga.canvas.ctx.overlay;
    const drawingCanvas = Quagga.canvas.dom.overlay;

    // Ensure canvas is properly positioned
    if (drawingCanvas.style.position !== "absolute") {
      drawingCanvas.style.position = "absolute";
      drawingCanvas.style.top = "0";
      drawingCanvas.style.left = "0";
      drawingCanvas.style.zIndex = "2"; // Ensure overlay is above video
    }

    // Clear the entire canvas before drawing new content
    const width = parseInt(drawingCanvas.getAttribute("width"));
    const height = parseInt(drawingCanvas.getAttribute("height"));
    drawingCtx.clearRect(0, 0, width, height);

    if (result) {
      // Draw searching boxes (purple)
      if (result.boxes) {
        result.boxes
          .filter(box => box !== result.box)
          .forEach(box => {
            Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "purple", lineWidth: 4 });
          });
      }

      // Draw matching box (blue)
      if (result.box) {
        Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "blue", lineWidth: 4 });
      }

      // Draw scanning line and code (if there's a result)
      if (result.codeResult && result.codeResult.code) {
        Quagga.ImageDebug.drawPath(result.line, { x: "x", y: "y" }, drawingCtx, { color: "green", lineWidth: 4 });

        // Draw the code text
        drawingCtx.font = "24px Arial";
        drawingCtx.fillStyle = "green";
        drawingCtx.fillText(result.codeResult.code, 10, 20);
      }
    }
  };

  useLayoutEffect(() => {
    // if this component gets unmounted in the same tick that it is mounted, then all hell breaks loose,
    // so we need to wait 1 tick before calling init().  I'm not sure how to fix that, if it's even possible,
    // given the asynchronous nature of the camera functions, the non asynchronous nature of React, and just how
    // awful browsers are at dealing with cameras.
    let ignoreStart = false;
    const init = async () => {
      // wait for one tick to see if we get unmounted before we can possibly even begin cleanup
      await new Promise(resolve => setTimeout(resolve, 1));
      if (ignoreStart) {
        return;
      }
      // begin scanner initialization
      await Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            constraints: {
              ...constraints,
              ...(cameraId && { deviceId: cameraId }),
              ...(!cameraId && { facingMode }),
            },
            target: scannerRef.current,
            willReadFrequently: true,
          },
          locator,
          decoder: { readers: decoders },
          locate,
        },
        async err => {
          Quagga.onProcessed(handleProcessed);

          if (err) {
            // Prevent console.error from being called
            // return console.error("Error starting Quagga:", err);
          }
          if (scannerRef && scannerRef.current) {
            await Quagga.start();
            if (onScannerReady) {
              onScannerReady();
            }
          }
        },
      );
      Quagga.onDetected(errorCheck);
    };
    init();
    // cleanup by turning off the camera and any listeners
    return () => {
      ignoreStart = true;
      if (document.hidden) {
        Quagga.stop();
      }
      Quagga.offDetected(errorCheck);
      Quagga.offProcessed(handleProcessed);
    };
  }, [
    cameraId,
    onDetected,
    onScannerReady,
    scannerRef,
    errorCheck,
    constraints,
    locator,
    decoders,
    locate,
    facingMode,
  ]);
  return null;
};

Scanner.propTypes = {
  onDetected: PropTypes.func.isRequired,
  scannerRef: PropTypes.object.isRequired,
  onScannerReady: PropTypes.func,
  cameraId: PropTypes.string,
  facingMode: PropTypes.string,
  constraints: PropTypes.object,
  locator: PropTypes.object,
  decoders: PropTypes.array,
  locate: PropTypes.bool,
};

export default Scanner;
