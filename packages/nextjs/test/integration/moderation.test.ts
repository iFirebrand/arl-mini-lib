import { appPrisma, createTestLibrary, resetDatabase, testPrisma } from "./db";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Runs the moderation actions as the app's arlib_app role, with a real signed session cookie.
vi.mock("~~/lib/db", async () => ({ default: (await import("./db")).appPrisma }));
const browser = vi.hoisted(() => ({
  jar: null as null | ReturnType<typeof import("../mocks/cookies").createCookieJar>,
}));
vi.mock("next/headers", async () => {
  browser.jar = (await import("../mocks/cookies")).createCookieJar();
  return { headers: () => new Headers({ referer: "http://localhost:3000/browse/abc" }), cookies: () => browser.jar };
});

const { writeSession } = await import("~~/lib/session");
const moderation = await import("~~/actions/moderation");
const actions = await import("~~/actions/actions");
const { getModerationQueue } = await import("~~/lib/moderation");

const signInAs = async (displayName: string, { moderator = false } = {}) => {
  const account = await testPrisma.account.create({ data: { displayName } });
  if (moderator) await testPrisma.moderator.create({ data: { accountId: account.id } });
  browser.jar?.clear();
  await writeSession(account.id);
  return account;
};

const addBook = (libraryId: string, title: string, isbn13: string) =>
  testPrisma.item.create({ data: { title, isbn13, libraryId, itemInfo: "https://openlibrary.org/books/OL1M" } });

beforeEach(async () => {
  await resetDatabase();
  browser.jar?.clear();
});
afterAll(() => Promise.all([testPrisma.$disconnect(), appPrisma.$disconnect()]));

describe("hiding a library", () => {
  it("takes it and its books out of every public list and count, and logs it", async () => {
    const moderator = await signInAs("Reader MOD01", { moderator: true });
    const spam = await createTestLibrary({ locationName: "Spam", description: "Buy now" });
    const kept = await createTestLibrary({ locationName: "Maple St", latitude: 38.9, longitude: -77.2 });
    await addBook(spam.id, "Spam book", "9780000000002");
    await addBook(kept.id, "The Wager", "9780063345164");

    expect(await moderation.setLibraryHidden(spam.id, true)).toEqual({ ok: true });

    expect(await actions.totalLibraryCount()).toBe(1);
    expect(await actions.totalBookCount()).toBe(1);
    expect(await actions.getNewLibrariesCount()).toBe(1);
    expect(await actions.getLibrariesWithDescriptionCount()).toBe(0);
    expect(await actions.getManyLibraryDescriptions()).toEqual([]);
    expect((await actions.getLast50Books()).map(book => book.title)).toEqual(["The Wager"]);
    expect(await actions.getLibraryData(spam.id)).toBe("not found");
    expect(await actions.checkLibraryExists(String(spam.latitude), String(spam.longitude))).toBe("not found");
    expect(await actions.getItemsByLibraryId(spam.id)).toEqual([]);
    expect(await actions.bookCount(spam.id)).toBe(0);

    expect(await testPrisma.library.findUnique({ where: { id: spam.id } })).toMatchObject({ active: false });
    expect(await testPrisma.moderationEvent.findMany()).toEqual([
      expect.objectContaining({ moderatorId: moderator.id, targetType: "library", targetId: spam.id, hidden: true }),
    ]);
  });

  it("can be undone", async () => {
    await signInAs("Reader MOD01", { moderator: true });
    const library = await createTestLibrary();

    await moderation.setLibraryHidden(library.id, true);
    expect(await moderation.setLibraryHidden(library.id, false)).toEqual({ ok: true });

    expect(await actions.totalLibraryCount()).toBe(1);
    expect(await testPrisma.moderationEvent.count()).toBe(2);
  });

  it("keeps the queue's view of hidden libraries so they can be brought back", async () => {
    await signInAs("Reader MOD01", { moderator: true });
    const library = await createTestLibrary();
    await moderation.setLibraryHidden(library.id, true);

    expect((await getModerationQueue()).libraries).toEqual([expect.objectContaining({ id: library.id, hidden: true })]);
  });
});

describe("hiding a book", () => {
  it("removes it from the library's list without touching its last-confirmed time", async () => {
    await signInAs("Reader MOD01", { moderator: true });
    const library = await createTestLibrary();
    const book = await addBook(library.id, "Spam book", "9780000000002");
    await addBook(library.id, "The Wager", "9780063345164");

    expect(await moderation.setBookHidden(book.id, true)).toEqual({ ok: true });

    expect((await actions.getItemsByLibraryId(library.id)).map(item => item.title)).toEqual(["The Wager"]);
    expect(await actions.bookCount(library.id)).toBe(1);
    const after = await testPrisma.item.findUniqueOrThrow({ where: { id: book.id } });
    expect(after.hidden).toBe(true);
    expect(after.updatedAt).toEqual(book.updatedAt);
    // A hidden book can't be confirmed for a recency bonus.
    expect(await actions.confirmBookInLibrary(library.id, "9780000000002")).toEqual({
      confirmed: false,
      pointsAwarded: 0,
    });
  });
});

describe("who can moderate", () => {
  it("refuses visitors without a session", async () => {
    const library = await createTestLibrary();
    expect(await moderation.setLibraryHidden(library.id, true)).toEqual({
      ok: false,
      error: "Only moderators can do this",
    });
    expect(await actions.totalLibraryCount()).toBe(1);
  });

  it("refuses signed-in accounts that aren't moderators", async () => {
    await signInAs("Reader PLAYR");
    const library = await createTestLibrary();
    const book = await addBook(library.id, "The Wager", "9780063345164");

    expect(await moderation.setLibraryHidden(library.id, true)).toMatchObject({ ok: false });
    expect(await moderation.setBookHidden(book.id, true)).toMatchObject({ ok: false });
    expect(await testPrisma.moderationEvent.count()).toBe(0);
  });

  it("reports a missing library or book", async () => {
    await signInAs("Reader MOD01", { moderator: true });
    expect(await moderation.setLibraryHidden("nope", true)).toEqual({ ok: false, error: "Library not found" });
    expect(await moderation.setBookHidden("nope", true)).toEqual({ ok: false, error: "Book not found" });
    expect(await testPrisma.moderationEvent.count()).toBe(0);
  });
});
