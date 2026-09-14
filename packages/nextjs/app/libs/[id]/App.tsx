"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { type BarcodeReader, type DetectedBarcode, getBarcodeReader } from "./barcodeReader";
import { BoltIcon, BoltSlashIcon, CameraIcon, PhotoIcon, StopIcon } from "@heroicons/react/24/outline";
import { classifyBarcode, parseTypedIsbn } from "~~/lib/isbn";

// How the ISBN was read, kept with the book.
export type ScanSource = "camera" | "photo" | "typed";

interface ScannerProps {
  onScan: (isbn: string, source: ScanSource) => Promise<void>;
  isLoading: boolean;
}

type Status = "idle" | "starting" | "scanning" | "error";

// The camera is read about eight times a second, never while a book is being looked up.
const SCAN_INTERVAL_MS = 120;
// The same barcode stays in view for a while after it's read; don't read it again right away.
const SAME_CODE_COOLDOWN_MS = 4000;

export const STORE_CODE_HINT =
  "That's a store barcode, not an ISBN. Look for the barcode whose number starts with 978 or 979, or type the ISBN printed near it.";
export const NO_BARCODE_IN_PHOTO =
  "No barcode found in that photo. Try again a little closer, with the barcode flat and in focus, or type the ISBN below.";
export const INVALID_TYPED_ISBN = "That doesn't look like an ISBN. Check the 10 or 13 digits (the last one can be X).";

const cameraErrorMessage = (error: unknown) => {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera access is off for this site. Allow the camera in your browser's settings, then tap Start camera. You can also take a photo or type the ISBN below.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No camera found. Take a photo or type the ISBN below.";
  if (name === "NotReadableError") return "Another app is using the camera. Close it, then tap Start camera.";
  return "The camera couldn't start. Take a photo or type the ISBN below.";
};

// Draws the part of the video inside the on-screen scan box (plus a margin) onto a canvas, at full
// camera resolution. Reading a small crop is much faster than reading the whole frame.
function cropToScanBox(video: HTMLVideoElement, canvas: HTMLCanvasElement): HTMLCanvasElement | HTMLVideoElement {
  const { videoWidth: vw, videoHeight: vh } = video;
  const box = video.getBoundingClientRect();
  if (!vw || !vh || !box.width || !box.height) return video;
  // The video fills its 4:3 frame (object-cover), so part of it may be off screen.
  const shown = box.width / box.height;
  const visibleW = vw / vh > shown ? vh * shown : vw;
  const visibleH = vw / vh > shown ? vh : vw / shown;
  const sw = visibleW * 0.9;
  const sh = visibleH * 0.5;
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return video;
  context.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

type CameraCapabilities = MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] };

