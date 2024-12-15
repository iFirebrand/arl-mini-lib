interface BookRecord {
  recordURL: string;
  data: {
    title: string;
    authors?: { name: string }[];
    cover?: { medium: string };
    subtitle?: string;
    identifiers: {
      isbn_13: string[];
    };
  };
}

interface OpenLibraryResponse {
  records: {
    [key: string]: BookRecord;
  };
}

interface BookInfo {
  title: string;
  authors: string;
  thumbnail: string;
  description: string;
  isbn13: string;
  itemInfo: string;
  libraryId: string;
}

export async function fetchBookData(isbn: string, libraryId: string): Promise<BookInfo | null> {
  try {
    const response = await fetch(`/api/openlibrary?isbn=${isbn}`);
    const data: OpenLibraryResponse = await response.json();

    if (data.records && Object.keys(data.records).length > 0) {
      const recordKey = Object.keys(data.records)[0];
      const record = data.records[recordKey];

      const bookInfo: BookInfo = {
        title: record.data.title,
        authors: record.data.authors?.map(author => author.name).join(", ") || "",
        thumbnail: record.data.cover?.medium || "",
        description: record.data.subtitle || "",
        isbn13: record.data.identifiers.isbn_13[0],
        itemInfo: record.recordURL || "",
        libraryId: libraryId,
      };

      return bookInfo;
    }
    return null;
  } catch (error) {
    throw error;
  }
}
