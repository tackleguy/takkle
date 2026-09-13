/**
 * Texas Sports Writers Association all-state football (public media lists).
 * Multi-year HTML pages: https://txswa.org/allstatefootball{YY}.php
 */

import { isUrlAllowed, USER_AGENT } from "../shared/robots";
import {
  classYearFromGrade,
  normalizeName,
  normalizePosition,
  splitDisplayName,
} from "../shared/normalize";
import type { NormalizedPlayerRecord } from "../types";

export const TSWA_SOURCE_NAME = "Texas Sports Writers Association All-State Football";
export const TSWA_BASE = "https://txswa.org/";

/** Two-digit season end years with usable HTML lists (probed). 17–19 are 404. */
export const TSWA_YEAR_SPECS: { yy: string; seasonEndYear: number }[] = [
  { yy: "06", seasonEndYear: 2007 },
  { yy: "07", seasonEndYear: 2008 },
  { yy: "08", seasonEndYear: 2009 },
  { yy: "09", seasonEndYear: 2010 },
  { yy: "10", seasonEndYear: 2011 },
  { yy: "11", seasonEndYear: 2012 },
  { yy: "12", seasonEndYear: 2013 },
  { yy: "13", seasonEndYear: 2014 },
  { yy: "14", seasonEndYear: 2015 },
  { yy: "15", seasonEndYear: 2016 },
  { yy: "16", seasonEndYear: 2017 },
  { yy: "20", seasonEndYear: 2021 },
  { yy: "21", seasonEndYear: 2022 },
  { yy: "22", seasonEndYear: 2023 },
  { yy: "23", seasonEndYear: 2024 },
  { yy: "24", seasonEndYear: 2025 },
  { yy: "25", seasonEndYear: 2026 },
];

export const TSWA_URL = "https://txswa.org/allstatefootball24.php";

const GRADE_MAP: Record<string, number> = {
  sr: 12,
  sen: 12,
  senior: 12,
  jr: 11,
  junior: 11,
  so: 10,
  soph: 10,
  sophomore: 10,
  fr: 9,
  frosh: 9,
  freshman: 9,
};

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseClassYear(token: string, seasonEndYear: number): number | undefined {
  const t = token.toLowerCase().replace(/\./g, "").trim();
  const grade = GRADE_MAP[t];
  if (grade) return classYearFromGrade(grade, seasonEndYear);
  return undefined;
}

/**
 * TSWA lines look like:
 * "Guards – Henry Fenuku, North Crowley, 6-4, 295, sr.; Jared Risinger, ..."
 */
export function parseTswaHtml(
  html: string,
  seasonEndYear = 2025,
  sourceUrl = TSWA_URL,
): NormalizedPlayerRecord[] {
  const text = decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n"));
  const players: NormalizedPlayerRecord[] = [];
  const seen = new Set<string>();

  const entryRe =
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([A-Za-z0-9 .'\-\/]+?),\s*(?:\d-\d{1,2},?\s*)?(?:\d{2,3},?\s*)?(sr|jr|so|fr|soph|senior|junior|sophomore|freshman)\.?/g;

  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(text)) !== null) {
    const name = normalizeName(m[1]);
    const school = normalizeName(m[2]);
    const classYear = parseClassYear(m[3], seasonEndYear);
    const { firstName, lastName } = splitDisplayName(name);
    if (!firstName || !lastName || school.length < 2) continue;
    if (/coach/i.test(name) || /player of the year/i.test(name)) continue;

    const key = `${firstName}|${lastName}|${school}|${classYear ?? ""}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const windowStart = Math.max(0, m.index - 120);
    const window = text.slice(windowStart, m.index).toLowerCase();
    let position: string | undefined;
    const posHints = [
      "quarterback",
      "running back",
      "wide receiver",
      "tight end",
      "guard",
      "tackle",
      "center",
      "fullback",
      "linebacker",
      "cornerback",
      "safety",
      "defensive back",
      "defensive lineman",
      "defensive end",
      "kicker",
      "punter",
      "athlete",
      "utility",
      "all-purpose",
    ];
    for (const hint of posHints) {
      if (window.includes(hint)) {
        position = normalizePosition(
          hint
            .replace("quarterback", "QB")
            .replace("running back", "RB")
            .replace("wide receiver", "WR")
            .replace("tight end", "TE")
            .replace("guard", "OL")
            .replace("tackle", "OL")
            .replace("center", "OL")
            .replace("fullback", "RB")
            .replace("linebacker", "LB")
            .replace("cornerback", "DB")
            .replace("safety", "DB")
            .replace("defensive back", "DB")
            .replace("defensive lineman", "DL")
            .replace("defensive end", "DL")
            .replace("kicker", "K")
            .replace("punter", "P")
            .replace("athlete", "ATH")
            .replace("utility", "ATH")
            .replace("all-purpose", "ATH"),
        );
        break;
      }
    }

    players.push({
      firstName,
      lastName,
      position,
      classYear,
      schoolName: school,
      stateCode: "TX",
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName: TSWA_SOURCE_NAME,
      sourceType: "state_association",
      sourceState: "TX",
      sourceSchool: school,
      raw: { classToken: m[3] },
    });
  }

  return players;
}

export async function fetchTswaAllState(
  yearSpecs: { yy: string; seasonEndYear: number }[] = TSWA_YEAR_SPECS,
): Promise<{
  players: NormalizedPlayerRecord[];
  errors: string[];
  blocked: string[];
}> {
  const errors: string[] = [];
  const blocked: string[] = [];
  const players: NormalizedPlayerRecord[] = [];

  for (const spec of yearSpecs) {
    const url = `https://txswa.org/allstatefootball${spec.yy}.php`;
    const decision = await isUrlAllowed(url);
    if (!decision.allowed) {
      blocked.push(`${url} (${decision.notes})`);
      continue;
    }
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      });
      if (!res.ok) {
        errors.push(`${url} HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const parsed = parseTswaHtml(html, spec.seasonEndYear, url);
      if (parsed.length === 0) errors.push(`${url} parsed 0 players`);
      else console.log(`  TSWA ${spec.yy}: ${parsed.length} players`);
      players.push(...parsed);
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { players, errors, blocked };
}
