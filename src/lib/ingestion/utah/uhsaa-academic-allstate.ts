/**
 * Utah UHSAA Academic All-State Football (official association PDFs).
 * https://uhsaa.org/uhsaa-academic-all-state/
 * robots.txt allows /academicallstate/; no WAF on PDF paths tested.
 * Academic All-State honorees are graduating seniors → classYear = seasonEndYear.
 * NOTE: Through 2025–26 that means class ≤2026, outside Takkle’s 2027–2031 recruit window.
 * Keep the parser for when a 2027 season PDF exists; do not apply seniors into the live DB.
 */

import { USER_AGENT } from "../shared/robots";
import { normalizeName, splitDisplayName } from "../shared/normalize";
import type { NormalizedPlayerRecord } from "../types";

export const UHSAA_SOURCE_NAME = "UHSAA Academic All-State Football";

export interface UhsaaListSpec {
  seasonEndYear: number;
  label: string;
  url: string;
}

/** Public Academic All-State Football PDF charts (recent first). */
export const UHSAA_DEFAULT_LISTS: UhsaaListSpec[] = [
  {
    seasonEndYear: 2026,
    label: "2025-26 Football",
    url: "https://www.uhsaa.org/academicallstate/2025-26/Fall/25FB.pdf",
  },
  {
    seasonEndYear: 2025,
    label: "2024-25 Football",
    url: "https://www.uhsaa.org/academicallstate/2024-25/Fall/24FB.pdf",
  },
  {
    seasonEndYear: 2024,
    label: "2023-24 Football",
    url: "https://www.uhsaa.org/academicallstate/2023-24/23FB.pdf",
  },
  {
    seasonEndYear: 2023,
    label: "2022-23 Football",
    url: "https://www.uhsaa.org/academicallstate/2022-23/22FB.pdf",
  },
  {
    seasonEndYear: 2022,
    label: "2021-22 Football",
    url: "https://www.uhsaa.org/academicallstate/2021-22/21FB.pdf",
  },
  {
    seasonEndYear: 2021,
    label: "2020-21 Football",
    url: "https://www.uhsaa.org/academicallstate/2020-21/2020%20Football%20Chart%20to%20Post.pdf",
  },
  {
    seasonEndYear: 2020,
    label: "2019-20 Football",
    url: "https://www.uhsaa.org/academicallstate/2019-20/2019%20Football%20Chart%20to%20Post.pdf",
  },
  {
    seasonEndYear: 2019,
    label: "2018 Football",
    url: "https://www.uhsaa.org/academicallstate/2018%20Football%20Chart%20to%20Post.pdf",
  },
];

/**
 * UHSAA member school names (longest-first match for two-column PDF lines).
 * Keep in sync with official classifications when expanding.
 */
export const UHSAA_SCHOOLS: string[] = [
  "Intermountain Christian",
  "American Leadership",
  "Layton Christian",
  "Providence Hall",
  "Judge Memorial",
  "Summit Academy",
  "Gunnison Valley",
  "Crimson Cliffs",
  "Maple Mountain",
  "Mountain Crest",
  "Mountain Ridge",
  "Mountain View",
  "North Sanpete",
  "Pleasant Grove",
  "Spanish Fork",
  "American Fork",
  "Copper Hills",
  "Corner Canyon",
  "Desert Hills",
  "Green Canyon",
  "Northridge",
  "North Sevier",
  "North Summit",
  "Salem Hills",
  "Snow Canyon",
  "South Sevier",
  "South Summit",
  "Canyon View",
  "Cedar Valley",
  "Juan Diego",
  "Pine View",
  "Wasatch Academy",
  "West Field",
  "West Jordan",
  "Woods Cross",
  "Bonneville",
  "Box Elder",
  "Bountiful",
  "Clearfield",
  "Enterprise",
  "Farmington",
  "Grantsville",
  "Herriman",
  "Hillcrest",
  "Hurricane",
  "Monticello",
  "Park City",
  "Richfield",
  "Ridgeline",
  "Sky View",
  "Springville",
  "Stansbury",
  "Timpanogos",
  "Viewmont",
  "Water Canyon",
  "Bryce Valley",
  "Bear River",
  "Ben Lomond",
  "Cottonwood",
  "Maeser Prep",
  "Merit Academy",
  "Waterford",
  "Altamont",
  "Bingham",
  "Brighton",
  "Duchesne",
  "Highland",
  "Kearns",
  "Olympus",
  "Parowan",
  "Payson",
  "Riverton",
  "San Juan",
  "Skyridge",
  "Skyline",
  "Syracuse",
  "Taylorsville",
  "Timpview",
  "Westlake",
  "Beaver",
  "Carbon",
  "Cyprus",
  "Delta",
  "Dixie",
  "Emery",
  "Fremont",
  "Granger",
  "Hunter",
  "Jordan",
  "Kanab",
  "Layton",
  "Logan",
  "Manti",
  "Milford",
  "Millard",
  "Morgan",
  "Murray",
  "Ogden",
  "Orem",
  "Provo",
  "Tabiona",
  "Tooele",
  "Uintah",
  "Union",
  "Wasatch",
  "Weber",
  "Wayne",
  "Alta",
  "Cedar",
  "Davis",
  "East",
  "Grand",
  "Juab",
  "Lehi",
  "Manila",
  "Piute",
  "Rich",
  "Roy",
  "West",
].sort((a, b) => b.length - a.length);

