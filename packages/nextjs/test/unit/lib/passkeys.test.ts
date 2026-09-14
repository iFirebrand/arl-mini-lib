// @vitest-environment node
import { prismaMock } from "../../mocks/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deviceLabel } from "~~/lib/deviceLabel";
import { cleanPasskeyName, listPasskeys, providerName, removePasskey, renamePasskey } from "~~/lib/passkeys";

vi.mock("~~/lib/db", async () => ({ default: (await import("../../mocks/prisma")).prismaMock }));

describe("deviceLabel", () => {
  it.each([
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
      "Safari on iPhone",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.101 Mobile/15E148 Safari/604.1",
      "Chrome on iPhone",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      "Chrome on Mac",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
      "Edge on Windows",
    ],
    [
      "Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
      "Samsung Internet on Android",
    ],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0", "Firefox on Linux"],
    ["curl/8.7.1", null],
    [null, null],
  ])("labels %j as %j", (userAgent, label) => {
    expect(deviceLabel(userAgent)).toBe(label);
  });
});

describe("providerName", () => {
  it.each([
    ["fbfc3007-154e-4ecc-8c0b-6e020557d7bd", "Apple Passwords"],
    ["EA9B8D66-4D01-1D21-3CE4-B6B48CB575D4", "Google Password Manager"],
    ["00000000-0000-0000-0000-000000000000", null],
    [null, null],
  ])("names %j as %j", (aaguid, name) => {
    expect(providerName(aaguid)).toBe(name);
  });
});

describe("cleanPasskeyName", () => {
  it.each([
    ["  Work   laptop ", "Work laptop"],
    ["Phone\u0007", "Phone"],
    ["x".repeat(40), "x".repeat(40)],
  ])("keeps %j as %j", (raw, clean) => {
    expect(cleanPasskeyName(raw)).toBe(clean);
  });

  it.each(["", "   ", "x".repeat(41), 42, null])("rejects %j", raw => {
    expect(cleanPasskeyName(raw)).toBeNull();
  });
});

describe("managing passkeys", () => {
  beforeEach(() => {
    prismaMock.passkey.findMany.mockReset();
    prismaMock.passkey.updateMany.mockReset();
  });

  it("lists only the account's passkeys that still sign in, with their provider", async () => {
    prismaMock.passkey.findMany.mockResolvedValue([
      {
        id: "cred_1",
        name: null,
        aaguid: "fbfc3007-154e-4ecc-8c0b-6e020557d7bd",
        backedUp: true,
        createdAt: new Date("2026-09-13"),
        createdFrom: "Safari on iPhone",
        lastUsedAt: null,
        lastUsedFrom: null,
      },
    ]);

    expect(await listPasskeys("acc_1")).toEqual([
      {
        id: "cred_1",
        name: null,
        provider: "Apple Passwords",
        synced: true,
        createdAt: new Date("2026-09-13"),
        createdFrom: "Safari on iPhone",
        lastUsedAt: null,
        lastUsedFrom: null,
      },
    ]);
    expect(prismaMock.passkey.findMany.mock.calls[0][0].where).toEqual({ accountId: "acc_1", revokedAt: null });
  });

  it("renames only the account's own passkey", async () => {
    prismaMock.passkey.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    expect(await renamePasskey("acc_1", "cred_1", "Phone")).toBe(true);
    expect(await renamePasskey("acc_1", "someone_elses", "Phone")).toBe(false);
    expect(prismaMock.passkey.updateMany.mock.calls[0][0]).toEqual({
      where: { id: "cred_1", accountId: "acc_1", revokedAt: null },
      data: { name: "Phone" },
    });
  });

  it("removes by marking the time, and reports the passkeys left", async () => {
    prismaMock.passkey.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.passkey.findMany.mockResolvedValue([{ id: "cred_2" }]);

    expect(await removePasskey("acc_1", "cred_1")).toEqual(["cred_2"]);
    expect(prismaMock.passkey.updateMany.mock.calls[0][0]).toEqual({
      where: { id: "cred_1", accountId: "acc_1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("removes nothing that isn't the account's", async () => {
    prismaMock.passkey.updateMany.mockResolvedValue({ count: 0 });
    expect(await removePasskey("acc_1", "someone_elses")).toBeNull();
    expect(prismaMock.passkey.findMany).not.toHaveBeenCalled();
  });
});
