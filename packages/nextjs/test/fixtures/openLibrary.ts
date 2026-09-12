// Made-up book in the shape of an OpenLibrary brief-volumes response
// (https://openlibrary.org/api/volumes/brief/isbn/<isbn>.json). The real record for this ISBN is
// a different book; tests only rely on the shape.
export const openLibraryResponse = {
  records: {
    "/books/OL50548140M": {
      recordURL: "https://openlibrary.org/books/OL50548140M/The_Wager",
      data: {
        title: "The Wager",
        subtitle: "A Tale of Shipwreck, Mutiny and Murder",
        authors: [{ name: "David Grann" }],
        cover: { medium: "https://covers.openlibrary.org/b/id/14348537-M.jpg" },
        identifiers: { isbn_13: ["9780063345164"] },
      },
    },
  },
};

export const bookInfo = {
  title: "The Wager",
  authors: "David Grann",
  thumbnail: "https://covers.openlibrary.org/b/id/14348537-M.jpg",
  description: "A Tale of Shipwreck, Mutiny and Murder",
  isbn13: "9780063345164",
  itemInfo: "https://openlibrary.org/books/OL50548140M/The_Wager",
  libraryId: "lib_1",
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
