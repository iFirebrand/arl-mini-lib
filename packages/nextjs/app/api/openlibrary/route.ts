import { normalizeIsbn, openLibraryUrlFor } from "../../../lib/openLibrary";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawIsbn = searchParams.get("isbn");

    if (!rawIsbn) {
      return Response.json({ error: "ISBN is required" }, { status: 400 });
    }
    const isbn = normalizeIsbn(rawIsbn);
    if (!isbn) {
      return Response.json({ error: "ISBN must be 10 or 13 digits" }, { status: 400 });
    }

    const response = await fetch(openLibraryUrlFor(isbn), { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      throw new Error(`OpenLibrary API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}
// https://openlibrary.org/dev/docs/api/books#data
//  % curl -X GET "https://openlibrary.org/api/volumes/brief/isbn/9780063345164.json"
