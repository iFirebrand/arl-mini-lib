// @vitest-environment node
import IMAGE_HOSTS from "../../../lib/imageHosts.json";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CSP_REPORT_PATH, contentSecurityPolicy, createNonce } from "~~/lib/csp";
import { parseCspReports } from "~~/lib/cspReport";

const directives = (policy: string) =>
  Object.fromEntries(
    policy.split("; ").map(directive => {
      const [name, ...values] = directive.split(" ");
      return [name, values];
    }),
  );

describe("contentSecurityPolicy", () => {
  const policy = directives(contentSecurityPolicy("abc123"));

  it("runs only scripts with this request's nonce, and what they load", () => {
    expect(policy["script-src"]).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'", "'wasm-unsafe-eval'"]);
    expect(policy["script-src"]).not.toContain("'unsafe-inline'");
    expect(policy["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("allows images from every host next/image and lib/media.ts allow, plus the archive and map tiles", () => {
    for (const host of IMAGE_HOSTS) expect(policy["img-src"]).toContain(`https://${host}`);
    expect(policy["img-src"]).toEqual(
      expect.arrayContaining(["https://archive.org", "https://*.archive.org", "https://*.tile.openstreetmap.org"]),
    );
  });

  it("keeps the rules the site already enforced", () => {
    expect(policy["frame-ancestors"]).toEqual(["'none'"]);
    expect(policy["object-src"]).toEqual(["'none'"]);
    expect(policy["base-uri"]).toEqual(["'self'"]);
    expect(policy["form-action"]).toEqual(["'self'"]);
  });

  it("frames only the YouTube video and reports to our endpoint", () => {
    expect(policy["frame-src"]).toEqual(["https://www.youtube-nocookie.com"]);
    expect(policy["report-uri"]).toEqual([CSP_REPORT_PATH]);
  });

  it("adds eval and the reload socket in development only", () => {
    const dev = directives(contentSecurityPolicy("abc123", { dev: true }));
    expect(dev["script-src"]).toContain("'unsafe-eval'");
    expect(dev["connect-src"]).toContain("ws:");
    expect(policy["connect-src"]).not.toContain("ws:");
  });
});

describe("createNonce", () => {
  it("makes a fresh base64 value of 128 bits each time", () => {
    const nonces = new Set(Array.from({ length: 100 }, createNonce));
    expect(nonces.size).toBe(100);
    for (const nonce of nonces) expect(atob(nonce)).toHaveLength(16);
  });
});

describe("parseCspReports", () => {
  it("reads a report-uri report, dropping query strings", () => {
    expect(
      parseCspReports({
        "csp-report": {
          "document-uri": "https://www.arlib.me/browse?q=secret",
          "violated-directive": "script-src-elem",
          "effective-directive": "script-src-elem",
          "blocked-uri": "https://evil.example.com/x.js?token=abc",
        },
      }),
    ).toEqual([{ directive: "script-src-elem", blocked: "https://evil.example.com/x.js", page: "/browse" }]);
  });

  it("reads Reporting API reports and keeps keywords such as inline", () => {
    expect(
      parseCspReports([
        {
          type: "csp-violation",
          body: { documentURL: "https://www.arlib.me/", effectiveDirective: "script-src-elem", blockedURL: "inline" },
        },
        { type: "deprecation", body: { message: "not ours" } },
        {
          type: "csp-violation",
          body: { documentURL: "https://www.arlib.me/watch", effectiveDirective: "img-src", blockedURL: "data:x" },
        },
      ]),
    ).toEqual([
      { directive: "script-src-elem", blocked: "inline", page: "/" },
      { directive: "img-src", blocked: "data:", page: "/watch" },
    ]);
  });

  it("reads at most 10 reports from one post", () => {
    const report = { type: "csp-violation", body: { effectiveDirective: "img-src", blockedURL: "inline" } };
    expect(parseCspReports(Array(50).fill(report))).toHaveLength(10);
  });

  it.each([null, "text", 42, {}, [{}], [{ type: "csp-violation" }]])("ignores %j", data => {
    expect(parseCspReports(data)).toEqual([]);
  });
});

describe("POST /api/csp-report", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  let ipCounter = 0;
  const post = async (body: string, ip = `10.8.1.${++ipCounter}`) => {
    const { POST } = await import("~~/app/api/csp-report/route");
    return POST(
      new Request("https://www.arlib.me/api/csp-report", { method: "POST", headers: { "x-forwarded-for": ip }, body }),
    );
  };

  it("logs one line per violation and answers 204", async () => {
    const res = await post(
      JSON.stringify([
        {
          type: "csp-violation",
          body: {
            documentURL: "https://www.arlib.me/about",
            effectiveDirective: "script-src-elem",
            blockedURL: "https://evil.example.com/x.js",
          },
        },
      ]),
    );

    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledWith("CSP violation: script-src-elem blocked https://evil.example.com/x.js on /about");
  });

  it("answers 204 to anything else without logging", async () => {
    expect((await post("not json")).status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });

  it("stops logging a browser that sends more than 30 reports a minute", async () => {
    const body = JSON.stringify([
      { type: "csp-violation", body: { effectiveDirective: "img-src", blockedURL: "inline" } },
    ]);
    for (let i = 0; i < 31; i++) await post(body, "192.0.2.99");
    expect(warn).toHaveBeenCalledTimes(30);
  });
});
