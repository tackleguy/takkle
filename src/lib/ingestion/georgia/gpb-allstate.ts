/**
 * Georgia Public Broadcasting (GPB) Sports All-State Football.
 * https://www.gpb.org/blogs/gpb-sports-blog/2024/12/24/2024-gpb-all-state-team
 * Public media honor roll; robots Allow:/ .
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isUrlAllowed, USER_AGENT } from "../shared/robots";
import {
  classYearFromGrade,
  normalizeName,
  normalizePosition,
  splitDisplayName,
} from "../shared/normalize";
import type { NormalizedPlayerRecord } from "../types";

export const GPB_SOURCE_NAME = "GPB Sports All-State Football";
export const GPB_URL_2024 =
  "https://www.gpb.org/blogs/gpb-sports-blog/2024/12/24/2024-gpb-all-state-team";

const GRADE_MAP: Record<string, number> = {
  senior: 12,
  junior: 11,
  sophomore: 10,
  freshman: 9,
};

const SECTION_POS: Array<[RegExp, string]> = [
  [/quarterback/i, "QB"],
  [/running back/i, "RB"],
  [/wide receiver/i, "WR"],
  [/tight end/i, "TE"],
  [/offensive lineman|offensive line/i, "OL"],
  [/defensive lineman|defensive line/i, "DL"],
  [/linebacker/i, "LB"],
  [/defensive back/i, "DB"],
  [/athlete/i, "ATH"],
  [/special team|kicker|punter/i, "K"],
];

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&apos;/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\r/g, "");
}

export function parseGpbText(
  text: string,
  seasonEndYear = 2025,
  sourceUrl = GPB_URL_2024,
): NormalizedPlayerRecord[] {
  const players: NormalizedPlayerRecord[] = [];
  const seen = new Set<string>();
  let currentPos: string | undefined;

  const add = (name: string, school: string, gradeRaw?: string, pos?: string) => {
    const cleaned = normalizeName(name.replace(/"/g, ""));
    const schoolName = normalizeName(school);
    const { firstName, lastName } = splitDisplayName(cleaned);
    if (!firstName || !lastName || schoolName.length < 2) return;
    if (/coach|outstanding|caption|credit|gpb sports|honorable mention/i.test(cleaned)) return;
    if (/stats:|recruiting:|team:|season stats/i.test(schoolName)) return;

    const grade = gradeRaw ? GRADE_MAP[gradeRaw.toLowerCase()] : undefined;
    const key = `${firstName}|${lastName}|${schoolName}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    players.push({
      firstName,
      lastName,
      position: normalizePosition(pos || currentPos),
      classYear: grade ? classYearFromGrade(grade, seasonEndYear) : undefined,
      gradeLevel: grade,
      schoolName,
      stateCode: "GA",
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName: GPB_SOURCE_NAME,
      sourceType: "state_association",
      sourceState: "GA",
      sourceSchool: schoolName,
      raw: { gradeRaw, sectionPos: currentPos },
    });
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;

    for (const [re, pos] of SECTION_POS) {
      if (re.test(line) && /all-state|gpb/i.test(line)) {
        currentPos = pos;
        break;
      }
    }

    // Name - School - 6-1, 181, Senior
    const sized = line.match(
      /^([A-Z][A-Za-z."'\-]+(?:\s+[A-Z][A-Za-z."'\-]+)+)\s*-\s*([A-Za-z0-9 .'\-\/]+?)\s*-\s*\d-\d{1,2},\s*\d{2,3},\s*(Senior|Junior|Sophomore|Freshman)\b/i,
    );
    if (sized) {
      add(sized[1], sized[2], sized[3]);
      continue;
    }

    // Honorable Mention: Name, School; Name, School
    const hm = line.match(/^Honorable Mention:\s*(.+)$/i);
    if (hm) {
      for (const part of hm[1].split(";")) {
        const m = part.trim().match(/^([^,]+),\s*(.+)$/);
        if (m) add(m[1], m[2]);
      }
    }
  }

  return players;
}

function loadSnapshot(rootDir: string): string | null {
  const path = join(rootDir, "data/ingestion/sources/georgia/2024-gpb-all-state.txt");
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

export async function fetchGpbAllState(options?: {
  rootDir?: string;
}): Promise<{ players: NormalizedPlayerRecord[]; errors: string[]; blocked: string[] }> {
  const errors: string[] = [];
  const blocked: string[] = [];
  const rootDir = options?.rootDir ?? process.cwd();

  const decision = await isUrlAllowed(GPB_URL_2024);
  if (!decision.allowed) {
    blocked.push(`${GPB_URL_2024} (${decision.notes})`);
  }

  let text: string | null = null;
  if (decision.allowed) {
    try {
      const res = await fetch(GPB_URL_2024, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      });
      if (!res.ok) errors.push(`${GPB_URL_2024} HTTP ${res.status}`);
      else text = htmlToText(await res.text());
    } catch (e) {
      errors.push(`${GPB_URL_2024}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!text || parseGpbText(text).length === 0) {
    const snap = loadSnapshot(rootDir);
    if (snap) text = snap;
  }

  if (!text) {
    errors.push("GPB All-State text unavailable");
    return { players: [], errors, blocked };
  }

  const players = parseGpbText(text, 2025, GPB_URL_2024);
  if (players.length === 0) errors.push("GPB parsed 0 players");
  return { players, errors, blocked };
}
