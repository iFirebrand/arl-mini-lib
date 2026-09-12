// The server looks the book up by ISBN itself, so only the ISBN and library are sent.
export async function saveBookToDatabase(book: { isbn13: string; libraryId: string }): Promise<void> {
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
}
