import { loadNcesSchools } from "../shared/nces";
import { emptyRunSummary } from "../shared/normalize";
import { fetchChsaaAllState } from "./chsaa-allstate";
import { fetchCfbdRecruitsForStates } from "../shared/cfbd-state";
import type { StateAdapterResult } from "../types";

export async function runColoradoAdapter(options?: {
  rootDir?: string;
  schoolLimitPerState?: number;
}): Promise<StateAdapterResult> {
  const rootDir = options?.rootDir ?? process.cwd();
  const summary = emptyRunSummary("colorado", "CO");
  const schools = loadNcesSchools(rootDir, ["CO"], options?.schoolLimitPerState);
  summary.schoolsDiscovered = schools.length;

  const chsaa = await fetchChsaaAllState();
  summary.errors.push(...chsaa.errors);
  summary.blockedSources.push(...chsaa.blocked);

  const cfbd = await fetchCfbdRecruitsForStates(["CO"], { rootDir });
  summary.errors.push(...cfbd.errors);
  if (cfbd.note) summary.blockedSources.push(cfbd.note);

  const merged = [...chsaa.players, ...cfbd.players];
  const byKey = new Map<string, (typeof merged)[number]>();
  for (const p of merged) {
    const key = `${p.firstName}|${p.lastName}|${p.schoolName}|${p.classYear ?? ""}`.toLowerCase();
    const existing = byKey.get(key);
    if (!existing || p.seasonYear > existing.seasonYear) byKey.set(key, p);
    else summary.duplicatesDetected += 1;
  }

  const players = [...byKey.values()];
  summary.playersDiscovered = players.length;
  summary.sourcesFailing = summary.errors.length + summary.blockedSources.length;
  summary.lastSuccessfulAt = new Date().toISOString();
  return { schools, players, summary };
}
