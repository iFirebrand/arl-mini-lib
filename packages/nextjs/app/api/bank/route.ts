import { NextResponse } from "next/server";
import prisma from "../../../lib/db";

const validatePointActions = (actions: any[]) => {
  // Implement validation logic here:
  // - Check timestamps are reasonable
  // - Validate action types
  // - Ensure points per action are within limits
  // - Check for duplicate actions
  return true; // Return false if validation fails
};

export async function POST(request: Request) {
  try {
    const { address, pointActions } = await request.json();

    if (!address || !pointActions) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Validate the point actions
    if (!validatePointActions(pointActions)) {
      return NextResponse.json({ message: "Invalid point actions" }, { status: 400 });
    }

    // Calculate total valid points
    const totalPoints = pointActions.reduce((sum: number, action: any) => sum + action.points, 0);

    // Update the database with the new points
    const updatedUser = await prisma.user.upsert({
      where: {
        walletAddress: address,
      },
      create: {
        walletAddress: address,
        points: totalPoints,
      },
      update: {
        points: {
          increment: totalPoints,
        },
      },
    });

    return NextResponse.json({
      success: true,
      pointsBanked: totalPoints,
      currentTotal: updatedUser.points,
    });
  } catch (error) {
    console.error("Error banking points:", error);
    return NextResponse.json({ message: "Error banking points" }, { status: 500 });
  }
}
