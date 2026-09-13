/**
 * Data ingestion framework for permitted sources.
 * Respects robots/ToS — no unauthorized recruiting-site scraping.
 * Cap: stop automated onboarding around 10,000 players for review.
 */

export { INGESTION_PLAYER_CAP } from "./cap";
import { INGESTION_PLAYER_CAP } from "./cap";

export type {
  IngestionSourceType,
  NormalizedPlayerRecord,
  IngestionRunSummary,
  DuplicateMatch,
  NormalizedSchoolRecord,
  StateAdapterResult,
  PermissionStatus,
  VerificationStatus,
} from "./types";

export {
  scoreDuplicateMatch,
  shouldAutoMerge,
  slugify,
  normalizeName,
  normalizePosition,
  classYearFromGrade,
  schoolKey,
  emptyRunSummary,
  splitDisplayName,
} from "./shared/normalize";

export { isUrlAllowed, fetchRobotsTxt, USER_AGENT } from "./shared/robots";
export { loadNcesSchools } from "./shared/nces";
export { INGESTION_SOURCE_REGISTRY } from "./source-registry";

export { runCaliforniaAdapter } from "./california";
export { runTexasAdapter } from "./texas";
export { runFloridaAdapter } from "./florida";
export { runGeorgiaAdapter } from "./georgia";
export { runOhioAdapter } from "./ohio";
export { runAlabamaAdapter } from "./alabama";

import type { NormalizedPlayerRecord } from "./types";
import { applyIngestionCap as _cap } from "./cap";

export { applyIngestionCap } from "./cap";
export { parsePlayerCsv, validateCsvPreview } from "./csv";

export function filterToCap(
  players: NormalizedPlayerRecord[],
  alreadyImported: number,
  cap = INGESTION_PLAYER_CAP,
): { kept: NormalizedPlayerRecord[]; stoppedAtCap: boolean } {
  const { allowed, stoppedAtCap } = _cap(players.length, alreadyImported, cap);
  return { kept: players.slice(0, allowed), stoppedAtCap };
}
