/**
 * Arizona AIA football recognitions via AZPreps365 (official AIA site).
 * Public All-Conference / All-Region honor rolls — not full rosters.
 * robots.txt: User-agent * Crawl-Delay: 10
 * https://azpreps365.com/recognitions/football/6a
 */

import { isUrlAllowed, USER_AGENT } from "../shared/robots";
import {
  normalizeName,
  normalizePosition,
  splitDisplayName,
} from "../shared/normalize";
import type { NormalizedPlayerRecord } from "../types";

export const AIA_SOURCE_NAME = "AIA AZPreps365 Football Recognitions";
export const AIA_BASE = "https://azpreps365.com";

/** Conference-level tier IDs (statewide All-Conference). Region tiers expand volume. */
export const AIA_CONFERENCE_TIERS: Array<{ id: number; label: string }> = [
  { id: 12070, label: "6A" },
  { id: 12074, label: "5A" },
  { id: 12078, label: "4A" },
  { id: 12082, label: "3A" },
  { id: 12086, label: "2A" },
  { id: 12096, label: "1A" },
];

/** Region / sub-conference tiers for additional All-Region honor rolls. */
export const AIA_REGION_TIERS: Array<{ id: number; label: string }> = [
  { id: 12161, label: "6A Central" },
  { id: 12169, label: "6A Desert Valley" },
  { id: 12159, label: "6A East Valley" },
  { id: 12157, label: "6A Fiesta" },
  { id: 12167, label: "6A Southeast" },
  { id: 12155, label: "6A Southern" },
  { id: 12101, label: "5A Central Valley" },
  { id: 12103, label: "5A Desert West" },
  { id: 12105, label: "5A Metro" },
  { id: 12107, label: "5A Northeast Valley" },
  { id: 12109, label: "5A Northwest" },
  { id: 12111, label: "5A San Tan" },
  { id: 12113, label: "5A Sonoran" },
  { id: 12115, label: "5A Southern" },
  { id: 12217, label: "4A Black Canyon" },
  { id: 12219, label: "4A Copper Sky" },
  { id: 12221, label: "4A Desert Sky" },
  { id: 12223, label: "4A Desert Southwest" },
  { id: 12227, label: "4A Gila" },
  { id: 12229, label: "4A Grand Canyon" },
  { id: 12231, label: "4A Kino" },
  { id: 12233, label: "4A Skyline" },
  { id: 12235, label: "4A Southwest" },
  { id: 12239, label: "4A West Valley" },
  { id: 12137, label: "3A East" },
  { id: 12139, label: "3A Metro" },
  { id: 12141, label: "3A Mountain" },
  { id: 12143, label: "3A North" },
  { id: 12145, label: "3A West" },
  { id: 12099, label: "2A East" },
  { id: 12260, label: "2A Metro 1" },
  { id: 12262, label: "2A Metro 2" },
  { id: 12264, label: "2A Metro 3" },
  { id: 12266, label: "2A Metro 4" },
  { id: 12268, label: "2A Metro 5" },
  { id: 12270, label: "2A North 1" },
  { id: 12272, label: "2A North 2" },
  { id: 12276, label: "2A South 1" },
  { id: 12280, label: "2A South 2" },
  { id: 12243, label: "1A East" },
  { id: 12245, label: "1A North" },
  { id: 12247, label: "1A South" },
  { id: 12249, label: "1A West" },
];

export interface AiaYearSpec {
  /** Filter year param (e.g. 2024 → 2024-25 season). */
  yearParam: number;
  seasonEndYear: number;
}

/** Recent seasons prioritizing recruit window underclassmen when present. */
export const AIA_DEFAULT_YEARS: AiaYearSpec[] = [
  { yearParam: 2024, seasonEndYear: 2025 },
  { yearParam: 2023, seasonEndYear: 2024 },
  { yearParam: 2022, seasonEndYear: 2023 },
  { yearParam: 2021, seasonEndYear: 2022 },
  { yearParam: 2020, seasonEndYear: 2021 },
];

const AIA_POS: Record<string, string> = {
  "defensive backs": "DB",
  "defensive back": "DB",
  "defensive lineman": "DL",
  "defensive linemen": "DL",
  "defensive line": "DL",
  "offensive lineman": "OL",
  "offensive linemen": "OL",
  "offensive line": "OL",
  "linebackers": "LB",
  linebacker: "LB",
  "running backs": "RB",
  "running back": "RB",
  "wide receivers": "WR",
  "wide receiver": "WR",
  "tight ends": "TE",
  "tight end": "TE",
  quarterbacks: "QB",
  quarterback: "QB",
  kickers: "K",
  kicker: "K",
  punters: "P",
  punter: "P",
  athletes: "ATH",
  athlete: "ATH",
  "utility players": "ATH",
  "special teams": "ATH",
  "long snappers": "ATH",
  "long snapper": "ATH",
  "return specialists": "ATH",
  "receivers/tight ends": "WR",
  "kickoff returner": "ATH",
  "punt returner": "ATH",
  placekicker: "K",
  "defensive utility/flex player": "ATH",
  "offensive utility/flex player": "ATH",
  "long snapper": "ATH",
};

