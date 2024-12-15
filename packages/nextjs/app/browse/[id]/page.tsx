import { bookCount } from "../../../actions/actions";
import prisma from "../../../lib/db";
import ViewItems from "./ViewItems";

export default async function LibraryBooks({ params }: { params: { id: string } }) {
  const library = await prisma.library.findUnique({
    where: { id: params.id },
  });
  const count = await bookCount(params.id);

  return (
    <main className="flex flex-col items-center gap-y-5 pt-24, text-center">
      <h1 className="text-2xl font-semibold">
        {count} 📚 at {library?.locationName}
      </h1>
      {library?.id && <ViewItems libraryId={library.id} />}
    </main>
  );
}
