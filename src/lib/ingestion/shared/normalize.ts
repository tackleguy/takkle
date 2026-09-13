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

export function splitDisplayName(full: string): { firstName: string; lastName: string } {
  const cleaned = normalizeName(full)
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, (m) => m) // keep suffix on last
    .trim();
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
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
