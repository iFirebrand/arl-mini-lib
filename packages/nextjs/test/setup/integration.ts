import { getTestDatabaseUrl } from "./testDatabaseUrl";

// Point Prisma at the local test database before any PrismaClient is created.
const url = getTestDatabaseUrl();
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
