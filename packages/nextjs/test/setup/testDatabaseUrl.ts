// Integration tests wipe tables, so they must only ever touch a disposable local database.
export const DEFAULT_TEST_DATABASE_URL = "postgresql://arlib:arlib@localhost:54329/arlib_test";
export const TEST_APP_ROLE_PASSWORD = "arlib_app_test_only";

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

// The same database, signed in as the least-privilege role the app uses in production.
export function getTestAppDatabaseUrl(): string {
  const url = new URL(getTestDatabaseUrl());
  url.username = "arlib_app";
  url.password = TEST_APP_ROLE_PASSWORD;
  return url.toString();
}
