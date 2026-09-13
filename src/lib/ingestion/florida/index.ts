/**
 * Florida adapter — association/commercial all-state pages are paywalled or robots-blocked.
 * Permitted paths:
 *   1) Operator CSV under data/ingestion/sources/florida/*.csv (with source_url provenance)
 *   2) CFBD recruiting API when CFBD_API_KEY is set (licensed prospects, not full rosters)
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadNcesSchools } from "../shared/nces";
import { emptyRunSummary } from "../shared/normalize";
import { parsePlayerCsv } from "../csv";
import { fetchCfbdRecruitsForStates } from "../shared/cfbd-state";
import type { StateAdapterResult } from "../types";

export const FLORIDA_BLOCKED = [
  "floridahsfootball.com all-state — Paid Memberships Pro paywall (no login/CAPTCHA bypass).",
  "fhsaa.org — robots.txt User-agent:* Disallow:/",
  "MaxPreps / Scorebook Live — robots/WAF blocked.",
];

export async function runFloridaAdapter(options?: {
  rootDir?: string;
  schoolLimitPerState?: number;
}): Promise<StateAdapterResult> {
  const rootDir = options?.rootDir ?? process.cwd();
  const summary = emptyRunSummary("florida", "FL");
  const schools = loadNcesSchools(rootDir, ["FL"], options?.schoolLimitPerState);
  summary.schoolsDiscovered = schools.length;
  summary.blockedSources.push(...FLORIDA_BLOCKED);

  const players = [];

  // CSV imports
  const csvDir = join(rootDir, "data/ingestion/sources/florida");
  if (existsSync(csvDir)) {
    for (const f of readdirSync(csvDir).filter((x) => x.endsWith(".csv"))) {
      const { records, errors } = parsePlayerCsv(readFileSync(join(csvDir, f), "utf8"));
      summary.errors.push(...errors.map((e) => `${f}: ${e}`));
      for (const r of records) {
        if (r.stateCode !== "FL") continue;
        players.push(r);
      }
    }
  }

  // Licensed CFBD prospects when key present
  const cfbd = await fetchCfbdRecruitsForStates(["FL"], { rootDir });
  players.push(...cfbd.players);
  summary.errors.push(...cfbd.errors);
  if (cfbd.note) summary.blockedSources.push(cfbd.note);

  const byKey = new Map<string, (typeof players)[number]>();
  for (const p of players) {
    const key = `${p.firstName}|${p.lastName}|${p.schoolName}|${p.classYear ?? ""}`.toLowerCase();
    const existing = byKey.get(key);
    if (!existing || p.seasonYear > existing.seasonYear) byKey.set(key, p);
    else summary.duplicatesDetected += 1;
  }

  const deduped = [...byKey.values()];
  summary.playersDiscovered = deduped.length;
  summary.lastSuccessfulAt = new Date().toISOString();
  return { schools, players: deduped, summary };
}
