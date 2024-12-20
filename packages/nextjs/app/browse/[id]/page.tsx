import Link from "next/link";
import { bookCount, getLibraryData } from "../../../actions/actions";
import prisma from "../../../lib/db";
import ViewItems from "./ViewItems";

export default async function LibraryBooks({ params }: { params: { id: string } }) {
  const library = await prisma.library.findUnique({
    where: { id: params.id },
  });
  const count = await bookCount(params.id);

  const libraryData = await getLibraryData(params.id);

  return (
    <main className="flex flex-col items-center gap-y-5 pt-24, text-center">
      <Link href={`/profile?libraryId=${library?.id}`} className="text-2xl font-semibold hover:underline">
        {count} 📚 at {library?.locationName}
      </Link>
      {library?.id && typeof libraryData !== "string" && <ViewItems libraryId={library.id} libraryData={libraryData} />}
    </main>
  );
}
