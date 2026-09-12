import { defineConfig, devices } from "@playwright/test";

// Read-only smoke tests: they only load pages and make GET requests, so they are safe to run against
// a local dev server, a Vercel preview URL or production.
//   yarn test:e2e                                   # starts `next dev` on :3000
//   E2E_BASE_URL=https://<preview>.vercel.app yarn test:e2e
// Preview deployments sit behind Vercel Authentication; set VERCEL_AUTOMATION_BYPASS_SECRET
// (Project Settings → Deployment Protection → Protection Bypass for Automation) to get through it.
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    extraHTTPHeaders: bypassSecret
      ? { "x-vercel-protection-bypass": bypassSecret, "x-vercel-set-bypass-cookie": "true" }
      : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "yarn dev", url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
