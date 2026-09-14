import { appPrisma, resetDatabase, testPrisma } from "./db";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("./db")).appPrisma }));

// One browser: cookies set by a response are sent with the next request.
const browser = vi.hoisted(() => ({
  jar: null as null | ReturnType<typeof import("../mocks/cookies").createCookieJar>,
}));
vi.mock("next/headers", async () => {
  browser.jar = (await import("../mocks/cookies")).createCookieJar();
  return { headers: () => new Headers({ referer: "http://localhost:3000/account" }), cookies: () => browser.jar };
});

const { writeChallenge, writeSession } = await import("~~/lib/session");
const { mergeAccountInto } = await import("~~/lib/accounts");
const { GET: listRoute } = await import("~~/app/api/account/passkeys/route");
const { PATCH: renameRoute, DELETE: removeRoute } = await import("~~/app/api/account/passkeys/[id]/route");
const { POST: registerOptions } = await import("~~/app/api/passkey/register/options/route");
const { POST: loginVerify } = await import("~~/app/api/passkey/login/verify/route");
const { GET: accountRoute } = await import("~~/app/api/account/route");

let ipCounter = 0;
const req = (url: string, method: string, body?: unknown) =>
  new Request(`http://localhost:3000${url}`, {
    method,
    headers: { "x-forwarded-for": `10.9.2.${++ipCounter}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const PASSKEY = { publicKey: Buffer.from([1, 2, 3]), deviceType: "multiDevice", backedUp: true };

// Credential ids look like base64url; these are made up.
const idOf = (displayName: string, n: number) => `${displayName.replace(/\W/g, "-")}-credential-${n}`;

async function accountWithPasskeys(displayName: string, count: number) {
  const account = await testPrisma.account.create({ data: { displayName } });
  for (let n = 1; n <= count; n++) {
    await testPrisma.passkey.create({ data: { id: idOf(displayName, n), accountId: account.id, ...PASSKEY } });
  }
  return account;
}

beforeEach(async () => {
  await resetDatabase();
  browser.jar?.clear();
});
afterAll(() => Promise.all([testPrisma.$disconnect(), appPrisma.$disconnect()]));

describe("managing passkeys, as the app's database role", () => {
  it("lists, renames and removes the signed-in account's passkeys", async () => {
    const account = await accountWithPasskeys("Reader AAAAA", 2);
    await writeSession(account.id);

    const listed = await (await listRoute()).json();
    expect(listed.passkeys.map((p: { id: string }) => p.id)).toEqual([
      idOf("Reader AAAAA", 1),
      idOf("Reader AAAAA", 2),
    ]);

    const renamed = await renameRoute(
      req("/api/account/passkeys/x", "PATCH", { name: "My phone" }),
      params(idOf("Reader AAAAA", 1)),
    );
    expect(renamed.status).toBe(200);

    const removed = await (
      await removeRoute(req("/api/account/passkeys/x", "DELETE"), params(idOf("Reader AAAAA", 2)))
    ).json();
    expect(removed.remaining).toEqual([idOf("Reader AAAAA", 1)]);

    const rows = await testPrisma.passkey.findMany({ orderBy: { id: "asc" } });
    expect(rows).toEqual([
      expect.objectContaining({ id: idOf("Reader AAAAA", 1), name: "My phone", revokedAt: null }),
      expect.objectContaining({ id: idOf("Reader AAAAA", 2), revokedAt: expect.any(Date) }),
    ]);
    // Removed passkeys leave the list and can't be renamed or removed again.
    expect((await (await listRoute()).json()).passkeys).toHaveLength(1);
    expect((await removeRoute(req("/x", "DELETE"), params(idOf("Reader AAAAA", 2)))).status).toBe(404);
  });

  it("can't touch another account's passkeys", async () => {
    const mine = await accountWithPasskeys("Reader MINE1", 1);
    await accountWithPasskeys("Reader OTHER", 1);
    await writeSession(mine.id);

    expect((await renameRoute(req("/x", "PATCH", { name: "Mine now" }), params(idOf("Reader OTHER", 1)))).status).toBe(
      404,
    );
    expect((await removeRoute(req("/x", "DELETE"), params(idOf("Reader OTHER", 1)))).status).toBe(404);
    expect(await testPrisma.passkey.findUniqueOrThrow({ where: { id: idOf("Reader OTHER", 1) } })).toMatchObject({
      name: null,
      revokedAt: null,
    });
  });

  it("stops counting a removed passkey: the account is no longer saved with one", async () => {
    const account = await accountWithPasskeys("Reader BBBBB", 1);
    await writeSession(account.id);
    expect((await (await accountRoute()).json()).account.hasPasskey).toBe(true);

    await removeRoute(req("/x", "DELETE"), params(idOf("Reader BBBBB", 1)));

    expect((await (await accountRoute()).json()).account.hasPasskey).toBe(false);
  });

  it("won't sign in with a removed passkey", async () => {
    await accountWithPasskeys("Reader CCCCC", 1);
    await testPrisma.passkey.update({ where: { id: idOf("Reader CCCCC", 1) }, data: { revokedAt: new Date() } });
    await writeChallenge("login-challenge", "login");

    const res = await loginVerify(req("/api/passkey/login/verify", "POST", { id: idOf("Reader CCCCC", 1) }));

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ unknownCredential: true });
    expect(browser.jar?.values.has("arlib_session")).toBe(false);
  });

  it("doesn't let a removed passkey stop the device from making a new one", async () => {
    const account = await accountWithPasskeys("Reader DDDDD", 2);
    await testPrisma.passkey.update({ where: { id: idOf("Reader DDDDD", 1) }, data: { revokedAt: new Date() } });
    await writeSession(account.id);

    const options = await (await registerOptions(req("/api/passkey/register/options", "POST"))).json();

    expect(options.excludeCredentials.map((c: { id: string }) => c.id)).toEqual([idOf("Reader DDDDD", 2)]);
  });

  it("merges an anonymous account whose only passkey was removed, since nobody can sign in to it", async () => {
    const leftover = await accountWithPasskeys("Reader EEEEE", 1);
    await testPrisma.account.update({ where: { id: leftover.id }, data: { points: 20 } });
    await testPrisma.passkey.update({ where: { id: idOf("Reader EEEEE", 1) }, data: { revokedAt: new Date() } });
    const signedIn = await testPrisma.account.create({ data: { displayName: "Reader FFFFF", points: 5 } });

    await mergeAccountInto(leftover.id, signedIn.id);

    expect((await testPrisma.account.findUniqueOrThrow({ where: { id: signedIn.id } })).points).toBe(25);
  });
});
