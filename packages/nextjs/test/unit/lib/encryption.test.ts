import { afterEach, describe, expect, it, vi } from "vitest";
import { decrypt, encrypt } from "~~/lib/encryption";

// Same shape PointsContext stores in localStorage.
const pointsPayload = JSON.stringify({
  points: 5,
  actions: [{ action: "ADD_BOOK", points: 5, timestamp: 1736800000000 }],
});

describe("encryption", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips the points payload", () => {
    expect(decrypt(encrypt(pointsPayload))).toBe(pointsPayload);
  });

  it("produces an opaque string, not the raw JSON", () => {
    const encrypted = encrypt(pointsPayload);
    expect(encrypted).not.toContain("ADD_BOOK");
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("rejects a payload whose data was edited", () => {
    const decoded = JSON.parse(decodeURIComponent(atob(encrypt(pointsPayload))));
    decoded.data = decoded.data.replace('"points":5', '"points":2000');
    const tampered = btoa(encodeURIComponent(JSON.stringify(decoded)));

    expect(() => decrypt(tampered)).toThrow("Invalid data");
  });

  it("rejects garbage input", () => {
    expect(() => decrypt("not-base64-at-all")).toThrow("Invalid data");
  });

  it("rejects payloads older than 24 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const encrypted = encrypt(pointsPayload);

    vi.setSystemTime(new Date("2026-01-01T23:59:00Z"));
    expect(decrypt(encrypted)).toBe(pointsPayload);

    vi.setSystemTime(new Date("2026-01-02T00:01:00Z"));
    expect(() => decrypt(encrypted)).toThrow("Invalid data");
  });

  it("cannot read back a payload with an empty actions list (known quirk)", () => {
    // decrypt() finds the JSON by searching for a trailing `}]}`, which an empty array never has.
    const empty = JSON.stringify({ points: 0, actions: [] });
    expect(() => decrypt(encrypt(empty))).toThrow("Invalid data");
  });
});
