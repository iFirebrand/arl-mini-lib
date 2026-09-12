import Link from "next/link";
import { bookCount, getLibraryData } from "../../../actions/actions";
import prisma from "../../../lib/db";
import ViewItems from "./ViewItems";

export default async function LibraryBooks({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const library = await prisma.library.findUnique({
    where: { id },
  });
  const count = await bookCount(id);

  const libraryData = await getLibraryData(id);

  return (
    <main className="flex flex-col items-center gap-y-5 pt-24, text-center">
      <Link href={`/profile?libraryId=${library?.id}`} className="text-2xl font-semibold hover:underline">
        {count} 📚 at {library?.locationName}
      </Link>
      {library?.id && typeof libraryData !== "string" && <ViewItems libraryId={library.id} libraryData={libraryData} />}
    </main>
  );
}
