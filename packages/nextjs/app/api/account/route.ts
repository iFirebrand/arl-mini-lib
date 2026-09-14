import { NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { readSessionAccountId } from "../../../lib/session";

// The visitor's account: pseudonym, points, whether a passkey protects it and whether it may
// moderate. Null until they first earn points.
export async function GET() {
  const accountId = await readSessionAccountId();
  const account = accountId
    ? await prisma.account.findUnique({
        where: { id: accountId },
        select: {
          displayName: true,
          points: true,
          // Removed passkeys no longer sign in, so they don't count.
          _count: { select: { passkeys: { where: { revokedAt: null } } } },
          moderator: { select: { accountId: true } },
        },
      })
    : null;

  return NextResponse.json(
    {
      account: account
        ? {
            displayName: account.displayName,
            points: account.points,
            hasPasskey: account._count.passkeys > 0,
            isModerator: account.moderator !== null,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
