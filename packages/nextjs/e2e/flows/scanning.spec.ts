import { bookInfo } from "../../test/fixtures/openLibrary";
import prepareTestDatabase from "../../test/setup/integrationGlobal";
import { getTestDatabaseUrl } from "../../test/setup/testDatabaseUrl";
import { BARCODE_VIDEO_ISBN } from "../fixtures/barcodeVideo";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

// Chrome's fake camera plays a video of a book's barcode (see playwright.config.ts), so this scans
// a real barcode: camera, barcode reader (the WebAssembly one where Chrome has no built-in reader),
// lookup and save. The book lookup and save responses are stubbed; their server side has its own
// tests.

const db = new PrismaClient({ datasourceUrl: getTestDatabaseUrl() });
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
    await page.route("**/api/saveBook", route =>
      route.fulfill({ status: 201, json: { award: { pointsAwarded: 5, total: 5, newBooksThisVisit: 1 } } }),
    );

    await page.goto(`/libs/${library.id}`);

    await expect(page.getByText("Book added successfully!")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Scanned Books: 1/)).toBeVisible();
    expect(lookups[0]).toBe(BARCODE_VIDEO_ISBN);
    if (reader.includes("WebAssembly")) {
      // Loaded once, from our own site rather than a CDN.
      expect(wasm).toEqual([expect.stringMatching(/^200 \/zxing\/[\d.]+\/zxing_reader\.wasm$/)]);
    }

    await context.close();
  });
}
