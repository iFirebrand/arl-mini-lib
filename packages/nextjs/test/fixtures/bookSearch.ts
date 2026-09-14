// Trimmed responses in the shape of OpenLibrary's search API
// (https://openlibrary.org/search.json?title=...&fields=...,editions,...) and Google Books' search
// (https://www.googleapis.com/books/v1/volumes?q=intitle:...). Real books, trimmed to what we read.
export const openLibrarySearchResponse = {
  numFound: 3,
  docs: [
    {
      title: "Stone Fox",
      author_name: ["John Reynolds Gardiner"],
      first_publish_year: 1979,
      cover_i: 439185,
      editions: {
        docs: [
          {
            key: "/books/OL22253548M",
            title: "Stone Fox",
            cover_i: 9531777,
            publish_date: ["2003"],
            isbn: ["0064401324", "9780064401326"],
          },
        ],
      },
    },
    {
      // An old edition: no ISBN and no cover of its own.
      title: "Controversial essays",
      author_name: ["John Hanbury Angus Sparrow"],
      first_publish_year: 1966,
      cover_i: 10066834,
      editions: {
        docs: [{ key: "/books/OL6014553M", title: "Controversial essays", publish_date: ["May 1966"] }],
      },
    },
    {
      // An edition with only an ISBN-10 on record.
      title: "Heartbeat",
      author_name: ["Sharon Creech"],
      first_publish_year: 2004,
      editions: { docs: [{ key: "/books/OL3401345M", isbn: ["0060546352"], publish_date: ["2004"] }] },
    },
  ],
};

export const googleBooksSearchResponse = {
  items: [
    {
      volumeInfo: {
        title: "Stone Fox",
        authors: ["John Reynolds Gardiner"],
        publishedDate: "1980-04-23",
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0690039840" },
          { type: "ISBN_13", identifier: "9780690039849" },
        ],
        imageLinks: { thumbnail: "http://books.google.com/books/content?id=qaPknQEACAAJ&img=1&zoom=1" },
      },
    },
    {
      // No ISBN, so it can't be saved: left out.
      volumeInfo: { title: "Stone Fox (braille)", authors: ["John Reynolds Gardiner"], publishedDate: "1990" },
    },
    {
      volumeInfo: {
        title: "Stone Fox",
        authors: ["John Reynolds Gardiner"],
        publishedDate: "2003",
        industryIdentifiers: [{ type: "ISBN_13", identifier: "9780064401326" }],
      },
    },
  ],
};
