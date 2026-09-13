"use server";

// import { revalidatePath } from "next/cache";
import { getBookRecencyBonus } from "../app/libs/[id]/scoring";
import { CREATE_LIBRARY_POINTS, awardPoints, getOrCreateAccount } from "../lib/accounts";
import prisma from "../lib/db";
import { normalizeIsbn } from "../lib/openLibrary";
import { rateLimit } from "../lib/rate-limit";
import { getActionClientIp } from "../lib/requestGuards";
import { Prisma } from "@prisma/client";

// Every exported function here is a public endpoint, so writes validate input and are rate-limited.
const createLibraryLimiter = rateLimit({ interval: 60 * 60 * 1000, uniqueTokenPerInterval: 500, limit: 10 });
const confirmBookLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500, limit: 30 });

const MAX_LIBRARY_NAME = 80;

// What the public sees: libraries a moderator hasn't hidden, and their books that aren't hidden.
const VISIBLE_LIBRARY = { active: true } as const;
const VISIBLE_BOOK = { hidden: false, library: VISIBLE_LIBRARY } as const;

// Library photos must come from our own upload route (/api/upload).
const isOwnLibraryImage = (url: string) =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/library-images/`);

const toCoordinate = (value: FormDataEntryValue | null, limit: number) => {
  const number = Number(value);
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(number) && Math.abs(number) <= limit
    ? number
    : null;
};

export async function createLibrary(formData: FormData) {
  const clientIp = await getActionClientIp();
  if (!createLibraryLimiter.check(clientIp).success) {
    return { error: "Too many new libraries from this connection. Try again later." };
  }

  const locationName = String(formData.get("locationName") ?? "").trim();
  const latitude = toCoordinate(formData.get("latitude"), 90);
  const longitude = toCoordinate(formData.get("longitude"), 180);
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  if (!locationName || locationName.length > MAX_LIBRARY_NAME) {
    return { error: `Library name must be 1 to ${MAX_LIBRARY_NAME} characters` };
  }
  if (latitude === null || longitude === null) {
    return { error: "A valid location is required" };
  }
  if (imageUrl && !isOwnLibraryImage(imageUrl)) {
    return { error: "Library photos must be uploaded through the app" };
  }

  try {
    const library = await prisma.library.create({
      data: {
        locationName,
        longitude,
        latitude,
        imageUrl: imageUrl || null,
      },
      select: {
        id: true,
      },
    });
    // revalidatePath("/libs");
    const account = await getOrCreateAccount(clientIp);
    const award = account
      ? await awardPoints(account.id, "CREATE_LIBRARY", CREATE_LIBRARY_POINTS, { libraryId: library.id })
      : { pointsAwarded: 0, total: 0 };
    return { id: library.id, ...award };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { error: "Library with this location already exists" };
      }
    }
    console.error(error);
    return { error: "Failed to create library" };
  }
}

// Function to check if a library exists based on latitude and longitude
export async function checkLibraryExists(latitude: string, longitude: string) {
  try {
    const library = await prisma.library.findFirst({
      where: {
        ...VISIBLE_LIBRARY,
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
        ...VISIBLE_LIBRARY,
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

// Function to get library description.
export async function getLibraryDescription(libraryId: string) {
  try {
    const library = await prisma.library.findFirst({
      where: {
        id: libraryId,
        ...VISIBLE_LIBRARY,
      },
      select: {
        description: true,
      },
    });

    return library
      ? {
          description: library.description,
        }
      : "not found";
  } catch (error) {
    console.error("Error getting library description:", error);
    throw new Error("Error getting library description");
  }
}

// Function to get the number of libraries with a description
export async function getLibrariesWithDescriptionCount(): Promise<number> {
  try {
    return await prisma.library.count({
      where: {
        ...VISIBLE_LIBRARY,
        description: {
          not: null,
        },
      },
    });
  } catch (error) {
    console.error("Error getting libraries with description count:", error);
    throw new Error("Error getting libraries with description count");
  }
}

// Function to get items (books) by library ID with pagination
export async function getItemsByLibraryId(
  libraryId: string,
  page = 1,
): Promise<{ id: string; title: string; coverUrl: string; itemInfo: string; updatedAt: Date }[]> {
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  try {
    const items = await prisma.item.findMany({
      where: { libraryId, ...VISIBLE_BOOK },
      select: {
        id: true,
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
      id: item.id,
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

// Records that someone just saw this book in the library and awards the recency bonus: the longer
// nobody confirmed it, the bigger the bonus. Confirming resets the clock.
export async function confirmBookInLibrary(
  libraryId: string,
  isbn13: string,
): Promise<{ confirmed: boolean; pointsAwarded: number; total?: number }> {
  const isbn = normalizeIsbn(isbn13);
  const clientIp = await getActionClientIp();
  if (!isbn || typeof libraryId !== "string" || !libraryId) return { confirmed: false, pointsAwarded: 0 };
  if (!confirmBookLimiter.check(clientIp).success) return { confirmed: false, pointsAwarded: 0 };
  try {
    const latest = await prisma.item.findFirst({
      where: { libraryId, isbn13: isbn, ...VISIBLE_BOOK },
      orderBy: { updatedAt: "desc" },
      select: { id: true, updatedAt: true },
    });
    if (!latest) return { confirmed: false, pointsAwarded: 0 };

    const bonus = getBookRecencyBonus(latest.updatedAt);
    if (bonus === 0) return { confirmed: true, pointsAwarded: 0 };

    // Only the request that still sees the old time wins the bonus, so two scans can't both earn it.
    const { count } = await prisma.item.updateMany({
      where: { libraryId, isbn13: isbn, hidden: false, updatedAt: { lte: latest.updatedAt } },
      data: { updatedAt: new Date() },
    });
    if (count === 0) return { confirmed: true, pointsAwarded: 0 };

    const account = await getOrCreateAccount(clientIp);
    if (!account) return { confirmed: true, pointsAwarded: 0 };
    return {
      confirmed: true,
      ...(await awardPoints(account.id, "CONFIRM_BOOK", bonus, { libraryId, itemId: latest.id })),
    };
  } catch (error) {
    console.error("Error confirming book:", error);
    return { confirmed: false, pointsAwarded: 0 };
  }
}

export async function bookCount(libraryId: string) {
  const numberOfBooks = await prisma.item.count({
    where: { libraryId: libraryId, ...VISIBLE_BOOK },
  });
  return numberOfBooks;
}

export async function totalBookCount() {
  try {
    const totalBooks = await prisma.item.count({ where: VISIBLE_BOOK });
    return totalBooks;
  } catch (error) {
    console.error("Error getting total book count:", error);
    throw new Error("Error getting total book count");
  }
}

export async function totalLibraryCount() {
  try {
    const totalLibraries = await prisma.library.count({ where: VISIBLE_LIBRARY });
    return totalLibraries;
  } catch (error) {
    console.error("Error getting total library count:", error);
    throw new Error("Error getting total library count");
  }
}

export async function totalUserCount() {
  try {
    const totalUsers = await prisma.account.count({ where: { points: { gt: 0 } } });
    return totalUsers;
  } catch (error) {
    console.error("Error getting total user count:", error);
    throw new Error("Error getting total user count");
  }
}

export async function getLast50Books(): Promise<
  { title: string; thumbnail: string; sourceURL: string; libraryId: string; libraryName: string; itemInfo: string }[]
> {
  try {
    const last50Books = await prisma.item.findMany({
      where: VISIBLE_BOOK,
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        title: true,
        thumbnail: true,
        sourceURL: true,
        itemInfo: true,
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
      itemInfo: book.itemInfo ?? "",
      libraryId: book.library?.id ?? "",
      libraryName: book.library?.locationName ?? "",
    }));
  } catch (error) {
    console.error("Error getting last 50 books:", error);
    throw new Error(`Error getting last 50 books: ${error}`); // Include original error message
  }
}

// The 10 accounts with the most points, by pseudonym.
export async function getTopUsers(): Promise<{ id: string; displayName: string; points: number }[]> {
  try {
    return await prisma.account.findMany({
      where: { points: { gt: 0 } },
      orderBy: { points: "desc" },
      take: 10,
      select: { id: true, displayName: true, points: true },
    });
  } catch (error) {
    console.error("Error fetching top users:", error);
    throw new Error("Failed to fetch top users");
  }
}

export async function getNewLibrariesCount(): Promise<number> {
  try {
    const newLibrariesCount = await prisma.library.count({
      where: {
        ...VISIBLE_LIBRARY,
        createdAt: {
          gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return newLibrariesCount || 0;
  } catch (error) {
    console.error("Error fetching new libraries count:", error);
    return 0;
  }
}

export async function getManyLibraryDescriptions() {
  try {
    const libraries = await prisma.library.findMany({
      where: {
        ...VISIBLE_LIBRARY,
        description: { not: null }, // Only include libraries with a non-null description
      },
      select: {
        id: true,
        description: true,
        locationName: true,
        imageUrl: true,
      },
    });

    return libraries.map(library => ({
      libraryId: library.id,
      description: library.description,
      locationName: library.locationName,
      imageUrl: library.imageUrl,
    }));
  } catch (error) {
    console.error("Error getting library descriptions:", error);
    throw new Error("Error getting library descriptions");
  }
}
