// Finding a book by title (and author) when it has no barcode, in OpenLibrary and Google Books.
// The browser shows the matches; saving looks the chosen one up again by its ISBN or OpenLibrary
// edition id (/api/saveBook), so nothing from here is stored as-is.
import { hasValidEan13CheckDigit, hasValidIsbn10CheckDigit, isbn10To13 } from "./isbn";
import { EDITION_KEY, MAX_TEXT, httpsUrlOn, text } from "./openLibrary";
import "server-only";

export interface SearchResult {
  title: string;
  authors: string;
  year: string;
  thumbnail: string;
  // At least one is set. Saving uses the ISBN when there is one.
  isbn13: string | null;
  editionKey: string | null;
}

export const MAX_RESULTS = 8;
export const MAX_QUERY = { title: 120, author: 100 };

/** A title or author as typed, trimmed, with control characters and quotes removed. */
export function cleanQuery(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\p{Cc}"]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const yearOf = (value: unknown) => String(value ?? "").match(/\b(1[4-9]|20)\d\d\b/)?.[0] ?? "";

// The first ISBN-13 in a list of ISBN-10s and ISBN-13s, converting an ISBN-10 if that's all there is.
function firstIsbn13(values: unknown): string | null {
  const codes = (Array.isArray(values) ? values : [])
    .map(value => (typeof value === "string" ? value.replace(/[\s-]/g, "").toUpperCase() : ""))
    .filter(Boolean);
  const isbn13 = codes.find(code => /^97[89]\d{10}$/.test(code) && hasValidEan13CheckDigit(code));
  if (isbn13) return isbn13;
  const isbn10 = codes.find(hasValidIsbn10CheckDigit);
  return isbn10 ? isbn10To13(isbn10) : null;
}

// OpenLibrary fills in `editions` (each work's best-matching edition) only when the work's `key` is
// asked for too.
const OPENLIBRARY_FIELDS = [
  "key",
  "title",
  "author_name",
  "first_publish_year",
  "cover_i",
  "cover_edition_key",
  "editions",
  "editions.key",
  "editions.title",
  "editions.isbn",
  "editions.cover_i",
  "editions.publish_date",
].join(",");

export function openLibrarySearchUrl(title: string, author: string) {
  const params = new URLSearchParams({ title, limit: String(MAX_RESULTS), fields: OPENLIBRARY_FIELDS });
  if (author) params.set("author", author);
  return `https://openlibrary.org/search.json?${params}`;
}

type OpenLibraryDoc = {
  title?: unknown;
  author_name?: unknown[];
  first_publish_year?: unknown;
  cover_i?: unknown;
  cover_edition_key?: unknown;
  editions?: {
    docs?: { key?: unknown; title?: unknown; isbn?: unknown[]; cover_i?: unknown; publish_date?: unknown[] }[];
  };
};

const coverUrl = (id: unknown) =>
  typeof id === "number" && Number.isInteger(id) && id > 0 ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : "";

const authorsOf = (names: unknown) =>
  (Array.isArray(names) ? names : [])
    .map(name => text(name, 100))
    .filter(Boolean)
    .join(", ")
    .slice(0, MAX_TEXT.authors);

/** Matches in an OpenLibrary search response: each work's best-matching edition. */
export function parseOpenLibrarySearch(data: unknown): SearchResult[] {
  const docs = (data as { docs?: unknown } | null)?.docs;
  if (!Array.isArray(docs)) return [];
  return (docs as (OpenLibraryDoc | null)[]).flatMap(doc => {
    // The edition with a cover stands in if OpenLibrary didn't pick a best edition.
    const edition =
      doc?.editions?.docs?.[0] ?? (doc?.cover_edition_key ? { key: `/books/${doc.cover_edition_key}` } : undefined);
    const editionKey = String(edition?.key ?? "").replace(/^\/books\//, "");
    if (!doc || !edition || !EDITION_KEY.test(editionKey)) return [];
    const title = text(edition.title, MAX_TEXT.title) || text(doc.title, MAX_TEXT.title);
    if (!title) return [];
    return [
      {
        title,
        authors: authorsOf(doc.author_name),
        year: yearOf(edition.publish_date?.[0]) || yearOf(doc.first_publish_year),
        thumbnail: coverUrl(edition.cover_i) || coverUrl(doc.cover_i),
        isbn13: firstIsbn13(edition.isbn),
        editionKey,
      },
    ];
  });
}

const GOOGLE_FIELDS = "items(volumeInfo(title,authors,publishedDate,industryIdentifiers,imageLinks/thumbnail))";

export function googleBooksSearchUrl(title: string, author: string, key: string) {
  const q = `intitle:"${title}"` + (author ? ` inauthor:"${author}"` : "");
  const params = new URLSearchParams({
    q,
    maxResults: String(MAX_RESULTS),
    printType: "books",
    fields: GOOGLE_FIELDS,
    key,
  });
  return `https://www.googleapis.com/books/v1/volumes?${params}`;
}

type GoogleVolume = {
  volumeInfo?: {
    title?: unknown;
    authors?: unknown[];
    publishedDate?: unknown;
    industryIdentifiers?: { type?: unknown; identifier?: unknown }[];
    imageLinks?: { thumbnail?: unknown };
  };
};

/** Matches in a Google Books search response. Only books with an ISBN, which is how they're saved. */
export function parseGoogleBooksSearch(data: unknown): SearchResult[] {
  const items = (data as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return [];
  return (items as (GoogleVolume | null)[]).flatMap(item => {
    const info = item?.volumeInfo;
    const identifiers = Array.isArray(info?.industryIdentifiers) ? info.industryIdentifiers : [];
    const isbn13 = firstIsbn13(
      identifiers.filter(id => id?.type === "ISBN_13" || id?.type === "ISBN_10").map(id => id?.identifier),
    );
    const title = text(info?.title, MAX_TEXT.title);
    if (!info || !isbn13 || !title) return [];
    return [
      {
        title,
        authors: authorsOf(info.authors),
        year: yearOf(info.publishedDate),
        thumbnail: httpsUrlOn(info.imageLinks?.thumbnail, "books.google.com"),
        isbn13,
        editionKey: null,
      },
    ];
  });
}

async function getJson(url: string, catalog: string, timeoutMs: number) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`${catalog} search responded with status: ${response.status}`);
  return response.json();
}

// OpenLibrary's search often takes 2 to 9 seconds; Google Books answers in about one.
const OPENLIBRARY_TIMEOUT_MS = 10_000;
const GOOGLE_TIMEOUT_MS = 8_000;

/**
 * Books matching a title (and optionally an author), at most MAX_RESULTS. Both catalogs are asked
 * at once; OpenLibrary's matches come first, since only it has editions without an ISBN. Throws
 * only if no catalog answered.
 */
export async function searchBooks(title: string, author: string): Promise<SearchResult[]> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const [openLibrary, google] = await Promise.allSettled([
    getJson(openLibrarySearchUrl(title, author), "OpenLibrary", OPENLIBRARY_TIMEOUT_MS).then(parseOpenLibrarySearch),
    key
      ? getJson(googleBooksSearchUrl(title, author, key), "Google Books", GOOGLE_TIMEOUT_MS).then(
          parseGoogleBooksSearch,
        )
      : Promise.resolve(null),
  ]);
  if (openLibrary.status === "rejected") console.error("OpenLibrary search failed:", openLibrary.reason);
  if (google.status === "rejected") console.error("Google Books search failed:", google.reason);

  const answers = [openLibrary, google].flatMap(answer => (answer.status === "fulfilled" && answer.value) || []);
  if (openLibrary.status === "rejected" && (google.status === "rejected" || !google.value)) {
    throw openLibrary.reason;
  }

  // The same edition can come back from both catalogs, or twice from one.
  const seen = new Set<string>();
  return answers
    .filter(result => {
      const id = result.isbn13 ?? result.editionKey ?? "";
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, MAX_RESULTS);
}
