import { createPrismaClient } from "../../lib/prismaClient";
import { bookInfo } from "../../test/fixtures/openLibrary";
import prepareTestDatabase from "../../test/setup/integrationGlobal";
import { getTestDatabaseUrl } from "../../test/setup/testDatabaseUrl";
import { BARCODE_VIDEO_ISBN } from "../fixtures/barcodeVideo";
import { expect, test } from "@playwright/test";

// Chrome's fake camera plays a video of a book's barcode (see playwright.config.ts), so this scans
// a real barcode: camera, barcode reader (the WebAssembly one where Chrome has no built-in reader),
// lookup and save. The book lookup and save responses are stubbed; their server side has its own
// tests.

const db = createPrismaClient(getTestDatabaseUrl());
const AT = { latitude: 38.883839, longitude: -77.107249 };

test.beforeAll(() => {
  prepareTestDatabase();
});
test.afterAll(() => db.$disconnect());

for (const reader of ["the browser's reader", "the WebAssembly reader iPhones use"]) {
  test(`the camera reads a book's barcode with ${reader} and adds the book`, async ({ browser }) => {
    const library = await db.library.create({ data: { locationName: "Barcode Test Library", ...AT } });
    const context = await browser.newContext({ permissions: ["camera", "geolocation"], geolocation: AT });
    const page = await context.newPage();
    if (reader.includes("WebAssembly")) {
      // Safari has no built-in reader; without one, the scanner loads ZXing's WebAssembly.
      await page.addInitScript(() => {
        delete (window as { BarcodeDetector?: unknown }).BarcodeDetector;
      });
    }
    const wasm: string[] = [];
    page.on("response", response => {
      if (response.url().endsWith(".wasm")) wasm.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });

    const lookups: string[] = [];
    await page.route("**/api/book?*", async route => {
      lookups.push(new URL(route.request().url()).searchParams.get("isbn") ?? "");
      await route.fulfill({ json: { book: { ...bookInfo, libraryId: undefined } } });
    });
    const saved: unknown[] = [];
    await page.route("**/api/saveBook", route => {
      saved.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, json: { award: { pointsAwarded: 5, total: 5, newBooksThisVisit: 1 } } });
    });

    await page.goto(`/libs/${library.id}`);

    await expect(page.getByText("Book added successfully!")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Scanned Books: 1/)).toBeVisible();
    expect(lookups[0]).toBe(BARCODE_VIDEO_ISBN);
    expect(saved[0]).toEqual({ isbn: BARCODE_VIDEO_ISBN, libraryId: library.id, via: "camera" });
    if (reader.includes("WebAssembly")) {
      // Loaded once, from our own site rather than a CDN.
      expect(wasm).toEqual([expect.stringMatching(/^200 \/zxing\/[\d.]+\/zxing_reader\.wasm$/)]);
    }

    await context.close();
  });
}

test("a book without a barcode is found by title and added", async ({ browser }) => {
  const library = await db.library.create({ data: { locationName: "Search Test Library", ...AT } });
  const context = await browser.newContext({ permissions: ["geolocation"], geolocation: AT });
  const page = await context.newPage();
  // No camera, so the fake barcode video doesn't add a book while we search.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("No camera", "NotFoundError"));
  });

  const searches: string[] = [];
  await page.route("**/api/book/search?*", async route => {
    searches.push(new URL(route.request().url()).search);
    await route.fulfill({
      json: {
        results: [
          {
            title: "Controversial essays",
            authors: "John Hanbury Angus Sparrow",
            year: "1966",
            thumbnail: "https://covers.openlibrary.org/b/id/10066834-M.jpg",
            isbn13: null,
            editionKey: "OL6014553M",
          },
        ],
      },
    });
  });
  const saved: unknown[] = [];
  await page.route("**/api/saveBook", route => {
    saved.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { award: { pointsAwarded: 2, total: 2, searchLimitReached: false } } });
  });

  await page.goto(`/libs/${library.id}`);
  await page.getByRole("button", { name: /Search by title/ }).click();
  await page.getByLabel("Title").fill("controversial essays");
  await page.getByLabel(/Author/).fill("sparrow");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: /Controversial essays/ }).click();

  await expect(page.getByText("Book added successfully!")).toBeVisible();
  await expect(page.getByText("Searched Book Points")).toBeVisible();
  expect(searches).toEqual(["?title=controversial+essays&author=sparrow"]);
  expect(saved).toEqual([{ editionKey: "OL6014553M", libraryId: library.id, via: "search" }]);

  await context.close();
});
