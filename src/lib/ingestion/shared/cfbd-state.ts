/**
 * Optional CFBD recruiting pull for permitted licensed prospects.
 * Requires CFBD_API_KEY. Does not fabricate data; returns empty when unavailable.
 */

import type { NormalizedPlayerRecord } from "../types";
import {
  normalizeName,
  normalizePosition,
  splitDisplayName,
} from "./normalize";

const API = "https://api.collegefootballdata.com/recruiting/players";
const SOURCE_NAME = "CollegeFootballData Recruiting";

export async function fetchCfbdRecruitsForStates(
  states: string[],
  options?: { rootDir?: string; years?: number[] },
): Promise<{ players: NormalizedPlayerRecord[]; errors: string[]; note?: string }> {
  const key = process.env.CFBD_API_KEY;
  if (!key) {
    return {
      players: [],
      errors: [],
      note: "CFBD_API_KEY not set — skipping licensed recruit import (CSV / association lists only).",
    };
  }

  const years = options?.years ?? [2027, 2028, 2029, 2030, 2031];
  const want = new Set(states.map((s) => s.toUpperCase()));
  const players: NormalizedPlayerRecord[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const year of years) {
    try {
      const url = new URL(API);
      url.searchParams.set("year", String(year));
      url.searchParams.set("classification", "HighSchool");
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          "User-Agent": "TakkleIngestionBot/1.0 (+https://takkle.com; CFBD licensed)",
        },
      });
      if (!res.ok) {
        errors.push(`CFBD ${year} HTTP ${res.status}`);
        continue;
      }
      const rows = (await res.json()) as Array<Record<string, unknown>>;
      for (const rec of rows) {
        const stateCode = String(rec.stateProvince || rec.state_province || "").toUpperCase();
        if (!want.has(stateCode)) continue;
        const name = normalizeName(String(rec.name || ""));
        const { firstName, lastName } = splitDisplayName(name);
        const schoolName = normalizeName(String(rec.school || rec.highSchool || ""));
        if (!firstName || !lastName || !schoolName) continue;
        const keyId = `${firstName}|${lastName}|${schoolName}|${year}`.toLowerCase();
        if (seen.has(keyId)) continue;
        seen.add(keyId);
        players.push({
          firstName,
          lastName,
          position: normalizePosition(String(rec.position || "")),
          classYear: Number(rec.year) || year,
          schoolName,
          city: rec.city ? String(rec.city) : undefined,
          stateCode,
          seasonYear: year,
          sourceUrl: `https://collegefootballdata.com/recruiting/players?year=${year}`,
          sourceName: SOURCE_NAME,
          sourceType: "licensed",
          sourceState: stateCode,
          sourceSchool: schoolName,
          raw: { cfbdId: rec.id, stars: rec.stars },
        });
      }
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {
      errors.push(`CFBD ${year}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { players, errors };
}
