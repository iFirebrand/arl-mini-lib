// @vitest-environment node
import { describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextConfig = require("../../../next.config.js");

const headersFor = async (path: string) => {
  const rules: { source: string; headers: { key: string; value: string }[] }[] = await nextConfig.headers();
  const rule = rules.find(r => r.source === "/:path*");
  expect(rule, `no header rule covers ${path}`).toBeDefined();
  return Object.fromEntries((rule?.headers ?? []).map(h => [h.key.toLowerCase(), h.value]));
};

describe("security headers", () => {
  it("apply to every path", async () => {
    const headers = await headersFor("/libs/abc");
    expect(headers).toMatchObject({
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-frame-options": "DENY",
    });
  });

  it("stop other sites from framing the app", async () => {
    expect((await headersFor("/"))["content-security-policy"]).toContain("frame-ancestors 'none'");
  });

  it("keep the camera and location available to our own pages for scanning", async () => {
    const policy = (await headersFor("/"))["permissions-policy"];
    expect(policy).toContain("camera=(self)");
    expect(policy).toContain("geolocation=(self)");
  });

  it("still send the full referrer to our own API routes, which check the origin", async () => {
    // strict-origin-when-cross-origin keeps the full URL for same-origin requests.
    expect((await headersFor("/"))["referrer-policy"]).not.toBe("no-referrer");
  });
});
