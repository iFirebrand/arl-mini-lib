// Copies the barcode reader's WebAssembly file into public/, so the scanner loads it from our own
// site instead of a CDN. The folder is named after the zxing-wasm version barcode-detector uses,
// which lets it be cached forever. Runs before `next dev` and `next build`.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Resolve zxing-wasm the way barcode-detector does, in case several versions are installed.
const fromDetector = createRequire(createRequire(join(root, "package.json")).resolve("barcode-detector/ponyfill"));
const wasm = fromDetector.resolve("zxing-wasm/reader/zxing_reader.wasm");

let dir = dirname(wasm);
while (!existsSync(join(dir, "package.json"))) dir = dirname(dir);
const { version } = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));

const target = join(root, "public", "zxing", version);
mkdirSync(target, { recursive: true });
copyFileSync(wasm, join(target, "zxing_reader.wasm"));
console.log(`Copied zxing_reader.wasm ${version} to public/zxing/${version}/`);
