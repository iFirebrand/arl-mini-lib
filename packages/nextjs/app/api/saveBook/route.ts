import { NextResponse } from "next/server";
import prisma from "../../../lib/db";

// Adjust the import path based on your project structure

export async function POST(req: Request) {
  const { title, authors, thumbnail, description, isbn10, libraryId } = await req.json();

  try {
    // Save the book data to the database
    const newItem = await prisma.item.create({
      data: {
        title,
        authors,
        thumbnail,
        description,
        isbn13: isbn10,
        // Correctly use the library relation
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
