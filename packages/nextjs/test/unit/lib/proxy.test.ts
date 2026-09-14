// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { CSP_HEADER, config, proxy } from "~~/proxy";

describe("proxy", () => {
  it("sends each page its policy with a fresh nonce, and passes the nonce on to the page", () => {
    const first = proxy(new NextRequest("https://www.arlib.me/browse"));
    const second = proxy(new NextRequest("https://www.arlib.me/browse"));

    const policy = first.headers.get(CSP_HEADER) ?? "";
    const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();
    expect(second.headers.get(CSP_HEADER)).not.toContain(nonce);
    // NextResponse.next({ request: { headers } }) forwards request headers this way.
    expect(first.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(first.headers.get(`x-middleware-request-${CSP_HEADER.toLowerCase()}`)).toBe(policy);
  });

  it("is report-only for now", () => {
    expect(CSP_HEADER).toBe("Content-Security-Policy-Report-Only");
  });

  // Next.js matches paths against the source pattern as a whole.
  const matches = (path: string) => new RegExp(`^${config.matcher[0].source}$`).test(path);

  it.each(["/", "/browse", "/browse/cm4vbijmt0000jy03m9ejsei8", "/libs/abc", "/stats/personality", "/account"])(
    "runs on the page %s",
    path => expect(matches(path)).toBe(true),
  );

  it.each([
    "/api/book",
    "/api/csp-report",
    "/_next/static/chunks/app.js",
    "/_next/image",
    "/logo.svg",
    "/images/marker-icon.png",
    "/zxing/2.1.2/zxing_reader.wasm",
  ])("skips %s", path => expect(matches(path)).toBe(false));
});
