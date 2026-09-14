/**
 * HomeTeamsONLINE (HTO) football roster name + row helpers.
 * Handles "Last, First - Captain" and rejects "Last, Jr" suffix-only rows.
 */

import type { NormalizedPlayerRecord } from "../types";
import {
  classYearFromGrade,
  isJunkPlayerName,
  isPositionCodeSchool,
  normalizeName,
  normalizePosition,
  parseGrade,
  parseRosterDisplayName,
} from "./normalize";

export function parseHtoPlayerName(raw: string): { firstName: string; lastName: string } {
  return parseRosterDisplayName(raw);
}

/** Map HTO Yr / Grade cell → recruiting class year (default fall season year). */
export function mapHtoClassYear(
  yrRaw: string | null | undefined,
  seasonFallYear = 2026,
): number | undefined {
  const raw = normalizeName(yrRaw ?? "");
  if (!raw) return undefined;
  if (/^20(2[7-9]|3[01])$/.test(raw)) return Number(raw);

  const grade = parseGrade(raw);
  if (grade) return classYearFromGrade(grade, seasonFallYear + 1);

  const m = raw.match(
    /\b(Sr|Sen(?:ior)?s?|Jr|Jun(?:ior)?s?|So|Soph(?:omore)?s?|Fr|Frosh|Freshm[ae]n)\b/i,
  );
  if (!m) return undefined;
  const tok = m[1]!.toLowerCase();
  const base = seasonFallYear + 1;
  if (/^sr|^sen/.test(tok)) return base;
  if (/^jr|^jun/.test(tok)) return base + 1;
  if (/^so|^soph/.test(tok)) return base + 2;
  if (/^fr|^fro|^fresh/.test(tok)) return base + 3;
  return undefined;
}

function cleanCell(html: string): string {
  return normalizeName(
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&middot;/gi, "/")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#8217;/g, "'")
      .replace(/&amp;/g, "&"),
  );
}

function cellsFromRow(rowHtml: string): string[] {
  const cells: string[] = [];
  const re = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rowHtml)) !== null) cells.push(cleanCell(m[1]!));
  return cells;
}

export function parseHtoRosterHtml(
  html: string,
  options: {
    sourceUrl: string;
    schoolName: string;
    stateCode: string;
    seasonFallYear?: number;
  },
): NormalizedPlayerRecord[] {
  const seasonFallYear = options.seasonFallYear ?? 2026;
  const schoolName = normalizeName(options.schoolName);
  if (!schoolName || isPositionCodeSchool(schoolName)) return [];

  let header: string[] | null = null;
  const players: NormalizedPlayerRecord[] = [];
  const seen = new Set<string>();

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(html)) !== null) {
    const cells = cellsFromRow(row[1]!);
    if (!cells.length) continue;

    if (!header) {
      if (cells.some((c) => /^(Yr|Year|Grade|Class)$/i.test(c))) {
        header = cells;
      }
      continue;
    }

    const idx = Object.fromEntries(header.map((h, i) => [h.toLowerCase(), i]));
    const nameI = idx.name ?? idx.player;
    const posI = idx.pos ?? idx.position;
    const yrI = idx.yr ?? idx.year ?? idx.grade ?? idx.class;
    if (nameI == null || nameI >= cells.length) continue;

    const { firstName, lastName } = parseHtoPlayerName(cells[nameI]!);
    if (isJunkPlayerName(firstName, lastName)) continue;

    const yrRaw = yrI != null && yrI < cells.length ? cells[yrI] : "";
    const classYear = mapHtoClassYear(yrRaw, seasonFallYear);
    if (!classYear) continue;

    const pos = posI != null && posI < cells.length ? cells[posI] : undefined;
    const key = `${firstName}|${lastName}|${schoolName}|${classYear}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    players.push({
      firstName,
      lastName,
      position: normalizePosition(pos?.replace(/·/g, "/")),
      classYear,
      schoolName,
      stateCode: options.stateCode,
      seasonYear: seasonFallYear,
      sourceUrl: options.sourceUrl,
      sourceName: "HomeTeamsONLINE Football Rosters",
      sourceType: "school_website",
      sourceState: options.stateCode,
      sourceSchool: schoolName,
    });
  }

  return players;
}
