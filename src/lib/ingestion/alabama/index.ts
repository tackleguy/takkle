import { loadNcesSchools } from "../shared/nces";
import { emptyRunSummary, filterRecruitClassPlayers } from "../shared/normalize";
import { fetchAswaAllState } from "./aswa-allstate";
import { fetchCfbdRecruitsForStates } from "../shared/cfbd-state";
import type { StateAdapterResult } from "../types";

/** Stretch state — ASWA public all-state (permitted media honor rolls). */
export async function runAlabamaAdapter(options?: {
  rootDir?: string;
  schoolLimitPerState?: number;
}): Promise<StateAdapterResult> {
  const rootDir = options?.rootDir ?? process.cwd();
  const summary = emptyRunSummary("alabama", "AL");
  const schools = loadNcesSchools(rootDir, ["AL"], options?.schoolLimitPerState);
  summary.schoolsDiscovered = schools.length;

  const { players, errors, blocked } = await fetchAswaAllState({ rootDir });
  summary.errors.push(...errors);
  summary.blockedSources.push(...blocked);

  const cfbd = await fetchCfbdRecruitsForStates(["AL"], { rootDir });
  const merged = [...players, ...cfbd.players];
  summary.errors.push(...cfbd.errors);
  if (cfbd.note) summary.blockedSources.push(cfbd.note);

  const byKey = new Map<string, (typeof merged)[number]>();
  for (const p of merged) {
    const key = `${p.firstName}|${p.lastName}|${p.schoolName}|${p.classYear ?? ""}`.toLowerCase();
    const existing = byKey.get(key);
    if (!existing || p.seasonYear > existing.seasonYear) byKey.set(key, p);
    else summary.duplicatesDetected += 1;
  }

  const deduped = filterRecruitClassPlayers([...byKey.values()]);
  summary.playersDiscovered = deduped.length;
  summary.sourcesFailing = errors.length + blocked.length;
  summary.lastSuccessfulAt = new Date().toISOString();
  return { schools, players: deduped, summary };
}
