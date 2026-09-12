import { TEST_APP_ROLE_PASSWORD, getTestDatabaseUrl } from "./testDatabaseUrl";
import { execSync } from "node:child_process";

// Runs once before the integration suite: recreate the schema from prisma/schema.prisma, then
// apply the production role setup so the app's queries run as the least-privilege arlib_app role.
export default function setup() {
  const url = getTestDatabaseUrl();
  const run = (command: string, input?: string) =>
    execSync(command, { env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, input, stdio: "pipe" });
  try {
    run("npx prisma db push --force-reset --skip-generate");
    run(`npx prisma db execute --url "${url}" --file test/setup/supabase-roles.sql`);
    run(`npx prisma db execute --url "${url}" --file prisma/sql/app-role.sql`);
    run(
      `npx prisma db execute --url "${url}" --stdin`,
      `alter role arlib_app with password '${TEST_APP_ROLE_PASSWORD}';`,
    );
  } catch (error) {
    const output = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error);
    throw new Error(`Could not prepare the test database at ${url}. Is it running? (yarn test:db:up)\n${output}`);
  }
}
