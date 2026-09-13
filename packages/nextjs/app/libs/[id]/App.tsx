"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, Exception, NotFoundException, Result } from "@zxing/library";

interface VideoDevice {
  deviceId: string;
  label: string;
}

interface ScannerProps {
  onScan: (isbn: string) => Promise<void>;
  isLoading: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, isLoading }) => {
  const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader>(new BrowserMultiFormatReader());
  const startScanningRef = useRef<(() => void) | undefined>(undefined);
  const handleResultRef = useRef<typeof handleResult | undefined>(undefined);
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
      if (!result || isProcessing || isLoading) return;

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
    [onScan, lastScanTime, isProcessing, isLoading],
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
    <div className="flex w-full flex-col gap-3">
      <div className="relative overflow-hidden rounded-box bg-neutral shadow-card">
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
        {/* Where to hold the barcode. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[12%] top-1/2 h-1/3 -translate-y-1/2 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-neutral rounded-full" onClick={startScanning}>
          Start
        </button>
        <button className="btn btn-ghost rounded-full" onClick={resetScanning}>
          Stop
        </button>

        {videoDevices.length > 1 && (
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-base-content/70">Camera</span>
            <select
              id="sourceSelect"
              className="select select-bordered select-sm max-w-[12rem]"
              value={selectedDeviceId}
              onChange={e => setSelectedDeviceId(e.target.value)}
              aria-label="Change video source"
            >
              {videoDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
};

export default Scanner;

// https://github.com/zxing-js/library/blob/master/docs/examples/multi-camera/index.html
