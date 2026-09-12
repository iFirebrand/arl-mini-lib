import { vi } from "vitest";

// Stand-in for the PrismaClient exported by lib/db.ts. Use it with:
//   vi.mock("~~/lib/db", async () => ({ default: (await import("../../mocks/prisma")).prismaMock }));
const model = () => ({
  create: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  upsert: vi.fn(),
  updateMany: vi.fn(),
});

export const prismaMock = {
  library: model(),
  item: model(),
  user: model(),
  poll: model(),
  arlibSettings: model(),
};
