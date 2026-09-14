import { NextResponse } from "next/server";
import { mergeAccountInto } from "../../../../../lib/accounts";
import prisma from "../../../../../lib/db";
import { deviceLabel } from "../../../../../lib/deviceLabel";
import { refusePasskeyRequest } from "../../../../../lib/passkeyGuards";
import { readSessionAccountId, takeChallenge, writeSession } from "../../../../../lib/session";
import { relyingParty } from "../../../../../lib/webauthn";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

// Step 2 of signing in: check the passkey's signature and switch this browser to its account.
export async function POST(request: Request) {
  const refused = await refusePasskeyRequest(request);
  if (refused) return refused;

  const expectedChallenge = await takeChallenge("login");
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Sign-in expired. Please try again." }, { status: 400 });
  }

  const response = await request.json().catch(() => null);
  const passkey =
    typeof response?.id === "string" ? await prisma.passkey.findUnique({ where: { id: response.id } }) : null;
  // unknownCredential tells the browser it may ask the password manager to forget this passkey.
  if (!passkey) {
    return NextResponse.json(
      { error: "This passkey isn't registered with ArLib.me", unknownCredential: true },
      { status: 404 },
    );
  }
  if (passkey.revokedAt) {
    return NextResponse.json(
      {
        error: "This passkey was removed from its ArLib.me account. Sign in with another one.",
        unknownCredential: true,
      },
      { status: 404 },
    );
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
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
      lastUsedFrom: deviceLabel(request.headers.get("user-agent")),
    },
  });

  // Points earned anonymously on this device before signing in move to the signed-in account.
  const previousAccountId = await readSessionAccountId();
  if (previousAccountId) await mergeAccountInto(previousAccountId, passkey.accountId);
  await writeSession(passkey.accountId);

  return NextResponse.json({ ok: true });
}
