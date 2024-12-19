"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, Exception, NotFoundException, Result } from "@zxing/library";

interface VideoDevice {
  deviceId: string;
  label: string;
}

interface ScannerProps {
  onScan: (isbn: string) => Promise<void>;
}

const Scanner: React.FC<ScannerProps> = ({ onScan }) => {
  const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader>(new BrowserMultiFormatReader());
  const startScanningRef = useRef<() => void>();
  const handleResultRef = useRef<typeof handleResult>();
  const SCAN_DELAY = 2000; // 2 seconds

  const startScanning = useCallback((): void => {
    if (!videoRef.current) return;

    codeReader.current.decodeFromVideoDevice(
      selectedDeviceId,
      videoRef.current,
      (result: Result | null, error?: Exception) => {
        if (result) {
          handleResultRef.current?.(result);
        }
        if (error && !(error instanceof NotFoundException)) {
          console.error(error);
        }
      },
    );
  }, [selectedDeviceId]);

  const handleResult = useCallback(
    (result: Result | null): void => {
      if (!result || isProcessing) return;

      const now = Date.now();
      if (now - lastScanTime > SCAN_DELAY) {
        const text = result.getText();
        console.log("Scan detected:", text);

        // Stop scanning
        codeReader.current.reset();

        onScan(text).finally(() => {
          setIsProcessing(false);
          setLastScanTime(now);

          // Wait for delay then restart scanning
          setTimeout(() => {
            startScanningRef.current?.();
          }, SCAN_DELAY);
        });
      }
    },
    [onScan, lastScanTime, isProcessing],
  );

  useEffect(() => {
    startScanningRef.current = startScanning;
    handleResultRef.current = handleResult;
  }, [startScanning, handleResult]);

  useEffect(() => {
    const reader = codeReader.current;
    const currentVideoRef = videoRef.current;

    const initializeDevices = async () => {
      try {
        const devices = await reader.listVideoInputDevices();
        if (devices.length === 0) {
          throw new Error("No video devices found");
        }
        setVideoDevices(devices);
        setSelectedDeviceId(devices[0].deviceId);
      } catch (err) {
        console.error("Error listing video devices:", err);
        // Add user feedback here
      }
    };

    initializeDevices();

    return () => {
      reader.reset();
      if (currentVideoRef && currentVideoRef.srcObject) {
        const tracks = (currentVideoRef.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const resetScanning = useCallback(() => {
    codeReader.current.reset();
    console.log("Reset.");
  }, []);

  return (
    <main className="w-full flex flex-col items-center p-8">
      <div className="w-full max-w-2xl flex flex-col items-center gap-4">
        {/* <h1 className="text-2xl font-bold">Start to scan barcode</h1> */}

        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={startScanning}>
            Start
          </button>
          <button className="btn btn-secondary" onClick={resetScanning}>
            Stop
          </button>
        </div>

        <div>
          <video ref={videoRef} width={300} height={200} className="border border-gray-300 rounded" />
        </div>

        {videoDevices.length > 1 && (
          <div className="flex flex-col gap-2">
            <label htmlFor="sourceSelect">Change video source:</label>
            <select
              id="sourceSelect"
              className="select select-bordered w-full max-w-xs"
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
      </div>
    </main>
  );
};

export default Scanner;

// https://github.com/zxing-js/library/blob/master/docs/examples/multi-camera/index.html
