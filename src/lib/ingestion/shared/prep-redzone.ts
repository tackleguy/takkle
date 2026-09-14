/**
 * Prep Redzone rankings table parser.
 * Never treats position codes (EDGE/ATH, WR/DB, …) as school names.
 */

import type { NormalizedPlayerRecord } from "../types";
import {
  isJunkPlayerName,
  isPositionCodeSchool,
  normalizeName,
  normalizePosition,
  splitDisplayName,
} from "./normalize";

const STATE_MAP: Record<string, string> = {
  alabama: "AL",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  nebraska: "NE",
  nevada: "NV",
  "new-jersey": "NJ",
  "new-york": "NY",
  "north-carolina": "NC",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode-island": "RI",
  "south-carolina": "SC",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  virginia: "VA",
  washington: "WA",
  "west-virginia": "WV",
  wisconsin: "WI",
};

export function inferPrzState(url: string): string | undefined {
  const m = url.match(/prepredzone\.com\/([^/]+)\//i);
  return m ? STATE_MAP[m[1]!.toLowerCase()] : undefined;
}

export function inferPrzClassYear(url: string): number | undefined {
  for (const y of [2031, 2030, 2029, 2028, 2027]) {
    if (url.includes(String(y))) return y;
  }
  return undefined;
}

function cleanCell(html: string): string {
  return normalizeName(
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#8217;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&#\d+;/g, " "),
  );
}

function cellsFromRow(rowHtml: string): string[] {
  const cells: string[] = [];
  const re = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rowHtml)) !== null) cells.push(cleanCell(m[1]!));
  return cells;
}

/**
 * Parse a Prep Redzone rankings HTML page into player records.
 * Requires explicit High School / School column — never uses Position as school.
 */
export function parsePrepRedzoneHtml(
  html: string,
  sourceUrl: string,
  options?: { stateCode?: string; classYear?: number },
): NormalizedPlayerRecord[] {
  const stateCode = options?.stateCode ?? inferPrzState(sourceUrl);
  const classYear = options?.classYear ?? inferPrzClassYear(sourceUrl);
  if (!stateCode || !classYear) return [];

  const players: NormalizedPlayerRecord[] = [];
  const seen = new Set<string>();
  let headerIdx: Record<string, number> | null = null;

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(html)) !== null) {
    const cells = cellsFromRow(row[1]!);
    if (!cells.length) continue;
    const low = cells.map((c) => c.toLowerCase());

    if (low.includes("player") && (low.includes("high school") || low.includes("school"))) {
      headerIdx = {};
      for (let i = 0; i < cells.length; i++) {
        const key = cells[i]!.toLowerCase();
        if (key && headerIdx[key] == null) headerIdx[key] = i;
      }
      continue;
    }
    if (!headerIdx) continue;

    const pi = headerIdx.player;
    const si = headerIdx["high school"] ?? headerIdx.school;
    const posi = headerIdx.position ?? headerIdx.pos;
    if (pi == null || si == null || pi >= cells.length) continue;

    const name = cells[pi]!;
    if (!name || name.toLowerCase() === "player") continue;
    const { firstName, lastName } = splitDisplayName(name);
    if (isJunkPlayerName(firstName, lastName)) continue;

    const school = cells[si] ?? "";
    if (!school || school.length < 2 || isPositionCodeSchool(school)) continue;
    // Guard: if school cell looks like height/weight, skip
    if (/^\d/.test(school) || /['″"]/.test(school)) continue;

    const position = posi != null && posi < cells.length ? cells[posi] : undefined;

    const key = `${firstName}|${lastName}|${school}|${classYear}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    players.push({
      firstName,
      lastName,
      position: normalizePosition(position),
      classYear,
      schoolName: school,
      stateCode,
      seasonYear: classYear,
      sourceUrl,
      sourceName: `Prep Redzone Class of ${classYear} Rankings`,
      sourceType: "media_public",
      sourceState: stateCode,
      sourceSchool: school,
    });
  }

  return players;
}

/** Filter already-parsed PRZ (or any) records that used position codes as schools. */
export function rejectPositionCodeSchools<
  T extends { schoolName?: string | null; sourceSchool?: string | null },
>(rows: T[]): T[] {
  return rows.filter((r) => {
    const school = r.schoolName || r.sourceSchool;
    return !isPositionCodeSchool(school);
  });
}
