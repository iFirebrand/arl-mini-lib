import { MAX_QUERY, cleanQuery, searchBooks } from "../../../../lib/bookSearch";
import { rateLimit } from "../../../../lib/rate-limit";
import { getClientIp } from "../../../../lib/requestGuards";

// Each search is typed by hand, so 20 a minute is plenty.
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500, limit: 20 });

// Books matching a title (and author), for books without a barcode. Saving looks the chosen book up
// again on the server (/api/saveBook), so nothing here is trusted later.
export async function GET(request: Request) {
  if (!limiter.check(getClientIp(request)).success) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const params = new URL(request.url).searchParams;
  const title = cleanQuery(params.get("title"), MAX_QUERY.title);
  const author = cleanQuery(params.get("author"), MAX_QUERY.author);
  if (title.length < 2) {
    return Response.json({ error: "Type at least 2 letters of the title" }, { status: 400 });
  }

  try {
    const results = await searchBooks(title, author);
    // Catalogs change slowly: keep answers at Vercel's edge for a day, which also saves quota.
    return Response.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
    );
  } catch {
    return Response.json({ error: "Could not reach the book catalogs" }, { status: 502 });
  }
}
