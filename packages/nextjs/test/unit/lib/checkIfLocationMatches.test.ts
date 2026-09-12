import { describe, expect, it } from "vitest";
import { checkIfLocationMatches } from "~~/components/maps/checkIfLocationMatches";

// With the Earth radius used by the function (6371 km), one degree of latitude is ~111.195 km,
// so moving north by N degrees moves exactly N * 111.195 km.
const library = { libraryLatitude: 38.883839, libraryLongitude: -77.107249 };
const userAt = (dLat: number, dLng = 0) => ({
  ...library,
  userLatitude: library.libraryLatitude + dLat,
  userLongitude: library.libraryLongitude + dLng,
});

describe("checkIfLocationMatches", () => {
  it("matches when the user is standing at the library", () => {
    expect(checkIfLocationMatches(userAt(0))).toBe(true);
  });

  it("matches within the current 1500 ft (~457 m) radius", () => {
    // The comments and UI copy say 20-30 ft, but the code uses 1500 ft. This locks in the real behavior.
    expect(checkIfLocationMatches(userAt(0.0041))).toBe(true); // ~456 m north
    expect(checkIfLocationMatches(userAt(-0.0041))).toBe(true); // ~456 m south
  });

  it("does not match just past the radius", () => {
    expect(checkIfLocationMatches(userAt(0.0042))).toBe(false); // ~467 m north
  });

  it("accounts for longitude shrinking with latitude", () => {
    // At ~38.9°N a degree of longitude is ~86.5 km, so 0.005° east is ~433 m (inside),
    // even though 0.005° of latitude would be ~556 m (outside).
    expect(checkIfLocationMatches(userAt(0, 0.005))).toBe(true);
    expect(checkIfLocationMatches(userAt(0.005))).toBe(false);
  });

  it("does not match a library across town", () => {
    expect(checkIfLocationMatches(userAt(0.05, 0.05))).toBe(false);
  });
});
