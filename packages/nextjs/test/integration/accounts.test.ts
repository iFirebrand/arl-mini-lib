import { jsonResponse, openLibraryResponse } from "../fixtures/openLibrary";
import { appPrisma, createTestLibrary, resetDatabase, testPrisma } from "./db";
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("./db")).appPrisma }));

// One browser: cookies set by a response are sent with the next request.
const browser = vi.hoisted(() => ({
  jar: null as null | ReturnType<typeof import("../mocks/cookies").createCookieJar>,
}));
vi.mock("next/headers", async () => {
  browser.jar = (await import("../mocks/cookies")).createCookieJar();
  return { headers: () => new Headers({ referer: "http://localhost:3000/libs/abc" }), cookies: () => browser.jar };
});

const accounts = await import("~~/lib/accounts");
const actions = await import("~~/actions/actions");
const { POST: saveBook } = await import("~~/app/api/saveBook/route");

const DAY = 24 * 60 * 60 * 1000;
let ipCounter = 0;

// Answers OpenLibrary lookups with the fixture, renumbered to the requested ISBN.
const stubOpenLibrary = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const isbn = url.match(/isbn\/(\d+)\.json/)?.[1] ?? "";
      const record = openLibraryResponse.records["/books/OL50548140M"];
      return jsonResponse({
        records: {
          [isbn]: { ...record, data: { ...record.data, title: `Book ${isbn}`, identifiers: { isbn_13: [isbn] } } },
        },
      });
    }),
  );

const scanNewBook = async (isbn: string, libraryId: string) =>
  (
    await saveBook(
      new Request("http://localhost:3000/api/saveBook", {
        method: "POST",
        headers: { "x-forwarded-for": `10.7.0.${++ipCounter}` },
        body: JSON.stringify({ isbn, libraryId }),
      }),
    )
  ).json();

// The account this "browser" is signed in to.
const sessionAccount = async () => {
  const account = await accounts.getSessionAccount();
  if (!account) throw new Error("No account in the session cookie");
  return account;
};

