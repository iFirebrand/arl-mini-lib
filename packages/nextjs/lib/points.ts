// The most points the app can award for a single action. The server rejects anything else.
export const MAX_POINTS_PER_ACTION: Record<string, number> = {
  // New book (5, doubled after the first 3 new books) + one-time persistence bonus (5).
  ADD_BOOK: 15,
  CREATE_LIBRARY: 50,
};

// Unbanked points are capped at this total in the browser, then banked in one request.
export const MAX_POINTS_PER_REQUEST = 2000;
export const MAX_ACTIONS_PER_REQUEST = 100;

type PointActionInput = { points?: unknown; type?: unknown; action?: unknown };

export type PointActionsValidation = { ok: true; total: number } | { ok: false; error: string };

/**
 * Checks point actions sent by the browser. Actions banked immediately use `type`
 * (handlePoints); actions saved before a wallet was connected use `action` (PointsContext).
 */
export function validatePointActions(pointActions: unknown): PointActionsValidation {
  if (!Array.isArray(pointActions) || pointActions.length === 0) {
    return { ok: false, error: "Point actions are required" };
  }
  if (pointActions.length > MAX_ACTIONS_PER_REQUEST) {
    return { ok: false, error: "Too many point actions" };
  }

  let total = 0;
  for (const entry of pointActions as PointActionInput[]) {
    const type = entry?.type ?? entry?.action;
    const max = typeof type === "string" ? MAX_POINTS_PER_ACTION[type] : undefined;
    if (max === undefined) {
      return { ok: false, error: "Unknown point action" };
    }
    const points = entry.points;
    if (typeof points !== "number" || !Number.isInteger(points) || points < 1 || points > max) {
      return { ok: false, error: "Invalid points value" };
    }
    total += points;
  }

  if (total > MAX_POINTS_PER_REQUEST) {
    return { ok: false, error: "Invalid points value" };
  }
  return { ok: true, total };
}
