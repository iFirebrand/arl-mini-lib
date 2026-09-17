// @vitest-environment node
import { describe, expect, it } from "vitest";

const nextConfig = (await import("../../../next.config.js")).default;
const images = nextConfig.images ?? {};

// Vercel's free allowance is 5,000 image transformations a month, and it bills one whenever its
// copy of an image is missing or stale. These settings are what keeps the site inside it.
describe("image optimization budget", () => {
  it("keeps transformed images for the longest Vercel caches them", () => {
    // Supabase serves library photos with `no-cache`; without this they went stale every few hours.
    expect(images.minimumCacheTTL).toBe(2678400);
  });

  it("offers only the widths the layouts ask for, since each is transformed separately", () => {
    expect(images.deviceSizes).toEqual([640, 828, 1080, 1200, 1920]);
    // The 56px list thumbnails need 64 and 128 for ordinary and retina screens.
    expect(images.imageSizes).toEqual([64, 128, 256, 384]);
  });

  it("allows one quality", () => {
    expect(images.qualities).toEqual([75]);
  });
});
