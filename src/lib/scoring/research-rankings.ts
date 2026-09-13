/**
 * Research-informed provisional scoring for honor-roll / association selections.
 *
 * Methodology (position-first, industry-aligned):
 * - Rivals / Prep Redzone style: evaluate within position before national rollups
 * - Film is the primary signal when available; until film exists we do NOT invent it
 * - Association all-state / All-CIF / All-Ohio lists are treated as production +
 *   competition proxies (public, permitted sources only)
 * - State depth tiers reflect historical recruiting volume (TX/CA/FL/GA/OH)
 * - Multi-source appearances boost consistency
 * - Underclass all-state appearances carry a recruiting-signal premium
 *
 * Confidence stays limited/insufficient without film — never fake a film grade.
 */

import {
  computeTackleScore,
  type ScoreInputs,
  type ScoreWeightConfig,
} from "@/lib/scoring/tackle-score";
import type { ScoreConfidence, TackleScoreComponent } from "@/types/recruiting";
import { isRecruitClassYear } from "@/lib/recruiting/class-years";

export const RANKING_VERSION = "research-2026.1";
export const SCORE_VERSION = "research-2026.1";

/** Weights renormalized when film/measurables are absent. */
export const RESEARCH_WEIGHTS_NO_FILM: ScoreWeightConfig = {
  version: SCORE_VERSION,
  filmEvaluation: 0,
  production: 0.35,
  athleticism: 0.1,
  measurables: 0,
  competitionLevel: 0.25,
  consistency: 0.15,
  recruitingSignals: 0.15,
};

const SOURCE_TIER: Record<string, number> = {
  "CIF Southern Section All-CIF Football": 8.4,
  "Cal-Hi Sports All-State Football": 8.6,
  "Texas Sports Writers Association All-State Football": 8.7,
  "Ohio Prep Sports Media Association All-Ohio Football": 8.2,
  "GPB Sports All-State Football": 8.0,
  "Alabama Sports Writers Association All-State Football": 8.1,
};

const STATE_COMPETITION: Record<string, number> = {
  TX: 9.0,
  CA: 8.8,
  FL: 8.7,
  GA: 8.3,
  OH: 8.1,
  AL: 7.9,
  LA: 7.8,
  PA: 7.6,
  NC: 7.5,
  NJ: 7.4,
};

/** Position groups used for apples-to-apples rankings (Rivals-style). */
export const RANKING_POSITIONS = [
  "QB",
  "RB",
  "WR",
  "TE",
  "OL",
  "DL",
  "LB",
  "DB",
  "K",
  "P",
  "ATH",
] as const;

export type RankingPosition = (typeof RANKING_POSITIONS)[number];

export function normalizeRankingPosition(raw: string | null | undefined): RankingPosition {
  if (!raw) return "ATH";
  const p = raw.toUpperCase().trim();
  if (p === "L" || p === "OT" || p === "OG" || p === "OC" || p === "IOL") return "OL";
  if (p === "DE" || p === "DT" || p === "NT" || p === "EDGE") return "DL";
  if (p === "CB" || p === "S" || p === "SAF" || p === "FS" || p === "SS") return "DB";
  if (p === "ILB" || p === "OLB" || p === "MLB") return "LB";
  if ((RANKING_POSITIONS as readonly string[]).includes(p)) return p as RankingPosition;
  return "ATH";
}

export interface ResearchPlayerInput {
  id: string;
  classYear: number | null;
  stateCode: string | null;
  position: string | null;
  sourceName: string | null;
  sourceRefCount?: number;
  heightInches?: number | null;
  weightLbs?: number | null;
}

export interface ResearchScoreResult {
  score: number;
  confidence: ScoreConfidence;
  components: TackleScoreComponent[];
  inputs: ScoreInputs;
  rankingPosition: RankingPosition;
  eligible: boolean;
  reason?: string;
}

function sourceProduction(sourceName: string | null): number {
  if (!sourceName) return 6.5;
  for (const [key, value] of Object.entries(SOURCE_TIER)) {
    if (sourceName.includes(key) || key.includes(sourceName)) return value;
  }
  if (/all[- ]?state/i.test(sourceName)) return 8.0;
  if (/all[- ]?cif|all[- ]?section|all[- ]?ohio/i.test(sourceName)) return 8.2;
  return 6.8;
}

