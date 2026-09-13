import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { awardPoints, getOrCreateAccount, newBookPoints } from "../../../lib/accounts";
import prisma from "../../../lib/db";
import { lookupBook, normalizeIsbn } from "../../../lib/openLibrary";
import { rateLimit } from "../../../lib/rate-limit";
import { getClientIp, isAllowedReferer } from "../../../lib/requestGuards";

// Same pace as scanning: a scan takes a few seconds.
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500, limit: 30 });

// Saves a scanned book. Only the ISBN and library come from the browser; the book details are
// looked up here, so nothing a visitor types ends up in the catalog as-is.
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
  const libraryId = typeof body?.libraryId === "string" && body.libraryId.length <= 64 ? body.libraryId : null;
  if (!isbn || !libraryId) {
    return NextResponse.json({ error: "A valid ISBN and library are required" }, { status: 400 });
  }

  try {
    // A library a moderator hid takes no new books.
    const library = await prisma.library.findFirst({ where: { id: libraryId, active: true }, select: { id: true } });
    if (!library) {
      return NextResponse.json({ error: "Library not found" }, { status: 404 });
    }

    let book;
    try {
      book = await lookupBook(isbn);
    } catch (error) {
      console.error("Error looking up book:", error);
      return NextResponse.json({ error: "Could not reach OpenLibrary" }, { status: 502 });
    }
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // One entry per book per library, and no points for a book the library already has.
    const existing = await prisma.item.findFirst({ where: { libraryId, isbn13: book.isbn13 } });
    if (existing) {
      return NextResponse.json({ ...existing, award: null }, { status: 200 });
    }

    const newItem = await prisma.item.create({
      data: { ...book, library: { connect: { id: libraryId } } },
    });

    // Points are decided here, never by the browser.
    const account = await getOrCreateAccount(clientIp);
    let award = null;
    if (account) {
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