beforeEach(async () => {
  await resetDatabase();
  browser.jar?.clear();
  stubOpenLibrary();
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => Promise.all([testPrisma.$disconnect(), appPrisma.$disconnect()]));

describe("earning points without signing up", () => {
  it("creates an anonymous account with a pseudonym on the first book", async () => {
    const library = await createTestLibrary();

    const { award } = await scanNewBook("9780000000001", library.id);

    expect(award).toMatchObject({ pointsAwarded: 5, total: 5, newBooksThisVisit: 1 });
    const account = await sessionAccount();
    expect(account?.displayName).toMatch(/^Reader [0-9A-HJKMNP-TV-Z]{5}$/);
    expect(account?.walletAddress).toBeNull();
  });

  it("pays 5, 5, 5, then double for new books at the same library", async () => {
    const library = await createTestLibrary();

    const awards = [];
    for (const isbn of ["9780000000001", "9780000000002", "9780000000003", "9780000000004"]) {
      awards.push((await scanNewBook(isbn, library.id)).award.pointsAwarded);
    }

    expect(awards).toEqual([5, 5, 5, 10]);
    expect((await sessionAccount())?.points).toBe(25);
  });

  it("starts the multiplier over at a different library", async () => {
    const first = await createTestLibrary();
    const second = await createTestLibrary({ locationName: "Oak St" });
    for (const isbn of ["9780000000001", "9780000000002", "9780000000003"]) await scanNewBook(isbn, first.id);

    expect((await scanNewBook("9780000000004", second.id)).award.pointsAwarded).toBe(5);
  });

  it("pays nothing for a book the library already has", async () => {
    const library = await createTestLibrary();
    await scanNewBook("9780000000001", library.id);

    expect((await scanNewBook("9780000000001", library.id)).award).toBeNull();
    expect((await sessionAccount())?.points).toBe(5);
  });

  it("records every award in the points history", async () => {
    const library = await createTestLibrary();
    await scanNewBook("9780000000001", library.id);

    const account = await sessionAccount();
    const events = await testPrisma.pointEvent.findMany({ where: { accountId: account?.id } });
    const item = await testPrisma.item.findFirstOrThrow();
    expect(events).toEqual([
      expect.objectContaining({ action: "ADD_BOOK", points: 5, libraryId: library.id, itemId: item.id }),
    ]);
  });

  it("pays 50 for a new library", async () => {
    const form = new FormData();
    Object.entries({ locationName: "Maple St", latitude: "38.88", longitude: "-77.1" }).forEach(([k, v]) =>
      form.set(k, v),
    );

    expect(await actions.createLibrary(form)).toMatchObject({ id: expect.any(String), pointsAwarded: 50, total: 50 });
  });

  it("pays the recency bonus for a stale book once", async () => {
    const library = await createTestLibrary();
    await testPrisma.item.create({
      data: {
        title: "Old book",
        isbn13: "9780000000009",
        libraryId: library.id,
        updatedAt: new Date(Date.now() - 40 * DAY),
      },
    });

    expect(await actions.confirmBookInLibrary(library.id, "9780000000009")).toMatchObject({
      confirmed: true,
      pointsAwarded: 5,
    });
    expect(await actions.confirmBookInLibrary(library.id, "9780000000009")).toEqual({
      confirmed: true,
      pointsAwarded: 0,
    });
  });

  it("lets only one of two simultaneous confirmations earn the bonus", async () => {
    const library = await createTestLibrary();
    await testPrisma.item.create({
      data: {
        title: "Old book",
        isbn13: "9780000000009",
        libraryId: library.id,
        updatedAt: new Date(Date.now() - 40 * DAY),
      },
    });
    await scanNewBook("9780000000001", library.id); // create the account first

    const results = await Promise.all([
      actions.confirmBookInLibrary(library.id, "9780000000009"),
      actions.confirmBookInLibrary(library.id, "9780000000009"),
    ]);

    expect(results.map(result => result.pointsAwarded).sort()).toEqual([0, 5]);
  });

  it("caps an account at 500 points a day", async () => {
    const library = await createTestLibrary();
    await scanNewBook("9780000000001", library.id);
    const account = await sessionAccount();
    await testPrisma.pointEvent.create({ data: { accountId: account.id, action: "ADD_BOOK", points: 493 } });

    expect((await scanNewBook("9780000000002", library.id)).award.pointsAwarded).toBe(2);
    expect((await scanNewBook("9780000000003", library.id)).award.pointsAwarded).toBe(0);
  });

  it("doesn't count imported wallet points toward the daily cap", async () => {
    const library = await createTestLibrary();
    await scanNewBook("9780000000001", library.id);
    const account = await sessionAccount();
    await testPrisma.pointEvent.create({
      data: { accountId: account.id, action: "IMPORTED_WALLET_POINTS", points: 1245 },
    });

    expect((await scanNewBook("9780000000002", library.id)).award.pointsAwarded).toBe(5);
  });
});

describe("merging accounts on sign-in", () => {
  const withPasskey = async (points: number) => {
    const account = await testPrisma.account.create({ data: { displayName: accounts.pseudonym(), points } });
    await testPrisma.passkey.create({
      data: {
        id: `cred_${account.id}`,
        accountId: account.id,
        publicKey: Buffer.from([1]),
        deviceType: "multiDevice",
        backedUp: true,
      },
    });
    return account;
  };

  it("moves an anonymous account's points and history into the signed-in account", async () => {
    const owner = await withPasskey(100);
    const library = await createTestLibrary();
    await scanNewBook("9780000000001", library.id);
    const anonymous = await sessionAccount();

    await accounts.mergeAccountInto(anonymous.id, owner.id);

    expect((await testPrisma.account.findUniqueOrThrow({ where: { id: owner.id } })).points).toBe(105);
    expect((await testPrisma.account.findUniqueOrThrow({ where: { id: anonymous.id } })).points).toBe(0);
    expect(await testPrisma.pointEvent.count({ where: { accountId: owner.id } })).toBe(1);
  });

  it("never merges an account that has its own passkey", async () => {
    const owner = await withPasskey(100);
    const other = await withPasskey(40);

    await accounts.mergeAccountInto(other.id, owner.id);

    expect((await testPrisma.account.findUniqueOrThrow({ where: { id: owner.id } })).points).toBe(100);
    expect((await testPrisma.account.findUniqueOrThrow({ where: { id: other.id } })).points).toBe(40);
  });
});

describe("importing pre-account wallet players", () => {
  const importScript = readFileSync(new URL("../../prisma/sql/import-wallet-users.sql", import.meta.url), "utf8");
  const runImport = async () => {
    for (const statement of importScript
      .split(/;\s*\n/)
      .map(s => s.replace(/--.*$/gm, "").trim())
      .filter(Boolean)) {
      await testPrisma.$executeRawUnsafe(statement);
    }
  };

  it("gives each wallet an account with its points, claimable by that wallet later", async () => {
    await testPrisma.user.createMany({
      data: [
        { walletAddress: "0xABCDEF0000000000000000000000000000000001", points: 1245 },
        { walletAddress: "0x0000000000000000000000000000000000000002", points: 50 },
        { walletAddress: null, points: 10 },
      ],
    });

    await runImport();
    await runImport(); // safe to re-run

    const imported = await testPrisma.account.findMany({ orderBy: { points: "desc" } });
    expect(imported.map(account => [account.walletAddress, account.points])).toEqual([
      ["0xabcdef0000000000000000000000000000000001", 1245],
      ["0x0000000000000000000000000000000000000002", 50],
    ]);
    expect(imported.every(account => /^Reader [0-9A-F]{5}$/.test(account.displayName))).toBe(true);
    expect(await testPrisma.pointEvent.count({ where: { action: "IMPORTED_WALLET_POINTS" } })).toBe(2);
  });

  it("puts imported players on the leaderboard by pseudonym", async () => {
    await testPrisma.user.create({ data: { walletAddress: "0x01", points: 1245 } });
    await runImport();

    const [top] = await actions.getTopUsers();
    expect(top).toMatchObject({ points: 1245, displayName: expect.stringMatching(/^Reader /) });
    expect(top).not.toHaveProperty("walletAddress");
  });
});
