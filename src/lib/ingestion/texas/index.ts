/**
 * Texas adapter — TSWA multi-year all-state football (public media lists).
 * Full roster scraping of commercial sites is blocked; CSV fallback remains for depth.
 */

import { loadNcesSchools } from "../shared/nces";
import { emptyRunSummary, filterRecruitClassPlayers } from "../shared/normalize";
import { fetchTswaAllState } from "./tswa-allstate";
import type { StateAdapterResult } from "../types";

export async function runTexasAdapter(options?: {
  rootDir?: string;
  schoolLimitPerState?: number;
}): Promise<StateAdapterResult> {
  const rootDir = options?.rootDir ?? process.cwd();
  const summary = emptyRunSummary("texas", "TX");

  const schools = loadNcesSchools(rootDir, ["TX"], options?.schoolLimitPerState);
  summary.schoolsDiscovered = schools.length;

  const { players, errors, blocked } = await fetchTswaAllState();
  summary.playersDiscovered = players.length;
  summary.errors.push(...errors);
  summary.blockedSources.push(
    ...blocked,
    "MaxPreps — robots.txt Disallow /school/ /team/",
    "Dave Campbell's Texas Football all-state — commercial / incomplete public scrape path; use CSV",
  );
  summary.sourcesFailing = errors.length + blocked.length;
  summary.lastSuccessfulAt = new Date().toISOString();

  const byKey = new Map<string, (typeof players)[number]>();
  for (const p of players) {
    const key = `${p.firstName}|${p.lastName}|${p.schoolName}|${p.classYear ?? ""}`.toLowerCase();
    const existing = byKey.get(key);
    if (!existing || p.seasonYear > existing.seasonYear) byKey.set(key, p);
    else summary.duplicatesDetected += 1;
  }

  const playersKept = filterRecruitClassPlayers([...byKey.values()]);
  summary.playersDiscovered = playersKept.length;
  return { schools, players: playersKept, summary };
}
