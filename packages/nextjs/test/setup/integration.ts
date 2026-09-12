import { getTestDatabaseUrl } from "./testDatabaseUrl";

// Point Prisma at the local test database before any PrismaClient is created.
const url = getTestDatabaseUrl();
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
// Library photos must live under this project's storage URL (see createLibrary).
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test";
