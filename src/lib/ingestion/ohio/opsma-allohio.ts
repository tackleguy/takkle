/**
 * Ohio Prep Sports Media Association (OPSMA) All-Ohio Football.
 * Public PDFs hosted by OHSAA on Azure blob (robots-friendly).
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

export const OPSMA_SOURCE_NAME = "Ohio Prep Sports Media Association All-Ohio Football";

export interface OpsmaYearSpec {
  seasonEndYear: number;
  url: string;
  snapshot: string;
}

/** Multi-year public OPSMA PDFs (probed 2026-09-13). */
export const OPSMA_YEAR_SPECS: OpsmaYearSpec[] = [
  {
    seasonEndYear: 2022,
    url: "https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2021/2021OPSWAAll_OhioFB.pdf",
    snapshot: "2021-opsma-all-ohio.txt",
  },
  {
    seasonEndYear: 2023,
    url: "https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2022/2022OPSWAAll_OhioFB.pdf",
    snapshot: "2022-opsma-all-ohio.txt",
  },
  {
    seasonEndYear: 2024,
    url: "https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2023/2023_football_all-ohio.pdf",
    snapshot: "2023-opsma-all-ohio.txt",
  },
  {
    seasonEndYear: 2025,
    url: "https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2024/2024-fb-all-ohio.pdf",
    snapshot: "2024-opsma-all-ohio.txt",
  },
  {
    seasonEndYear: 2026,
    url: "https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2025/2025-opsma-football-all-ohio.pdf",
    snapshot: "2025-opsma-all-ohio.txt",
  },
];

export const OPSMA_PDF_2024 = OPSMA_YEAR_SPECS.find((s) => s.seasonEndYear === 2025)!.url;

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
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([A-Za-z][A-Za-z0-9 .'\-\/]*?),\s*(?:\d-\d{1,2},?\s*)?(?:\d{2,3},?\s*)?(sr|jr|so|fr|soph|senior|junior|sophomore|freshman)\.?/gi;

  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(flat)) !== null) {
    const name = normalizeName(m[1].replace(/\s+/g, " "));
    const school = normalizeName(m[2].replace(/\s+/g, " "));
    const grade = GRADE_MAP[m[3].toLowerCase().replace(/\./g, "")];
    const { firstName, lastName } = splitDisplayName(name);
    if (!firstName || !lastName || school.length < 2) continue;
    if (/coach|player of the year/i.test(name)) continue;

    const key = `${firstName}|${lastName}|${school}|${seasonEndYear}`.toLowerCase();
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
    const raw = buf.toString("latin1");
    const chunks: string[] = [];
    const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
    let sm: RegExpExecArray | null;
    while ((sm = streamRe.exec(raw)) !== null) {
      const body = sm[1];
      const tj = body.match(/\((?:\\.|[^\\)])*\)\s*Tj/g) || [];
      for (const t of tj) {
        const m = t.match(/\(([\s\S]*)\)\s*Tj/);
        if (m) chunks.push(m[1].replace(/\\([nrt\\()])/g, "$1"));
      }
      const tjArr = body.match(/\[([\s\S]*?)\]\s*TJ/g) || [];
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

function loadSnapshot(rootDir: string, snapshot: string): string | null {
  const path = join(rootDir, "data/ingestion/sources/ohio", snapshot);
  if (!existsSync(path)) return null;
  const text = readFileSync(path, "utf8");
  return text.trim().length > 100 ? text : null;
}

export async function fetchOpsmaAllOhio(options?: {
  rootDir?: string;
  years?: OpsmaYearSpec[];
}): Promise<{ players: NormalizedPlayerRecord[]; errors: string[]; blocked: string[] }> {
  const errors: string[] = [];
  const blocked: string[] = [];
  const rootDir = options?.rootDir ?? process.cwd();
  const years = options?.years ?? OPSMA_YEAR_SPECS;
  const all: NormalizedPlayerRecord[] = [];

  for (const spec of years) {
    const decision = await isUrlAllowed(spec.url);
    let text: string | null = null;

    if (!decision.allowed) {
      blocked.push(`${spec.url} (${decision.notes})`);
    } else {
      text = await fetchPdfText(spec.url);
      if (!text) errors.push(`${spec.url} PDF stream extract empty; using snapshot if present`);
    }

    if (!text || parseOpsmaText(text, spec.seasonEndYear, spec.url).length < 50) {
      text = loadSnapshot(rootDir, spec.snapshot) ?? text;
    }

    if (!text) {
      errors.push(`OPSMA ${spec.seasonEndYear}: no text`);
      continue;
    }

    const parsed = parseOpsmaText(text, spec.seasonEndYear, spec.url);
    if (parsed.length === 0) errors.push(`${spec.url} parsed 0`);
    else console.log(`  OPSMA ${spec.seasonEndYear}: ${parsed.length} players`);
    all.push(...parsed);
    await new Promise((r) => setTimeout(r, 200));
  }

  // Load any extra snapshots not already covered
  const dir = join(rootDir, "data/ingestion/sources/ohio");
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".txt") || f === "PROVENANCE.txt") continue;
      if (years.some((y) => y.snapshot === f)) continue;
      const yearMatch = f.match(/^(20\d{2})/);
      if (!yearMatch) continue;
      const seasonEndYear = Number(yearMatch[1]) + 1;
      const snap = loadSnapshot(rootDir, f);
      if (!snap) continue;
      const parsed = parseOpsmaText(snap, seasonEndYear, `local://${f}`);
      all.push(...parsed);
    }
  }

  return { players: all, errors, blocked };
}
