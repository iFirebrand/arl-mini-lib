import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { rateLimit } from "../../../lib/rate-limit";

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

// Function to check rate limit and origin
const checkRequestOrigin = async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const { success } = await limiter.check(ip);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const referer = headers().get("referer");
  const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL || "", "http://localhost:3000"];
  if (!referer || !allowedOrigins.some(origin => referer.startsWith(origin))) {
    return NextResponse.json({ error: "Unauthorized request origin" }, { status: 403 });
  }
};

export async function POST(req: Request) {
  try {
    const originCheckResponse = await checkRequestOrigin(req);
    if (originCheckResponse) return originCheckResponse;

    const { title, authors, thumbnail, description, isbn13, itemInfo, libraryId } = await req.json();

    if (!title || !authors || !libraryId) {
      return NextResponse.json({ error: "Title, authors, and library ID are required" }, { status: 400 });
    }

    // Save the book data to the database
    const newItem = await prisma.item.create({
      data: {
        title,
        authors,
        description,
        thumbnail,
        isbn13,
        itemInfo,
        library: { connect: { id: libraryId } }, // Use connect to link to Library
      },
    });

    // Respond with the created item
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Error saving book:", error);
    return NextResponse.json({ error: "Failed to save book" }, { status: 500 });
  }
}
