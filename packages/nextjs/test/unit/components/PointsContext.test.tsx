import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PointsProvider, usePoints } from "~~/app/contexts/PointsContext";
import { decrypt, encrypt } from "~~/lib/encryption";

// Matches the fallback in PointsContext when NEXT_PUBLIC_ENCRYPTION_KEY is unset.
const STORAGE_KEY = "arlib_temp_points";

const wrapper = ({ children }: { children: React.ReactNode }) => <PointsProvider>{children}</PointsProvider>;
const renderPoints = () => renderHook(() => usePoints(), { wrapper });

describe("PointsContext", () => {
  it("starts at zero", () => {
    const { result } = renderPoints();
    expect(result.current.points).toBe(0);
    expect(result.current.getPointActions()).toEqual([]);
  });

  it("adds points, records the action and saves it encrypted", () => {
    const { result } = renderPoints();

    act(() => result.current.addPoints(50, "CREATE_LIBRARY"));

    expect(result.current.points).toBe(50);
    expect(result.current.getPointActions()).toEqual([
      { action: "CREATE_LIBRARY", points: 50, timestamp: expect.any(Number) },
    ]);
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? "";
    expect(stored).not.toContain("CREATE_LIBRARY");
    expect(JSON.parse(decrypt(stored))).toMatchObject({ points: 50 });
  });

  it.each([0, -5, 101])("ignores an out-of-range amount (%i)", amount => {
    const { result } = renderPoints();

    act(() => result.current.addPoints(amount, "ADD_BOOK"));

    expect(result.current.points).toBe(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("caps unbanked points at 2000", () => {
    const { result } = renderPoints();

    for (let i = 0; i < 20; i++) {
      act(() => result.current.addPoints(100, "ADD_BOOK"));
    }
    expect(result.current.points).toBe(2000);

    act(() => result.current.addPoints(1, "ADD_BOOK"));
    expect(result.current.points).toBe(2000);
  });

  it("restores saved points on load", async () => {
    const saved = { points: 15, actions: [{ action: "ADD_BOOK", points: 15, timestamp: 1 }] };
    window.localStorage.setItem(STORAGE_KEY, encrypt(JSON.stringify(saved)));

    const { result } = renderPoints();

    await waitFor(() => expect(result.current.points).toBe(15));
    expect(result.current.getPointActions()).toEqual(saved.actions);
  });

  it("discards corrupted saved data", async () => {
    window.localStorage.setItem(STORAGE_KEY, "tampered");

    const { result } = renderPoints();

    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull());
    expect(result.current.points).toBe(0);
  });

  it("clears temporary points", () => {
    const { result } = renderPoints();
    act(() => result.current.addPoints(10, "ADD_BOOK"));

    act(() => result.current.clearTemporaryPoints());

    expect(result.current.points).toBe(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("throws when used outside the provider", () => {
    expect(() => renderHook(() => usePoints())).toThrow("usePoints must be used within a PointsProvider");
  });
});
