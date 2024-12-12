export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get("isbn");

    if (!isbn) {
      return Response.json({ error: "ISBN is required" }, { status: 400 });
    }

    // Using the Books API with jscmd=data to get full book information
    const url = `http://openlibrary.org/api/volumes/brief/isbn/${isbn}.json`;

    const response = await fetch(url);

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
