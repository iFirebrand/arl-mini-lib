"use server";

import { revalidatePath } from "next/cache";
import prisma from "../lib/db";
import { Prisma } from "@prisma/client";

// Adjust the import based on your database setup

export async function createLibrary(formData: FormData) {
  try {
    await prisma.library.create({
      data: {
        locationName: formData.get("locationName") as string,
        longitude: parseFloat(formData.get("longitude") as string),
        latitude: parseFloat(formData.get("latitude") as string),
        // imageUrl: formData.get("imageUrl") as string,
      },
    });
    revalidatePath("/libs");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { error: "Library with this location already exists" };
      }
    }
    console.error(error);
  }
}

// Function to check if a library exists based on latitude and longitude
export async function checkLibraryExists(latitude: string, longitude: string): Promise<string | null> {
  try {
    // Query the database to check for existing library
    const library = await prisma.library.findFirst({
      where: {
        // Use a raw SQL query to calculate distance
        AND: [
          {
            latitude: {
              gte: parseFloat(latitude) - 0.000549, // Adjusted latitude range for 200 feet
              lte: parseFloat(latitude) + 0.000549,
            },
          },
          {
            longitude: {
              gte: parseFloat(longitude) - 0.000549, // Adjusted longitude range for 200 feet
              lte: parseFloat(longitude) + 0.000549,
            },
          },
        ],
      },
    });

    return library ? library.locationName : "an undiscovered 🤩"; // Return the library locationName if no library found, then return "New Library Discovered!"
  } catch (error) {
    console.error("Error checking library existence:", error);
    return "Error checking library existence"; // Return false if an error occurs
  }
}

// Function to get items (books) by library ID with pagination
export async function getItemsByLibraryId(
  libraryId: string,
  page = 1,
): Promise<{ title: string; coverUrl: string; itemInfo: string; updatedAt: Date }[]> {
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  try {
    const items = await prisma.item.findMany({
      where: { libraryId },
      select: {
        title: true,
        thumbnail: true,
        itemInfo: true,
        isbn13: true,
        updatedAt: true,
      },
      skip,
      take: pageSize,
    });

    return items.map(item => ({
      title: item.title ?? "",
      coverUrl: item.thumbnail ?? "",
      itemInfo: item.itemInfo ? `https://openlibrary.org/isbn/${item.isbn13}` : "#",
      updatedAt: item.updatedAt,
    }));
  } catch (error) {
    console.error("Error details:", error); // Log the actual error
    return []; // Return empty array instead of throwing
  }
}
