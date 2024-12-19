# ARLib: Arlington Mini Library App

## Overview

ARLib is a web application designed to connect communities with mini libraries, allowing users to discover, catalog, and share books in their neighborhoods. The platform enables users to add new libraries, scan books for cataloging, and earn points through various activities. With a focus on community engagement and gamification, ARLib aims to make reading more accessible and enjoyable.

## Features

- **Discover Mini Libraries**: Users can find mini libraries in their area and browse their collections.
- **Add Libraries**: Users can add new libraries to the platform by geotagging their locations and cataloging books.
- **Scan Books**: Users can scan book barcodes to catalog them and earn points.
- **Leaderboard**: A dynamic leaderboard showcasing the top users based on points earned.
- **User Accounts**: Users can create accounts to track their points and library contributions.
- **Gamification**: Users can participate in quests and earn rewards for their contributions.

## Technologies Used

- **React**: For building the user interface.
- **Next.js**: For server-side rendering and routing.
- **TypeScript**: For type safety and better development experience.
- **Tailwind CSS**: For styling the application.
- **Next.js**: For handling API requests.
- **Prisma**: For database interactions.
- **PostgreSQL**: For data storage.

## Getting Started

To run the ARLib application locally please use yarn.

## API Endpoints

- **GET /api/openlibrary**: Fetch book data from OpenLibrary using ISBN.
- **POST /api/points**: Add or retrieve user points.
- **POST /api/saveBook**: Save book data to the database.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to the contributors and the open-source community for their support and resources. Specifically big thanks to https://scaffoldeth.io/ that served as the starter.
