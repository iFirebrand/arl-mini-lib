import type { BookDetails } from "~~/lib/openLibrary";

interface BookInfo extends BookDetails {
  updatedAt: string;
  libraryId: string;
}

// Looks the book up (OpenLibrary, then Google Books) so the page can react immediately. The server
// repeats the lookup when saving and never stores these details as sent. Returns null if no catalog
// has the book; throws if the lookup itself failed.
export async function fetchBookData(isbn: string, libraryId: string): Promise<BookInfo | null> {
  const response = await fetch(`/api/book?isbn=${encodeURIComponent(isbn)}`);
  if (!response.ok) throw new Error(`Book lookup failed with status: ${response.status}`);
  const { book } = (await response.json()) as { book: BookDetails | null };
  return book ? { ...book, libraryId, updatedAt: new Date().toISOString() } : null;
}
