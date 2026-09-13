// This is a server component
import prisma from "../../lib/db";
import BrowseClient from "./BrowseClient";

export const dynamic = "force-dynamic";

async function fetchLibraries() {
  const libraries = await prisma.library.findMany({
    where: {
      active: true,
      locationName: {
        not: {
          equals: "",
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      locationName: true,
      latitude: true,
      longitude: true,
      imageUrl: true,
      _count: { select: { items: { where: { hidden: false } } } },
    },
  });

  return libraries.map(({ _count, ...library }) => ({ ...library, bookCount: _count.items }));
}

export default async function BrowsePage() {
  const libraries = await fetchLibraries();

  return <BrowseClient libraries={libraries} librariesCount={libraries.length} />;
}
