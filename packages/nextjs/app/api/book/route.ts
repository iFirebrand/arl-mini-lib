import { findBook } from "../../../lib/bookLookup";
import { normalizeIsbn } from "../../../lib/openLibrary";
import { rateLimit } from "../../../lib/rate-limit";
import { getClientIp } from "../../../lib/requestGuards";

// A scan takes a few seconds, so 60 lookups a minute is far more than anyone scanning needs.
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500, limit: 60 });

// Book details for an ISBN, so the scanning page can show the book right away. Saving looks the
// book up again on the server (/api/saveBook), so nothing here is trusted later.
export async function GET(request: Request) {
  if (!limiter.check(getClientIp(request)).success) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const rawIsbn = new URL(request.url).searchParams.get("isbn");
  if (!rawIsbn) {
    return Response.json({ error: "ISBN is required" }, { status: 400 });
  }
  const isbn = normalizeIsbn(rawIsbn);
  if (!isbn) {
    return Response.json({ error: "ISBN must be 10 or 13 digits" }, { status: 400 });
  }

  try {
    const book = await findBook(isbn);
    // Books don't change: keep answers at Vercel's edge (a day for a match, an hour for none),
    // which also saves the catalogs' daily quotas.
    return Response.json(
      { book },
      { headers: { "Cache-Control": `public, s-maxage=${book ? 86400 : 3600}, stale-while-revalidate=86400` } },
    );
  } catch {
    return Response.json({ error: "Could not reach the book catalogs" }, { status: 502 });
  }
}
