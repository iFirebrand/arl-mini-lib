// @ts-check

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
    domains: ["books.google.com", "covers.openlibrary.org", "img.daisyui.com", "dtmqxpohipopgolmirik.supabase.co"],
  },
};

module.exports = nextConfig;
