export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get("isbn");

    if (!isbn) {
      return Response.json({ error: "ISBN is required" }, { status: 400 });
    }

    const url = `http://openlibrary.org/api/volumes/brief/isbn/${isbn}.json`;
    console.log("Fetching from OpenLibrary:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenLibrary API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log("OpenLibrary API response:", JSON.stringify(data, null, 2));

    return Response.json(data);
  } catch (error: unknown) {
    console.error("OpenLibrary API error:", error);
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}
// https://openlibrary.org/dev/docs/api/books#data
//  % curl -X GET "http://openlibrary.org/api/volumes/brief/isbn/9780063345164.json"
