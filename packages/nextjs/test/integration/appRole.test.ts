import { appPrisma, createTestLibrary, resetDatabase, testPrisma } from "./db";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

// prisma/sql/app-role.sql, applied by the integration global setup, exactly as in production.

beforeEach(resetDatabase);
afterAll(() => Promise.all([testPrisma.$disconnect(), appPrisma.$disconnect()]));

const PERMISSION_DENIED = /permission denied/i;

describe("the arlib_app role", () => {
  it("connects as arlib_app, not as an admin", async () => {
    const [{ current_user, is_superuser }] = await appPrisma.$queryRaw<
      { current_user: string; is_superuser: string }[]
    >`
      select current_user, current_setting('is_superuser') as is_superuser`;
    expect(current_user).toBe("arlib_app");
    expect(is_superuser).toBe("off");
  });

  it("can do what the app does", async () => {
    const library = await appPrisma.library.create({
      data: { locationName: "Maple St", latitude: 38.88, longitude: -77.1 },
    });
    const item = await appPrisma.item.create({
      data: { title: "The Wager", isbn13: "9780063345164", libraryId: library.id },
    });
    await appPrisma.item.updateMany({ where: { id: item.id }, data: { updatedAt: new Date() } });
    await appPrisma.user.upsert({
      where: { walletAddress: "0xabc" },
      update: { points: { increment: 5 } },
      create: { walletAddress: "0xabc", points: 5 },
    });
    await appPrisma.$executeRaw`UPDATE "Library" SET "active" = false WHERE "id" = ${library.id}`;
    await appPrisma.$executeRaw`UPDATE "Item" SET "hidden" = true WHERE "id" = ${item.id}`;
    await appPrisma.moderationEvent.create({
      data: { moderatorId: "acc_1", targetType: "item", targetId: item.id, hidden: true },
    });

    expect(await appPrisma.item.count()).toBe(1);
    expect(await appPrisma.arlibSettings.findMany()).toEqual([]);
  });

  it("can change only a library's visibility and a book's confirmed time and visibility", async () => {
    const library = await createTestLibrary();
    const item = await testPrisma.item.create({ data: { title: "The Wager", libraryId: library.id } });
    await expect(
      appPrisma.$executeRaw`UPDATE "Library" SET "locationName" = 'Renamed' WHERE "id" = ${library.id}`,
    ).rejects.toThrow(PERMISSION_DENIED);
    await expect(appPrisma.$executeRaw`UPDATE "Item" SET "title" = 'Renamed' WHERE "id" = ${item.id}`).rejects.toThrow(
      PERMISSION_DENIED,
    );
  });

  it("cannot make anyone a moderator or rewrite the moderation log", async () => {
    const account = await testPrisma.account.create({ data: { displayName: "Reader TEST1" } });
    await expect(appPrisma.moderator.create({ data: { accountId: account.id } })).rejects.toThrow(PERMISSION_DENIED);
    const event = await testPrisma.moderationEvent.create({
      data: { moderatorId: account.id, targetType: "library", targetId: "lib_1", hidden: true },
    });
    await expect(
      appPrisma.moderationEvent.update({ where: { id: event.id }, data: { hidden: false } }),
    ).rejects.toThrow(PERMISSION_DENIED);
  });

  it("can note books no catalog found, but not read them back", async () => {
    await appPrisma.lookupMiss.createMany({ data: [{ kind: "isbn", query: "9780063345164" }] });
    expect(await testPrisma.lookupMiss.count()).toBe(1);
    await expect(appPrisma.lookupMiss.findMany()).rejects.toThrow(PERMISSION_DENIED);
    await expect(appPrisma.lookupMiss.create({ data: { kind: "isbn", query: "9780063345164" } })).rejects.toThrow(
      PERMISSION_DENIED,
    );
  });

  it("can rename and remove a passkey, but never change its key or owner", async () => {
    const account = await testPrisma.account.create({ data: { displayName: "Reader KEYS1" } });
    const other = await testPrisma.account.create({ data: { displayName: "Reader KEYS2" } });
    await testPrisma.passkey.create({
      data: {
        id: "cred_1",
        accountId: account.id,
        publicKey: Buffer.from([1]),
        deviceType: "multiDevice",
        backedUp: true,
      },
    });

    await appPrisma.passkey.updateMany({ where: { id: "cred_1" }, data: { name: "Phone", revokedAt: new Date() } });
    await appPrisma.passkey.updateMany({
      where: { id: "cred_1" },
      data: { counter: 7, lastUsedAt: new Date(), lastUsedFrom: "Safari on iPhone" },
    });

    await expect(
      appPrisma.$executeRaw`UPDATE "Passkey" SET "publicKey" = ${Buffer.from([9])} WHERE "id" = 'cred_1'`,
    ).rejects.toThrow(PERMISSION_DENIED);
    await expect(
      appPrisma.$executeRaw`UPDATE "Passkey" SET "accountId" = ${other.id} WHERE "id" = 'cred_1'`,
    ).rejects.toThrow(PERMISSION_DENIED);
    const row = await testPrisma.passkey.findUniqueOrThrow({ where: { id: "cred_1" } });
    expect(row).toMatchObject({ name: "Phone", counter: 7, accountId: account.id });
    expect(Buffer.from(row.publicKey)).toEqual(Buffer.from([1]));
  });

  it("can no longer add poll votes", async () => {
    await expect(appPrisma.poll.create({ data: { questionId: "rewards-pool", rating: 4 } })).rejects.toThrow(
      PERMISSION_DENIED,
    );
  });

  it("cannot delete rows", async () => {
    const library = await createTestLibrary();
    await expect(appPrisma.library.delete({ where: { id: library.id } })).rejects.toThrow(PERMISSION_DENIED);
    await expect(appPrisma.item.deleteMany()).rejects.toThrow(PERMISSION_DENIED);
    expect(await testPrisma.library.count()).toBe(1);
  });

  it("cannot truncate tables or change the schema", async () => {
    await expect(appPrisma.$executeRawUnsafe('TRUNCATE TABLE "Library" CASCADE')).rejects.toThrow(PERMISSION_DENIED);
    await expect(appPrisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN hacked text')).rejects.toThrow(
      /must be owner|permission denied/i,
    );
    await expect(appPrisma.$executeRawUnsafe("CREATE TABLE public.hacked (id int)")).rejects.toThrow(PERMISSION_DENIED);
  });

  it("cannot change site settings or touch tables the app doesn't use", async () => {
    await expect(
      appPrisma.arlibSettings.create({
        data: { id: "1", booksNeededToNameLibrary: 1, seasonEndsAt: new Date(), totalItems: 0, totalLibraries: 0 },
      }),
    ).rejects.toThrow(PERMISSION_DENIED);
    await expect(appPrisma.$queryRawUnsafe('SELECT * FROM "_LibraryCurators"')).rejects.toThrow(PERMISSION_DENIED);
  });
});

describe("row-level security", () => {
  it("is on for every app table", async () => {
    const tables = await testPrisma.$queryRaw<{ tablename: string; rowsecurity: boolean }[]>`
      select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename`;
    expect(tables.filter(table => !table.rowsecurity).map(table => table.tablename)).toEqual([]);
  });
});

describe("the Supabase Data API roles", () => {
  it("hold no privileges on any app table", async () => {
    const grants = await testPrisma.$queryRaw<{ grantee: string; table_name: string }[]>`
      select grantee, table_name from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')`;
    expect(grants).toEqual([]);
  });

  it("no longer have the per-person policies", async () => {
    const policies = await testPrisma.$queryRaw<{ policyname: string }[]>`
      select policyname from pg_policies where schemaname = 'public' and policyname like 'Allow %'`;
    expect(policies).toEqual([]);
  });
});
