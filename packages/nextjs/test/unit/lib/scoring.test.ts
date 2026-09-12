import { describe, expect, it } from "vitest";
import { getBookRecencyBonus } from "~~/app/libs/[id]/scoring";

const now = new Date("2026-09-12T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe("getBookRecencyBonus", () => {
  it.each([
    [0, 0],
    [0.9, 0],
    [1, 1],
    [7.5, 1],
    [8, 2],
    [14.9, 2],
    [15, 3],
    [21.5, 3],
    [22, 4],
    [28.5, 4],
    [29, 5],
    [400, 5],
  ])("gives %s days since last confirmed a bonus of %i", (days, bonus) => {
    expect(getBookRecencyBonus(daysAgo(days), now)).toBe(bonus);
  });

  it("accepts serialized dates from the server", () => {
    expect(getBookRecencyBonus(daysAgo(10).toISOString(), now)).toBe(2);
  });

  it("gives no bonus for timestamps in the future", () => {
    expect(getBookRecencyBonus(daysAgo(-3), now)).toBe(0);
  });
});
