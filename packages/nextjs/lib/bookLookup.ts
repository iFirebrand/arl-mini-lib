import { lookupGoogleBook } from "./googleBooks";
import { hasValidIsbn10CheckDigit, isbn10To13 } from "./isbn";
import { type BookDetails, lookupBook as lookupOpenLibraryBook } from "./openLibrary";
import "server-only";

// Once Google Books has the book, how much longer to wait for OpenLibrary's record, which we prefer.
// OpenLibrary sometimes takes several seconds or times out; Google Books answers in about one.
export const OPENLIBRARY_GRACE_MS = 1500;

type Outcome = { ok: true; book: BookDetails | null } | { ok: false; error: unknown };
const settle = (lookup: Promise<BookDetails | null>): Promise<Outcome> =>
  lookup.then(
    book => ({ ok: true, book }),
    error => ({ ok: false, error }),
  );
const WAITED = Symbol("waited");
const wait = (ms: number) => new Promise<typeof WAITED>(resolve => setTimeout(() => resolve(WAITED), ms));

/**
 * Finds a book by ISBN (10 or 13 digits, as normalizeIsbn returns) in OpenLibrary and Google Books,
 * asked at once. OpenLibrary's record wins unless it's slow, missing or failing. Returns null if
 * neither has the book; throws if we can't tell, because a catalog that might have it didn't answer.
 */
export async function findBook(isbn: string): Promise<BookDetails | null> {
  const isbn13 = isbn.length === 10 && hasValidIsbn10CheckDigit(isbn) ? isbn10To13(isbn) : isbn;
  const key = process.env.GOOGLE_BOOKS_API_KEY;

  const openLibrary = settle(lookupOpenLibraryBook(isbn13));
  const google: Promise<Outcome> = key
    ? settle(lookupGoogleBook(isbn13, key))
    : Promise.resolve({ ok: true, book: null });

  // OpenLibrary's answer, or WAITED if Google Books found the book and OpenLibrary took too long.
  const fromOpenLibrary = await Promise.race<Outcome | typeof WAITED>([
    openLibrary,
    google.then<Outcome | typeof WAITED>(outcome =>
      outcome.ok && outcome.book ? wait(OPENLIBRARY_GRACE_MS) : openLibrary,
    ),
  ]);
  if (fromOpenLibrary !== WAITED && fromOpenLibrary.ok && fromOpenLibrary.book) return fromOpenLibrary.book;
  if (fromOpenLibrary !== WAITED && !fromOpenLibrary.ok)
    console.error("OpenLibrary lookup failed:", fromOpenLibrary.error);

  const fromGoogle = await google;
  if (fromGoogle.ok && fromGoogle.book) return fromGoogle.book;
  if (!fromGoogle.ok) console.error("Google Books lookup failed:", fromGoogle.error);

  // Neither catalog has it, as far as we can tell. (WAITED only happens when Google Books had it.)
  if (fromOpenLibrary !== WAITED && !fromOpenLibrary.ok) throw fromOpenLibrary.error;

  // Only the ISBN, to see how often books go unfound and which catalog to add next.
  if (fromGoogle.ok) console.warn(`Book not found in any catalog: ${isbn13}`);
  return null;
}
