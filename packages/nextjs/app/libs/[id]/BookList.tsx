import React from "react";

interface BookInfo {
  title: string;
  authors?: string;
  thumbnail?: string;
  description?: string;
  isbn13?: string;
  itemInfo?: string;
}

interface ScanResult {
  codeResult: {
    code: string;
  };
  bookInfo?: BookInfo;
}

interface BookListProps {
  results: ScanResult[];
}

const BookList: React.FC<BookListProps> = ({ results }) => {
  return results.length > 0 ? (
    <ul className="results">
      {results.map(result => result.bookInfo && <li key={result.codeResult.code}>{result.bookInfo.title}</li>)}
    </ul>
  ) : (
    <p>No books scanned in this session</p>
  );
};

export default BookList;
