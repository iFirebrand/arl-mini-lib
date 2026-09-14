// @vitest-environment node
import { PrismaPg } from "@prisma/adapter-pg";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPrismaClient } from "~~/lib/prismaClient";

vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: vi.fn() }));
vi.mock("~~/lib/generated/prisma/client", () => ({ PrismaClient: vi.fn() }));

const poolConfig = () => vi.mocked(PrismaPg).mock.calls[0][0] as Record<string, unknown>;

describe("createPrismaClient", () => {
  beforeEach(() => {
    vi.mocked(PrismaPg).mockClear();
  });

  // Production's database role refuses unencrypted connections, and Node doesn't trust Supabase's
  // certificate authority: without this setting, or with certificate checks on, nothing connects.
  it("encrypts connections to Supabase without checking the certificate, as Prisma 6 did", () => {
    const url = "postgresql://arlib_app.ref:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
    createPrismaClient(url);
    expect(poolConfig()).toMatchObject({ connectionString: url, ssl: { rejectUnauthorized: false } });
  });

  it("connects to the local test database without TLS", () => {
    createPrismaClient("postgresql://arlib:arlib@localhost:54329/arlib_test");
    expect(poolConfig().ssl).toBe(false);
    createPrismaClient("postgresql://arlib:arlib@127.0.0.1:54329/arlib_test");
    expect(vi.mocked(PrismaPg).mock.calls[1][0]).toMatchObject({ ssl: false });
  });

  it("gives up connecting after 5 seconds instead of waiting forever", () => {
    createPrismaClient("postgresql://u:p@db.example.com:5432/postgres");
    expect(poolConfig().connectionTimeoutMillis).toBe(5_000);
  });

  // The build runs without secrets and still loads lib/db.ts.
  it("can be created without a connection string", () => {
    expect(() => createPrismaClient(undefined)).not.toThrow();
  });
});
