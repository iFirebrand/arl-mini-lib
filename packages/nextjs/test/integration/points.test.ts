import { resetDatabase, testPrisma } from "./db";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("./db")).testPrisma }));
vi.mock("next/headers", () => ({ headers: () => new Headers({ referer: "http://localhost:3000/libs/abc" }) }));

const { GET, POST } = await import("~~/app/api/points/route");
const actions = await import("~~/actions/actions");

const WALLET = "0x1234567890abcdef1234567890abcdef12345678";
let ipCounter = 0;

const bank = (walletAddress: string, points: number, type = points > 15 ? "CREATE_LIBRARY" : "ADD_BOOK") =>
  POST(
    new Request("http://localhost:3000/api/points", {
      method: "POST",
      headers: { "x-forwarded-for": `10.1.0.${++ipCounter}` },
      body: JSON.stringify({ walletAddress, pointActions: [{ points, type, timestamp: "t" }] }),
    }),
  );

const balance = async (walletAddress: string) =>
  (await (await GET(new Request(`http://localhost:3000/api/points?walletAddress=${walletAddress}`))).json())
    .currentTotal;

beforeEach(resetDatabase);
afterAll(() => testPrisma.$disconnect());

describe("banking points", () => {
  it("creates a user on first deposit and adds to it afterwards", async () => {
    const first = await bank(WALLET, 50);
    expect(await first.json()).toMatchObject({ success: true, currentTotal: 50 });

    const second = await bank(WALLET, 5);
    expect(await second.json()).toMatchObject({ success: true, currentTotal: 55 });

    expect(await balance(WALLET)).toBe(55);
    expect(await testPrisma.user.count()).toBe(1);
  });

  it("reports 0 for an unknown wallet without creating it", async () => {
    expect(await balance("0xnobody")).toBe(0);
    expect(await testPrisma.user.count()).toBe(0);
  });

  it("does not lose points under concurrent deposits", async () => {
    await bank(WALLET, 1);

    const results = await Promise.all(Array.from({ length: 20 }, () => bank(WALLET, 5)));

    expect(results.every(res => res.status === 200)).toBe(true);
    expect(await balance(WALLET)).toBe(101);
  });

  it("feeds the leaderboard and user count", async () => {
    await bank("0xaaa", 10);
    await bank("0xbbb", 50);
    await bank("0xccc", 15);

    expect((await actions.getTopUsers()).map(user => [user.walletAddress, user.points])).toEqual([
      ["0xbbb", 50],
      ["0xccc", 15],
      ["0xaaa", 10],
    ]);
    expect(await actions.totalUserCount()).toBe(3);
  });

  it("stores nothing when a request is rejected", async () => {
    const res = await bank(WALLET, 1_000_000, "ADD_BOOK");

    expect(res.status).toBe(400);
    expect(await testPrisma.user.count()).toBe(0);
  });
});
