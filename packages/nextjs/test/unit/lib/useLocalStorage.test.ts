import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLocalStorage } from "~~/hooks/useLocalStorage";

describe("useLocalStorage", () => {
  it("returns the initial value when nothing is stored", () => {
    const { result } = renderHook(() => useLocalStorage("bpyr", false));
    expect(result.current[0]).toBe(false);
  });

  it("loads a previously stored value after mount", async () => {
    window.localStorage.setItem("bpyr", "true");
    const { result } = renderHook(() => useLocalStorage("bpyr", false));

    await waitFor(() => expect(result.current[0]).toBe(true));
  });

  it("persists updates as JSON", () => {
    const { result } = renderHook(() => useLocalStorage("bpyr", false));

    act(() => result.current[1](true));

    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem("bpyr")).toBe("true");
  });

  it("falls back to the initial value when stored JSON is corrupt", async () => {
    window.localStorage.setItem("bpyr", "{not json");
    const { result } = renderHook(() => useLocalStorage("bpyr", false));

    await waitFor(() => expect(result.current[0]).toBe(false));
  });
});
