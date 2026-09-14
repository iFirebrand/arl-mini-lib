// The site's Content Security Policy: which scripts may run and where pages may load from or send
// data to. proxy.ts sends it with a fresh nonce on every page. It starts in report-only mode, so
// browsers report what it would block (to CSP_REPORT_PATH) without blocking anything.
import IMAGE_HOSTS from "./imageHosts.json";

export const CSP_REPORT_PATH = "/api/csp-report";

// Everything we load from other sites, and why.
const IMAGES = [
  // Library photos and book covers (the same list next/image and lib/media.ts use).
  ...IMAGE_HOSTS.map(host => `https://${host}`),
  // OpenLibrary covers redirect to the Internet Archive.
  "https://archive.org",
  "https://*.archive.org",
  // Map tiles.
  "https://*.tile.openstreetmap.org",
  // Google Analytics beacons.
  "https://*.google-analytics.com",
  "https://*.googletagmanager.com",
];
const CONNECTIONS = [
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://*.googletagmanager.com",
];
// The /watch video.
const FRAMES = ["https://www.youtube-nocookie.com"];

export function contentSecurityPolicy(nonce: string, { dev = false } = {}): string {
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    // Only scripts carrying this request's nonce run, plus whatever those load ('strict-dynamic':
    // Next.js chunks, Google's gtag.js, Vercel's analytics). The barcode reader compiles
    // WebAssembly ('wasm-unsafe-eval'). React needs eval in development only.
    [
      "script-src",
      ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", "'wasm-unsafe-eval'", ...(dev ? ["'unsafe-eval'"] : [])],
    ],
    // React renders style attributes and the map positions tiles with them; styles can't run code.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", ...IMAGES]],
    ["font-src", ["'self'"]],
    // Development reloads over a WebSocket.
    ["connect-src", ["'self'", ...CONNECTIONS, ...(dev ? ["ws:"] : [])]],
    ["frame-src", FRAMES],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
    // report-uri works in every browser and sends at once. (Given report-to as well, Chrome uses
    // that instead, and its batched reports never arrived in testing.)
    ["report-uri", [CSP_REPORT_PATH]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

/** A nonce: 128 random bits, base64. New for every page request. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
