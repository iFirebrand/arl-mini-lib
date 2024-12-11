// This is a server component
import prisma from "../../../lib/db";
import LibraryClient from "./LibraryClient";

export default async function LibraryPage({ params }: { params: { id: string } }) {
  // Fetch library data on the server side
  const libraryData = await prisma.library.findUnique({
    where: { id: params.id },
  });

  return <LibraryClient library={libraryData} />;
}
