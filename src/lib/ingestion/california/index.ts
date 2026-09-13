import { loadNcesSchools } from "../shared/nces";
import { emptyRunSummary, filterRecruitClassPlayers } from "../shared/normalize";
import { CIFSS_PDF_ONLY_NOTES, fetchCifssPlayers } from "./cifss-allcif";
import { fetchCalHiSportsPlayers } from "./calhisports-allstate";
import type { StateAdapterResult } from "../types";

export async function runCaliforniaAdapter(options?: {
  rootDir?: string;
  schoolLimitPerState?: number;
  includeHistoricalSeasons?: boolean;
}): Promise<StateAdapterResult> {
  const rootDir = options?.rootDir ?? process.cwd();
  const summary = emptyRunSummary("california", "CA");

  const schools = loadNcesSchools(rootDir, ["CA"], options?.schoolLimitPerState);
  summary.schoolsDiscovered = schools.length;

  const cifss = await fetchCifssPlayers();
  const calhi = await fetchCalHiSportsPlayers();
  const players = [...cifss.players, ...calhi.players];
  summary.playersDiscovered = players.length;
  summary.errors.push(...cifss.errors, ...calhi.errors);
  summary.blockedSources.push(
    ...cifss.blocked,
    ...calhi.blocked,
    ...CIFSS_PDF_ONLY_NOTES,
    "CIF San Diego / North Coast / Central — HTTP 403 or no public all-CIF HTML",
    "MaxPreps — robots.txt Disallow /school/ /team/",
    "Scorebook Live / scores.cifss.org — AWS WAF challenge + commercial ToS",
  );
  summary.sourcesFailing = summary.errors.length + summary.blockedSources.length;
  summary.lastSuccessfulAt = new Date().toISOString();

  const byKey = new Map<string, (typeof players)[number]>();
  for (const p of players) {
    const key = `${p.firstName}|${p.lastName}|${p.schoolName}|${p.classYear ?? ""}`.toLowerCase();
    const existing = byKey.get(key);
    if (!existing || p.seasonYear > existing.seasonYear) {
      byKey.set(key, p);
    } else {
      summary.duplicatesDetected += 1;
    }
  }

  const playersKept = filterRecruitClassPlayers([...byKey.values()]);
  summary.playersDiscovered = playersKept.length;

  return {
    schools,
    players: playersKept,
    summary,
  };
}
