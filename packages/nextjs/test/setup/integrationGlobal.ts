import { getTestDatabaseUrl } from "./testDatabaseUrl";
import { execSync } from "node:child_process";

// Runs once before the integration suite: recreate the schema from prisma/schema.prisma.
export default function setup() {
  const url = getTestDatabaseUrl();
  try {
    execSync("npx prisma db push --force-reset --skip-generate", {
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
      stdio: "pipe",
    });
  } catch (error) {
    const output = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error);
    throw new Error(`Could not prepare the test database at ${url}. Is it running? (yarn test:db:up)\n${output}`);
  }
}
