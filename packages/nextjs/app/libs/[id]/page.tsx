// This is a server component
import { getISBN13ByLibraryId } from "../../../actions/actions";
import prisma from "../../../lib/db";
import LibraryClient from "./LibraryClient";

export default async function LibraryPage({ params }: { params: { id: string } }) {
  // Fetch library data on the server side
  const libraryData = await prisma.library.findUnique({
    where: { id: params.id },
  });

  // let isbn13s: { updatedAt: Date; isbn13: string }[] = [];
  const isbn13s = libraryData?.id ? await getISBN13ByLibraryId(libraryData.id) : [];

  return <LibraryClient library={libraryData} isbn13s={isbn13s} />;
}
