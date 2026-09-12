import prisma from "./db";
import { rateLimit } from "./rate-limit";
import { readSessionAccountId, writeSession } from "./session";
import { Prisma } from "@prisma/client";
import { randomInt } from "node:crypto";
import "server-only";

export const NEW_BOOK_POINTS = 5;
// New books at the same library within this window count toward the multiplier.
export const MULTIPLIER_WINDOW_MS = 12 * 60 * 60 * 1000;
// The first this-many new books in a window earn NEW_BOOK_POINTS; later ones earn double.
export const MULTIPLIER_AFTER = 3;
export const CREATE_LIBRARY_POINTS = 50;
// Stops anyone from farming points with scripts; real sessions stay far below it.
export const DAILY_POINTS_CAP = 500;

export type PointAction = "ADD_BOOK" | "CONFIRM_BOOK" | "CREATE_LIBRARY";

const newAccountLimiter = rateLimit({ interval: 60 * 60 * 1000, uniqueTokenPerInterval: 500, limit: 10 });

// Crockford base32 without ambiguous characters: "Reader K7Q2M". ~33 million combinations.
const PSEUDONYM_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const pseudonym = () =>
  "Reader " + Array.from({ length: 5 }, () => PSEUDONYM_ALPHABET[randomInt(PSEUDONYM_ALPHABET.length)]).join("");

export async function getSessionAccount() {
  const accountId = await readSessionAccountId();
  return accountId ? prisma.account.findUnique({ where: { id: accountId } }) : null;
}

/**
 * The visitor's account, creating an anonymous one (and its session cookie) on first use.
 * Returns null if this connection has created too many accounts recently.
 */
export async function getOrCreateAccount(clientIp: string) {
  const existing = await getSessionAccount();
  if (existing) return existing;
  if (!newAccountLimiter.check(clientIp).success) return null;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const account = await prisma.account.create({ data: { displayName: pseudonym() } });
      await writeSession(account.id);
      return account;
    } catch (error) {
      // A pseudonym collision; try another.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }
  throw new Error("Could not create an account");
}

/** Points the next new book at this library earns: 5, or 10 after the first few in a visit. */
export async function newBookPoints(accountId: string, libraryId: string, now = new Date()) {
  const recentNewBooks = await prisma.pointEvent.count({
    where: {
      accountId,
      libraryId,
      action: "ADD_BOOK",
      createdAt: { gt: new Date(now.getTime() - MULTIPLIER_WINDOW_MS) },
    },
  });
  return {
    points: recentNewBooks < MULTIPLIER_AFTER ? NEW_BOOK_POINTS : NEW_BOOK_POINTS * 2,
    newBooksThisVisit: recentNewBooks + 1,
  };
}

/**
 * Records points for an account and adds them to its total, trimmed to the daily cap.
 * Returns the points actually awarded and the new total.
 */
export async function awardPoints(
  accountId: string,
  action: PointAction,
  requested: number,
  refs: { libraryId?: string; itemId?: string } = {},
) {
  return prisma.$transaction(async tx => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { _sum } = await tx.pointEvent.aggregate({
      where: { accountId, createdAt: { gt: since }, action: { not: "IMPORTED_WALLET_POINTS" } },
      _sum: { points: true },
    });
    const points = Math.max(0, Math.min(requested, DAILY_POINTS_CAP - (_sum.points ?? 0)));
    if (points === 0) {
      const account = await tx.account.findUniqueOrThrow({ where: { id: accountId } });
      return { pointsAwarded: 0, total: account.points };
    }
    await tx.pointEvent.create({ data: { accountId, action, points, ...refs } });
    const account = await tx.account.update({ where: { id: accountId }, data: { points: { increment: points } } });
    return { pointsAwarded: points, total: account.points };
  });
}

/**
 * Moves an anonymous account's points into another account (used when someone who played
 * anonymously on this device signs in with an existing passkey). The emptied account remains,
 * with 0 points, because the app's database role cannot delete rows.
 */
export async function mergeAccountInto(fromId: string, intoId: string) {
  if (fromId === intoId) return;
  await prisma.$transaction(async tx => {
    const from = await tx.account.findUnique({
      where: { id: fromId },
      include: { passkeys: { select: { id: true } } },
    });
    // Never merge an account someone can still sign in to.
    if (!from || from.passkeys.length > 0 || from.points === 0) return;
    await tx.pointEvent.updateMany({ where: { accountId: fromId }, data: { accountId: intoId } });
    await tx.account.update({ where: { id: intoId }, data: { points: { increment: from.points } } });
    await tx.account.update({ where: { id: fromId }, data: { points: 0 } });
  });
}
