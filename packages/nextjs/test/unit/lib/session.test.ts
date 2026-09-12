// @vitest-environment node
import { createCookieJar } from "../../mocks/cookies";
import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieJar> | null }));
vi.mock("next/headers", () => ({ cookies: () => jar.current }));

const session = await import("~~/lib/session");

describe("session cookie", () => {
  beforeEach(() => {
    jar.current = createCookieJar();
  });

  it("round-trips the account id", async () => {
    await session.writeSession("acc_1");
    expect(await session.readSessionAccountId()).toBe("acc_1");
  });

  it("is httpOnly, same-site and long-lived", async () => {
    await session.writeSession("acc_1");
    expect(jar.current?.options.get("arlib_session")).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 400 * 24 * 60 * 60,
    });
  });

  it("stores only a signed id, nothing readable about the person", async () => {
    await session.writeSession("acc_1");
    const [, payload] = (jar.current?.values.get("arlib_session") ?? "").split(".");
    expect(Object.keys(JSON.parse(Buffer.from(payload, "base64url").toString())).sort()).toEqual(["exp", "iat", "sub"]);
  });

  it("rejects a cookie that was edited", async () => {
    await session.writeSession("acc_1");
    const [header, , signature] = (jar.current?.values.get("arlib_session") ?? "").split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "someone_else" })).toString("base64url");
    jar.current?.values.set("arlib_session", `${header}.${forged}.${signature}`);

    expect(await session.readSessionAccountId()).toBeNull();
  });

  it("returns null without a cookie or with garbage", async () => {
    expect(await session.readSessionAccountId()).toBeNull();
    jar.current?.values.set("arlib_session", "garbage");
    expect(await session.readSessionAccountId()).toBeNull();
  });

  it("refuses to run in production without a strong secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "short");
    try {
      await expect(session.writeSession("acc_1")).rejects.toThrow("SESSION_SECRET");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("passkey challenges", () => {
  beforeEach(() => {
    jar.current = createCookieJar();
  });

  it("returns a stored challenge once, for the same purpose", async () => {
    await session.writeChallenge("abc123", "register");

    expect(await session.takeChallenge("register")).toBe("abc123");
    expect(await session.takeChallenge("register")).toBeNull();
  });

  it("won't use a sign-in challenge for registration", async () => {
    await session.writeChallenge("abc123", "login");
    expect(await session.takeChallenge("register")).toBeNull();
  });

  it("expires after five minutes", async () => {
    vi.useFakeTimers();
    try {
      await session.writeChallenge("abc123", "login");
      vi.setSystemTime(Date.now() + 6 * 60 * 1000);
      expect(await session.takeChallenge("login")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
