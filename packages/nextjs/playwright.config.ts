import { getTestAppDatabaseUrl, getTestDatabaseUrl } from "./test/setup/testDatabaseUrl";
import { defineConfig, devices } from "@playwright/test";

// Two kinds of browser tests:
//
// Smoke tests (e2e/*.spec.ts) only load pages and make GET requests, so they are safe to run
// against a local dev server, a Vercel preview URL or production.
//   yarn test:e2e                                   # starts `next dev` on :3000
//   E2E_BASE_URL=https://<preview>.vercel.app yarn test:e2e
// Preview deployments sit behind Vercel Authentication; set VERCEL_AUTOMATION_BYPASS_SECRET
// (Project Settings → Deployment Protection → Protection Bypass for Automation) to get through it.
//
// Flow tests (e2e/flows) create accounts and passkeys, so they only ever run against a fresh local
// server wired to the throwaway test database (yarn test:db:up first).
//   yarn test:e2e:flows
const flows = Boolean(process.env.E2E_FLOWS);
const baseURL = flows ? "http://localhost:3000" : process.env.E2E_BASE_URL || "http://localhost:3000";
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const smokeServer = process.env.E2E_BASE_URL
  ? undefined
  : { command: "yarn dev", url: baseURL, reuseExistingServer: true, timeout: 180_000 };

// Never reuse a running server here: it might be pointed at production.
const flowsServer = {
  command: "yarn dev",
  url: baseURL,
  reuseExistingServer: false,
  timeout: 180_000,
  env: {
    DATABASE_URL: flows ? getTestAppDatabaseUrl() : "",
    DIRECT_URL: flows ? getTestDatabaseUrl() : "",
    NEXT_PUBLIC_SUPABASE_URL: "http://supabase.test",
  },
};

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
  projects: flows
    ? [{ name: "flows", testDir: "e2e/flows", use: { ...devices["Desktop Chrome"] } }]
    : [
        { name: "desktop", testIgnore: "flows/**", use: { ...devices["Desktop Chrome"] } },
        { name: "mobile", testIgnore: "flows/**", use: { ...devices["Pixel 7"] } },
      ],
  webServer: flows ? flowsServer : smokeServer,
});
