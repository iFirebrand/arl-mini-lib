import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Writes a short video of a book's EAN-13 barcode for Chrome's fake camera
// (--use-file-for-fake-video-capture), so browser tests can scan a real barcode. The .y4m format
// is raw frames, simple enough to write by hand.

/** The ISBN in the barcode video the browser tests use. */
export const BARCODE_VIDEO_ISBN = "9780063345164";

const L = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];
const G = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];
const R = L.map(code => [...code].map(bit => (bit === "0" ? "1" : "0")).join(""));
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

/** The 95 modules (1 = bar) of an EAN-13 barcode. */
export function ean13Modules(digits: string): string {
  const parity = PARITY[Number(digits[0])];
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === "L" ? L : G)[Number(digits[i])];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += R[Number(digits[i])];
  return bits + "101";
}

export function writeBarcodeVideo(digits: string, width = 640, height = 480): string {
  const modules = ean13Modules(digits);
  const moduleWidth = 3;
  const barsWidth = modules.length * moduleWidth;
  const left = Math.round((width - barsWidth) / 2);
  const top = Math.round(height * 0.3);
  const bottom = Math.round(height * 0.7);

  // Luma: white paper, black bars. Chroma: neutral gray.
  const luma = Buffer.alloc(width * height, 235);
  for (let y = top; y < bottom; y++) {
    for (let m = 0; m < modules.length; m++) {
      if (modules[m] === "1")
        luma.fill(16, y * width + left + m * moduleWidth, y * width + left + (m + 1) * moduleWidth);
    }
  }
  const chroma = Buffer.alloc((width / 2) * (height / 2), 128);
  const frame = Buffer.concat([Buffer.from("FRAME\n"), luma, chroma, chroma]);

  const dir = join(tmpdir(), "arlib-e2e");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `barcode-${digits}.y4m`);
  writeFileSync(
    path,
    Buffer.concat([Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\n`), frame, frame]),
  );
  return path;
}
