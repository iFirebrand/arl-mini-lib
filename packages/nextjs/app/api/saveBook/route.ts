import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { awardPoints, getOrCreateAccount, newBookPoints, searchedBookPoints } from "../../../lib/accounts";
import { findBook } from "../../../lib/bookLookup";
import prisma from "../../../lib/db";
import { EDITION_KEY, lookupEdition, normalizeIsbn } from "../../../lib/openLibrary";
import { rateLimit } from "../../../lib/rate-limit";
import { getClientIp, isAllowedReferer } from "../../../lib/requestGuards";

// Same pace as scanning: a scan takes a few seconds.
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500, limit: 30 });

// How a book reached the catalog, kept with it. Books found by title search earn fewer points.
const ADDED_VIA = ["camera", "photo", "typed", "search"] as const;
type AddedVia = (typeof ADDED_VIA)[number];

// Saves a scanned book, or one found by title search. Only an ISBN (or, for books without one, an
// OpenLibrary edition id) and the library come from the browser; the book details are looked up
// here, so nothing a visitor types ends up in the catalog as-is.
export async function POST(req: Request) {
  const clientIp = getClientIp(req);
  if (!limiter.check(clientIp).success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  if (!isAllowedReferer((await headers()).get("referer"))) {
    return NextResponse.json({ error: "Unauthorized request origin" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const isbn = normalizeIsbn(body?.isbn ?? body?.isbn13);
  const editionKey = typeof body?.editionKey === "string" && EDITION_KEY.test(body.editionKey) ? body.editionKey : null;
  const libraryId = typeof body?.libraryId === "string" && body.libraryId.length <= 64 ? body.libraryId : null;
  if ((!isbn && !editionKey) || !libraryId) {
    return NextResponse.json({ error: "A valid ISBN and library are required" }, { status: 400 });
  }
  // Only a title search finds books by edition id.
  const via: AddedVia | null = !isbn ? "search" : ADDED_VIA.includes(body?.via) ? body.via : null;

  try {
    // A library a moderator hid takes no new books.
    const library = await prisma.library.findFirst({ where: { id: libraryId, active: true }, select: { id: true } });
    if (!library) {
      return NextResponse.json({ error: "Library not found" }, { status: 404 });
    }

    let book;
    try {
      book = isbn ? await findBook(isbn) : await lookupEdition(editionKey as string);
    } catch (error) {
      console.error("Error looking up book:", error);
      return NextResponse.json({ error: "Could not reach the book catalogs" }, { status: 502 });
    }
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // One entry per book per library, and no points for a book the library already has. Books
    // without an ISBN are told apart by their OpenLibrary edition.
    const sameBook = book.isbn13 ? { isbn13: book.isbn13 } : { editionKey };
    const existing = await prisma.item.findFirst({ where: { libraryId, ...sameBook } });
    if (existing) {
      return NextResponse.json({ ...existing, award: null }, { status: 200 });
    }

    const newItem = await prisma.item.create({
      data: { ...book, addedVia: via, library: { connect: { id: libraryId } } },
    });

    // Points are decided here, never by the browser.
    const account = await getOrCreateAccount(clientIp);
    let award = null;
    if (account && via === "search") {
      const points = await searchedBookPoints(account.id, libraryId);
      award = {
        ...(await awardPoints(account.id, "ADD_SEARCHED_BOOK", points, { libraryId, itemId: newItem.id })),
        searchLimitReached: points === 0,
      };
    } else if (account) {
      const { points, newBooksThisVisit } = await newBookPoints(account.id, libraryId);
      award = {
        ...(await awardPoints(account.id, "ADD_BOOK", points, { libraryId, itemId: newItem.id })),
        newBooksThisVisit,
      };
    }
    return NextResponse.json({ ...newItem, award }, { status: 201 });
  } catch (error) {
    console.error("Error saving book:", error);
    return NextResponse.json({ error: "Failed to save book" }, { status: 500 });
  }
}
