// Made-up volume in the shape of a Google Books search response
// (https://www.googleapis.com/books/v1/volumes?q=isbn:<isbn>), trimmed to the fields we request.
export const googleBooksResponse = {
  items: [
    {
      volumeInfo: {
        title: "The Wager",
        subtitle: "A Tale of Shipwreck, Mutiny and Murder",
        authors: ["David Grann"],
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0063345161" },
          { type: "ISBN_13", identifier: "9780063345164" },
        ],
        imageLinks: { thumbnail: "http://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1" },
        infoLink: "http://books.google.com/books?id=abc",
      },
    },
  ],
};
