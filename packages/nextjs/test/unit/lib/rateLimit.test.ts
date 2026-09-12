import { describe, expect, it } from "vitest";
import { rateLimit } from "~~/lib/rate-limit";

describe("rateLimit", () => {
  it("allows limit - 1 requests per interval, then blocks", () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 3 });

    expect(limiter.check("1.2.3.4").success).toBe(true);
    expect(limiter.check("1.2.3.4").success).toBe(true);
    expect(limiter.check("1.2.3.4").success).toBe(false);
    expect(limiter.check("1.2.3.4").success).toBe(false);
  });

  it("tracks each token separately", () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 2 });

    expect(limiter.check("a").success).toBe(true);
    expect(limiter.check("a").success).toBe(false);
    expect(limiter.check("b").success).toBe(true);
  });

  it("resets once the interval passes", async () => {
    const limiter = rateLimit({ interval: 30, uniqueTokenPerInterval: 2 });

    limiter.check("a");
    expect(limiter.check("a").success).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 60));
    expect(limiter.check("a").success).toBe(true);
  });

  it("defaults to 500 requests per minute", () => {
    const limiter = rateLimit();
    for (let i = 0; i < 499; i++) {
      expect(limiter.check("x").success).toBe(true);
    }
    expect(limiter.check("x").success).toBe(false);
  });
});
