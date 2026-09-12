import { NextResponse } from "next/server";
import prisma from "../../../../../lib/db";
import { refusePasskeyRequest } from "../../../../../lib/passkeyGuards";
import { readSessionAccountId, takeChallenge } from "../../../../../lib/session";
import { relyingParty } from "../../../../../lib/webauthn";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

// Step 2 of adding a passkey: check the browser's response and store the public key.
export async function POST(request: Request) {
  const refused = refusePasskeyRequest(request);
  if (refused) return refused;

  const accountId = await readSessionAccountId();
  const expectedChallenge = await takeChallenge("register");
  if (!accountId || !expectedChallenge) {
    return NextResponse.json({ error: "Passkey setup expired. Please try again." }, { status: 400 });
  }

  const { rpID, origins } = relyingParty();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: await request.json(),
      expectedChallenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (error) {
    console.error("Passkey registration failed:", error);
    return NextResponse.json({ error: "The passkey could not be verified" }, { status: 400 });
  }
  if (!verification.verified) {
    return NextResponse.json({ error: "The passkey could not be verified" }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  await prisma.passkey.create({
    data: {
      id: credential.id,
      accountId,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports?.join(",") ?? null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
