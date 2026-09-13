// Chooses the barcode reader. Android Chrome and Samsung Internet have a fast built-in one; iPhones
// don't (Safari keeps it behind a flag, and it's broken there even when turned on), so they use
// ZXing compiled to WebAssembly, loaded only when the scanner opens and served from our own site
// (scripts/copy-zxing-wasm.mjs).

export interface DetectedBarcode {
  rawValue: string;
  format: string;
}

export interface BarcodeReader {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

// Books carry EAN-13; the others are read only to explain that they aren't ISBNs.
const FORMATS = ["ean_13", "upc_a", "upc_e", "ean_8"];

type NativeDetector = {
  new (options: { formats: string[] }): BarcodeReader;
  getSupportedFormats(): Promise<string[]>;
};

const isAppleWebKit = () => {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/Chrome|Chromium|Android/.test(ua);
  return iOS || safari;
};

type BarcodeFormat = import("barcode-detector/ponyfill").BarcodeFormat;

let reader: Promise<BarcodeReader> | null = null;

async function createReader(): Promise<BarcodeReader> {
  const Native = (globalThis as { BarcodeDetector?: NativeDetector }).BarcodeDetector;
  if (Native && !isAppleWebKit()) {
    try {
      const supported = await Native.getSupportedFormats();
      if (supported.includes("ean_13")) return new Native({ formats: FORMATS.filter(f => supported.includes(f)) });
    } catch {
      // Fall through to the WebAssembly reader.
    }
  }
  const { BarcodeDetector, ZXING_WASM_VERSION, prepareZXingModule } = await import("barcode-detector/ponyfill");
  // Downloads and compiles the reader now, so a failed download surfaces here rather than mid-scan.
  await prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? `/zxing/${ZXING_WASM_VERSION}/${path}` : prefix + path,
    },
    fireImmediately: true,
  });
  return new BarcodeDetector({ formats: FORMATS as BarcodeFormat[] });
}

/** One shared reader per page; the WebAssembly download starts on first use. */
export function getBarcodeReader(): Promise<BarcodeReader> {
  reader ??= createReader().catch(error => {
    reader = null;
    throw error;
  });
  return reader;
}
