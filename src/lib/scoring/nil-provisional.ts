/**
 * Provisional NIL Score for college FBS/FCS athletes.
 * Marketability proxy from division, conference reach, position visibility,
 * and team/roster signals — not deal dollars. Confidence stays limited until
 * verified social / deal data exists.
 */

import type { ScoreConfidence } from "@/types/recruiting";

export const NIL_SCORE_VERSION = "nil-provisional-2026.1";

/** Conference brand / TV reach proxies (1–10). */
const CONFERENCE_REACH: Record<string, number> = {
  SEC: 9.7,
  "Big Ten": 9.6,
  "Big 12": 9.1,
  ACC: 9.0,
  "Pac-12": 8.6,
  "American Athletic": 7.8,
  AAC: 7.8,
  "Mountain West": 7.5,
  "Sun Belt": 7.3,
  MAC: 7.1,
  "Conference USA": 7.0,
  "FBS Independents": 8.4,
  Independents: 8.4,
  MVFC: 6.8,
  "Missouri Valley": 6.8,
  "Big Sky": 6.7,
  CAA: 6.6,
  Southern: 6.5,
  Southland: 6.4,
  "Ohio Valley": 6.3,
  OVC: 6.3,
  SWAC: 7.2,
  MEAC: 6.9,
  Ivy: 7.0,
};

/** Skill / high-visibility positions tend to attract more NIL interest. */
const POSITION_VISIBILITY: Record<string, number> = {
  QB: 9.4,
  WR: 8.8,
  RB: 8.4,
  TE: 7.6,
  CB: 7.4,
  S: 7.2,
  LB: 7.0,
  EDGE: 7.1,
  DL: 6.8,
  OL: 6.4,
  OT: 6.5,
  IOL: 6.3,
  K: 6.2,
  P: 6.0,
  LS: 5.8,
  ATH: 7.5,
};

function clamp(v: number): number {
  return Math.round(Math.min(10, Math.max(1, v)) * 10) / 10;
}

export type NilScoreInput = {
  division?: string | null;
  conference?: string | null;
  position?: string | null;
  transferPortalStatus?: string | null;
  collegeName?: string | null;
};

export type NilScoreResult = {
  score: number;
  confidence: ScoreConfidence;
  components: Record<string, { score: number; weight: number }>;
};

export function scoreNilMarketability(p: NilScoreInput): NilScoreResult {
  const div = (p.division || "").toLowerCase();
  const divisionScore = div === "fbs" ? 8.8 : div === "fcs" ? 7.0 : 6.8;

  const confName = (p.conference || "").trim();
  let reach = 6.8;
  for (const [key, val] of Object.entries(CONFERENCE_REACH)) {
    if (confName.toLowerCase() === key.toLowerCase() || confName.includes(key)) {
      reach = val;
      break;
    }
  }

  const pos = (p.position || "ATH").toUpperCase();
  const positionScore = POSITION_VISIBILITY[pos] ?? 7.0;

  const teamSignal = (p.transferPortalStatus || "").toLowerCase();
  let teamMobility = 6.6;
  if (teamSignal === "entered") teamMobility = 7.9;
  else if (teamSignal === "committed") teamMobility = 8.3;
  else if (teamSignal === "enrolled") teamMobility = 7.5;
  else if (teamSignal === "withdrawn") teamMobility = 6.9;
  else if (p.collegeName) teamMobility = 7.2;

  const parts: Array<[string, number, number]> = [
    ["market_reach", reach, 0.35],
    ["competition_level", divisionScore, 0.25],
    ["position_visibility", positionScore, 0.25],
    ["team_signals", teamMobility, 0.15],
  ];

  const wSum = parts.reduce((s, [, , w]) => s + w, 0);
  let weighted = 0;
  const components: Record<string, { score: number; weight: number }> = {};
  for (const [key, val, w] of parts) {
    const nw = w / wSum;
    weighted += val * nw;
    components[key] = { score: clamp(val), weight: Math.round(nw * 10000) / 10000 };
  }

  return {
    score: clamp(weighted),
    confidence: "limited",
    components,
  };
}

export function formatNilScore(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return "—";
  return score.toFixed(1);
}
