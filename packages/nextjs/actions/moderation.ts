"use server";

import { type ModerationTarget, getModeratorId, setHidden } from "../lib/moderation";

type Result = { ok: true } | { ok: false; error: string };

const isId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 64;

// Public endpoints like every server action: each one checks the session belongs to a moderator.
async function moderate(target: ModerationTarget, targetId: unknown, hidden: unknown): Promise<Result> {
  if (!isId(targetId) || typeof hidden !== "boolean") return { ok: false, error: "Invalid request" };
  const moderatorId = await getModeratorId();
  if (!moderatorId) return { ok: false, error: "Only moderators can do this" };
  const found = await setHidden(moderatorId, target, targetId, hidden);
  return found ? { ok: true } : { ok: false, error: target === "library" ? "Library not found" : "Book not found" };
}

export async function setLibraryHidden(libraryId: string, hidden: boolean): Promise<Result> {
  return moderate("library", libraryId, hidden);
}

export async function setBookHidden(itemId: string, hidden: boolean): Promise<Result> {
  return moderate("item", itemId, hidden);
}
