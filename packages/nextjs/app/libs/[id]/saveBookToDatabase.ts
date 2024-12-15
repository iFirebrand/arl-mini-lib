interface BookInfo {
  title: string;
  authors: string;
  thumbnail: string;
  description: string;
  isbn13: string;
  itemInfo: string;
  libraryId: string;
}

export async function saveBookToDatabase(book: BookInfo): Promise<void> {
  try {
    const response = await fetch("/api/saveBook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(book),
    });

    if (!response.ok) {
      throw new Error(`Save book API failed with status: ${response.status}`);
    }
  } catch (error) {
    throw error;
  }
}
