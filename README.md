# Jingles

1. “Discover. Scan. Share. ARLib’s everywhere!” 2. “Bring your neighborhood library to life.” 3. “Find it, scan it, map it with ARLib.” 4. “Turning shelves into shared treasures.” 5. “Every library has a story—help us tell it.” 6. “The library in your pocket.” 7. “Scan the world, one book at a time.” 8. “Your key to neighborhood libraries.” 9. “ARLib: Mapping knowledge, one scan away.” 10. “Mini libraries, big connections.” 11. “The little libraries, right at your fingertips.” 12. “From books to barcodes, we’ve got it covered.” 13. “Sharing stories, one scan at a time.” 14. “Explore. Share. Repeat.” 15. “Connect your library to the world.” 16. “Find it, love it, share it—ARLib.” 17. “Unlock a world of books nearby.” 18. “Cataloging made easy with ARLib.” 19. “Libraries reimagined, powered by you.” 20. “From Arlington to everywhere, libraries united.”

## Sponsor Incentive Description

4. Sponsor Incentive Description

Support the ARLib Discovery Season
Want to see all of Arlington’s mini libraries come online? You can help make it happen by sponsoring our inaugural ARLib Discovery Season. Here’s how it works: 1. Become a Sponsor: Donate to our two-month onboarding season using stablecoin (USDC). Your contribution will incentivize participants, or “Library Explorers,” to discover and catalog mini libraries. 2. Earn Points, Get Paid: Explorers earn points for activities like adding a new library (50 points) and cataloging its books (50 points). At the end of the season, the pooled donations are divided among participants based on their points. 3. Transparent Payouts: All transactions, donations, and payouts are managed on the blockchain via smart contracts for total transparency.

By supporting ARLib, you’re ensuring that hidden mini libraries are brought to light and their contents made accessible to the entire community. Together, let’s map, catalog, and share the treasures of Arlington’s libraries—one scan at a time!

## Initial Text

I'm making a mobile friendly web app for mini libraries call ARLib. This aims to start serving the Arlington county in Virginia as a start. The goal is put the contents of the library online by the patrons who come by the library. The project will enable anyone to add a library to this site. The person would come to a library and use the geolocation on their phone to lookup the library. If the library is not yet in the database (on the site) the person will be able to add the library to the site. Then that person or anyone in the future will be able to catalog the books in the library. Cataloging simply means invoking the "add a book" feature of the app that opens a barcode scanner app. The person would scan one book at a time. As soon as the barcode is scanned the book data will be looked up and added to the catalog of that mini library. The listing of the libraries and the books will on the site. As the users add libraries they will be mapped on the map. This is meant to be a fun and useful project to showcase the libraries around the neighborhoods plus a way to see what people are sharing and what books are available.

Now, create me a few artifacts based on my write-up.

1. come up with 20 jingles for me to consider, similar to "wheels when you need them" based on the write-up. Focus on making this memorable.
2. come up with a 2-30 second description of the project that I can put on a home page. This must be consumable by the user to hook them in the first 5 seconds of reading.
3. come up with a long form text of the project for the About page. This shouldn't be too tense and I should be able to get through the page at most in 90 seconds. It should describe how the site works. But the opening paragraph should be about "why" it matters.
4. come up with an additional text that will be added to the About page that let's people sponsor others to discover mini libraries all over the arlington to bring them online and catalog the books. In essence a person makes a donation to incentivize bringing a mini-library online. The details of how this works will established later, but in essence it will work something like this. We start the first onboarding season. During this period of 2 months the library hunters (or pick a better name) discover the libraries and catalog the books. Each activity earns you points. Discovering a library is 50 points. Initial cataloging of the library is 50 points. A sponsor is someone who wants to incentivize seeing all the Arlington mini libraries come online. They donate to the first season of the project. Let's say they donate $20. The money is pooled along with other donors. At the end of the two month season all the money is divided equally by the people who earned points. Let's say there were $1000 worth of donations. Let's say 50 libraries were brought online by 15 different people. Then the total worth of each point is 5000 / 1000 = $0.20. This means each library was brought online for $20. If there are fewer donations, then the payout is smaller. The program will be structured so that a minimum of 50 mini libraries must be identified before the season is over. How this works for the initial library curator. They find a previously undiscovered library and make an entry on the site. The person must by physically present and pull the geo location from their phone along with a picture of the library. Then the person must catalog all the books in the library. The whole process takes 5-8 minutes. The submission is reviewed for accuracy and the points are allocated. To participate the curators and sponsors must have coinbase a smart wallet. This will be their identity on the system. No email, passwords, or any other PII will be stored on ARLib. The donations will be accepted as stable coins USDC and paid out as USDC. Since the transactions will be blockchain the value flow (points, donations and distributions) between all the wallets will be transparent for everyone to see and verify. The owner of the site will not have access to the money as the computer program, known as a smart contract on blockchain, will be in charge of handling the money.

## Documentation

Visit our [docs](https://docs.scaffoldeth.io) to learn how to start building with Scaffold-ETH 2.

To know more about its features, check out our [website](https://scaffoldeth.io).

## Contributing to Scaffold-ETH 2

We welcome contributions to Scaffold-ETH 2!

Please see [CONTRIBUTING.MD](https://github.com/scaffold-eth/scaffold-eth-2/blob/main/CONTRIBUTING.md) for more information and guidelines for contributing to Scaffold-ETH 2.

## Fetching Book Data

Google inplementation.

const fetchBookData = useCallback(
async isbn => {
try {
const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`);
const data = await response.json();
if (data.items && data.items.length > 0) {
const bookInfo = data.items[0].volumeInfo;
// Check if the book has already been scanned
const isBookAlreadyScanned = results.some(result => result.codeResult && result.codeResult.code === isbn);
if (!isBookAlreadyScanned) {
await saveBookToDatabase({
title: bookInfo.title,
authors: bookInfo.authors?.join(", "),
thumbnail: bookInfo.imageLinks?.thumbnail,
description: bookInfo.description,
isbn10: isbn,
});

            // Update results state directly instead of using a separate bookDataList
            setResults(prev => [...prev, { codeResult: { code: isbn }, bookInfo }]);
            // Increment scanned count directly
            setScannedCount(prev => prev + 1);
            console.log("Book added to results", bookInfo);
            console.log("Results", results);
            console.log("Books Already Scanned", isBookAlreadyScanned);
          }
        } // end of if - here we'll try with Library of Congress API
      } catch (error) {
        console.error("Error fetching book data:", error);
      }
    },
    [results, saveBookToDatabase],

);
