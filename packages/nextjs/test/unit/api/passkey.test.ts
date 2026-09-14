// @vitest-environment node
import { prismaMock } from "../../mocks/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~~/lib/db", async () => ({ default: (await import("../../mocks/prisma")).prismaMock }));

const requestHeaders = vi.hoisted(() => ({ current: new Headers({ referer: "http://localhost:3000/" }) }));
vi.mock("next/headers", () => ({ headers: () => requestHeaders.current }));

const webauthn = vi.hoisted(() => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));
vi.mock("@simplewebauthn/server", () => webauthn);

const session = vi.hoisted(() => ({
  readSessionAccountId: vi.fn(),
  writeSession: vi.fn(),
  writeChallenge: vi.fn(),
  takeChallenge: vi.fn(),
}));
vi.mock("~~/lib/session", () => session);

const accounts = vi.hoisted(() => ({ getOrCreateAccount: vi.fn(), mergeAccountInto: vi.fn() }));
vi.mock("~~/lib/accounts", () => accounts);

const { POST: registerOptions } = await import("~~/app/api/passkey/register/options/route");
const { POST: registerVerify } = await import("~~/app/api/passkey/register/verify/route");
const { POST: loginOptions } = await import("~~/app/api/passkey/login/options/route");
const { POST: loginVerify } = await import("~~/app/api/passkey/login/verify/route");

