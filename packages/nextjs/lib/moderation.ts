import prisma from "./db";
import { readSessionAccountId } from "./session";
import "server-only";

export type ModerationTarget = "library" | "item";

/** The signed-in account's id if it is a moderator, otherwise null. */
export async function getModeratorId(): Promise<string | null> {
  const accountId = await readSessionAccountId();
  if (!accountId) return null;
  const moderator = await prisma.moderator.findUnique({ where: { accountId }, select: { accountId: true } });
  return moderator?.accountId ?? null;
}

/**
 * Hides or shows a library or book and logs it. Returns false if there is no such row.
 *
 * Raw SQL on purpose: the app's database role may update only these visibility columns, and a
 * Prisma update would also touch updatedAt, which for books means "last confirmed on the shelf".
 */
export async function setHidden(moderatorId: string, target: ModerationTarget, targetId: string, hidden: boolean) {
  return prisma.$transaction(async tx => {
    const changed =
      target === "library"
        ? await tx.$executeRaw`UPDATE "Library" SET "active" = ${!hidden} WHERE "id" = ${targetId}`
        : await tx.$executeRaw`UPDATE "Item" SET "hidden" = ${hidden} WHERE "id" = ${targetId}`;
    if (changed === 0) return false;
    await tx.moderationEvent.create({ data: { moderatorId, targetType: target, targetId, hidden } });
    return true;
  });
}

export interface ModerationQueue {
  libraries: { id: string; locationName: string; createdAt: Date; hidden: boolean }[];
  books: {
    id: string;
    title: string;
    libraryId: string;
    libraryName: string;
    createdAt: Date;
    hidden: boolean;
    // Books found by title search weren't scanned, so they're worth a second look.
    addedBySearch: boolean;
  }[];
}

/** The newest libraries and books, hidden ones included, for the moderation page. */
export async function getModerationQueue(): Promise<ModerationQueue> {
  const [libraries, books] = await Promise.all([
    prisma.library.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, locationName: true, createdAt: true, active: true },
    }),
    prisma.item.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        createdAt: true,
        hidden: true,
        addedVia: true,
        library: { select: { id: true, locationName: true } },
      },
    }),
  ]);
  return {
    libraries: libraries.map(({ active, ...library }) => ({ ...library, hidden: !active })),
    books: books.map(book => ({
      id: book.id,
      title: book.title ?? "",
      libraryId: book.library?.id ?? "",
      libraryName: book.library?.locationName ?? "",
      createdAt: book.createdAt,
      hidden: book.hidden,
      addedBySearch: book.addedVia === "search",
    })),
  };
}
