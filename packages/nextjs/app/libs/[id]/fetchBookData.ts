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
    console.log("Fetching data for ISBN:", isbn);
    const response = await fetch(`/api/openlibrary?isbn=${isbn}`);
    const data: OpenLibraryResponse = await response.json();
    console.log("Raw API response:", data);

    if (data.records && Object.keys(data.records).length > 0) {
      const recordKey = Object.keys(data.records)[0];
      console.log("Record key:", recordKey);

      const record = data.records[recordKey];
      console.log("Record data:", JSON.stringify(record, null, 2));

      const bookInfo: BookInfo = {
        title: record.data.title,
        authors: record.data.authors?.map(author => author.name).join(", ") || "",
        thumbnail: record.data.cover?.medium || "",
        description: record.data.subtitle || "",
        isbn13: record.data.identifiers.isbn_13[0],
        itemInfo: record.recordURL || "",
        libraryId: libraryId,
      };

      console.log("Final processed bookInfo:", JSON.stringify(bookInfo, null, 2));
      return bookInfo;
    }
    console.log("No records found in response");
    return null;
  } catch (error) {
    console.error("Error fetching book data:", error);
    throw error;
  }
}
