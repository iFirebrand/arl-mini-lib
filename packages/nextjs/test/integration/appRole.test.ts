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
    await appPrisma.poll.create({ data: { questionId: "rewards-pool", rating: 4 } });

    expect(await appPrisma.item.count()).toBe(1);
    expect(await appPrisma.arlibSettings.findMany()).toEqual([]);
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
