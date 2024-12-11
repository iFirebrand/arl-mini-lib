import React from "react";

const BookList = ({ results }) => {
  return results.length > 0 ? (
    <ul className="results">
      {results.map(result => result.bookInfo && <li key={result.codeResult.code}>{result.bookInfo.title}</li>)}
    </ul>
  ) : (
    <p>No books scanned in this session</p>
  );
};

export default BookList;
