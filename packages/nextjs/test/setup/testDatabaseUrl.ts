// Integration tests wipe tables, so they must only ever touch a disposable local database.
export const DEFAULT_TEST_DATABASE_URL = "postgresql://arlib:arlib@localhost:54329/arlib_test";

export function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
  const { hostname } = new URL(url);
  if (!["localhost", "127.0.0.1"].includes(hostname)) {
    throw new Error(
      `Refusing to run integration tests against ${hostname}. TEST_DATABASE_URL must point at a local database ` +
        "(start one with `yarn test:db:up`).",
    );
  }
  return url;
}
