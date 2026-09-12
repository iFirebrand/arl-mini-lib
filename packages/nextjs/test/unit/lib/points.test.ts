import { describe, expect, it } from "vitest";
import { MAX_ACTIONS_PER_REQUEST, validatePointActions } from "~~/lib/points";

describe("validatePointActions", () => {
  it("totals valid actions sent right after they happen (type)", () => {
    expect(
      validatePointActions([
        { points: 5, type: "ADD_BOOK", timestamp: "t" },
        { points: 50, type: "CREATE_LIBRARY", timestamp: "t" },
      ]),
    ).toEqual({ ok: true, total: 55 });
  });

  it("accepts actions saved before a wallet was connected (action)", () => {
    expect(validatePointActions([{ points: 10, action: "ADD_BOOK", timestamp: 1 }])).toEqual({ ok: true, total: 10 });
  });

  it("accepts the largest possible book award", () => {
    expect(validatePointActions([{ points: 15, type: "ADD_BOOK" }])).toEqual({ ok: true, total: 15 });
  });

  it.each([
    ["no actions", []],
    ["not an array", "ADD_BOOK"],
    ["missing", undefined],
  ])("rejects %s", (_label, input) => {
    expect(validatePointActions(input)).toEqual({ ok: false, error: "Point actions are required" });
  });

  it.each([
    ["an unknown action", [{ points: 10, type: "TEST_POINTS" }]],
    ["an action with no type", [{ points: 10 }]],
    ["a null entry", [null]],
  ])("rejects %s", (_label, input) => {
    expect(validatePointActions(input)).toEqual({ ok: false, error: "Unknown point action" });
  });

  it.each([
    ["more than an action can earn", [{ points: 16, type: "ADD_BOOK" }]],
    ["zero", [{ points: 0, type: "ADD_BOOK" }]],
    ["negative", [{ points: -5, type: "ADD_BOOK" }]],
    ["fractional", [{ points: 2.5, type: "ADD_BOOK" }]],
    ["a string", [{ points: "5", type: "ADD_BOOK" }]],
    [
      "a negative entry hidden among valid ones",
      [
        { points: 50, type: "CREATE_LIBRARY" },
        { points: -50, type: "ADD_BOOK" },
      ],
    ],
  ])("rejects points that are %s", (_label, input) => {
    expect(validatePointActions(input)).toEqual({ ok: false, error: "Invalid points value" });
  });

  it("rejects a request totalling more than 2000 points", () => {
    const actions = Array.from({ length: 41 }, () => ({ points: 50, type: "CREATE_LIBRARY" }));
    expect(validatePointActions(actions)).toEqual({ ok: false, error: "Invalid points value" });
    expect(validatePointActions(actions.slice(0, 40))).toEqual({ ok: true, total: 2000 });
  });

  it("rejects too many actions in one request", () => {
    const actions = Array.from({ length: MAX_ACTIONS_PER_REQUEST + 1 }, () => ({ points: 1, type: "ADD_BOOK" }));
    expect(validatePointActions(actions)).toEqual({ ok: false, error: "Too many point actions" });
  });
});
