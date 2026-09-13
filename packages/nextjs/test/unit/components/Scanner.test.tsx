import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Scanner, { INVALID_TYPED_ISBN, NO_BARCODE_IN_PHOTO, STORE_CODE_HINT } from "~~/app/libs/[id]/App";

const mocks = vi.hoisted(() => ({ detect: vi.fn() }));
vi.mock("~~/app/libs/[id]/barcodeReader", () => ({ getBarcodeReader: async () => ({ detect: mocks.detect }) }));

const BOOK = { rawValue: "9780063345164", format: "ean_13" };
const UPC = { rawValue: "036000291452", format: "upc_a" };

const fakeCamera = ({ torch = false } = {}) => {
  const track = {
    stop: vi.fn(),
    getCapabilities: () => ({ torch }),
    getSettings: () => ({ deviceId: "back-camera" }),
    addEventListener: vi.fn(),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  return { track, stream };
};

const setCamera = (getUserMedia: () => Promise<unknown>) =>
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(getUserMedia), enumerateDevices: vi.fn().mockResolvedValue([]) },
  });

const renderScanner = () => {
  const onScan = vi.fn().mockResolvedValue(undefined);
  render(<Scanner onScan={onScan} isLoading={false} />);
  return onScan;
};

describe("Scanner", () => {
  beforeEach(() => {
    mocks.detect.mockReset().mockResolvedValue([]);
    // jsdom has no media playback or canvas drawing.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", { configurable: true, get: () => 4 });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 4032, height: 3024, close: vi.fn() }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("opens the rear camera at high resolution and reads a book's barcode", async () => {
    const { stream } = fakeCamera();
    setCamera(async () => stream);
    mocks.detect.mockResolvedValue([BOOK]);
    const onScan = renderScanner();

    await waitFor(() => expect(onScan).toHaveBeenCalledWith("9780063345164"));
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    // The same barcode, still in view, isn't read twice.
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it("explains a store barcode instead of looking it up", async () => {
    setCamera(async () => fakeCamera().stream);
    mocks.detect.mockResolvedValue([UPC]);
    const onScan = renderScanner();

    expect(await screen.findByText(STORE_CODE_HINT)).toBeInTheDocument();
    expect(onScan).not.toHaveBeenCalled();
  });

  it("offers the flashlight when the camera has one", async () => {
    const { stream, track } = fakeCamera({ torch: true });
    setCamera(async () => stream);
    renderScanner();

    await userEvent.click(await screen.findByRole("button", { name: "Turn on the flashlight" }));

    expect(track.applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
    expect(screen.getByRole("button", { name: "Turn off the flashlight" })).toBeInTheDocument();
  });

  it("says how to allow the camera when access is off, and still accepts a typed ISBN", async () => {
    setCamera(async () => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" })));
    const onScan = renderScanner();

    expect(await screen.findByText(/Camera access is off for this site/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start camera" })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Type the ISBN/), "0-06-334516-1");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onScan).toHaveBeenCalledWith("9780063345164");
  });

  it("rejects a typed number that isn't an ISBN", async () => {
    setCamera(async () => Promise.reject(Object.assign(new Error(), { name: "NotFoundError" })));
    const onScan = renderScanner();

    await userEvent.type(screen.getByLabelText(/Type the ISBN/), "9780063345165");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText(INVALID_TYPED_ISBN)).toBeInTheDocument();
    expect(onScan).not.toHaveBeenCalled();
  });

  it.each([
    ["a book's barcode", [BOOK], null],
    ["only a store barcode", [UPC], STORE_CODE_HINT],
    ["no barcode", [], NO_BARCODE_IN_PHOTO],
  ])("reads a photo with %s", async (_label, codes, message) => {
    setCamera(async () => Promise.reject(Object.assign(new Error(), { name: "NotFoundError" })));
    mocks.detect.mockResolvedValue(codes);
    const onScan = renderScanner();

    await userEvent.upload(
      screen.getByLabelText("Take a photo of the barcode"),
      new File(["jpeg"], "barcode.jpg", { type: "image/jpeg" }),
    );

    if (message) {
      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(onScan).not.toHaveBeenCalled();
    } else {
      await waitFor(() => expect(onScan).toHaveBeenCalledWith("9780063345164"));
    }
  });
});
