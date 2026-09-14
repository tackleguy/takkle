/**
 * CHSAA / CHSAANow.com official All-State Football honor rolls (Colorado).
 * Public HTML tables: Player | School | Pos | Yr
 * https://chsaanow.com/history/all-state
 */

import { isUrlAllowed, USER_AGENT } from "../shared/robots";
import {
  classYearFromGrade,
  normalizeName,
  normalizePosition,
  parseGrade,
  splitDisplayName,
} from "../shared/normalize";
import type { NormalizedPlayerRecord } from "../types";

export const CHSAA_SOURCE_NAME = "CHSAA All-State Football";

const GRADE_TOKEN: Record<string, number> = {
  sr: 12,
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

function gradeFromYearToken(raw?: string): number | undefined {
  if (!raw) return undefined;
  const token = raw.toLowerCase().replace(/\./g, "").trim();
  if (GRADE_TOKEN[token] != null) return GRADE_TOKEN[token];
  return parseGrade(raw);
}

export interface ChsaaListSpec {
  seasonEndYear: number;
  label: string;
  url: string;
}

/** Public tackle-football all-state announcements (flag football excluded). */
export const CHSAA_DEFAULT_LISTS: ChsaaListSpec[] = [
  {
    seasonEndYear: 2026,
    label: "2025 CHSAA All-State Football",
    url: "https://chsaanow.com/news/2025/12/15/football-2025-chsaa-all-state-teams-announced",
  },
  {
    seasonEndYear: 2025,
    label: "2024 CHSAA All-State Football",
    url: "https://chsaanow.com/news/2024/12/17/football-2024-all-state-teams-announced",
  },
  {
    seasonEndYear: 2024,
    label: "2023 CHSAA All-State Football",
    url: "https://chsaanow.com/news/2023/12/13/all-state-football-teams-for-the-2023-season",
  },
];

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function parseChsaaAllStateHtml(
  html: string,
  spec: ChsaaListSpec,
): NormalizedPlayerRecord[] {
  const players: NormalizedPlayerRecord[] = [];
  const seen = new Set<string>();

  for (const table of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    for (const row of table[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
      const cells = [...row[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
        decodeHtml(m[1]),
      );
      if (cells.length < 4) continue;
      const [nameRaw, schoolRaw, posRaw, yearRaw] = cells;
      if (!nameRaw || /^player$/i.test(nameRaw)) continue;
      if (!schoolRaw || /^school$/i.test(schoolRaw)) continue;
      add(players, seen, nameRaw, schoolRaw, posRaw, yearRaw, spec);
    }
  }

  // Player of the Year: Name, School
  const poyRe = /Player of the Year:\s*(?:<\/b>)?\s*([^,<]+),\s*([^<\n]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = poyRe.exec(html)) !== null) {
    add(players, seen, decodeHtml(m[1]), decodeHtml(m[2]), undefined, undefined, spec);
  }

  return players;
}

function add(
  players: NormalizedPlayerRecord[],
  seen: Set<string>,
  nameRaw: string,
  schoolRaw: string,
  posRaw: string | undefined,
  yearRaw: string | undefined,
  spec: ChsaaListSpec,
) {
  const name = normalizeName(nameRaw);
  const school = normalizeName(schoolRaw);
  const { firstName, lastName } = splitDisplayName(name);
  if (!firstName || !lastName || school.length < 2) return;
  const grade = gradeFromYearToken(yearRaw);
  const classYear = grade ? classYearFromGrade(grade, spec.seasonEndYear) : undefined;
  const key = `${firstName}|${lastName}|${school}|${spec.seasonEndYear}`.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  players.push({
    firstName,
    lastName,
    position: normalizePosition(posRaw),
    classYear,
    gradeLevel: grade,
    schoolName: school,
    stateCode: "CO",
    seasonYear: spec.seasonEndYear,
    sourceUrl: spec.url,
    sourceName: CHSAA_SOURCE_NAME,
    sourceType: "state_association",
    sourceState: "CO",
    sourceSchool: school,
    raw: { label: spec.label, yearRaw, positionRaw: posRaw },
  });
}

export async function fetchChsaaAllState(
  lists: ChsaaListSpec[] = CHSAA_DEFAULT_LISTS,
): Promise<{ players: NormalizedPlayerRecord[]; errors: string[]; blocked: string[] }> {
  const players: NormalizedPlayerRecord[] = [];
  const errors: string[] = [];
  const blocked: string[] = [];

  for (const spec of lists) {
    const decision = await isUrlAllowed(spec.url);
    if (!decision.allowed) {
      blocked.push(`${spec.url} (${decision.notes})`);
      continue;
    }
    try {
      const res = await fetch(spec.url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        redirect: "follow",
      });
      if (!res.ok) {
        errors.push(`${spec.url} HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const parsed = parseChsaaAllStateHtml(html, spec);
      if (parsed.length === 0) errors.push(`${spec.url} parsed 0 players`);
      players.push(...parsed);
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      errors.push(`${spec.url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { players, errors, blocked };
}
