// Fails if the built browser JavaScript (.next/static) contains a Supabase secret key, a
// service_role JWT, or the value of any server-only secret env var. Run after `next build`.
import { CLIENT_SECRET_MARKERS, serverSecretValues } from "./secretMarkers.mjs";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../.next/static", import.meta.url).pathname;

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (entry.name.endsWith(".js")) yield path;
  }
}

const needles = [
  ...CLIENT_SECRET_MARKERS.map(marker => ({ label: `marker ${marker}`, value: marker })),
  ...serverSecretValues().map(({ name, value }) => ({ label: `value of ${name}`, value })),
];

let scanned = 0;
const leaks = [];
for (const file of files(root)) {
  scanned++;
  const content = readFileSync(file, "utf8");
  for (const { label, value } of needles) {
    if (content.includes(value)) leaks.push(`${label} in ${file.slice(root.length + 1)}`);
  }
}

if (scanned === 0) {
  console.error(`No JavaScript found under ${root}. Run next build first.`);
  process.exit(1);
}
if (leaks.length > 0) {
  console.error(`Secrets found in browser JavaScript:\n  ${leaks.join("\n  ")}`);
  process.exit(1);
}
console.log(`No secrets in ${scanned} browser JavaScript files (${needles.length} checks).`);
