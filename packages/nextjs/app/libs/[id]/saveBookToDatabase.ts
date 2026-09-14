export interface BookAward {
  pointsAwarded: number;
  total: number;
  // Scanned books count toward the double-points multiplier.
  newBooksThisVisit?: number;
  // Searched books earn points only for the first few at a library each day.
  searchLimitReached?: boolean;
}

export interface SaveResult {
  // False if the library already had this book.
  added: boolean;
  award: BookAward | null;
}

// The server looks the book up itself (by ISBN, or by OpenLibrary edition id for a searched book
// without one) and decides the points, so only those ids, the library and how the book was found
// are sent.
export async function saveBookToDatabase(book: {
  libraryId: string;
  isbn13?: string | null;
  editionKey?: string | null;
  via: "camera" | "photo" | "typed" | "search";
}): Promise<SaveResult> {
  const response = await fetch("/api/saveBook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      book.isbn13
        ? { isbn: book.isbn13, libraryId: book.libraryId, via: book.via }
        : { editionKey: book.editionKey, libraryId: book.libraryId, via: book.via },
    ),
  });

  if (!response.ok) {
    throw new Error(`Save book API failed with status: ${response.status}`);
  }
  return { added: response.status === 201, award: (await response.json()).award ?? null };
}
