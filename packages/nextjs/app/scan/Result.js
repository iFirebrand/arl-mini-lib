"use client";

import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";

const Result = ({ result, libraryId }) => {
  const [bookDataList, setBookDataList] = useState([]);

  const [toastMessage, setToastMessage] = useState("");
  const apiKey = "AIzaSyA8Y5xWU_S2NaN6NPYgxV_XFS_8iv5OVfk";

  useEffect(() => {
    fetchBookData(result.codeResult.code);
  }, [result.codeResult.code, fetchBookData]);

  const fetchBookData = useCallback(
    async isbn => {
      try {
        console.log("fetchBookData called", isbn, libraryId);
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const bookInfo = data.items[0].volumeInfo;

          const isBookAlreadyScanned = bookDataList.some(book => book.title === bookInfo.title);
          if (!isBookAlreadyScanned) {
            await saveBookToDatabase({
              title: bookInfo.title,
              authors: bookInfo.authors?.join(", "),
              thumbnail: bookInfo.imageLinks?.thumbnail,
              description: bookInfo.description,
              isbn10: isbn,
            });

            setBookDataList(prev => [...prev, bookInfo]);
            setScannedCount(prev => prev + 1);
            setToastMessage(`Book "${bookInfo.title}" added successfully!`);
          }
        }
      } catch (error) {
        console.error("Error fetching book data:", error);
      }
    },
    [bookDataList, saveBookToDatabase],
  );

  const saveBookToDatabase = useCallback(async book => {
    console.log("saveBookToDatabase called", book, libraryId);
    await fetch("/api/saveBook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...book, libraryId }),
    });
  }, []);

  return (
    <>
      <li>{result.codeResult.code}</li>
      {toastMessage && (
        <div className="toast toast-top toast-center">
          <div className="alert alert-success">
            <div>
              <span>{toastMessage}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

Result.propTypes = {
  result: PropTypes.object.isRequired,
  libraryId: PropTypes.string.isRequired,
};

export default Result;
