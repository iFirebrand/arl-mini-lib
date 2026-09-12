// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CLIENT_SECRET_MARKERS, serverSecretValues } from "~~/scripts/secretMarkers.mjs";

const jwt = (payload: object) =>
  ["header", Buffer.from(JSON.stringify(payload)).toString("base64url"), "signature"].join(".");

const flagged = (text: string) => CLIENT_SECRET_MARKERS.some(marker => text.includes(marker));

describe("client secret markers", () => {
  it.each([
    { role: "service_role" },
    { iss: "supabase", role: "service_role" },
    { iss: "supabase", ref: "abcdefghij", role: "service_role" },
    { iss: "supabasex", ref: "abcdefghijk", role: "service_role", iat: 1 },
  ])("flags a service_role JWT regardless of what precedes the role (%j)", payload => {
    expect(flagged(`const key = "${jwt(payload)}";`)).toBe(true);
  });

  it("flags new-format secret keys", () => {
    expect(flagged('createClient(url, "sb_secret_abc123")')).toBe(true);
  });

  it.each([{ role: "anon" }, { iss: "supabase", ref: "abcdefghij", role: "anon" }])(
    "does not flag public anon JWTs (%j)",
    payload => {
      expect(flagged(jwt(payload))).toBe(false);
    },
  );

  it("does not flag publishable keys", () => {
    expect(flagged("sb_publishable_abc123")).toBe(false);
  });
});

describe("serverSecretValues", () => {
  it("picks server-only credentials and skips public or short values", () => {
    const env = {
      SUPABASE_SECRET_KEY: "sb_secret_0123456789abcdefghij",
      DATABASE_URL: "postgresql://user:password@host:6543/postgres",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co/very/long/url",
      NODE_ENV: "production",
      SHORT_TOKEN: "abc",
      HOME: "/Users/someone/a/long/home/path",
    };

    expect(serverSecretValues(env).map(entry => entry.name)).toEqual(["SUPABASE_SECRET_KEY", "DATABASE_URL"]);
  });
});
