// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const requestHeaders = vi.hoisted(() => ({ current: new Headers({ referer: "http://localhost:3000/account" }) }));
vi.mock("next/headers", () => ({ headers: () => requestHeaders.current }));

const session = vi.hoisted(() => ({ readSessionAccountId: vi.fn() }));
vi.mock("~~/lib/session", () => session);

const passkeys = vi.hoisted(() => ({ listPasskeys: vi.fn(), renamePasskey: vi.fn(), removePasskey: vi.fn() }));
vi.mock("~~/lib/passkeys", async importOriginal => ({ ...(await importOriginal<object>()), ...passkeys }));
vi.mock("~~/lib/db", () => ({ default: {} }));

const { GET: list } = await import("~~/app/api/account/passkeys/route");
const { PATCH: rename, DELETE: remove } = await import("~~/app/api/account/passkeys/[id]/route");

const ID = "AbCdEfGhIjKlMnOpQrStUv";
let ipCounter = 0;
const call = (handler: typeof rename, id: string, method: string, body?: unknown) =>
  handler(
    new Request(`http://localhost:3000/api/account/passkeys/${id}`, {
      method,
      headers: { "x-forwarded-for": `10.7.1.${++ipCounter}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  requestHeaders.current = new Headers({ referer: "http://localhost:3000/account" });
  session.readSessionAccountId.mockReset().mockResolvedValue("acc_1");
  Object.values(passkeys).forEach(fn => fn.mockReset());
});

describe("GET /api/account/passkeys", () => {
  it("lists the signed-in account's passkeys, never cached", async () => {
    passkeys.listPasskeys.mockResolvedValue([{ id: ID }]);

    const res = await list();

    expect(await res.json()).toEqual({ passkeys: [{ id: ID }] });
    expect(passkeys.listPasskeys).toHaveBeenCalledWith("acc_1");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("needs an account", async () => {
    session.readSessionAccountId.mockResolvedValue(null);
    expect((await list()).status).toBe(401);
  });
});

describe("PATCH /api/account/passkeys/:id", () => {
  it("renames with the cleaned name", async () => {
    passkeys.renamePasskey.mockResolvedValue(true);

    const res = await call(rename, ID, "PATCH", { name: "  Work  laptop " });

    expect(await res.json()).toEqual({ ok: true, name: "Work laptop" });
    expect(passkeys.renamePasskey).toHaveBeenCalledWith("acc_1", ID, "Work laptop");
  });

  it.each([
    ["an empty name", { name: " " }],
    ["a name over 40 characters", { name: "x".repeat(41) }],
    ["no name", {}],
  ])("rejects %s", async (_label, body) => {
    expect((await call(rename, ID, "PATCH", body)).status).toBe(400);
    expect(passkeys.renamePasskey).not.toHaveBeenCalled();
  });

  it("answers 404 for a passkey that isn't the account's", async () => {
    passkeys.renamePasskey.mockResolvedValue(false);
    expect((await call(rename, ID, "PATCH", { name: "Phone" })).status).toBe(404);
  });

  it("answers 404 for something that can't be a passkey id", async () => {
    expect((await call(rename, "../../people", "PATCH", { name: "Phone" })).status).toBe(404);
    expect(passkeys.renamePasskey).not.toHaveBeenCalled();
  });

  it("refuses other sites and visitors without an account", async () => {
    requestHeaders.current = new Headers({ referer: "https://evil.example.com/" });
    expect((await call(rename, ID, "PATCH", { name: "Phone" })).status).toBe(403);

    requestHeaders.current = new Headers({ referer: "http://localhost:3000/account" });
    session.readSessionAccountId.mockResolvedValue(null);
    expect((await call(rename, ID, "PATCH", { name: "Phone" })).status).toBe(401);
    expect(passkeys.renamePasskey).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/account/passkeys/:id", () => {
  it("removes it and returns what the browser needs to update the password manager", async () => {
    passkeys.removePasskey.mockResolvedValue(["cred_2"]);

    const res = await call(remove, ID, "DELETE");

    expect(await res.json()).toEqual({
      remaining: ["cred_2"],
      rpID: "localhost",
      userID: Buffer.from("acc_1").toString("base64url"),
    });
    expect(passkeys.removePasskey).toHaveBeenCalledWith("acc_1", ID);
  });

  it("answers 404 for a passkey that isn't the account's", async () => {
    passkeys.removePasskey.mockResolvedValue(null);
    expect((await call(remove, ID, "DELETE")).status).toBe(404);
  });

  it("refuses other sites", async () => {
    requestHeaders.current = new Headers({ referer: "https://evil.example.com/" });
    expect((await call(remove, ID, "DELETE")).status).toBe(403);
    expect(passkeys.removePasskey).not.toHaveBeenCalled();
  });
});
