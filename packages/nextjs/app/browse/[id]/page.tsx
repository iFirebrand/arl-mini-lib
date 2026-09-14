import Image from "next/image";
import Link from "next/link";
import { bookCount, getItemsByLibraryId } from "../../../actions/actions";
import prisma from "../../../lib/db";
import { PLACEHOLDER_LIBRARY_IMAGE, safeImageSrc } from "../../../lib/media";
import { getModeratorId } from "../../../lib/moderation";
import LibraryModeration from "./LibraryModeration";
import ViewItems from "./ViewItems";
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, QrCodeIcon } from "@heroicons/react/24/outline";
import { Container } from "~~/components/ui/Page";

export const dynamic = "force-dynamic";

const books = (count: number) => (count === 1 ? "1 book" : `${count} books`);

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
      <Container width="narrow" className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">Library not found</h1>
        <p className="text-base-content/75">It may have been removed, or the link is incomplete.</p>
        <Link href="/browse" className="btn btn-primary rounded-full">
          See all libraries
        </Link>
      </Container>
    );
  }

  const [items, count] = await Promise.all([getItemsByLibraryId(library.id), bookCount(library.id)]);

  return (
    <Container className="flex flex-col gap-6 py-6 sm:py-8">
      <Link href="/browse" className="flex w-fit items-center gap-1.5 text-sm font-medium text-link hover:underline">
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        All libraries
      </Link>

      {isModerator && <LibraryModeration libraryId={library.id} hidden={!library.active} />}

      <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Image
            src={safeImageSrc(library.imageUrl, PLACEHOLDER_LIBRARY_IMAGE)}
            alt={`${library.locationName} library`}
            width={704}
            height={528}
            priority
            sizes="(min-width: 1024px) 352px, 100vw"
            className="aspect-4/3 h-auto w-full rounded-box bg-base-300 object-cover shadow-card"
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">{library.locationName}</h1>
            <p className="text-base-content/70">{books(count)} on the shelf</p>
          </div>
          {library.description && <p className="leading-relaxed text-base-content/85">{library.description}</p>}
          <div className="flex flex-wrap gap-2">
            <Link href={`/libs/${library.id}`} className="btn btn-neutral rounded-full">
              <QrCodeIcon className="h-5 w-5" aria-hidden="true" />
              Scan books here
            </Link>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${library.latitude},${library.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost rounded-full"
            >
              Directions
              <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <p className="text-sm text-base-content/65">
            At this library? Scanning books keeps the catalog fresh and earns points: 5 for each new book, and a bonus
            for confirming books nobody has checked in a while.
          </p>
        </aside>

        <section aria-labelledby="shelf" className="flex flex-col gap-4">
          <h2 id="shelf" className="text-2xl font-semibold tracking-tight">
            On the shelf
          </h2>
          <ViewItems initialItems={items} />
        </section>
      </div>
    </Container>
  );
}