let ipCounter = 0;
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const request = (body?: unknown, ip = `10.6.0.${++ipCounter}`, userAgent?: string) =>
  new Request("http://localhost:3000/api/passkey", {
    method: "POST",
    headers: { "x-forwarded-for": ip, ...(userAgent && { "user-agent": userAgent }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const storedPasskey = {
  id: "cred_1",
  accountId: "acc_owner",
  publicKey: Buffer.from([1, 2, 3]),
  counter: 4,
  transports: "internal,hybrid",
};

beforeEach(() => {
  requestHeaders.current = new Headers({ referer: "http://localhost:3000/" });
  Object.values(webauthn).forEach(fn => fn.mockReset());
  Object.values(session).forEach(fn => fn.mockReset());
  Object.values(accounts).forEach(fn => fn.mockReset());
  prismaMock.passkey.findMany.mockReset().mockResolvedValue([]);
  prismaMock.passkey.findUnique.mockReset();
  prismaMock.passkey.create.mockReset();
  prismaMock.passkey.update.mockReset();
});

describe("adding a passkey", () => {
  it("creates the account if needed and asks for a discoverable passkey", async () => {
    accounts.getOrCreateAccount.mockResolvedValue({ id: "acc_1", displayName: "Reader K7Q2M" });
    prismaMock.passkey.findMany.mockResolvedValue([{ id: "cred_old" }]);
    webauthn.generateRegistrationOptions.mockResolvedValue({ challenge: "reg-challenge" });

    const res = await registerOptions(request());

    expect(res.status).toBe(200);
    const options = webauthn.generateRegistrationOptions.mock.calls[0][0];
    expect(options).toMatchObject({
      rpID: "localhost",
      userName: "Reader K7Q2M",
      excludeCredentials: [{ id: "cred_old" }],
      authenticatorSelection: { residentKey: "required" },
    });
    // A removed passkey may still be on this device; it mustn't block making a new one.
    expect(prismaMock.passkey.findMany).toHaveBeenCalledWith({
      where: { accountId: "acc_1", revokedAt: null },
      select: { id: true },
    });
    expect(new TextDecoder().decode(options.userID)).toBe("acc_1");
    expect(session.writeChallenge).toHaveBeenCalledWith("reg-challenge", "register");
  });

  it("stores the verified public key on the signed-in account", async () => {
    session.readSessionAccountId.mockResolvedValue("acc_1");
    session.takeChallenge.mockResolvedValue("reg-challenge");
    webauthn.verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: { id: "cred_new", publicKey: new Uint8Array([9, 9]), counter: 0, transports: ["internal"] },
        credentialDeviceType: "multiDevice",
        credentialBackedUp: true,
        aaguid: "fbfc3007-154e-4ecc-8c0b-6e020557d7bd",
      },
    });

    const res = await registerVerify(request({ id: "cred_new" }, undefined, IPHONE_SAFARI));

    expect(res.status).toBe(201);
    expect(webauthn.verifyRegistrationResponse.mock.calls[0][0]).toMatchObject({
      expectedChallenge: "reg-challenge",
      expectedOrigin: ["http://localhost:3000"],
      expectedRPID: "localhost",
    });
    expect(prismaMock.passkey.create).toHaveBeenCalledWith({
      data: {
        id: "cred_new",
        accountId: "acc_1",
        publicKey: Buffer.from([9, 9]),
        counter: 0,
        transports: "internal",
        deviceType: "multiDevice",
        backedUp: true,
        aaguid: "fbfc3007-154e-4ecc-8c0b-6e020557d7bd",
        createdFrom: "Safari on iPhone",
      },
    });
  });

  it("refuses when the challenge is missing or expired", async () => {
    session.readSessionAccountId.mockResolvedValue("acc_1");
    session.takeChallenge.mockResolvedValue(null);

    expect((await registerVerify(request({ id: "cred_new" }))).status).toBe(400);
    expect(prismaMock.passkey.create).not.toHaveBeenCalled();
  });

  it("stores nothing when verification fails", async () => {
    session.readSessionAccountId.mockResolvedValue("acc_1");
    session.takeChallenge.mockResolvedValue("reg-challenge");
    webauthn.verifyRegistrationResponse.mockRejectedValue(new Error("Unexpected registration response origin"));

    expect((await registerVerify(request({ id: "cred_new" }))).status).toBe(400);
    expect(prismaMock.passkey.create).not.toHaveBeenCalled();
  });
});

describe("signing in with a passkey", () => {
  it("issues a challenge", async () => {
    webauthn.generateAuthenticationOptions.mockResolvedValue({ challenge: "login-challenge" });

    expect((await loginOptions(request())).status).toBe(200);
    expect(webauthn.generateAuthenticationOptions).toHaveBeenCalledWith({
      rpID: "localhost",
      userVerification: "preferred",
    });
    expect(session.writeChallenge).toHaveBeenCalledWith("login-challenge", "login");
  });

  it("verifies against the stored key, bumps the counter and signs in to that account", async () => {
    session.takeChallenge.mockResolvedValue("login-challenge");
    session.readSessionAccountId.mockResolvedValue(null);
    prismaMock.passkey.findUnique.mockResolvedValue(storedPasskey);
    webauthn.verifyAuthenticationResponse.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 5 } });

    const res = await loginVerify(request({ id: "cred_1" }, undefined, MAC_CHROME));

    expect(res.status).toBe(200);
    expect(webauthn.verifyAuthenticationResponse.mock.calls[0][0]).toMatchObject({
      expectedChallenge: "login-challenge",
      credential: { id: "cred_1", counter: 4, transports: ["internal", "hybrid"] },
    });
    expect(prismaMock.passkey.update).toHaveBeenCalledWith({
      where: { id: "cred_1" },
      data: { counter: 5, lastUsedAt: expect.any(Date), lastUsedFrom: "Chrome on Mac" },
    });
    expect(session.writeSession).toHaveBeenCalledWith("acc_owner");
    expect(accounts.mergeAccountInto).not.toHaveBeenCalled();
  });

  it("moves points earned anonymously on this device into the signed-in account", async () => {
    session.takeChallenge.mockResolvedValue("login-challenge");
    session.readSessionAccountId.mockResolvedValue("acc_anonymous");
    prismaMock.passkey.findUnique.mockResolvedValue(storedPasskey);
    webauthn.verifyAuthenticationResponse.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 5 } });

    await loginVerify(request({ id: "cred_1" }));

    expect(accounts.mergeAccountInto).toHaveBeenCalledWith("acc_anonymous", "acc_owner");
  });

  it("refuses a removed passkey, and lets the browser tell the password manager", async () => {
    session.takeChallenge.mockResolvedValue("login-challenge");
    prismaMock.passkey.findUnique.mockResolvedValue({ ...storedPasskey, revokedAt: new Date() });

    const res = await loginVerify(request({ id: "cred_1" }));

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ unknownCredential: true, error: expect.stringContaining("removed") });
    expect(webauthn.verifyAuthenticationResponse).not.toHaveBeenCalled();
    expect(session.writeSession).not.toHaveBeenCalled();
  });

  it("refuses an unknown passkey", async () => {
    session.takeChallenge.mockResolvedValue("login-challenge");
    prismaMock.passkey.findUnique.mockResolvedValue(null);

    expect((await loginVerify(request({ id: "cred_unknown" }))).status).toBe(404);
    expect(session.writeSession).not.toHaveBeenCalled();
  });

  it("refuses a bad signature without signing in", async () => {
    session.takeChallenge.mockResolvedValue("login-challenge");
    prismaMock.passkey.findUnique.mockResolvedValue(storedPasskey);
    webauthn.verifyAuthenticationResponse.mockResolvedValue({ verified: false });

    expect((await loginVerify(request({ id: "cred_1" }))).status).toBe(400);
    expect(session.writeSession).not.toHaveBeenCalled();
    expect(prismaMock.passkey.update).not.toHaveBeenCalled();
  });

  it("refuses when the challenge is missing or expired", async () => {
    session.takeChallenge.mockResolvedValue(null);
    expect((await loginVerify(request({ id: "cred_1" }))).status).toBe(400);
  });
});

describe("passkey request guards", () => {
  it("reject other sites", async () => {
    requestHeaders.current = new Headers({ referer: "https://evil.example.com/" });
    expect((await loginOptions(request())).status).toBe(403);
    expect((await registerOptions(request())).status).toBe(403);
  });

  it("rate-limit an IP after 20 attempts a minute", async () => {
    webauthn.generateAuthenticationOptions.mockResolvedValue({ challenge: "c" });
    for (let i = 0; i < 20; i++) await loginOptions(request(undefined, "192.0.2.60"));
    expect((await loginOptions(request(undefined, "192.0.2.60"))).status).toBe(429);
  });
});
