/** Global automated onboarding review cap (shared across states). */
export const INGESTION_PLAYER_CAP = 10000;

export function applyIngestionCap(
  discovered: number,
  alreadyImported: number,
  cap = INGESTION_PLAYER_CAP,
): { allowed: number; stoppedAtCap: boolean } {
  const remaining = Math.max(0, cap - alreadyImported);
  const allowed = Math.min(discovered, remaining);
  return { allowed, stoppedAtCap: discovered > remaining };
}
