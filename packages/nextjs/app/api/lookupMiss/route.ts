import { headers } from "next/headers";
import { MAX_QUERY, cleanQuery } from "../../../lib/bookSearch";
import prisma from "../../../lib/db";
import { parseTypedIsbn } from "../../../lib/isbn";
import { rateLimit } from "../../../lib/rate-limit";
import { getClientIp, isAllowedReferer } from "../../../lib/requestGuards";

// A visit finds a few unknown books at most.
const limiter = rateLimit({ interval: 10 * 60 * 1000, uniqueTokenPerInterval: 500, limit: 20 });

// Notes a book no catalog could find: an ISBN neither catalog knew, or a title search that ended
// without a match. Only what was looked up and at which library; nothing about the person.
export async function POST(req: Request) {
  if (!limiter.check(getClientIp(req)).success) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  if (!isAllowedReferer((await headers()).get("referer"))) {
    return Response.json({ error: "Unauthorized request origin" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const libraryId = typeof body?.libraryId === "string" && body.libraryId.length <= 64 ? body.libraryId : null;
  let query = "";
  if (body?.kind === "isbn") {
    query = (typeof body.isbn === "string" && parseTypedIsbn(body.isbn)) || "";
  } else if (body?.kind === "search") {
    const title = cleanQuery(body.title, MAX_QUERY.title);
    const author = cleanQuery(body.author, MAX_QUERY.author);
    query = title && (author ? `${title} | ${author}` : title);
  }
  if (!query || !libraryId) {
    return Response.json({ error: "A book and library are required" }, { status: 400 });
  }

  try {
    const library = await prisma.library.findFirst({ where: { id: libraryId, active: true }, select: { id: true } });
    if (!library) {
      return Response.json({ error: "Library not found" }, { status: 404 });
    }
    // createMany returns no rows, so the app's database role needs only INSERT here.
    await prisma.lookupMiss.createMany({ data: [{ kind: body.kind, query, libraryId }] });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error saving lookup miss:", error);
    return Response.json({ error: "Could not save" }, { status: 500 });
  }
}
