import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { rateLimit } from "../../../lib/rate-limit";

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { success } = await limiter.check(ip);
    if (!success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Origin check
    const referer = headers().get("referer");
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL || "",
      "http://localhost:3000",
      "https://www.arlib.me", // Include www
      "https://arlib.me", // Include non-www
    ];
    if (!referer || !allowedOrigins.some(origin => referer.startsWith(origin))) {
      return NextResponse.json({ error: "Unauthorized request origin" }, { status: 403 });
    }

    const { walletAddress, pointActions } = await request.json();
    console.log("Received Wallet Address:", walletAddress); // Log wallet address
    console.log("Received Point Actions:", pointActions); // Log point actions

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    if (!Array.isArray(pointActions) || pointActions.length === 0) {
      return NextResponse.json({ error: "Point actions are required" }, { status: 400 });
    }

    const totalPoints = pointActions.reduce((sum, action) => sum + action.points, 0);
    if (totalPoints < 0 || totalPoints > 1000000) {
      return NextResponse.json({ error: "Invalid points value" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { points: { increment: totalPoints } },
      create: { walletAddress, points: totalPoints },
    });

    console.log("User after upsert:", user); // Log user data after upsert

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
