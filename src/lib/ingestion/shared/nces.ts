import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { NormalizedSchoolRecord } from "../types";

export interface NcesSchoolJson {
  id: string;
  name: string;
  slug: string;
  city: string;
  stateCode: string;
  ncesId?: string;
  websiteUrl?: string;
  leaName?: string;
  isSynthetic?: boolean;
  provenance?: {
    sourceName?: string;
    sourceType?: string;
    sourceUrl?: string;
    schoolYear?: string;
    license?: string;
  };
}

/** Load priority-state public HS from local NCES CCD dump (public domain). */
export function loadNcesSchools(
  rootDir: string,
  states: string[] = ["CA", "TX", "FL", "GA", "OH"],
  limitPerState?: number,
): NormalizedSchoolRecord[] {
  const fullPath = join(rootDir, "data/nces/schools.json");
  const samplePath = join(rootDir, "src/data/seed/schools-nces-sample.json");
  const path = existsSync(fullPath) ? fullPath : samplePath;
  if (!existsSync(path)) {
    throw new Error(`NCES schools file not found. Run: npm run import:nces-schools`);
  }

  const raw = JSON.parse(readFileSync(path, "utf8")) as NcesSchoolJson[];
  const stateSet = new Set(states.map((s) => s.toUpperCase()));
  const counts = new Map<string, number>();
  const out: NormalizedSchoolRecord[] = [];

  for (const s of raw) {
    const st = (s.stateCode || "").toUpperCase();
    if (!stateSet.has(st)) continue;
    const n = counts.get(st) ?? 0;
    if (limitPerState != null && n >= limitPerState) continue;
    counts.set(st, n + 1);

    out.push({
      name: s.name,
      stateCode: st,
      city: s.city || undefined,
      ncesId: s.ncesId,
      websiteUrl: s.websiteUrl,
      athleticAssociation: undefined,
      sourceUrl: s.provenance?.sourceUrl || "https://nces.ed.gov/ccd/files.asp",
      sourceName: "NCES Common Core of Data (CCD)",
      sourceType: "nces_ccd",
      isSynthetic: false,
    });
  }

  return out;
}