const SKIP_LINE =
  /Academic All-State|ACTIVITIES ASSOCIATION|^\d{4}-\d{2}|Football|^\dA$|8-Player|cont\.|Chart to Post|UTAH HIGH SCHOOL/i;

function parseLinePairs(line: string): Array<{ name: string; school: string }> {
  const out: Array<{ name: string; school: string }> = [];
  // Collapse dotted leader charts ("Name .... School") into plain text.
  let rest = line.replace(/\.{2,}/g, " ").replace(/\s+/g, " ").trim();
  const nameOk = /^[A-Z][a-zA-Z.'\-]+(?:\s+[A-Z][a-zA-Z.'\-]+){1,3}$/;
  while (rest) {
    rest = rest.trim();
    if (!rest) break;
    let best: { name: string; school: string; after: string; idx: number; len: number } | null =
      null;
    for (const school of UHSAA_SCHOOLS) {
      const idx = rest.indexOf(school);
      if (idx <= 0) continue;
      const before = rest.slice(0, idx).trim().replace(/^[,.\-\s]+|[,.\-\s]+$/g, "");
      const after = rest.slice(idx + school.length);
      const boundaryOk =
        idx + school.length === rest.length || /\s/.test(rest[idx + school.length] ?? "");
      if (!before || !boundaryOk || !nameOk.test(before)) continue;
      // Prefer leftmost school; at the same index prefer the longest name (Westlake > West).
      if (
        !best ||
        idx < best.idx ||
        (idx === best.idx && school.length > best.len)
      ) {
        best = { name: before, school, after, idx, len: school.length };
      }
    }
    if (!best) break;
    out.push({ name: best.name, school: best.school });
    rest = best.after.trim().replace(/^[,.\-\s]+/, "");
  }
  return out;
}

export function parseUhsaaAcademicPdfText(
  text: string,
  spec: UhsaaListSpec,
): NormalizedPlayerRecord[] {
  const players: NormalizedPlayerRecord[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || SKIP_LINE.test(line)) continue;
    for (const pair of parseLinePairs(line)) {
      const name = normalizeName(pair.name);
      const school = normalizeName(pair.school);
      const { firstName, lastName } = splitDisplayName(name);
      if (!firstName || !lastName || school.length < 2) continue;
      const key = `${firstName}|${lastName}|${school}|${spec.seasonEndYear}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({
        firstName,
        lastName,
        // UHSAA Academic All-State football lists are graduating seniors.
        classYear: spec.seasonEndYear,
        schoolName: school,
        stateCode: "UT",
        seasonYear: spec.seasonEndYear,
        sourceUrl: spec.url,
        sourceName: UHSAA_SOURCE_NAME,
        sourceType: "state_association",
        sourceState: "UT",
        sourceSchool: school,
        raw: { label: spec.label },
      });
    }
  }
  return players;
}

/**
 * PDF bytes → players. Requires `pdf-parse` at runtime when used from Node.
 * Prefer `scripts/ingest-west.mjs` (pypdf) for production west batches.
 */
export async function fetchUhsaaAcademicAllState(options?: {
  lists?: UhsaaListSpec[];
  delayMs?: number;
  extractText?: (buf: ArrayBuffer) => Promise<string>;
}): Promise<{ players: NormalizedPlayerRecord[]; errors: string[]; blocked: string[] }> {
  const lists = options?.lists ?? UHSAA_DEFAULT_LISTS;
  const delayMs = options?.delayMs ?? 800;
  const players: NormalizedPlayerRecord[] = [];
  const errors: string[] = [];
  const blocked: string[] = [];

  if (!options?.extractText) {
    return {
      players: [],
      errors: ["UHSAA PDF extractText callback required (use scripts/ingest-west.mjs)"],
      blocked,
    };
  }

  for (const spec of lists) {
    try {
      const res = await fetch(spec.url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/pdf" },
        redirect: "follow",
      });
      if (!res.ok) {
        errors.push(`${spec.url} HTTP ${res.status}`);
        continue;
      }
      const text = await options.extractText(await res.arrayBuffer());
      const parsed = parseUhsaaAcademicPdfText(text, spec);
      if (!parsed.length) errors.push(`${spec.url} parsed 0 players`);
      players.push(...parsed);
      await new Promise((r) => setTimeout(r, delayMs));
    } catch (e) {
      errors.push(`${spec.url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { players, errors, blocked };
}
