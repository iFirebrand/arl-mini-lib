import { NextResponse } from "next/server";
import { refusePasskeyRequest } from "../../../../../lib/passkeyGuards";
import { MAX_PASSKEY_NAME, cleanPasskeyName, removePasskey, renamePasskey } from "../../../../../lib/passkeys";
import { readSessionAccountId } from "../../../../../lib/session";
import { relyingParty } from "../../../../../lib/webauthn";

type Params = { params: Promise<{ id: string }> };

// Credential ids are base64url; anything else can't be one of ours.
const credentialId = (id: string) => (/^[A-Za-z0-9_-]{16,1400}$/.test(id) ? id : null);

async function owner(request: Request) {
  const refused = await refusePasskeyRequest(request);
  if (refused) return { refused };
  const accountId = await readSessionAccountId();
  if (!accountId) return { refused: NextResponse.json({ error: "No account on this device" }, { status: 401 }) };
  return { accountId };
}

const NOT_FOUND = () => NextResponse.json({ error: "That passkey isn't on your account" }, { status: 404 });

// Renames one of the signed-in account's passkeys.
export async function PATCH(request: Request, { params }: Params) {
  const { refused, accountId } = await owner(request);
  if (refused) return refused;
  const id = credentialId((await params).id);
  const name = cleanPasskeyName((await request.json().catch(() => null))?.name);
  if (!name) {
    return NextResponse.json(
      { error: `Give the passkey a name of 1 to ${MAX_PASSKEY_NAME} characters` },
      { status: 400 },
    );
  }
  if (!id || !(await renamePasskey(accountId, id, name))) return NOT_FOUND();
  return NextResponse.json({ ok: true, name });
}

// Removes one of the signed-in account's passkeys, so it no longer signs in. The answer carries
// what the browser needs to tell the password manager which passkeys are still good.
export async function DELETE(request: Request, { params }: Params) {
  const { refused, accountId } = await owner(request);
  if (refused) return refused;
  const id = credentialId((await params).id);
  const remaining = id ? await removePasskey(accountId, id) : null;
  if (!remaining) return NOT_FOUND();
  return NextResponse.json({
    remaining,
    rpID: relyingParty().rpID,
    // The user handle each passkey was created with (see /api/passkey/register/options).
    userID: Buffer.from(accountId).toString("base64url"),
  });
}
