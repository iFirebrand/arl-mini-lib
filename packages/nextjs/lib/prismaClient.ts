import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 talks to Postgres through the pg driver, whose defaults differ from Prisma 6's own
// engine. These settings keep what Prisma 6 did.
export function createPrismaClient(connectionString: string | undefined) {
  // Without a URL (the build has no secrets) nothing connects until the first query, which fails.
  const hostname = connectionString ? new URL(connectionString).hostname : "localhost";
  const local = hostname === "localhost" || hostname === "127.0.0.1";
  const adapter = new PrismaPg(
    {
      connectionString,
      // Supabase requires an encrypted connection, and its certificate comes from Supabase's own
      // certificate authority, which Node doesn't know. Prisma 6 encrypted without checking the
      // certificate (sslmode=prefer); so does this. The local test database has no TLS.
      ssl: local ? false : { rejectUnauthorized: false },
      // pg waits forever for a connection by default; Prisma 6 gave up after 5 seconds.
      connectionTimeoutMillis: 5_000,
    },
    // The database closed an idle connection. The pool replaces it; log it so it shows up in Vercel.
    { onPoolError: error => console.error("Database connection dropped:", error.message) },
  );
  return new PrismaClient({ adapter });
}