function competitionForState(state: string | null): number {
  if (!state) return 7.0;
  return STATE_COMPETITION[state.toUpperCase()] ?? 7.0;
}

function underclassSignal(classYear: number | null): number {
  if (!classYear) return 5.5;
  // Younger classes on all-state lists are rarer → higher recruiting signal.
  if (classYear >= 2030) return 8.8;
  if (classYear === 2029) return 8.4;
  if (classYear === 2028) return 7.8;
  if (classYear === 2027) return 7.2;
  return 5.5;
}

function consistencyFromRefs(refCount: number | undefined): number {
  const n = refCount ?? 1;
  if (n >= 3) return 8.5;
  if (n === 2) return 7.5;
  return 6.5;
}

function athleticismProxy(heightInches?: number | null, weightLbs?: number | null): number | undefined {
  if (heightInches == null && weightLbs == null) return undefined;
  // Soft frame proxy only — never invent combine numbers.
  let score = 6.0;
  if (heightInches != null) {
    if (heightInches >= 74) score += 1.2;
    else if (heightInches >= 72) score += 0.6;
  }
  if (weightLbs != null) {
    if (weightLbs >= 220) score += 0.5;
    else if (weightLbs >= 190) score += 0.3;
  }
  return Math.min(9.0, score);
}

/**
 * Build provisional Tackle Score™ inputs from permitted association honor rolls.
 * Does not invent film grades.
 */
export function scorePlayerFromResearch(player: ResearchPlayerInput): ResearchScoreResult {
  const rankingPosition = normalizeRankingPosition(player.position);

  if (!isRecruitClassYear(player.classYear)) {
    return {
      score: 1.0,
      confidence: "insufficient",
      components: [],
      inputs: {},
      rankingPosition,
      eligible: false,
      reason: "Outside recruiting classes 2027–2031",
    };
  }

  const inputs: ScoreInputs = {
    production: sourceProduction(player.sourceName),
    competitionLevel: competitionForState(player.stateCode),
    consistency: consistencyFromRefs(player.sourceRefCount),
    recruitingSignals: underclassSignal(player.classYear),
  };

  const ath = athleticismProxy(player.heightInches, player.weightLbs);
  if (ath != null) inputs.athleticism = ath;

  // Renormalize weights over present keys only.
  const present = Object.entries(inputs).filter(([, v]) => v != null) as Array<
    [keyof ScoreInputs, number]
  >;
  const weightMap: Record<string, number> = {
    production: RESEARCH_WEIGHTS_NO_FILM.production,
    athleticism: RESEARCH_WEIGHTS_NO_FILM.athleticism,
    competitionLevel: RESEARCH_WEIGHTS_NO_FILM.competitionLevel,
    consistency: RESEARCH_WEIGHTS_NO_FILM.consistency,
    recruitingSignals: RESEARCH_WEIGHTS_NO_FILM.recruitingSignals,
  };
  const sum = present.reduce((s, [k]) => s + (weightMap[k] ?? 0), 0) || 1;
  const weights: ScoreWeightConfig = {
    version: SCORE_VERSION,
    filmEvaluation: 0,
    production: present.some(([k]) => k === "production")
      ? (weightMap.production ?? 0) / sum
      : 0,
    athleticism: present.some(([k]) => k === "athleticism")
      ? (weightMap.athleticism ?? 0) / sum
      : 0,
    measurables: 0,
    competitionLevel: present.some(([k]) => k === "competitionLevel")
      ? (weightMap.competitionLevel ?? 0) / sum
      : 0,
    consistency: present.some(([k]) => k === "consistency")
      ? (weightMap.consistency ?? 0) / sum
      : 0,
    recruitingSignals: present.some(([k]) => k === "recruitingSignals")
      ? (weightMap.recruitingSignals ?? 0) / sum
      : 0,
  };

  const result = computeTackleScore(inputs, weights);
  // Override confidence: without film, never claim high/medium from honor rolls alone.
  const confidence: ScoreConfidence =
    present.length >= 4 ? "limited" : present.length >= 2 ? "limited" : "insufficient";

  return {
    score: result.score,
    confidence,
    components: result.components,
    inputs,
    rankingPosition,
    eligible: confidence !== "insufficient",
  };
}
