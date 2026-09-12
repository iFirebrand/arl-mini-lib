const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bonus points for re-scanning a book the library already has: the longer since anyone
 * confirmed it was there, the bigger the bonus. 1 point per started week, up to 5.
 */
export function getBookRecencyBonus(lastConfirmedAt: Date | string, now: Date = new Date()): number {
  const days = (now.getTime() - new Date(lastConfirmedAt).getTime()) / DAY_MS;
  if (days < 1) return 0;
  if (days < 8) return 1;
  if (days < 15) return 2;
  if (days < 22) return 3;
  if (days < 29) return 4;
  return 5;
}
