import prisma from "../../../lib/db";
import ViewItems from "./ViewItems";

// removed the cached for now. See the libs for the cached version

export default async function LibraryBooks({ params }: { params: { id: string } }) {
  const library = await prisma.library.findUnique({
    where: { id: params.id },
  });

  return (
    <main className="flex flex-col items-center gap-y-5 pt-24, text-center">
      <h1 className="text-2xl font-semibold">Books at {library?.locationName}</h1>
      {library?.id && <ViewItems libraryId={library.id} />}
    </main>
  );
}
