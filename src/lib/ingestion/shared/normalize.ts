import type {
  DuplicateMatch,
  IngestionRunSummary,
  NormalizedPlayerRecord,
} from "../types";

const POSITION_MAP: Record<string, string> = {
  qb: "QB",
  rb: "RB",
  fb: "RB",
  wr: "WR",
  te: "TE",
  ol: "OL",
  ot: "OL",
  og: "OL",
  c: "OL",
  oc: "OL",
  dl: "DL",
  de: "DL",
  dt: "DL",
  nt: "DL",
  lb: "LB",
  ilb: "LB",
  olb: "LB",
  mlb: "LB",
  db: "DB",
  cb: "DB",
  s: "DB",
  ss: "DB",
  fs: "DB",
  saf: "DB",
  k: "K",
  pk: "K",
  p: "P",
  ath: "ATH",
  util: "ATH",
  mp: "ATH",
};

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

/** Generational / name suffixes that are not first names. */
export const GENERATIONAL_SUFFIX_RE = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;

/**
 * Football position codes (incl. slash compounds like EDGE/ATH, WR/DB).
 * Used to reject position tokens mistaken for school names.
 */
const POSITION_TOKEN =
  "QB|RB|WR|TE|OL|DL|LB|DB|CB|S|K|P|ATH|EDGE|DE|DT|NT|FS|SS|OT|OG|C|OC|FB|HB|SAF|ILB|OLB|MLB|PK|LS|UTL|FLEX|KR|PR|AP|UTILITY";

export const POSITION_CODE_SCHOOL_RE = new RegExp(
  `^(?:${POSITION_TOKEN})(?:\\/(?:${POSITION_TOKEN}))*$`,
  "i",
);

/** True when a school name is actually a position code (e.g. EDGE/ATH). */
export function isPositionCodeSchool(name: string | null | undefined): boolean {
  if (!name) return true;
  const n = normalizeName(name).replace(/\s+/g, "");
  if (n.length < 1) return true;
  return POSITION_CODE_SCHOOL_RE.test(n);
}

/**
 * Reject placeholder / parse-junk player names (ASWA Athlete headers, None., etc.).
 * Requires a real first + last (not generational-suffix-as-first).
 */
export function isJunkPlayerName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): boolean {
  const first = normalizeName(firstName ?? "");
  const last = normalizeName(lastName ?? "");
  if (!first || !last) return true;
  if (first.length < 2 || last.length < 2) return true;
  if (GENERATIONAL_SUFFIX_RE.test(first)) return true;
  const display = `${first} ${last}`;
  if (/^(None\.?\s*)?Athlete\b/i.test(display)) return true;
  if (/^(None\.?\s*)?Athlete\b/i.test(first)) return true;
  if (/^(athlete|none\.?|n\/?a|unknown|null|undefined|player|test|recruit)$/i.test(first)) {
    return true;
  }
  if (/^(athlete|none\.?|n\/?a|unknown|null|undefined|player|test|recruit)$/i.test(last)) {
    return true;
  }
  return false;
}

/**
 * Strip roster role suffixes like " - Captain" before splitting names.
 */
export function stripRosterRoleSuffix(name: string): string {
  return normalizeName(name).replace(
    /\s*[-–—]\s*(Co-?Captains?|Captains?|Managers?|Coaches?|Trainers?|Volunteers?|Staff)\s*$/i,
    "",
  );
}

/**
 * Parse roster display names: "First Last", "Last, First", "Last, First - Captain".
 * Rejects incomplete "Last, Jr" (suffix-only first) as empty names.
 */
export function parseRosterDisplayName(raw: string): { firstName: string; lastName: string } {
  const cleaned = stripRosterRoleSuffix(raw);
  if (!cleaned) return { firstName: "", lastName: "" };

  if (cleaned.includes(",")) {
    const comma = cleaned.indexOf(",");
    const lastPart = cleaned.slice(0, comma).trim();
    const firstPart = cleaned.slice(comma + 1).trim();
    if (!lastPart || !firstPart) return { firstName: "", lastName: "" };
    // "Smith, Jr" → suffix is not a first name
    if (GENERATIONAL_SUFFIX_RE.test(firstPart)) return { firstName: "", lastName: "" };
    const firstBits = firstPart.split(/\s+/).filter(Boolean);
    if (firstBits.length === 0) return { firstName: "", lastName: "" };
    // "Smith, John Jr" → last gets the suffix
    if (firstBits.length > 1 && GENERATIONAL_SUFFIX_RE.test(firstBits[firstBits.length - 1]!)) {
      const suffix = firstBits[firstBits.length - 1]!;
      const given = firstBits.slice(0, -1).join(" ");
      return {
        firstName: normalizeName(given),
        lastName: normalizeName(`${lastPart} ${suffix}`),
      };
    }
    return { firstName: normalizeName(firstPart), lastName: normalizeName(lastPart) };
  }

  return splitDisplayName(cleaned);
}

