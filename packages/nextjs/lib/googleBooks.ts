// The second book catalog: Google Books, asked only when OpenLibrary has no match. Needs the
// server-only GOOGLE_BOOKS_API_KEY.
import { hasValidIsbn10CheckDigit, isbn10To13 } from "./isbn";
import { type BookDetails, MAX_TEXT, httpsUrlOn, text } from "./openLibrary";

// Only the fields we store, to keep responses small.
const FIELDS = "items(volumeInfo(title,subtitle,authors,industryIdentifiers,imageLinks/thumbnail,infoLink))";

export const googleBooksUrlFor = (isbn13: string, key: string) =>
  `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}&maxResults=5&fields=${encodeURIComponent(FIELDS)}&key=${encodeURIComponent(key)}`;

type Identifier = { type?: unknown; identifier?: unknown };
type Volume = {
  volumeInfo?: {
    title?: unknown;
    subtitle?: unknown;
    authors?: unknown[];
    industryIdentifiers?: Identifier[];
    imageLinks?: { thumbnail?: unknown };
    infoLink?: unknown;
  };
};

// The ISBN-13s a volume lists, including converted ISBN-10s.
const isbn13sOf = (identifiers: unknown): string[] =>
  (Array.isArray(identifiers) ? (identifiers as (Identifier | null)[]) : []).flatMap(entry => {
    const { type, identifier } = entry ?? {};
    const id = typeof identifier === "string" ? identifier.replace(/[\s-]/g, "").toUpperCase() : "";
    if (type === "ISBN_13" && /^\d{13}$/.test(id)) return [id];
    if (type === "ISBN_10" && hasValidIsbn10CheckDigit(id)) return [isbn10To13(id)];
    return [];
  });

/** The first volume in a Google Books response that really has this ISBN, or null. */
export function parseGoogleBooksResponse(data: unknown, isbn13: string): BookDetails | null {
  const items = (data as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return null;
  for (const item of items as Volume[]) {
    const info = item?.volumeInfo;
    // A search can return near matches; only an exact ISBN counts.
    if (!info || !isbn13sOf(info.industryIdentifiers).includes(isbn13)) continue;
    const title = text(info.title, MAX_TEXT.title);
    if (!title) continue;
    const authors = Array.isArray(info.authors) ? info.authors.map(author => text(author, 100)).filter(Boolean) : [];
    return {
      title,
      authors: authors.join(", ").slice(0, MAX_TEXT.authors),
      thumbnail: httpsUrlOn(info.imageLinks?.thumbnail, "books.google.com"),
      description: text(info.subtitle, MAX_TEXT.description),
      isbn13,
      itemInfo: httpsUrlOn(info.infoLink, "books.google.com"),
    };
  }
  return null;
}

/** Throws if Google Books is unreachable; returns null if it has no such book. */
export async function lookupGoogleBook(isbn13: string, key: string): Promise<BookDetails | null> {
  const response = await fetch(googleBooksUrlFor(isbn13, key), { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    throw new Error(`Google Books API responded with status: ${response.status}`);
  }
  return parseGoogleBooksResponse(await response.json(), isbn13);
}
