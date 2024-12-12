// This is a server component
// import prisma from "../../lib/db";
import LibsClient from "./LibsClient";

// May cut these in the future if don't need DB access on this page.

// async function fetchLibraries() {
//   const libraries = await prisma.library.findMany({
//     where: {
//       locationName: {
//         not: {
//           equals: "",
//         },
//       },
//     },
//     orderBy: { createdAt: "asc" },
//     select: { id: true, locationName: true },
//   });

//   const librariesCount = await prisma.library.count({
//     where: {
//       locationName: {
//         not: {
//           equals: "",
//         },
//       },
//     },
//   });

//   return { libraries, librariesCount };
// }

export default async function LibsPage() {
  // const { libraries, librariesCount } = await fetchLibraries(); // Fetch libraries data

  return <LibsClient />;
}
