import { lookupGoogleBook } from "./googleBooks";
import { hasValidIsbn10CheckDigit, isbn10To13 } from "./isbn";
import { type BookDetails, lookupBook as lookupOpenLibraryBook } from "./openLibrary";
import "server-only";

/**
 * Finds a book by ISBN (10 or 13 digits, as normalizeIsbn returns): OpenLibrary first, then
 * Google Books. Returns null if neither has it; throws if we can't tell, because a catalog that
 * might have it didn't answer.
 */
export async function findBook(isbn: string): Promise<BookDetails | null> {
  const isbn13 = isbn.length === 10 && hasValidIsbn10CheckDigit(isbn) ? isbn10To13(isbn) : isbn;

  let openLibraryFailure: unknown = null;
  try {
    const book = await lookupOpenLibraryBook(isbn13);
    if (book) return book;
  } catch (error) {
    console.error("OpenLibrary lookup failed:", error);
    openLibraryFailure = error;
  }

  let googleFailed = false;
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (key) {
    try {
      const book = await lookupGoogleBook(isbn13, key);
      if (book) return book;
    } catch (error) {
      console.error("Google Books lookup failed:", error);
      if (openLibraryFailure) throw openLibraryFailure;
      googleFailed = true;
    }
  }
  if (openLibraryFailure) throw openLibraryFailure;

  // Only the ISBN, to see how often books go unfound and which catalog to add next.
  if (!googleFailed) console.warn(`Book not found in any catalog: ${isbn13}`);
  return null;
}
