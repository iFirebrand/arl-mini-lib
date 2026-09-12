import { PrismaClient } from "@prisma/client";

// Real PrismaClient connected to the test database. Integration tests swap it in for lib/db.ts,
// which would otherwise sign in to the production Supabase project first:
//   vi.mock("~~/lib/db", async () => ({ default: (await import("./db")).testPrisma }));
export const testPrisma = new PrismaClient();

export async function resetDatabase() {
  await testPrisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Item", "_LibraryCurators", "Library", "User", "Poll", "ArlibSettings" CASCADE',
  );
}

export function createTestLibrary(overrides: Partial<Parameters<typeof testPrisma.library.create>[0]["data"]> = {}) {
  return testPrisma.library.create({
    data: { locationName: "Maple St Little Library", latitude: 38.883839, longitude: -77.107249, ...overrides },
  });
}
