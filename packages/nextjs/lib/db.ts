// https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
import { PrismaClient } from "@prisma/client";
import "server-only";

// Prisma connects with DATABASE_URL directly. There is deliberately no Supabase sign-in here:
// it never applied to Prisma's connection, and when Supabase Auth timed out it left the whole
// server instance answering "Database access denied".
const globalForPrisma = globalThis as unknown as { prismaGlobal?: PrismaClient };

const prisma = globalForPrisma.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaGlobal = prisma;
}

export default prisma;
