/**
 * Ohio Prep Sports Media Association (OPSMA) All-Ohio Football.
 * Primary: public PDF hosted by OHSAA.
 * https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2024/2024-fb-all-ohio.pdf
 * Also mirrored on OHSAA news pages under /news-media/articles/ (robots-allowed).
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

export const OPSMA_SOURCE_NAME = "Ohio Prep Sports Media Association All-Ohio Football";
export const OPSMA_PDF_2024 =
  "https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2024/2024-fb-all-ohio.pdf";

const GRADE_MAP: Record<string, number> = {
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

const POS_HINTS: Array<[RegExp, string]> = [
  [/\bquarterback\b|\bQB:/i, "QB"],
  [/\brunning back\b|\bRB:/i, "RB"],
  [/\bwide receiver\b|\btight end\b|\bWR\/TE:|\bWR:|\bTE:/i, "WR"],
  [/\boffensive line\b|\bOL:/i, "OL"],
  [/\bdefensive line\b|\bDL:/i, "DL"],
  [/\blinebacker\b|\bLB:/i, "LB"],
  [/\bdefensive back\b|\bDB:/i, "DB"],
  [/\bkicker\b|\bK:/i, "K"],
  [/\bpunter\b|\bP:/i, "P"],
  [/\bathlete\b|\bATH:/i, "ATH"],
];

function decode(s: string): string {
  return s
    .replace(/\u0000/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseOpsmaText(
  text: string,
  seasonEndYear = 2025,
  sourceUrl = OPSMA_PDF_2024,
): NormalizedPlayerRecord[] {
  const flat = decode(text.replace(/\n/g, " "));
  const players: NormalizedPlayerRecord[] = [];
  const seen = new Set<string>();

  const entryRe =
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([A-Za-z0-9 .'\-\/]+?),\s*(?:\d-\d{1,2},?\s*)?(?:\d{2,3},?\s*)?(sr|jr|so|fr|soph|senior|junior|sophomore|freshman)\.?/gi;

  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(flat)) !== null) {
    const name = normalizeName(m[1].replace(/\s+/g, " "));
    const school = normalizeName(m[2].replace(/\s+/g, " "));
    const grade = GRADE_MAP[m[3].toLowerCase().replace(/\./g, "")];
    const { firstName, lastName } = splitDisplayName(name);
    if (!firstName || !lastName || school.length < 2) continue;
    if (/coach|player of the year/i.test(name)) continue;

    const key = `${firstName}|${lastName}|${school}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const window = flat.slice(Math.max(0, m.index - 100), m.index);
    let position: string | undefined;
    for (const [re, pos] of POS_HINTS) {
      if (re.test(window)) {
        position = normalizePosition(pos);
        break;
      }
    }

    players.push({
      firstName,
      lastName,
      position,
      classYear: grade ? classYearFromGrade(grade, seasonEndYear) : undefined,
      gradeLevel: grade,
      schoolName: school,
      stateCode: "OH",
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName: OPSMA_SOURCE_NAME,
      sourceType: "state_association",
      sourceState: "OH",
      sourceSchool: school,
      raw: { classToken: m[3] },
    });
  }

  return players;
}

async function fetchPdfText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/pdf,*/*" },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Minimal PDF stream text extraction (good enough for OHSAA All-Ohio layout).
    const raw = buf.toString("latin1");
    const chunks: string[] = [];
    const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
    let sm: RegExpExecArray | null;
    while ((sm = streamRe.exec(raw)) !== null) {
      const body = sm[1];
      const tj = body.match(/\((?:\\.|[^\\)])*\)\s*Tj/g) || [];
      for (const t of tj) {
        const inner = t.replace(/^\)|\)$/g, "").replace(/\)$/, "");
        const m = inner.match(/\(([\s\S]*)\)\s*Tj/);
        if (m) chunks.push(m[1].replace(/\\([nrt\\()])/g, "$1"));
      }
      const tjArr = body.match(/\[(.*?)\]\s*TJ/gs) || [];
      for (const block of tjArr) {
        for (const part of block.match(/\((?:\\.|[^\\)])*\)/g) || []) {
          chunks.push(part.slice(1, -1).replace(/\\([nrt\\()])/g, "$1"));
        }
      }
    }
    const text = chunks.join(" ");
    return text.length > 500 ? text : null;
  } catch {
    return null;
  }
}

function loadSnapshot(rootDir: string): string | null {
  const path = join(rootDir, "data/ingestion/sources/ohio/2024-opsma-all-ohio.txt");
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

export async function fetchOpsmaAllOhio(options?: {
  rootDir?: string;
}): Promise<{ players: NormalizedPlayerRecord[]; errors: string[]; blocked: string[] }> {
  const errors: string[] = [];
  const blocked: string[] = [];
  const rootDir = options?.rootDir ?? process.cwd();

  // Blob host has no robots.txt typically — check anyway; news pages are allowed.
  const decision = await isUrlAllowed(OPSMA_PDF_2024);
  if (!decision.allowed) {
    blocked.push(`${OPSMA_PDF_2024} (${decision.notes})`);
  }

  let text: string | null = null;
  if (decision.allowed) {
    text = await fetchPdfText(OPSMA_PDF_2024);
    if (!text) errors.push(`${OPSMA_PDF_2024} PDF text extract empty; using local snapshot if present`);
  }

  if (!text) {
    text = loadSnapshot(rootDir);
    if (!text) {
      errors.push("No OPSMA All-Ohio text available (PDF extract + snapshot failed)");
      return { players: [], errors, blocked };
    }
  }

  const players = parseOpsmaText(text, 2025, OPSMA_PDF_2024);
  if (players.length === 0) errors.push("OPSMA parsed 0 players");
  return { players, errors, blocked };
}
