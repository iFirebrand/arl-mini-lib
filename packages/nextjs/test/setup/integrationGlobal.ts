import { TEST_APP_ROLE_PASSWORD, getTestDatabaseUrl } from "./testDatabaseUrl";
import { execSync } from "node:child_process";

// Runs once before the integration suite: bring the schema in line with prisma/schema.prisma, then
// apply the production role setup so the app's queries run as the least-privilege arlib_app role.
export default function setup() {
  const url = getTestDatabaseUrl();
  // Prisma commands connect with DIRECT_URL (prisma.config.ts).
  const run = (command: string, input?: string) =>
    execSync(command, { env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, input, stdio: "pipe" });
  try {
    // Syncs tables without wiping the database; tests clear their own tables (resetDatabase).
    run("npx prisma db push");
    run("npx prisma db execute --file test/setup/supabase-roles.sql");
    run("npx prisma db execute --file prisma/sql/app-role.sql");
    run("npx prisma db execute --stdin", `alter role arlib_app with password '${TEST_APP_ROLE_PASSWORD}';`);
  } catch (error) {
    const output = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error);
    throw new Error(`Could not prepare the test database at ${url}. Is it running? (yarn test:db:up)\n${output}`);
  }
}
