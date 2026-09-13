import React from "react";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VercelInsights } from "~~/components/VercelInsights";

type BeforeSend = (event: { url: string }) => { url: string } | null;
const captured = vi.hoisted(() => ({ analytics: undefined as unknown, speed: undefined as unknown }));

vi.mock("@vercel/analytics/next", () => ({
  Analytics: ({ beforeSend }: { beforeSend: BeforeSend }) => {
    captured.analytics = beforeSend;
    return null;
  },
}));
vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: ({ beforeSend }: { beforeSend: BeforeSend }) => {
    captured.speed = beforeSend;
    return null;
  },
}));

const setWebdriver = (value: boolean) => Object.defineProperty(navigator, "webdriver", { value, configurable: true });

describe("VercelInsights", () => {
  afterEach(() => setWebdriver(false));

  it("reports visits from people", () => {
    setWebdriver(false);
    render(<VercelInsights />);
    const event = { url: "https://www.arlib.me/browse" };
    expect((captured.analytics as BeforeSend)(event)).toBe(event);
    expect((captured.speed as BeforeSend)(event)).toBe(event);
  });

  it("drops visits from automated browsers such as the smoke tests", () => {
    setWebdriver(true);
    render(<VercelInsights />);
    const event = { url: "https://www.arlib.me/browse" };
    expect((captured.analytics as BeforeSend)(event)).toBeNull();
    expect((captured.speed as BeforeSend)(event)).toBeNull();
  });
});
