import { type NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy, createNonce } from "./lib/csp";

// Report-only while we collect reports: browsers say what the policy would block without blocking
// it. Switching to enforcing means renaming this header to Content-Security-Policy.
export const CSP_HEADER = "Content-Security-Policy-Report-Only";

// Gives every page a fresh nonce and its Content Security Policy (lib/csp.ts). Next.js reads the
// nonce from the request's Content-Security-Policy header and puts it on its own scripts;
// app/layout.tsx reads x-nonce for the scripts we add. The request header must use that name even
// while the response is report-only: on Vercel a request header named ...-Report-Only didn't reach
// the page (it did under `next start`), so Next's scripts went out without the nonce.
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce, { dev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
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
