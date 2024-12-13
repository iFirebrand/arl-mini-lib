// This is a server component
import prisma from "../../lib/db";
import BrowseClient from "./BrowseClient";

// Import the client component

export const dynamic = "force-dynamic";

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
    select: { id: true, locationName: true, latitude: true, longitude: true },
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

export default async function BrowsePage() {
  const { libraries, librariesCount } = await fetchLibraries(); // Fetch libraries data

  return <BrowseClient libraries={libraries} librariesCount={librariesCount} />;
}
