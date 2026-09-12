import { BookDetails, parseOpenLibraryResponse } from "~~/lib/openLibrary";

interface BookInfo extends BookDetails {
  updatedAt: string;
  libraryId: string;
}

// Looks the book up in the browser so the page can react immediately. The server repeats the
// lookup when saving and never stores these details as sent.
export async function fetchBookData(isbn: string, libraryId: string): Promise<BookInfo | null> {
  const response = await fetch(`/api/openlibrary?isbn=${encodeURIComponent(isbn)}`);
  const book = parseOpenLibraryResponse(await response.json());
  return book ? { ...book, libraryId, updatedAt: new Date().toISOString() } : null;
}
