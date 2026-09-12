import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { validatePointActions } from "../../../lib/points";
import { rateLimit } from "../../../lib/rate-limit";
import { getClientIp, isAllowedReferer } from "../../../lib/requestGuards";

// Scanning a book takes a few seconds, so 30 requests a minute leaves room for real use.
const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  limit: 30,
});

export async function POST(request: Request) {
  try {
    const { success } = limiter.check(getClientIp(request));
    if (!success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    if (!isAllowedReferer(headers().get("referer"))) {
      return NextResponse.json({ error: "Unauthorized request origin" }, { status: 403 });
    }

    const { walletAddress, pointActions } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    const validation = validatePointActions(pointActions);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const totalPoints = validation.total;

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { points: { increment: totalPoints } },
      create: { walletAddress, points: totalPoints },
    });

    return NextResponse.json({
      success: true,
      user,
      currentTotal: user.points,
    });
  } catch (error) {
    console.error("Error saving points:", error);
    return NextResponse.json({ error: "Failed to save points" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    return NextResponse.json({
      success: true,
      currentTotal: user?.points || 0,
    });
  } catch (error) {
    console.error("Error loading points:", error);
    return NextResponse.json({ error: "Failed to load points" }, { status: 500 });
  }
}
