import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatsClient from "~~/app/stats/StatsClient";
import { PLACEHOLDER_BOOK_COVER } from "~~/lib/media";

const book = {
  title: "The Wager",
  thumbnail: "https://covers.openlibrary.org/b/id/14348537-M.jpg",
  sourceURL: "",
  itemInfo: "https://openlibrary.org/books/OL50548140M/The_Wager",
  libraryId: "lib_1",
  libraryName: "Maple St",
};

const renderStats = (last50Books: (typeof book)[]) =>
  render(
    <StatsClient
      last50Books={last50Books}
      totalBooks={1}
      totalLibraries={1}
      totalUsers={0}
      topUsers={[]}
      newLibrariesCount={0}
      librariesWithDescriptionCount={0}
    />,
  );

describe("StatsClient", () => {
  it("links books to OpenLibrary", () => {
    const { container } = renderStats([book]);
    const links = [...container.querySelectorAll("a")].map(a => a.getAttribute("href"));
    expect(links).toContain(book.itemInfo);
  });

  it("never renders a script link or an unapproved image, even if one is stored", () => {
    const { container } = renderStats([
      { ...book, itemInfo: "javascript:alert(document.domain)", thumbnail: "https://example.com/x.jpg" },
    ]);

    const hrefs = [...container.querySelectorAll("a")].map(a => a.getAttribute("href") ?? "");
    expect(hrefs.some(href => href.toLowerCase().startsWith("javascript:"))).toBe(false);
    const srcs = [...container.querySelectorAll("img")].map(img => decodeURIComponent(img.getAttribute("src") ?? ""));
    expect(srcs.some(src => src.includes("example.com"))).toBe(false);
    expect(srcs.some(src => src.includes(PLACEHOLDER_BOOK_COVER))).toBe(true);
  });
});
