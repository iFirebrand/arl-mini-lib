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
