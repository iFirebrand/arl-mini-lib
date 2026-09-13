import { getTestAppDatabaseUrl } from "../setup/testDatabaseUrl";
import { PrismaClient } from "@prisma/client";

// Admin connection for setting up and inspecting test data.
export const testPrisma = new PrismaClient();

// What the app gets: the least-privilege arlib_app role, exactly as in production. Swap it in for
// lib/db.ts, which would otherwise use DATABASE_URL:
//   vi.mock("~~/lib/db", async () => ({ default: (await import("./db")).appPrisma }));
export const appPrisma = new PrismaClient({ datasourceUrl: getTestAppDatabaseUrl() });

export async function resetDatabase() {
  await testPrisma.$executeRawUnsafe(
    'TRUNCATE TABLE "ModerationEvent", "Moderator", "PointEvent", "Passkey", "Account", "Item", "_LibraryCurators", "Library", "User", "Poll", "ArlibSettings" CASCADE',
  );
}

export function createTestLibrary(overrides: Partial<Parameters<typeof testPrisma.library.create>[0]["data"]> = {}) {
  return testPrisma.library.create({
    data: { locationName: "Maple St Little Library", latitude: 38.883839, longitude: -77.107249, ...overrides },
  });
}
