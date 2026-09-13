// Turning an ISBN into the book details we store, from OpenLibrary. The server looks books up
// (lib/bookLookup.ts) and never trusts book details sent by the browser.
import { hasValidIsbn10CheckDigit, isbn10To13 } from "./isbn";

export interface BookDetails {
  title: string;
  authors: string;
  thumbnail: string;
  description: string;
  isbn13: string;
  itemInfo: string;
}

export const MAX_TEXT = { title: 300, authors: 300, description: 1000 };

/** Digits of a valid-looking ISBN-10 or ISBN-13 (hyphens and spaces removed), or null. */
export function normalizeIsbn(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const isbn = raw.replace(/[\s-]/g, "").toUpperCase();
  return /^(?:\d{9}[\dX]|\d{13})$/.test(isbn) ? isbn : null;
}

export const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** An http(s) URL on exactly this host, upgraded to https; anything else becomes "". */
export const httpsUrlOn = (value: unknown, host: string) => {
  try {
    const url = new URL(String(value));
    if (url.hostname !== host || (url.protocol !== "https:" && url.protocol !== "http:")) return "";
    url.protocol = "https:";
    return url.href;
  } catch {
    return "";
  }
};

/** Details of the first record in an OpenLibrary brief-volumes response, or null if there is none. */
export function parseOpenLibraryResponse(data: unknown): BookDetails | null {
  const records = (data as { records?: Record<string, unknown> } | null)?.records;
  if (!records || typeof records !== "object") return null;
  const record = Object.values(records)[0] as
    | {
        recordURL?: unknown;
        data?: {
          title?: unknown;
          subtitle?: unknown;
          authors?: { name?: unknown }[];
          cover?: { medium?: unknown };
          identifiers?: { isbn_13?: unknown[]; isbn_10?: unknown[] };
        };
      }
    | undefined;
  const info = record?.data;
  // Older editions often have only an ISBN-10 on record.
  const isbn10 = normalizeIsbn(info?.identifiers?.isbn_10?.[0]);
  const isbn13 =
    normalizeIsbn(info?.identifiers?.isbn_13?.[0]) ??
    (isbn10 && hasValidIsbn10CheckDigit(isbn10) ? isbn10To13(isbn10) : null);
  const title = text(info?.title, MAX_TEXT.title);
  if (!info || !isbn13 || !title) return null;

  const authors = Array.isArray(info.authors)
    ? info.authors.map(author => text(author?.name, 100)).filter(Boolean)
    : [];
  return {
    title,
    authors: authors.join(", ").slice(0, MAX_TEXT.authors),
    thumbnail: httpsUrlOn(info.cover?.medium, "covers.openlibrary.org"),
    description: text(info.subtitle, MAX_TEXT.description),
    isbn13,
    itemInfo: httpsUrlOn(record?.recordURL, "openlibrary.org"),
  };
}

export const openLibraryUrlFor = (isbn: string) => `https://openlibrary.org/api/volumes/brief/isbn/${isbn}.json`;

/** Server-side lookup. Throws if OpenLibrary is unreachable; returns null if it has no such book. */
export async function lookupBook(isbn: string): Promise<BookDetails | null> {
  const response = await fetch(openLibraryUrlFor(isbn), { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    throw new Error(`OpenLibrary API responded with status: ${response.status}`);
  }
  return parseOpenLibraryResponse(await response.json());
}
