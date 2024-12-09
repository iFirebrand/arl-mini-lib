// This is a server component
import { createLibrary } from "../../actions/actions";
import prisma from "../../lib/db";
import LibsClient from "./LibsClient";

// Import the client component

async function fetchLibraries() {
  const libraries = await prisma.library.findMany({
    where: {
      locationName: {
        not: {
          equals: "",
        },
      },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, locationName: true },
  });

  const librariesCount = await prisma.library.count({
    where: {
      locationName: {
        not: {
          equals: "",
        },
      },
    },
  });

  return { libraries, librariesCount };
}

export default async function LibsPage() {
  const { libraries, librariesCount } = await fetchLibraries(); // Fetch libraries data

  return <LibsClient libraries={libraries} librariesCount={librariesCount} />;
}
