/**
 * Alabama Sports Writers Association (ASWA) All-State Football.
 * Public media selections (same category as TSWA).
 * 2025 mirror: floridatoday / Gadsden Times USA TODAY Network
 * 2022 mirror: SI.com (robots Allow:/)
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isUrlAllowed, USER_AGENT } from "../shared/robots";
import {
  classYearFromGrade,
  normalizeName,
  normalizePosition,
  splitDisplayName,
} from "../shared/normalize";
import type { NormalizedPlayerRecord } from "../types";

export const ASWA_SOURCE_NAME = "Alabama Sports Writers Association All-State Football";

export interface AswaListSpec {
  seasonEndYear: number;
  url: string;
  snapshot?: string;
}

export const ASWA_DEFAULT_LISTS: AswaListSpec[] = [
  {
    seasonEndYear: 2026,
    url: "https://www.floridatoday.com/story/sports/high-school/football/2025/12/20/alabama-all-state-high-school-football-aswa-ahsaa-aisa/87829172007/",
    snapshot: "2025-aswa-all-state.txt",
  },
  {
    seasonEndYear: 2023,
    url: "https://www.si.com/college/alabama/aswa/2022-aswa-all-state-football-teams-coaches-year",
    snapshot: "2022-aswa-all-state.txt",
  },
];

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

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[–—]/g, "-");
}

export function parseAswaText(
  text: string,
  seasonEndYear: number,
  sourceUrl: string,
): NormalizedPlayerRecord[] {
  const players: NormalizedPlayerRecord[] = [];
  const seen = new Set<string>();

  // QB: Trent Seaborn, Thompson, Jr., 6-1, 205
  const lineRe =
    /^(?:QB|RB|WR|TE|OL|DL|LB|DB|K|P|ATH|UTL|FLEX|KR|PR|AP|UTILITY):\s*([^,\n]+),\s*([^,\n]+),\s*(Jr\.?|Sr\.?|So\.?|Fr\.?|Junior|Senior|Sophomore|Freshman)\b/gim;

  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(text)) !== null) {
    const posToken = text.slice(Math.max(0, m.index - 5), m.index + 3);
    const posMatch = posToken.match(
      /(QB|RB|WR|TE|OL|DL|LB|DB|K|P|ATH|UTL|FLEX|KR|PR|AP)/i,
    );
    add(
      players,
      seen,
      m[1],
      m[2],
      m[3],
      posMatch?.[1],
      seasonEndYear,
      sourceUrl,
    );
  }

  // Also catch "Name, School, Sr." honorable mentions without position prefix
  const hmRe =
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([A-Za-z0-9 .'\-\/]+),\s*(Jr\.|Sr\.|So\.|Fr\.)/g;
  while ((m = hmRe.exec(text)) !== null) {
    add(players, seen, m[1], m[2], m[3], undefined, seasonEndYear, sourceUrl);
  }

  return players;
}

function add(
  players: NormalizedPlayerRecord[],
  seen: Set<string>,
  nameRaw: string,
  schoolRaw: string,
  gradeRaw: string,
  pos: string | undefined,
  seasonEndYear: number,
  sourceUrl: string,
) {
  const name = normalizeName(nameRaw);
  const school = normalizeName(schoolRaw);
  if (/coach|football|all-state|class \d/i.test(name)) return;
  const { firstName, lastName } = splitDisplayName(name);
  if (!firstName || !lastName || school.length < 2) return;

  const gKey = gradeRaw.toLowerCase().replace(/\./g, "");
  const grade = GRADE_MAP[gKey] || GRADE_MAP[gKey.slice(0, 2)];
  const key = `${firstName}|${lastName}|${school}|${seasonEndYear}`.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);

  players.push({
    firstName,
    lastName,
    position: normalizePosition(pos),
    classYear: grade ? classYearFromGrade(grade, seasonEndYear) : undefined,
    gradeLevel: grade,
    schoolName: school,
    stateCode: "AL",
    seasonYear: seasonEndYear,
    sourceUrl,
    sourceName: ASWA_SOURCE_NAME,
    sourceType: "state_association",
    sourceState: "AL",
    sourceSchool: school,
    raw: { gradeRaw },
  });
}

export async function fetchAswaAllState(options?: {
  rootDir?: string;
  lists?: AswaListSpec[];
}): Promise<{ players: NormalizedPlayerRecord[]; errors: string[]; blocked: string[] }> {
  const errors: string[] = [];
  const blocked: string[] = [];
  const rootDir = options?.rootDir ?? process.cwd();
  const lists = options?.lists ?? ASWA_DEFAULT_LISTS;
  const all: NormalizedPlayerRecord[] = [];

  for (const spec of lists) {
    const decision = await isUrlAllowed(spec.url);
    let text: string | null = null;

    if (!decision.allowed) {
      blocked.push(`${spec.url} (${decision.notes})`);
    } else {
      try {
        const res = await fetch(spec.url, {
          headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        });
        if (!res.ok) errors.push(`${spec.url} HTTP ${res.status}`);
        else text = htmlToText(await res.text());
      } catch (e) {
        errors.push(`${spec.url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!text || parseAswaText(text, spec.seasonEndYear, spec.url).length < 20) {
      if (spec.snapshot) {
        const snapPath = join(
          rootDir,
          "data/ingestion/sources/alabama",
          spec.snapshot,
        );
        if (existsSync(snapPath)) text = readFileSync(snapPath, "utf8");
      }
    }

    if (!text) {
      errors.push(`ASWA ${spec.seasonEndYear}: no text`);
      continue;
    }

    const parsed = parseAswaText(text, spec.seasonEndYear, spec.url);
    if (parsed.length === 0) errors.push(`${spec.url} parsed 0`);
    all.push(...parsed);
    await new Promise((r) => setTimeout(r, 400));
  }

  // Also load any extra snapshots in the alabama sources folder
  const dir = join(rootDir, "data/ingestion/sources/alabama");
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".txt") || f === "PROVENANCE.txt") continue;
      if (lists.some((l) => l.snapshot === f)) continue;
      const yearMatch = f.match(/^(20\d{2})/);
      const seasonEndYear = yearMatch ? Number(yearMatch[1]) + (f.includes("2025") ? 1 : 0) : 2025;
      // 2025-aswa => season end 2026 already handled; skip extras without clear year
      void seasonEndYear;
    }
  }

  return { players: all, errors, blocked };
}