function mapAiaPosition(raw: string): string | undefined {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (/conference|player of the year|coach/i.test(key)) return undefined;
  if (AIA_POS[key]) return AIA_POS[key];
  return normalizePosition(raw);
}

export function parseAiaRecognitionsHtml(
  html: string,
  seasonEndYear: number,
  sourceUrl: string,
  tierLabel: string,
): NormalizedPlayerRecord[] {
  const players: NormalizedPlayerRecord[] = [];
  const seen = new Set<string>();

  // Nested </div>s break box-section span matching — extract column triples per group.
  const groupRe =
    /<div class="column recognition-group">([\s\S]*?)(?=<div class="column recognition-group">|$)/gi;
  let g: RegExpExecArray | null;
  while ((g = groupRe.exec(html)) !== null) {
    const chunk = g[1];
    const titleM = chunk.match(/<div class="title">\s*([^<]+)/i);
    const honor = titleM ? titleM[1].replace(/\s+/g, " ").trim() : "";
    if (/coach of the year/i.test(honor)) continue;

    const cols = [...chunk.matchAll(/<div class="column is-4">\s*(?:<div>)?\s*([^<\n]+)/gi)].map(
      (m) => m[1].replace(/\s+/g, " ").trim(),
    );
    for (let i = 0; i + 2 < cols.length; i += 3) {
      const [nameRaw, schoolRaw, posRaw] = [cols[i], cols[i + 1], cols[i + 2]];
      if (!nameRaw || !schoolRaw || /^name$/i.test(nameRaw)) continue;
      if (/^coach$/i.test(posRaw) || /coach/i.test(nameRaw)) continue;
      const name = normalizeName(nameRaw);
      const school = normalizeName(schoolRaw);
      const { firstName, lastName } = splitDisplayName(name);
      if (!firstName || !lastName || school.length < 2) continue;
      const key = `${firstName}|${lastName}|${school}|${seasonEndYear}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({
        firstName,
        lastName,
        position: mapAiaPosition(posRaw),
        schoolName: school,
        stateCode: "AZ",
        seasonYear: seasonEndYear,
        sourceUrl,
        sourceName: AIA_SOURCE_NAME,
        sourceType: "state_association",
        sourceState: "AZ",
        sourceSchool: school,
        raw: { honor, tier: tierLabel, positionRaw: posRaw },
      });
    }
  }
  return players;
}

export async function fetchAiaRecognitions(options?: {
  includeRegions?: boolean;
  years?: AiaYearSpec[];
  /** Delay between requests (ms). Default 10000 to match Crawl-Delay. */
  delayMs?: number;
}): Promise<{ players: NormalizedPlayerRecord[]; errors: string[]; blocked: string[] }> {
  const years = options?.years ?? AIA_DEFAULT_YEARS;
  const delayMs = options?.delayMs ?? 10_000;
  const tiers = [
    ...AIA_CONFERENCE_TIERS,
    ...(options?.includeRegions === false ? [] : AIA_REGION_TIERS),
  ];
  const players: NormalizedPlayerRecord[] = [];
  const errors: string[] = [];
  const blocked: string[] = [];
  const seen = new Set<string>();

  const robotsUrl = `${AIA_BASE}/recognitions/football/6a`;
  const decision = await isUrlAllowed(robotsUrl);
  if (!decision.allowed) {
    blocked.push(`${robotsUrl} (${decision.notes})`);
    return { players, errors, blocked };
  }

  for (const year of years) {
    for (const tier of tiers) {
      const url = `${AIA_BASE}/recognitions/filter?activity=football&tier=${tier.id}&year=${year.yearParam}`;
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
          redirect: "follow",
        });
        if (!res.ok) {
          errors.push(`${url} HTTP ${res.status}`);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        const html = await res.text();
        const parsed = parseAiaRecognitionsHtml(html, year.seasonEndYear, url, tier.label);
        for (const p of parsed) {
          const key = `${p.firstName}|${p.lastName}|${p.schoolName}|${p.seasonYear}`.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          players.push(p);
        }
        await new Promise((r) => setTimeout(r, delayMs));
      } catch (e) {
        errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  return { players, errors, blocked };
}
