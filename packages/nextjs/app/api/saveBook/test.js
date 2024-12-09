const fetch = require("node-fetch"); // Ensure you have node-fetch installed

const testSaveBook = async () => {
  const url = "http://localhost:3000/api/saveBook"; // Adjust the URL if your app runs on a different port

  const bookData = {
    title: "Test Book Title",
    authors: "Test Author",
    thumbnail: "http://example.com/thumbnail.jpg",
    description: "A brief description of the test book.",
    isbn10: "1234567890",
    libraryId: "cm4hhayuz000ecut5hdfuhpdp", // Replace with an actual library ID if necessary
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookData),
    });

    const data = await response.json();
    console.log("Response Status:", response.status);
    console.log("Response Data:", data);
  } catch (error) {
    console.error("Error:", error);
  }
};

testSaveBook();
