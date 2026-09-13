import { loadNcesSchools } from "../shared/nces";
import { emptyRunSummary } from "../shared/normalize";
import { fetchGpbAllState } from "./gpb-allstate";
import { fetchCfbdRecruitsForStates } from "../shared/cfbd-state";
import type { StateAdapterResult } from "../types";

export async function runGeorgiaAdapter(options?: {
  rootDir?: string;
  schoolLimitPerState?: number;
}): Promise<StateAdapterResult> {
  const rootDir = options?.rootDir ?? process.cwd();
  const summary = emptyRunSummary("georgia", "GA");
  const schools = loadNcesSchools(rootDir, ["GA"], options?.schoolLimitPerState);
  summary.schoolsDiscovered = schools.length;

  const { players, errors, blocked } = await fetchGpbAllState({ rootDir });
  summary.errors.push(...errors);
  summary.blockedSources.push(...blocked);
  summary.blockedSources.push(
    "GHSA.net unstable/500 during automation checks — partnership or CSV for full GHSA dumps.",
  );

  const cfbd = await fetchCfbdRecruitsForStates(["GA"], { rootDir });
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

  const deduped = [...byKey.values()];
  summary.playersDiscovered = deduped.length;
  summary.sourcesFailing = errors.length + blocked.length;
  summary.lastSuccessfulAt = new Date().toISOString();
  return { schools, players: deduped, summary };
}
