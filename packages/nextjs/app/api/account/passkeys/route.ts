import { NextResponse } from "next/server";
import { listPasskeys } from "../../../../lib/passkeys";
import { readSessionAccountId } from "../../../../lib/session";

// The signed-in account's passkeys, for /account.
export async function GET() {
  const accountId = await readSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "No account on this device" }, { status: 401 });
  }
  return NextResponse.json({ passkeys: await listPasskeys(accountId) }, { headers: { "Cache-Control": "no-store" } });
}
