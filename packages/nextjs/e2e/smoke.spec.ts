import { CLIENT_SECRET_MARKERS } from "../scripts/secretMarkers.mjs";
import { expect, test } from "@playwright/test";

// Keep everything here read-only: these tests may run against production data.

test.describe("pages", () => {
  test("home page offers the main entry points", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1, name: "Arlington Mini Libraries" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enable Geolocation" })).toBeVisible();
    // Scope to the page body: on mobile the header's copies of these links are collapsed.
    await expect(page.locator('main a[href="/browse"]').first()).toBeVisible();
    await expect(page.locator('main a[href="/about"]').first()).toBeVisible();
  });

  test("browse lists libraries and opens one", async ({ page }) => {
    const response = await page.goto("/browse");
    expect(response?.status()).toBe(200);

    const heading = page.getByRole("heading", { name: /Discovered Mini Libraries \(\d+\)/ });
    await expect(heading).toBeVisible();
    const count = Number((await heading.textContent())?.match(/\((\d+)\)/)?.[1]);
    const libraryLinks = page.getByRole("link", { name: "Browse Books" });
    await expect(libraryLinks).toHaveCount(count);
    test.skip(count === 0, "No libraries in this environment's database");

    const href = await libraryLinks.first().getAttribute("href");
    expect(href).toMatch(/^\/browse\/.+/);
    const libraryPage = await page.goto(String(href));
    expect(libraryPage?.status()).toBe(200);
    await expect(page.getByText(/\d+ 📚 at /)).toBeVisible();
  });

  test("stats page shows totals", async ({ page }) => {
    const response = await page.goto("/stats");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { name: "Latest Stats" })).toBeVisible();
    await expect(page.getByText("Total Books")).toBeVisible();
    await expect(page.getByText("Total Libraries")).toBeVisible();
  });

  test("personality page loads", async ({ page }) => {
    const response = await page.goto("/stats/personality");
    expect(response?.status()).toBe(200);
  });

  test("about page loads", async ({ page }) => {
    const response = await page.goto("/about");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("ArlingtonAndUkraine+arlib@gmail.com").first()).toBeVisible();
  });

  test("scanning page handles an unknown library", async ({ page }) => {
    const response = await page.goto("/libs/does-not-exist");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Library not found")).toBeVisible();
  });

  test("add-library page asks for location when none is given", async ({ page }) => {
    const response = await page.goto("/libs");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Please enable geolocation to identify a library")).toBeVisible();
  });
});

test.describe("API", () => {
  test("OpenLibrary proxy requires an ISBN", async ({ request }) => {
    const res = await request.get("/api/openlibrary");
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "ISBN is required" });
  });

  test("points lookup requires a wallet", async ({ request }) => {
    const res = await request.get("/api/points");
    expect(res.status()).toBe(400);
  });

  test("points lookup returns a total for any wallet", async ({ request }) => {
    const res = await request.get("/api/points?walletAddress=0x000000000000000000000000000000000000dEaD");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ success: true, currentTotal: expect.any(Number) });
  });
});

test.describe("security", () => {
  test("pages send the security headers", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["permissions-policy"]).toContain("camera=(self)");
  });

  // Pages whose scripts include the most client code, including the add-library photo upload.
  for (const path of ["/", "/libs", "/browse", "/stats"]) {
    test(`no Supabase secret key in the scripts for ${path}`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      const scripts = [...new Set(html.match(/\/_next\/static\/[^"']+\.js/g) ?? [])];
      expect(scripts.length).toBeGreaterThan(0);

      for (const script of scripts) {
        const source = await (await request.get(script)).text();
        const found = CLIENT_SECRET_MARKERS.filter(marker => source.includes(marker));
        expect(found, `secret marker in ${script}`).toEqual([]);
      }
    });
  }
});
