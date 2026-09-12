import { describe, expect, it } from "vitest";
import { rateLimit } from "~~/lib/rate-limit";

describe("rateLimit", () => {
  it("allows exactly `limit` requests per interval, then blocks", () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500, limit: 3 });

    expect(limiter.check("1.2.3.4").success).toBe(true);
    expect(limiter.check("1.2.3.4").success).toBe(true);
    expect(limiter.check("1.2.3.4").success).toBe(true);
    expect(limiter.check("1.2.3.4").success).toBe(false);
  });

  it("tracks each token separately", () => {
    const limiter = rateLimit({ interval: 60_000, limit: 1 });

    expect(limiter.check("a").success).toBe(true);
    expect(limiter.check("a").success).toBe(false);
    expect(limiter.check("b").success).toBe(true);
  });

  it("resets once the interval passes", async () => {
    const limiter = rateLimit({ interval: 30, limit: 1 });

    limiter.check("a");
    expect(limiter.check("a").success).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 60));
    expect(limiter.check("a").success).toBe(true);
  });

  it("does not extend the window while requests keep coming", async () => {
    const limiter = rateLimit({ interval: 50, limit: 1 });

    limiter.check("a");
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(limiter.check("a").success).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(limiter.check("a").success).toBe(true);
  });

  it("falls back to uniqueTokenPerInterval as the limit, then 500", () => {
    const small = rateLimit({ uniqueTokenPerInterval: 2 });
    expect(small.check("x").success).toBe(true);
    expect(small.check("x").success).toBe(true);
    expect(small.check("x").success).toBe(false);

    const defaults = rateLimit();
    for (let i = 0; i < 500; i++) {
      expect(defaults.check("x").success).toBe(true);
    }
    expect(defaults.check("x").success).toBe(false);
  });
});
