import { loadNcesSchools } from "./nces";
import { emptyRunSummary } from "./normalize";
import type { StateAdapterResult } from "../types";

const BLOCKED_NOTES: Record<string, string[]> = {
  FL: [
    "FHSAA full rosters: no permitted bulk public API; commercial aggregators blocked.",
    "Use CSV import of school-submitted or association-published lists.",
  ],
  GA: [
    "GHSA site unstable/blocked for automated access during check; partnership or CSV required.",
  ],
  OH: [
    "OHSAA robots disallows many portal paths; no clean public all-state football dump located for automation.",
    "Use CSV import of OHSAA/school-published permitted lists.",
  ],
};

export async function runSchoolOnlyStateAdapter(
  adapterKey: string,
  stateCode: "FL" | "GA" | "OH",
  options?: { rootDir?: string; schoolLimitPerState?: number },
): Promise<StateAdapterResult> {
  const rootDir = options?.rootDir ?? process.cwd();
  const summary = emptyRunSummary(adapterKey, stateCode);
  const schools = loadNcesSchools(rootDir, [stateCode], options?.schoolLimitPerState);
  summary.schoolsDiscovered = schools.length;
  summary.blockedSources.push(...(BLOCKED_NOTES[stateCode] || []));
  summary.lastSuccessfulAt = new Date().toISOString();
  return { schools, players: [], summary };
}
