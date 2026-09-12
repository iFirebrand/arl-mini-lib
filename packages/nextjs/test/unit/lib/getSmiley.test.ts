import { describe, expect, it } from "vitest";
import { getSmiley } from "~~/app/libs/[id]/getSmiley";

describe("getSmiley", () => {
  it.each([
    [0, "😐"],
    [1, "🙂"],
    [5, "😂"],
    [10, "🤩"],
    [19, "😳"],
  ])("returns the face for %i books", (count, face) => {
    expect(getSmiley(count)).toBe(face);
  });

  it("returns a distinct face for every count from 0 to 19", () => {
    const faces = Array.from({ length: 20 }, (_, i) => getSmiley(i));
    expect(new Set(faces).size).toBe(20);
  });

  it("celebrates 20 or more books", () => {
    expect(getSmiley(20)).toBe("🎉");
    expect(getSmiley(500)).toBe("🎉");
  });
});
