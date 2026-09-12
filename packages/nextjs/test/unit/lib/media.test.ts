import { describe, expect, it } from "vitest";
import { PLACEHOLDER_BOOK_COVER, safeImageSrc, safeLinkHref } from "~~/lib/media";

describe("safeLinkHref", () => {
  it.each([
    "https://openlibrary.org/books/OL1M/Title",
    "http://openlibrary.org/books/OL1M/Title",
    "https://example.com/page?x=1",
  ])("keeps web links (%s)", href => {
    expect(safeLinkHref(href)).toBe(href);
  });

  it.each([
    "javascript:alert(document.domain)",
    " JavaScript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "/relative/path",
    "not a url",
    "",
    null,
    undefined,
  ])("replaces anything else with # (%j)", href => {
    expect(safeLinkHref(href)).toBe("#");
  });
});

describe("safeImageSrc", () => {
  it.each([
    "https://covers.openlibrary.org/b/id/14348537-M.jpg",
    "https://dtmqxpohipopgolmirik.supabase.co/storage/v1/object/public/library-images/uploads/a.jpg",
    "https://books.google.com/books/content?id=1",
  ])("keeps images from configured hosts (%s)", src => {
    expect(safeImageSrc(src, PLACEHOLDER_BOOK_COVER)).toBe(src);
  });

  it.each([
    "https://example.com/x.jpg",
    "http://covers.openlibrary.org/b/id/1-M.jpg",
    "https://covers.openlibrary.org.example.com/x.jpg",
    "javascript:alert(1)",
    "",
    null,
  ])("falls back for anything else (%j)", src => {
    expect(safeImageSrc(src, PLACEHOLDER_BOOK_COVER)).toBe(PLACEHOLDER_BOOK_COVER);
  });

  it("uses the same host list as next.config.js", async () => {
    const hosts = (await import("~~/lib/imageHosts.json")).default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require("../../../next.config.js");
    expect(config.images.remotePatterns.map((pattern: { hostname: string }) => pattern.hostname)).toEqual(hosts);
  });
});
