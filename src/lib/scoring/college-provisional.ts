/**
 * Provisional Tackle Scores for college athletes (no film yet).
 * Uses division, conference tier, measurables, and roster/team status as public proxies.
 * Confidence stays "limited" until film evaluations exist.
 */

import type { ScoreConfidence } from "@/types/recruiting";

export const COLLEGE_SCORE_VERSION = "college-provisional-2026.1";
export const COLLEGE_RANKING_VERSION = "college-provisional-2026.1";

/** Power / G5 / FCS / DII / DIII conference competition proxies (1–10). */
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
  GSC: 5.8,
  GLIAC: 5.7,
  GLVC: 5.7,
  "G-MAC": 5.6,
  MIAA: 5.7,
  NSIC: 5.6,
  PSAC: 5.6,
  "Lone Star": 5.6,
  SAC: 5.5,
  RMAC: 5.5,
  GAC: 5.4,
  GNAC: 5.4,
  NE10: 5.3,
  MEC: 5.3,
  CIAA: 5.2,
  SIAC: 5.2,
  "Conference Carolinas": 5.2,
  "DII Independents": 5.1,
  NESCAC: 4.8,
  WIAC: 4.7,
  MIAC: 4.7,
  CCIW: 4.6,
  OAC: 4.6,
  Centennial: 4.5,
  ODAC: 4.5,
  ASC: 4.4,
  SCIAC: 4.4,
  NCAC: 4.3,
  PAC: 4.3,
  ARC: 4.4,
  CNE: 4.3,
  "Empire 8": 4.3,
  Heartland: 4.3,
  Landmark: 4.3,
  "Liberty League": 4.3,
  NEWMAC: 4.3,
  NJAC: 4.3,
  NACC: 4.2,
  NWC: 4.3,
  SAA: 4.3,
  SCAC: 4.2,
  UMAC: 4.2,
  "USA South": 4.2,
  MSCAC: 4.2,
  Midwest: 4.2,
  "MAC D3": 4.3,
  "MIAA D3": 4.3,
  "DIII Independents": 4.1,
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
  const divisionScore =
    div === "fbs" ? 8.6 : div === "fcs" ? 7.2 : div === "d2" ? 5.8 : div === "d3" ? 4.6 : 7.0;

  const confName = (p.conference || "").trim();
  let conferenceScore =
    div === "d2" ? 5.5 : div === "d3" ? 4.5 : 7.0;
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
