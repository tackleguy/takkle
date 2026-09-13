/**
 * Cal-Hi Sports public All-State football honor pages (media).
 * robots.txt allows crawling with crawl-delay; skip Gold Club / paywalled posts.
 * https://www.calhisports.com/cal-hi-sports-archives/
 */

import { isUrlAllowed, USER_AGENT } from "../shared/robots";
import {
  classYearFromGrade,
  normalizeName,
  normalizePosition,
  splitDisplayName,
} from "../shared/normalize";
import type { NormalizedPlayerRecord } from "../types";

export const CALHISPORTS_SOURCE_NAME = "Cal-Hi Sports All-State Football";

export interface CalHiListSpec {
  seasonEndYear: number;
  url: string;
  label: string;
}

/**
 * Public (non–Gold Club) pages only.
 * Only seasons that can still yield class 2027+ underclassmen (seasonEnd ≥ 2024).
 * 2nd/3rd-team posts are often paywalled and are omitted.
 */
export const CALHISPORTS_DEFAULT_LISTS: CalHiListSpec[] = [
  {
    seasonEndYear: 2026,
    label: "2025 1st team offense",
    url: "https://www.calhisports.com/2026/02/06/all-state-fb-2025-1st-team-offense/",
  },
  {
    seasonEndYear: 2026,
    label: "2025 1st team defense",
    url: "https://www.calhisports.com/2026/02/06/all-state-fb-2025-1st-team-defense/",
  },
  {
    seasonEndYear: 2026,
    label: "2025 medium schools",
    url: "https://www.calhisports.com/2026/01/31/all-state-fb-2025-medium-schools/",
  },
  {
    seasonEndYear: 2025,
    label: "2024 1st team offense",
    url: "https://www.calhisports.com/2025/02/09/all-state-fb-2024-1st-team-offense/",
  },
  {
    seasonEndYear: 2025,
    label: "2024 1st team defense",
    url: "https://www.calhisports.com/2025/02/09/all-state-fb-2024-1st-team-defense/",
  },
  {
    seasonEndYear: 2025,
    label: "2024 medium schools",
    url: "https://www.calhisports.com/2025/02/05/all-state-fb-2024-medium-schools/",
  },
  {
    seasonEndYear: 2024,
    label: "2023 1st team offense",
    url: "https://www.calhisports.com/2024/02/03/all-state-fb-2023-1st-team-offense/",
  },
  {
    seasonEndYear: 2024,
    label: "2023 1st team defense",
    url: "https://www.calhisports.com/2024/02/03/all-state-fb-2023-1st-team-defense/",
  },
  {
    seasonEndYear: 2024,
    label: "2023 medium schools",
    url: "https://www.calhisports.com/2024/01/27/all-state-fb-2023-medium-schools/",
  },
];

const GRADE_MAP: Record<string, number> = {
  sr: 12,
  senior: 12,
  jr: 11,
  junior: 11,
  so: 10,
  soph: 10,
  sophomore: 10,
  fr: 9,
  freshman: 9,
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCalHiSportsHtml(
  html: string,
  spec: CalHiListSpec,
): NormalizedPlayerRecord[] {
  if (/Gold Club members only|This is a post for our Gold Club/i.test(html)) {
    return [];
  }
  const text = stripHtml(html);
  const players: NormalizedPlayerRecord[] = [];
  const seen = new Set<string>();

  // "QB Luke Fahey (Mission Viejo) 6-0, 185, Sr."
  const detailed =
    /(?:^|[.\s])([A-Z]{1,4}|Quarterback|Running Back|Wide Receiver|Tight End|Linebacker|Cornerback|Safety|Kicker|Punter|Athlete|OL|DL|DB|LB|RB|WR|TE|QB)\s+([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+)\s+\(([^)]+)\)\s+(?:\d-\d{1,2},\s*)?(?:\d{2,3},\s*)?(Sr|Jr|So|Fr|Senior|Junior|Sophomore|Freshman)\.?/gi;

  let m: RegExpExecArray | null;
  while ((m = detailed.exec(text)) !== null) {
    add(players, seen, m[2], m[3], m[1], m[4], spec);
  }

  // Fallback: "Name (School)" near class tokens — medium-school list style
  const loose =
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+)\s+\(([^)]{3,50})\)(?:\s*,?\s*(?:\d-\d{1,2})?(?:\s*,?\s*\d{2,3})?\s*,?\s*(Sr|Jr|So|Fr|Senior|Junior|Soph\.?|Sophomore|Freshman))?/g;
  while ((m = loose.exec(text)) !== null) {
    if (/click here|cal-hi|photo|gold club|follow @/i.test(m[0])) continue;
    if (/^[A-Z]{2,4}$/.test(m[1])) continue;
    add(players, seen, m[1], m[2], undefined, m[3], spec);
  }

  return players;
}

function add(
  players: NormalizedPlayerRecord[],
  seen: Set<string>,
  nameRaw: string,
  schoolRaw: string,
  positionRaw: string | undefined,
  classToken: string | undefined,
  spec: CalHiListSpec,
) {
  const name = normalizeName(nameRaw);
  const school = normalizeName(schoolRaw.replace(/,.*$/, "").trim());
  const { firstName, lastName } = splitDisplayName(name);
  if (!firstName || !lastName || school.length < 2) return;
  if (/coach|player of the year|click/i.test(name)) return;

  const grade = classToken
    ? GRADE_MAP[classToken.toLowerCase().replace(/\./g, "")]
    : undefined;
  const classYear = grade ? classYearFromGrade(grade, spec.seasonEndYear) : undefined;
  const key = `${firstName}|${lastName}|${school}|${spec.seasonEndYear}`.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);

  players.push({
    firstName,
    lastName,
    position: normalizePosition(positionRaw),
    classYear,
    gradeLevel: grade,
    schoolName: school,
    stateCode: "CA",
    seasonYear: spec.seasonEndYear,
    sourceUrl: spec.url,
    sourceName: CALHISPORTS_SOURCE_NAME,
    sourceType: "media_public",
    sourceState: "CA",
    sourceSchool: school,
    raw: { label: spec.label, classToken, positionRaw },
  });
}

export async function fetchCalHiSportsPlayers(
  lists: CalHiListSpec[] = CALHISPORTS_DEFAULT_LISTS,
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
      if (/Gold Club members only|This is a post for our Gold Club/i.test(html)) {
        blocked.push(`${spec.url} (Cal-Hi Sports Gold Club paywall)`);
        continue;
      }
      const parsed = parseCalHiSportsHtml(html, spec);
      if (parsed.length === 0) errors.push(`${spec.url} parsed 0 players`);
      players.push(...parsed);
      await new Promise((r) => setTimeout(r, 1000)); // crawl-delay 10 is heavy; be polite
    } catch (e) {
      errors.push(`${spec.url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { players, errors, blocked };
}
