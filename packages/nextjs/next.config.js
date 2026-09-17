// @ts-check
const imageHosts = require("./lib/imageHosts.json");

// Sent with every response. A full script-src Content Security Policy comes after the wallet
// libraries are removed; they load scripts and open connections to many hosts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  // Scanning needs the camera and location, only on our own pages; nothing needs the microphone.
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  images: {
    // One list shared with lib/media.ts, which swaps any other host for a placeholder before rendering.
    remotePatterns: imageHosts.map(hostname => ({ protocol: "https", hostname })),
    // Vercel bills an image transformation whenever its copy is missing or stale, and its free
    // allowance is 5,000 a month. Supabase serves the library photos with `no-cache`, so without
    // this every photo was transformed again every few hours. 31 days is what Vercel keeps.
    minimumCacheTTL: 2678400,
    // Each width in a srcset is transformed separately, so offer only the ones the layouts ask for:
    // library photos at full width on phones (640-1200) and the 56px list thumbnails (64/128).
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [64, 128, 256, 384],
    qualities: [75],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The barcode reader's WebAssembly, in a folder named after its version (scripts/copy-zxing-wasm.mjs).
      { source: "/zxing/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

module.exports = nextConfig;
