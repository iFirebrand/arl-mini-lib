"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, Exception, NotFoundException, Result } from "@zxing/library";
import PropTypes from "prop-types";

interface VideoDevice {
  deviceId: string;
  label: string;
}

interface ScannerProps {
  onScan: (isbn: string) => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScan }) => {
  const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader>(new BrowserMultiFormatReader());
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const SCAN_DELAY = 2000; // 2 seconds

  const handleResult = useCallback(
    (result: Result | null) => {
      if (!result || isProcessing) return;

      const now = Date.now();
      if (now - lastScanTime > SCAN_DELAY) {
        const text = result.getText();
        console.log("Scan detected:", text);
        setResult(text);
        setIsProcessing(true);
        onScan(text).finally(() => {
          setIsProcessing(false);
          setLastScanTime(now);
        });
      }
    },
    [onScan, lastScanTime, isProcessing],
  );

  useEffect(() => {
    const initializeDevices = async () => {
      try {
        const devices = await codeReader.current.listVideoInputDevices();
        setVideoDevices(devices);
        if (devices.length > 0) {
          setSelectedDeviceId(devices[0].deviceId);
        }
      } catch (err) {
        console.error("Error listing video devices:", err);
      }
    };

    initializeDevices();

    // Cleanup on component unmount
    return () => {
      codeReader.current.reset();
    };
  }, []);

  const startScanning = useCallback(() => {
    if (!videoRef.current) return;

    codeReader.current.decodeFromVideoDevice(
      selectedDeviceId,
      videoRef.current,
      (result: Result | null, error?: Exception) => {
        if (result) {
          handleResult(result);
        }
        if (error && !(error instanceof NotFoundException)) {
          console.error(error);
          setResult(error.message);
        }
      },
    );
    console.log(`Started continuous decode from camera with id ${selectedDeviceId}`);
  }, [selectedDeviceId, handleResult]);

  const resetScanning = useCallback(() => {
    codeReader.current.reset();
    setResult("");
    console.log("Reset.");
  }, []);

  return (
    <main className="wrapper" style={{ paddingTop: "2em" }}>
      <section className="container">
        <h1 className="title">Scan 1D/2D Code from Video Camera</h1>

        <div>
          <button className="button" onClick={startScanning}>
            Start
          </button>
          <button className="button" onClick={resetScanning}>
            Reset
          </button>
        </div>

        <div>
          <video ref={videoRef} width={300} height={200} style={{ border: "1px solid gray" }} />
        </div>

        {videoDevices.length > 1 && (
          <div>
            <label htmlFor="sourceSelect">Change video source:</label>
            <select
              id="sourceSelect"
              style={{ maxWidth: "400px" }}
              value={selectedDeviceId}
              onChange={e => setSelectedDeviceId(e.target.value)}
            >
              {videoDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label>Result:</label>
          <pre>
            <code>{result}</code>
          </pre>
        </div>
      </section>
    </main>
  );
};

export default Scanner;

// https://github.com/zxing-js/library/blob/master/docs/examples/multi-camera/index.html
