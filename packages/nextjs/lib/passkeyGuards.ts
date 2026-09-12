import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { rateLimit } from "./rate-limit";
import { getClientIp, isAllowedReferer } from "./requestGuards";
import "server-only";

// A passkey ceremony takes two requests; 20 a minute leaves room for retries.
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500, limit: 20 });

/** A response to send back if this passkey request should be refused, otherwise null. */
export function refusePasskeyRequest(request: Request): NextResponse | null {
  if (!limiter.check(getClientIp(request)).success) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }
  if (!isAllowedReferer(headers().get("referer"))) {
    return NextResponse.json({ error: "Unauthorized request origin" }, { status: 403 });
  }
  return null;
}
