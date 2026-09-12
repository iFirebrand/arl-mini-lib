// @vitest-environment node
import { prismaMock } from "../../mocks/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("../../mocks/prisma")).prismaMock }));

const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));
vi.mock("next/headers", () => ({ headers: () => requestHeaders.current }));

const { GET, POST } = await import("~~/app/api/points/route");

const WALLET = "0x1234567890abcdef1234567890abcdef12345678";
let ipCounter = 0;

// Each request gets its own IP so the module-level rate limiter doesn't leak between tests.
const postPoints = (body: unknown, { referer = "https://arlib.me/libs/abc", ip = `10.0.0.${++ipCounter}` } = {}) => {
  requestHeaders.current = new Headers(referer ? { referer } : {});
  return POST(
    new Request("https://arlib.me/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
};

const validBody = { walletAddress: WALLET, pointActions: [{ points: 5, type: "ADD_BOOK", timestamp: "t" }] };

describe("POST /api/points", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.arlib.me";
    prismaMock.user.upsert.mockReset();
    prismaMock.user.upsert.mockResolvedValue({ id: "u1", walletAddress: WALLET, points: 105 });
  });

  it("adds the summed points to the wallet and returns the new total", async () => {
    const res = await postPoints({
      walletAddress: WALLET,
      pointActions: [
        { points: 5, type: "ADD_BOOK", timestamp: "t" },
        { points: 50, type: "CREATE_LIBRARY", timestamp: "t" },
      ],
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, currentTotal: 105 });
    expect(prismaMock.user.upsert).toHaveBeenCalledWith({
      where: { walletAddress: WALLET },
      update: { points: { increment: 55 } },
      create: { walletAddress: WALLET, points: 55 },
    });
  });

  it.each(["https://arlib.me/", "https://www.arlib.me/stats", "http://localhost:3000/libs"])(
    "accepts requests from %s",
    async referer => {
      expect((await postPoints(validBody, { referer })).status).toBe(200);
    },
  );

  it("rejects requests with no referer", async () => {
    const res = await postPoints(validBody, { referer: "" });
    expect(res.status).toBe(403);
    expect(prismaMock.user.upsert).not.toHaveBeenCalled();
  });

  it("rejects requests from other sites", async () => {
    const res = await postPoints(validBody, { referer: "https://evil.example.com/" });
    expect(res.status).toBe(403);
  });

  it("rejects Vercel preview URLs while NEXT_PUBLIC_APP_URL points at production", async () => {
    const res = await postPoints(validBody, { referer: "https://arl-mini-lib-git-dev-0xfires-projects.vercel.app/" });
    expect(res.status).toBe(403);
  });

  it("KNOWN ISSUE: accepts any referer when NEXT_PUBLIC_APP_URL is unset (Preview and Development today)", async () => {
    // allowedOrigins falls back to "", and every string starts with "".
    delete process.env.NEXT_PUBLIC_APP_URL;
    const res = await postPoints(validBody, { referer: "https://evil.example.com/" });
    expect(res.status).toBe(200);
  });

  it("requires a wallet address", async () => {
    const res = await postPoints({ pointActions: validBody.pointActions });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Wallet address is required" });
  });

  it.each([[undefined], [[]], ["not-an-array"]])("requires a non-empty pointActions array (%j)", async pointActions => {
    const res = await postPoints({ walletAddress: WALLET, pointActions });
    expect(res.status).toBe(400);
  });

  it("rejects a negative total", async () => {
    const res = await postPoints({ walletAddress: WALLET, pointActions: [{ points: -10 }] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid points value" });
  });

  it("rejects a total above 1,000,000", async () => {
    const res = await postPoints({ walletAddress: WALLET, pointActions: [{ points: 1_000_001 }] });
    expect(res.status).toBe(400);
  });

  it("returns 500 when the database write fails", async () => {
    prismaMock.user.upsert.mockRejectedValue(new Error("connection refused"));
    const res = await postPoints(validBody);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to save points" });
  });

  it("rate-limits an IP after 499 requests a minute", async () => {
    const ip = "192.0.2.99";
    for (let i = 0; i < 499; i++) {
      expect((await postPoints(validBody, { ip })).status).toBe(200);
    }
    expect((await postPoints(validBody, { ip })).status).toBe(429);
    expect((await postPoints(validBody, { ip: "192.0.2.100" })).status).toBe(200);
  });
});

describe("GET /api/points", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
  });

  it("returns the wallet's banked total", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", walletAddress: WALLET, points: 42 });

    const res = await GET(new Request(`https://arlib.me/api/points?walletAddress=${WALLET}`));

    expect(await res.json()).toEqual({ success: true, currentTotal: 42 });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { walletAddress: WALLET } });
  });

  it("returns 0 for a wallet it has never seen", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await GET(new Request(`https://arlib.me/api/points?walletAddress=${WALLET}`));

    expect(await res.json()).toEqual({ success: true, currentTotal: 0 });
  });

  it("requires a wallet address", async () => {
    const res = await GET(new Request("https://arlib.me/api/points"));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the database read fails", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("timeout"));
    const res = await GET(new Request(`https://arlib.me/api/points?walletAddress=${WALLET}`));
    expect(res.status).toBe(500);
  });
});
