import { NextResponse } from "next/server";
import { mergeAccountInto } from "../../../../../lib/accounts";
import prisma from "../../../../../lib/db";
import { refusePasskeyRequest } from "../../../../../lib/passkeyGuards";
import { readSessionAccountId, takeChallenge, writeSession } from "../../../../../lib/session";
import { relyingParty } from "../../../../../lib/webauthn";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

// Step 2 of signing in: check the passkey's signature and switch this browser to its account.
export async function POST(request: Request) {
  const refused = refusePasskeyRequest(request);
  if (refused) return refused;

  const expectedChallenge = await takeChallenge("login");
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Sign-in expired. Please try again." }, { status: 400 });
  }

  const response = await request.json().catch(() => null);
  const passkey =
    typeof response?.id === "string" ? await prisma.passkey.findUnique({ where: { id: response.id } }) : null;
  if (!passkey) {
    return NextResponse.json({ error: "This passkey isn't registered with ArLib.me" }, { status: 404 });
  }

  const { rpID, origins } = relyingParty();
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      credential: {
        id: passkey.id,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports?.split(",") as never,
      },
      requireUserVerification: false,
    });
  } catch (error) {
    console.error("Passkey sign-in failed:", error);
    return NextResponse.json({ error: "The passkey could not be verified" }, { status: 400 });
  }
  if (!verification.verified) {
    return NextResponse.json({ error: "The passkey could not be verified" }, { status: 400 });
  }

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
  });

  // Points earned anonymously on this device before signing in move to the signed-in account.
  const previousAccountId = await readSessionAccountId();
  if (previousAccountId) await mergeAccountInto(previousAccountId, passkey.accountId);
  await writeSession(passkey.accountId);

  return NextResponse.json({ ok: true });
}
