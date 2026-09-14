/**
 * Provisional Tackle Scores for college FBS/FCS athletes (no film yet).
 * Uses division, conference tier, measurables, and team/roster status as public proxies.
 * Confidence stays "limited" until film evaluations exist.
 */

import type { ScoreConfidence } from "@/types/recruiting";

export const COLLEGE_SCORE_VERSION = "college-provisional-2026.1";
export const COLLEGE_RANKING_VERSION = "college-provisional-2026.1";

/** Power / G5 / FCS conference competition proxies (1–10). */
const CONFERENCE_TIER: Record<string, number> = {
  SEC: 9.6,
  "Big Ten": 9.5,
  "Big 12": 9.2,
  ACC: 9.1,
  "Pac-12": 8.8,
  "American Athletic": 8.2,
  AAC: 8.2,
  "Mountain West": 8.0,
  "Sun Belt": 7.9,
  MAC: 7.7,
  "Conference USA": 7.6,
  "FBS Independents": 8.5,
  Independents: 8.5,
  MVFC: 7.4,
  "Missouri Valley": 7.4,
  "Big Sky": 7.3,
  CAA: 7.2,
  Southern: 7.1,
  Southland: 7.0,
  "Ohio Valley": 6.9,
  OVC: 6.9,
  "United Athletic": 6.9,
  UAC: 6.9,
  Ivy: 6.8,
  Patriot: 6.7,
  Pioneer: 6.6,
  NEC: 6.5,
  SWAC: 6.8,
  MEAC: 6.7,
};

function clamp(v: number): number {
  return Math.round(Math.min(10, Math.max(1, v)) * 10) / 10;
}

export type CollegeScoreInput = {
  division?: string | null;
  conference?: string | null;
  heightInches?: number | null;
  weightLbs?: number | null;
  transferPortalStatus?: string | null;
  position?: string | null;
};

export type CollegeScoreResult = {
  score: number;
  confidence: ScoreConfidence;
  components: Record<string, { score: number; weight: number }>;
};

export function scoreCollegePlayer(p: CollegeScoreInput): CollegeScoreResult {
  const div = (p.division || "").toLowerCase();
  const divisionScore = div === "fbs" ? 8.6 : div === "fcs" ? 7.2 : 7.0;

  const confName = (p.conference || "").trim();
  let conferenceScore = 7.0;
  for (const [key, val] of Object.entries(CONFERENCE_TIER)) {
    if (confName.toLowerCase() === key.toLowerCase() || confName.includes(key)) {
      conferenceScore = val;
      break;
    }
  }

  let athleticism = 6.2;
  if (p.heightInches != null && p.heightInches > 0) {
    if (p.heightInches >= 76) athleticism += 1.4;
    else if (p.heightInches >= 74) athleticism += 1.0;
    else if (p.heightInches >= 72) athleticism += 0.5;
  }
  if (p.weightLbs != null && p.weightLbs > 0) {
    if (p.weightLbs >= 280) athleticism += 0.6;
    else if (p.weightLbs >= 240) athleticism += 0.4;
    else if (p.weightLbs >= 200) athleticism += 0.2;
  }
  athleticism = Math.min(9.5, athleticism);

  const portal = (p.transferPortalStatus || "").toLowerCase();
  let portalSignal = 6.5;
  if (portal === "entered") portalSignal = 7.8;
  else if (portal === "committed") portalSignal = 8.2;
  else if (portal === "enrolled") portalSignal = 7.4;
  else if (portal === "withdrawn") portalSignal = 6.8;

  const parts: Array<[string, number, number]> = [
    ["competition_level", divisionScore, 0.35],
    ["production", conferenceScore, 0.3],
    ["athleticism", athleticism, 0.2],
    ["recruiting_signals", portalSignal, 0.15],
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