const Scanner: React.FC<ScannerProps> = ({ onScan, isLoading }) => {
  // The camera opens as soon as the scanner appears.
  const [status, setStatus] = useState<Status>("starting");
  const [message, setMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BarcodeReader | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  // Each start gets a number; a start that finishes after a newer start or a stop gives up.
  const generationRef = useRef(0);
  const busyRef = useRef(false);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const onScanRef = useRef(onScan);
  const isLoadingRef = useRef(isLoading);
  useEffect(() => {
    onScanRef.current = onScan;
    isLoadingRef.current = isLoading;
  }, [onScan, isLoading]);

  /** Hands a valid ISBN to the page, one at a time. */
  const deliver = useCallback(async (isbn13: string, source: ScanSource) => {
    if (busyRef.current || isLoadingRef.current) return;
    busyRef.current = true;
    navigator.vibrate?.(40);
    try {
      await onScanRef.current(isbn13, source);
    } finally {
      busyRef.current = false;
    }
  }, []);

  const handleCode = useCallback(
    async ({ rawValue, format }: DetectedBarcode) => {
      const result = classifyBarcode(rawValue, format);
      if (result.kind === "unreadable") return;
      const now = Date.now();
      if (lastCodeRef.current.code === rawValue && now - lastCodeRef.current.at < SAME_CODE_COOLDOWN_MS) return;
      lastCodeRef.current = { code: rawValue, at: now };
      if (result.kind === "store-code") {
        setMessage(STORE_CODE_HINT);
        return;
      }
      setMessage(null);
      await deliver(result.isbn13, "camera");
    },
    [deliver],
  );

  /** Releases the camera and cancels any start in progress. */
  const release = useCallback(() => {
    generationRef.current++;
    window.clearTimeout(timerRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stop = useCallback(() => {
    release();
    setTorch({ supported: false, on: false });
  }, [release]);

  // Opens the camera and starts reading. State only changes after the camera answers.
  const openCamera = useCallback(
    async (deviceId?: string) => {
      const generation = generationRef.current;
      let stream: MediaStream;
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          await Promise.reject(Object.assign(new Error(), { name: "NotFoundError" }));
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } }),
            // Enough pixels per bar to read a book's barcode from a comfortable distance.
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch (error) {
        if (generation !== generationRef.current) return;
        setStatus("error");
        setMessage(cameraErrorMessage(error));
        return;
      }
      if (generation !== generationRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      const [track] = stream.getVideoTracks();
      const capabilities = (track.getCapabilities?.() ?? {}) as CameraCapabilities;
      if (capabilities.focusMode?.includes("continuous")) {
        track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
      }
      setTorch({ supported: Boolean(capabilities.torch), on: false });
      setCameraId(track.getSettings().deviceId ?? "");
      track.addEventListener("ended", () => {
        if (streamRef.current !== stream) return;
        stop();
        setStatus("idle");
        setMessage("The camera stopped. Tap Start camera to continue.");
      });
      navigator.mediaDevices
        .enumerateDevices()
        .then(devices =>
          setCameras(
            devices
              .filter(device => device.kind === "videoinput")
              .map((device, index) => ({ id: device.deviceId, label: device.label || `Camera ${index + 1}` })),
          ),
        )
        .catch(() => {});

      try {
        readerRef.current = await getBarcodeReader();
      } catch {
        if (generation !== generationRef.current) return;
        stop();
        setStatus("error");
        setMessage(
          "The barcode reader couldn't load. Check your connection and tap Start camera, or type the ISBN below.",
        );
        return;
      }
      if (generation !== generationRef.current) return;
      setStatus("scanning");

      const tick = async () => {
        if (generation !== generationRef.current) return;
        const current = videoRef.current;
        if (current && current.readyState >= 2 && !busyRef.current && !isLoadingRef.current && readerRef.current) {
          try {
            canvasRef.current ??= document.createElement("canvas");
            const codes = await readerRef.current.detect(cropToScanBox(current, canvasRef.current));
            if (codes[0] && generation === generationRef.current) await handleCode(codes[0]);
          } catch (error) {
            console.error("Barcode reading failed:", error);
          }
        }
        if (generation === generationRef.current) timerRef.current = window.setTimeout(tick, SCAN_INTERVAL_MS);
      };
      tick();
    },
    [handleCode, stop],
  );

  const start = (deviceId?: string) => {
    stop();
    setStatus("starting");
    setMessage(null);
    openCamera(deviceId);
  };

  // Open the camera as soon as the scanner appears, and release it when leaving the page.
  useEffect(() => {
    openCamera();
    return release;
  }, [openCamera, release]);

  const toggleTorch = async () => {
    const [track] = streamRef.current?.getVideoTracks() ?? [];
    if (!track) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ supported: true, on });
    } catch {
      setTorch({ supported: false, on: false });
    }
  };

  const readPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setMessage(null);
    try {
      const reader = await getBarcodeReader();
      const bitmap = await createImageBitmap(file);
      // Phone photos are large; about 2400 px on the long side keeps barcodes sharp and reading quick.
      const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      let source: ImageBitmapSource = bitmap;
      if (context) {
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        source = canvas;
      }
      const results = (await reader.detect(source)).map(code => classifyBarcode(code.rawValue, code.format));
      bitmap.close?.();
      const book = results.find(result => result.kind === "isbn");
      if (book?.kind === "isbn") await deliver(book.isbn13, "photo");
      else setMessage(results.some(result => result.kind === "store-code") ? STORE_CODE_HINT : NO_BARCODE_IN_PHOTO);
    } catch {
      setMessage("That photo couldn't be read. Try another, or type the ISBN below.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const submitTyped = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isbn13 = parseTypedIsbn(typed);
    if (!isbn13) {
      setTypedError(INVALID_TYPED_ISBN);
      return;
    }
    setTypedError(null);
    setTyped("");
    await deliver(isbn13, "typed");
  };

  const scanning = status === "scanning";

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative overflow-hidden rounded-box bg-camera-frame shadow-card">
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline autoPlay />

        {scanning && (
          // Where to hold the barcode. The reader looks a little beyond this box.
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[12%] top-1/2 h-1/3 -translate-y-1/2 rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]"
          >
            <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-flag-yellow/90 motion-safe:animate-pulse" />
          </div>
        )}

        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-camera-frame/80 p-6 text-center text-white">
            {status === "starting" ? (
              <>
                <span className="loading loading-spinner loading-md" aria-hidden="true" />
                <span>Starting the camera…</span>
              </>
            ) : (
              <button
                type="button"
                className="btn rounded-full border-0 bg-camera-button text-camera-frame hover:bg-camera-button/90"
                onClick={() => start(cameraId || undefined)}
              >
                <CameraIcon className="h-5 w-5" aria-hidden="true" />
                Start camera
              </button>
            )}
          </div>
        )}

        {scanning && torch.supported && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-pressed={torch.on}
            aria-label={torch.on ? "Turn off the flashlight" : "Turn on the flashlight"}
            className="btn btn-circle btn-sm absolute right-3 top-3 border-0 bg-base-100/90 text-base-content"
          >
            {torch.on ? <BoltSlashIcon className="h-5 w-5" /> : <BoltIcon className="h-5 w-5" />}
          </button>
        )}

        {scanning && (
          <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-6 text-center text-sm text-white">
            {isLoading ? "Looking up the book…" : "Point at the barcode on the back of the book"}
          </p>
        )}
      </div>

      {message && (
        <p role="status" className="rounded-xl border border-warning bg-warning/15 px-4 py-3 text-sm">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {scanning && (
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-full"
            onClick={() => {
              stop();
              setStatus("idle");
            }}
          >
            <StopIcon className="h-4 w-4" aria-hidden="true" />
            Stop camera
          </button>
        )}
        <label className={`btn btn-ghost btn-sm rounded-full ${photoBusy ? "btn-disabled" : ""}`}>
          {photoBusy ? (
            <span className="loading loading-spinner loading-xs" aria-hidden="true" />
          ) : (
            <PhotoIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {photoBusy ? "Reading the photo…" : "Take a photo instead"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={readPhoto}
            disabled={photoBusy}
            aria-label="Take a photo of the barcode"
          />
        </label>
        {cameras.length > 1 && (
          <select
            id="sourceSelect"
            className="select select-bordered select-sm ml-auto max-w-[12rem] rounded-full"
            value={cameraId}
            onChange={e => start(e.target.value)}
            aria-label="Camera"
          >
            {cameras.map(camera => (
              <option key={camera.id} value={camera.id}>
                {camera.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <form onSubmit={submitTyped} className="flex flex-col gap-1.5" noValidate>
        <label htmlFor="typed-isbn" className="text-sm font-medium">
          No barcode, or it won&apos;t scan? Type the ISBN
        </label>
        <div className="flex gap-2">
          <input
            id="typed-isbn"
            value={typed}
            onChange={e => {
              setTyped(e.target.value);
              setTypedError(null);
            }}
            autoComplete="off"
            enterKeyHint="go"
            placeholder="978…"
            className="input input-bordered min-w-0 flex-1 rounded-full bg-base-100"
            aria-invalid={Boolean(typedError)}
            aria-describedby={typedError ? "typed-isbn-error" : undefined}
          />
          <button type="submit" className="btn btn-primary rounded-full" disabled={isLoading || !typed.trim()}>
            Add
          </button>
        </div>
        {typedError && (
          <p id="typed-isbn-error" className="text-sm text-error">
            {typedError}
          </p>
        )}
      </form>
    </div>
  );
};

export default Scanner;
