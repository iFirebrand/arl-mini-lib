export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get("isbn");
    console.log("1. API Route - Received ISBN:", isbn);

    if (!isbn) {
      return Response.json({ error: "ISBN is required" }, { status: 400 });
    }

    // Using the Books API with jscmd=data to get full book information
    const url = `http://openlibrary.org/api/volumes/brief/isbn/${isbn}.json`;
    console.log("2. API Route - Calling OpenLibrary URL:", url);

    const response = await fetch(url);
    console.log("3. API Route - OpenLibrary Response Status:", response.status);

    if (!response.ok) {
      throw new Error(`OpenLibrary API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log("4. API Route - OpenLibrary Response Data:", JSON.stringify(data, null, 2));

    return Response.json(data);
  } catch (error) {
    console.error("5. API Route Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
