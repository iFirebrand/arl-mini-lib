import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { rateLimit } from "../../../lib/rate-limit";

interface PointAction {
  points: number;
  type: string;
  timestamp: string;
}

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users per second
});

export async function POST(request: Request) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { success } = await limiter.check(ip);
    if (!success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Get the request headers
    const headersList = headers();
    const referer = headersList.get("referer");
    const origin = headersList.get("origin");

    // Check if the request is coming from our own domain
    const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000", "https://arlib.me"];

    if (!referer || !allowedOrigins.some(origin => referer.startsWith(origin))) {
      return NextResponse.json({ error: "Unauthorized request origin" }, { status: 403 });
    }

    const { walletAddress, pointActions } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    if (!Array.isArray(pointActions) || pointActions.length === 0) {
      return NextResponse.json({ error: "Point actions are required" }, { status: 400 });
    }

    // Calculate total points from point actions
    const totalPoints = pointActions.reduce((sum, action) => sum + action.points, 0);

    // Validate points is a reasonable number
    if (totalPoints < 0 || totalPoints > 1000000) {
      return NextResponse.json({ error: "Invalid points value" }, { status: 400 });
    }

    // Update or create user with points
    const user = await prisma.user.upsert({
      where: {
        walletAddress: walletAddress,
      },
      update: {
        points: {
          increment: totalPoints, // Increment existing points instead of replacing
        },
      },
      create: {
        walletAddress: walletAddress,
        points: totalPoints,
      },
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
      where: {
        walletAddress: walletAddress,
      },
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
