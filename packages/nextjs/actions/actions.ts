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
        imageUrl: formData.get("imageUrl") as string,
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
export async function checkLibraryExists(latitude: string, longitude: string) {
  try {
    const library = await prisma.library.findFirst({
      where: {
        AND: [
          {
            latitude: {
              gte: parseFloat(latitude) - 0.00036,
              lte: parseFloat(latitude) + 0.00036,
            },
          },
          {
            longitude: {
              gte: parseFloat(longitude) - 0.00036,
              lte: parseFloat(longitude) + 0.00036,
            },
          },
        ],
      },
      select: {
        id: true,
        locationName: true,
        imageUrl: true,
        active: true,
        latitude: true,
        longitude: true,
        description: true,
      },
    });

    return library
      ? {
          locationName: library.locationName,
          id: library.id,
          imageUrl: library.imageUrl,
          active: library.active,
          latitude: library.latitude,
          longitude: library.longitude,
          description: library.description,
        }
      : "not found";
  } catch (error) {
    console.error("Error checking library existence:", error);
    throw new Error("Error checking library existence");
  }
}

// Function to get library data.
export async function getLibraryData(libraryId: string) {
  try {
    const library = await prisma.library.findFirst({
      where: {
        id: libraryId,
      },
      select: {
        id: true,
        locationName: true,
        imageUrl: true,
        active: true,
        latitude: true,
        longitude: true,
        description: true,
      },
    });

    return library
      ? {
          locationName: library.locationName,
          id: library.id,
          imageUrl: library.imageUrl,
          active: library.active,
          latitude: library.latitude,
          longitude: library.longitude,
          description: library.description,
        }
      : "not found";
  } catch (error) {
    console.error("Error getting library information:", error);
    throw new Error("Error getting library information");
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

// Function to get ISBN only by library ID
export async function getISBN13ByLibraryId(libraryId: string): Promise<{ updatedAt: Date; isbn13: string }[]> {
  try {
    const items = await prisma.item.findMany({
      where: { libraryId },
      select: {
        isbn13: true,
        updatedAt: true,
      },
    });

    return items
      .filter(item => item.isbn13 !== null)
      .map(item => ({
        isbn13: item.isbn13 as string,
        updatedAt: item.updatedAt,
      }));
  } catch (error) {
    console.error("Error details:", error); // Log the actual error
    return []; // Return empty array instead of throwing
  }
}

// Function to get ArlibSettings
export async function getArlibSettings() {
  try {
    const settings = await prisma.arlibSettings.findFirst({
      where: {
        id: "1",
      },
      select: {
        id: true,
        booksNeededToNameLibrary: true,
        seasonEndsAt: true,
        totalItems: true,
        totalLibraries: true,
      },
    });

    return settings
      ? {
          id: settings.id,
          booksNeededToNameLibrary: settings.booksNeededToNameLibrary,
          seasonEndsAt: settings.seasonEndsAt,
          totalItems: settings.totalItems,
          totalLibraries: settings.totalLibraries,
        }
      : "settings not found";
  } catch (error) {
    console.error("Error getting ArlibSettings:", error);
    throw new Error("Error getting ArlibSettings");
  }
}

export async function bookCount(libraryId: string) {
  const numberOfBooks = await prisma.item.count({
    where: { libraryId: libraryId },
  });
  return numberOfBooks;
}

export async function totalBookCount() {
  try {
    const totalBooks = await prisma.item.count();
    return totalBooks;
  } catch (error) {
    console.error("Error getting total book count:", error);
    throw new Error("Error getting total book count");
  }
}

export async function totalLibraryCount() {
  try {
    const totalLibraries = await prisma.library.count();
    return totalLibraries;
  } catch (error) {
    console.error("Error getting total library count:", error);
    throw new Error("Error getting total library count");
  }
}

export async function totalUserCount() {
  try {
    const totalUsers = await prisma.user.count();
    return totalUsers;
  } catch (error) {
    console.error("Error getting total user count:", error);
    throw new Error("Error getting total user count");
  }
}

export async function getLast50Books(): Promise<
  { title: string; thumbnail: string; sourceURL: string; libraryId: string; libraryName: string }[]
> {
  try {
    const last50Books = await prisma.item.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        title: true,
        thumbnail: true,
        sourceURL: true,
        library: {
          select: {
            id: true,
            locationName: true,
          },
        },
      },
    });
    return last50Books.map(book => ({
      title: book.title ?? "",
      thumbnail: book.thumbnail ?? "",
      sourceURL: book.sourceURL ?? "",
      libraryId: book.library?.id ?? "",
      libraryName: book.library?.locationName ?? "",
    }));
  } catch (error) {
    console.error("Error getting last 50 books:", error);
    throw new Error(`Error getting last 50 books: ${error}`); // Include original error message
  }
}

// Function to get the top 10 users with the most points
export async function getTopUsers(): Promise<{ id: string; walletAddress: string | null; points: number }[]> {
  try {
    const topUsers = await prisma.user.findMany({
      orderBy: {
        points: "desc", // Sort by points in descending order
      },
      take: 10, // Limit to top 10 users
      select: {
        id: true,
        walletAddress: true,
        points: true,
      },
    });

    return topUsers.map(user => ({
      id: user.id,
      walletAddress: user.walletAddress,
      points: user.points,
    }));
  } catch (error) {
    console.error("Error fetching top users:", error);
    throw new Error("Failed to fetch top users");
  }
}
