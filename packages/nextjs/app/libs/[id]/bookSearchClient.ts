import type { SearchResult } from "~~/lib/bookSearch";

/** Books matching a title (and author) in OpenLibrary and Google Books. Throws if the search failed. */
export async function searchCatalogs(title: string, author: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ title });
  if (author) params.set("author", author);
  const response = await fetch(`/api/book/search?${params}`);
  if (!response.ok) throw new Error(`Book search failed with status: ${response.status}`);
  return ((await response.json()) as { results: SearchResult[] }).results;
}

export type LookupMiss = { kind: "isbn"; isbn: string } | { kind: "search"; title: string; author: string };

/** Notes a book no catalog could find, so we learn which books go missing. Never throws. */
export function reportLookupMiss(miss: LookupMiss, libraryId: string): void {
  fetch("/api/lookupMiss", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...miss, libraryId }),
  }).catch(() => {});
}
