// @ts-check
const imageHosts = require("./lib/imageHosts.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  webpack: config => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  images: {
    // One list shared with lib/media.ts, which swaps any other host for a placeholder before rendering.
    remotePatterns: imageHosts.map(hostname => ({ protocol: "https", hostname })),
  },
};

module.exports = nextConfig;
