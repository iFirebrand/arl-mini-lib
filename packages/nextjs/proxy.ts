import { type NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy, createNonce } from "./lib/csp";

// Report-only while we collect reports: browsers say what the policy would block without blocking
// it. Switching to enforcing means renaming this header to Content-Security-Policy.
export const CSP_HEADER = "Content-Security-Policy-Report-Only";

// Gives every page a fresh nonce and its Content Security Policy (lib/csp.ts). Next.js reads the
// nonce from the request's policy header and puts it on its own scripts; app/layout.tsx reads
// x-nonce for the scripts we add.
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce, { dev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_HEADER, policy);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not API routes, Next.js assets, or files in public/ (anything with an extension).
      source: "/((?!api/|_next/static|_next/image|.*\\.[a-z0-9]+$).*)",
      // Link prefetches fetch data, not pages.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
