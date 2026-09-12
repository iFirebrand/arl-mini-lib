import { NextResponse } from "next/server";
import { refusePasskeyRequest } from "../../../../../lib/passkeyGuards";
import { writeChallenge } from "../../../../../lib/session";
import { relyingParty } from "../../../../../lib/webauthn";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

// Step 1 of signing in: the browser lets the person pick one of their ArLib passkeys.
export async function POST(request: Request) {
  const refused = await refusePasskeyRequest(request);
  if (refused) return refused;

  const options = await generateAuthenticationOptions({ rpID: relyingParty().rpID, userVerification: "preferred" });
  await writeChallenge(options.challenge, "login");
  return NextResponse.json(options);
}
