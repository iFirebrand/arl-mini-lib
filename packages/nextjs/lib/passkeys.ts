// The signed-in person's passkeys: listing, renaming and removing them. Every query is limited to
// their own account, and removed passkeys never come back.
import prisma from "./db";
import "server-only";

// Password managers that report an AAGUID, from the community list at
// https://github.com/passkeydeveloper/passkey-authenticator-aaguids (aaguid.json).
const PROVIDERS: Record<string, string> = {
  "fbfc3007-154e-4ecc-8c0b-6e020557d7bd": "Apple Passwords",
  "dd4ec289-e01d-41c9-bb89-70fa845d4bf2": "Apple Passwords",
  "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4": "Google Password Manager",
  "adce0002-35bc-c60a-648b-0b25f1f05503": "Chrome on Mac",
  "08987058-cadc-4b81-b6e1-30de50dcbe96": "Windows Hello",
  "9ddd1817-af5a-4672-a2b9-3e3dd95000a9": "Windows Hello",
  "6028b017-b1d4-4c02-b4b3-afcdafc96bb2": "Windows Hello",
  "d3452668-01fd-4c12-926c-83a4204853aa": "Microsoft Password Manager",
  "53414d53-554e-4700-0000-000000000000": "Samsung Pass",
  "bada5566-a7aa-401f-bd96-45619a55120d": "1Password",
  "d548826e-79b4-db40-a3d8-11116f7e8349": "Bitwarden",
  "531126d6-e717-415c-9320-3d9aa6981239": "Dashlane",
  "50726f74-6f6e-5061-7373-50726f746f6e": "Proton Pass",
  "b84e4048-15dc-4dd0-8640-f4f60813c8af": "NordPass",
  "0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6": "Keeper",
  "f3809540-7f14-49c1-a8b3-8f813b225541": "Enpass",
  "b78a0a55-6ef8-d246-a042-ba0f6d55050c": "LastPass",
  "fdb141b2-5d84-443e-8a35-4698c205a502": "KeePassXC",
};

/** The password manager an AAGUID stands for, or null if unknown (or all zeros, as some report). */
export const providerName = (aaguid: string | null | undefined) => (aaguid && PROVIDERS[aaguid.toLowerCase()]) || null;

export const MAX_PASSKEY_NAME = 40;

/** A name as typed: trimmed, single spaces, no control characters, 1 to 40 characters; else null. */
export function cleanPasskeyName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name.length >= 1 && name.length <= MAX_PASSKEY_NAME ? name : null;
}

export interface PasskeySummary {
  id: string;
  name: string | null;
  provider: string | null;
  // Synced passkeys follow the person to new devices through their password manager.
  synced: boolean;
  createdAt: Date;
  createdFrom: string | null;
  lastUsedAt: Date | null;
  lastUsedFrom: string | null;
}

const ACTIVE = { revokedAt: null };

/** The account's passkeys that still sign in, oldest first. */
export async function listPasskeys(accountId: string): Promise<PasskeySummary[]> {
  const passkeys = await prisma.passkey.findMany({
    where: { accountId, ...ACTIVE },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      aaguid: true,
      backedUp: true,
      createdAt: true,
      createdFrom: true,
      lastUsedAt: true,
      lastUsedFrom: true,
    },
  });
  return passkeys.map(({ aaguid, backedUp, ...passkey }) => ({
    ...passkey,
    provider: providerName(aaguid),
    synced: backedUp,
  }));
}

/** Renames one of the account's passkeys. False if it has no such passkey. */
export async function renamePasskey(accountId: string, id: string, name: string): Promise<boolean> {
  const { count } = await prisma.passkey.updateMany({ where: { id, accountId, ...ACTIVE }, data: { name } });
  return count > 0;
}

/**
 * Removes one of the account's passkeys so it no longer signs in. Returns the ids of the passkeys
 * that still do, or null if the account has no such passkey.
 */
export async function removePasskey(accountId: string, id: string): Promise<string[] | null> {
  const { count } = await prisma.passkey.updateMany({
    where: { id, accountId, ...ACTIVE },
    data: { revokedAt: new Date() },
  });
  if (count === 0) return null;
  const remaining = await prisma.passkey.findMany({ where: { accountId, ...ACTIVE }, select: { id: true } });
  return remaining.map(passkey => passkey.id);
}
