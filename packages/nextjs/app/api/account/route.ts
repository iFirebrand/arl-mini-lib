import { NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { readSessionAccountId } from "../../../lib/session";

// The visitor's account: pseudonym, points and whether a passkey protects it. Null until they
// first earn points.
export async function GET() {
  const accountId = await readSessionAccountId();
  const account = accountId
    ? await prisma.account.findUnique({
        where: { id: accountId },
        select: { displayName: true, points: true, _count: { select: { passkeys: true } } },
      })
    : null;

  return NextResponse.json(
    {
      account: account
        ? { displayName: account.displayName, points: account.points, hasPasskey: account._count.passkeys > 0 }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
