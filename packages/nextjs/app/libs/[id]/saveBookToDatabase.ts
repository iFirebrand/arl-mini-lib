export interface BookAward {
  pointsAwarded: number;
  total: number;
  newBooksThisVisit: number;
}

// The server looks the book up by ISBN itself and decides the points, so only the ISBN and
// library are sent. Returns the points awarded, or null if none (e.g. the book was already there).
export async function saveBookToDatabase(book: { isbn13: string; libraryId: string }): Promise<BookAward | null> {
  const response = await fetch("/api/saveBook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isbn: book.isbn13, libraryId: book.libraryId }),
  });

  if (!response.ok) {
    throw new Error(`Save book API failed with status: ${response.status}`);
  }
  return (await response.json()).award ?? null;
}
