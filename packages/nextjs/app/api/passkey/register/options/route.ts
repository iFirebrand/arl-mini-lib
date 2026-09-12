import { NextResponse } from "next/server";
import { getOrCreateAccount } from "../../../../../lib/accounts";
import prisma from "../../../../../lib/db";
import { refusePasskeyRequest } from "../../../../../lib/passkeyGuards";
import { getClientIp } from "../../../../../lib/requestGuards";
import { writeChallenge } from "../../../../../lib/session";
import { relyingParty } from "../../../../../lib/webauthn";
import { generateRegistrationOptions } from "@simplewebauthn/server";

// Step 1 of adding a passkey to the visitor's account (created now if they don't have one).
export async function POST(request: Request) {
  const refused = await refusePasskeyRequest(request);
  if (refused) return refused;

  const account = await getOrCreateAccount(getClientIp(request));
  if (!account) {
    return NextResponse.json({ error: "Too many new accounts from this connection" }, { status: 429 });
  }
  const existing = await prisma.passkey.findMany({ where: { accountId: account.id }, select: { id: true } });

  const { rpName, rpID } = relyingParty();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(account.id),
    userName: account.displayName,
    attestationType: "none",
    excludeCredentials: existing.map(passkey => ({ id: passkey.id })),
    // Discoverable credentials: signing in later needs no username or email.
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  await writeChallenge(options.challenge, "register");
  return NextResponse.json(options);
}
