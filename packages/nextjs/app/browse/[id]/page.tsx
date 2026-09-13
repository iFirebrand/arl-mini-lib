import Link from "next/link";
import { bookCount } from "../../../actions/actions";
import prisma from "../../../lib/db";
import { getModeratorId } from "../../../lib/moderation";
import LibraryModeration from "./LibraryModeration";
import ViewItems from "./ViewItems";

export default async function LibraryBooks({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Moderators still see a library they hid, so they can bring it back.
  const isModerator = Boolean(await getModeratorId());
  const library = await prisma.library.findFirst({
    where: isModerator ? { id } : { id, active: true },
    select: {
      id: true,
      locationName: true,
      imageUrl: true,
      active: true,
      latitude: true,
      longitude: true,
      description: true,
    },
  });

  if (!library) {
    return (
      <main className="flex flex-col items-center gap-y-5 pt-24 text-center">
        <p className="text-xl">Library not found</p>
        <Link href="/browse" className="btn btn-primary">
          See all libraries
        </Link>
      </main>
    );
  }

  const count = await bookCount(id);

  return (
    <main className="flex flex-col items-center gap-y-5 pt-24, text-center">
      {isModerator && <LibraryModeration libraryId={library.id} hidden={!library.active} />}
      <Link href={`/profile?libraryId=${library.id}`} className="text-2xl font-semibold hover:underline">
        {count} 📚 at {library.locationName}
      </Link>
      <ViewItems libraryId={library.id} libraryData={library} />
    </main>
  );
}
