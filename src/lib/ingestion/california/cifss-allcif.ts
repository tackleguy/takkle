/**
 * California CIF Southern Section — All-CIF Football honor rolls.
 * Source: https://cifss.org/allcifss/ (robots.txt allows crawling).
 * These are public association selections — not full team rosters.
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

export const CIFSS_SOURCE_NAME = "CIF Southern Section All-CIF Football";
export const CIFSS_BASE = "https://cifss.org/allcifss/";

export interface CifssListSpec {
  seasonLabel: string; // e.g. 2025-26
  seasonEndYear: number; // 2026
  kind: "football-11" | "football-8";
  url: string;
}

export const CIFSS_DEFAULT_LISTS: CifssListSpec[] = [
  {
    seasonLabel: "2025-26",
    seasonEndYear: 2026,
    kind: "football-11",
    url: "https://cifss.org/allcifss/2025-26-football-11/",
  },
  {
    seasonLabel: "2025-26",
    seasonEndYear: 2026,
    kind: "football-8",
    url: "https://cifss.org/allcifss/2025-26-football-8/",
  },
  {
    seasonLabel: "2024-25",
    seasonEndYear: 2025,
    kind: "football-11",
    url: "https://cifss.org/allcifss/2024-25-football-11/",
  },
  {
    seasonLabel: "2024-25",
    seasonEndYear: 2025,
    kind: "football-8",
    url: "https://cifss.org/allcifss/2024-25-football-8/",
  },
  {
    seasonLabel: "2023-24",
    seasonEndYear: 2024,
    kind: "football-11",
    url: "https://cifss.org/allcifss/2023-24-football-11/",
  },
  {
    seasonLabel: "2022-23",
    seasonEndYear: 2023,
    kind: "football-11",
    url: "https://cifss.org/allcifss/2022-23-football-11/",
  },
];

/** Older seasons are PDF embeds (HTML tables empty). Import via CSV until PDF text extract ships. */
export const CIFSS_PDF_ONLY_NOTES = [
  "CIF-SS All-CIF football pre-2022 seasons — public PDF embeds at cifss.org/allcifss/ (use CSV fallback)",
];

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** Parse markdown-style tables emitted by HTML→text converters, or HTML tables. */
export function parseCifssHtml(html: string, spec: CifssListSpec): NormalizedPlayerRecord[] {
  const players: NormalizedPlayerRecord[] = [];
  const seen = new Set<string>();

  // HTML table rows: <tr>...<td>Name</td><td>School</td><td>Pos</td><td>Year</td>
  const rowRe =
    /<tr[^>]*>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<\/tr>/gi;

  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const name = decodeHtml(m[1]);
    const school = decodeHtml(m[2]);
    const position = decodeHtml(m[3]);
    const year = decodeHtml(m[4]);
    if (!name || /^name$/i.test(name)) continue;
    if (!school || /^school$/i.test(school)) continue;
    addPlayer(players, seen, name, school, position, year, spec);
  }

  // Also parse pipe-table lines if present in pre-rendered markdown mirrors
  for (const line of html.split(/\n/)) {
    const pipe = line.match(
      /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/,
    );
    if (!pipe) continue;
    const [, name, school, position, year] = pipe.map((x) => x.trim());
    if (/^name$/i.test(name) || /^---/.test(name)) continue;
    addPlayer(players, seen, name, school, position, year, spec);
  }

  // POY lines: "Offensive Player of the Year – Name, POS, 12, School"
  const poyRe =
    /Player of the Year\s*[–—-]\s*([^,]+),\s*([^,]+),\s*(\d{1,2}),\s*([^\n<]+)/gi;
  while ((m = poyRe.exec(html)) !== null) {
    addPlayer(
      players,
      seen,
      decodeHtml(m[1]),
      decodeHtml(m[4]),
      decodeHtml(m[2]),
      decodeHtml(m[3]),
      spec,
    );
  }

  return players;
}

function addPlayer(
  players: NormalizedPlayerRecord[],
  seen: Set<string>,
  name: string,
  school: string,
  position: string,
  year: string,
  spec: CifssListSpec,
) {
  const { firstName, lastName } = splitDisplayName(normalizeName(name));
  if (!firstName || !lastName) return;
  const grade = parseGrade(year);
  const classYear = grade ? classYearFromGrade(grade, spec.seasonEndYear) : undefined;
  const key = `${firstName}|${lastName}|${school}|${spec.seasonEndYear}`.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);

  players.push({
    firstName,
    lastName,
    position: normalizePosition(position),
    classYear,
    gradeLevel: grade,
    schoolName: normalizeName(school),
    stateCode: "CA",
    seasonYear: spec.seasonEndYear,
    sourceUrl: spec.url,
    sourceName: CIFSS_SOURCE_NAME,
    sourceType: "state_association",
    sourceState: "CA",
    sourceSchool: normalizeName(school),
    raw: {
      seasonLabel: spec.seasonLabel,
      kind: spec.kind,
      grade,
      positionRaw: position,
    },
  });
}

export async function fetchCifssPlayers(
  lists: CifssListSpec[] = CIFSS_DEFAULT_LISTS,
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
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (!res.ok) {
        errors.push(`${spec.url} HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const parsed = parseCifssHtml(html, spec);
      if (parsed.length === 0) {
        errors.push(`${spec.url} parsed 0 players`);
      }
      players.push(...parsed);
      // polite delay
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      errors.push(`${spec.url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { players, errors, blocked };
}