export function splitDisplayName(full: string): { firstName: string; lastName: string } {
  const cleaned = stripRosterRoleSuffix(full);
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: parts[0]! };
  // Prefer real given name — don't let "Jr Smith" style stand (caller should use parseRosterDisplayName for Last, First)
  if (GENERATIONAL_SUFFIX_RE.test(parts[0]!)) return { firstName: "", lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export function normalizePosition(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const primary = raw.split(/[/,]/)[0]?.trim().toLowerCase();
  if (!primary) return undefined;
  return POSITION_MAP[primary] ?? primary.toUpperCase().slice(0, 3);
}

/** Convert HS grade (9-12) + season end year → recruiting class year. */
export function classYearFromGrade(grade: number, seasonEndYear: number): number {
  const yearsLeft = 12 - grade;
  return seasonEndYear + Math.max(0, yearsLeft);
}

/** Active recruiting classes only — never ingest alumni / null class years. */
export const RECRUIT_CLASS_MIN = 2027;
export const RECRUIT_CLASS_MAX = 2031;

export function isRecruitClassYear(year: number | null | undefined): boolean {
  return year != null && year >= RECRUIT_CLASS_MIN && year <= RECRUIT_CLASS_MAX;
}

/** Drop players outside class 2027–2031 (requires a known classYear). */
export function filterRecruitClassPlayers<T extends { classYear?: number | null }>(
  players: T[],
): T[] {
  return players.filter((p) => isRecruitClassYear(p.classYear ?? null));
}

export function parseGrade(raw?: string | number | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/\D/g, ""));
  if (!Number.isFinite(n) || n < 9 || n > 12) return undefined;
  return n;
}

export function schoolKey(name: string, stateCode: string): string {
  return `${slugify(name)}|${stateCode.toUpperCase()}`;
}

export function scoreDuplicateMatch(
  a: NormalizedPlayerRecord,
  b: NormalizedPlayerRecord,
): DuplicateMatch {
  const signals: string[] = [];
  const norm = (s: string) => s.trim().toLowerCase();

  if (norm(a.firstName) === norm(b.firstName) && norm(a.lastName) === norm(b.lastName)) {
    signals.push("name");
  }
  if (norm(a.schoolName) === norm(b.schoolName) && a.stateCode === b.stateCode) {
    signals.push("school");
  }
  if (a.classYear && b.classYear && a.classYear === b.classYear) {
    signals.push("class");
  }
  if (a.position && b.position && a.position === b.position) {
    signals.push("position");
  }
  if (a.jerseyNumber != null && a.jerseyNumber === b.jerseyNumber) {
    signals.push("jersey");
  }
  if (a.seasonYear && b.seasonYear && a.seasonYear === b.seasonYear) {
    signals.push("season");
  }

  if (signals.includes("name") && signals.includes("school") && signals.includes("class")) {
    return { confidence: "high", signals };
  }
  if (signals.includes("name") && (signals.includes("school") || signals.includes("class"))) {
    return { confidence: "medium", signals };
  }
  return { confidence: "low", signals };
}

export function shouldAutoMerge(match: DuplicateMatch): boolean {
  return match.confidence === "high";
}

export function emptyRunSummary(
  adapterKey: string,
  stateCode?: string,
): IngestionRunSummary {
  return {
    adapterKey,
    stateCode,
    schoolsDiscovered: 0,
    schoolsImported: 0,
    playersDiscovered: 0,
    playersImported: 0,
    duplicatesDetected: 0,
    playersRequiringReview: 0,
    sourcesFailing: 0,
    stoppedAtCap: false,
    errors: [],
    blockedSources: [],
  };
}
