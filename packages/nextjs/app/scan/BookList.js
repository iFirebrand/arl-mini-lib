import React from "react";

const BookList = ({ results }) => {
  return (
    <ul className="results">
      {results.map(result => result.bookInfo && <li key={result.codeResult.code}>{result.bookInfo.title}</li>)}
    </ul>
  );
};

export default BookList;
