import { loadNcesSchools } from "../shared/nces";
import { emptyRunSummary, filterRecruitClassPlayers } from "../shared/normalize";
import { fetchAiaRecognitions } from "./azpreps-recognitions";
import { fetchCfbdRecruitsForStates } from "../shared/cfbd-state";
import type { StateAdapterResult } from "../types";

export async function runArizonaAdapter(options?: {
  rootDir?: string;
  schoolLimitPerState?: number;
  includeRegions?: boolean;
}): Promise<StateAdapterResult> {
  const rootDir = options?.rootDir ?? process.cwd();
  const summary = emptyRunSummary("arizona", "AZ");
  const schools = loadNcesSchools(rootDir, ["AZ"], options?.schoolLimitPerState);
  summary.schoolsDiscovered = schools.length;

  const aia = await fetchAiaRecognitions({
    includeRegions: options?.includeRegions !== false,
  });
  summary.errors.push(...aia.errors);
  summary.blockedSources.push(...aia.blocked);

  const cfbd = await fetchCfbdRecruitsForStates(["AZ"], { rootDir });
  summary.errors.push(...cfbd.errors);
  if (cfbd.note) summary.blockedSources.push(cfbd.note);

  const merged = [...aia.players, ...cfbd.players];
  const byKey = new Map<string, (typeof merged)[number]>();
  for (const p of merged) {
    const key = `${p.firstName}|${p.lastName}|${p.schoolName}|${p.classYear ?? p.seasonYear}`.toLowerCase();
    const existing = byKey.get(key);
    if (!existing || p.seasonYear > existing.seasonYear) byKey.set(key, p);
    else summary.duplicatesDetected += 1;
  }

  // AIA honor rolls omit class year → filtered out unless CFBD (or another source) supplies 2027–2031.
  const players = filterRecruitClassPlayers([...byKey.values()]);
  summary.playersDiscovered = players.length;
  summary.sourcesFailing = summary.errors.length + summary.blockedSources.length;
  summary.lastSuccessfulAt = new Date().toISOString();
  return { schools, players, summary };
}
