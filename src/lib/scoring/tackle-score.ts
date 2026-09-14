import type { ScoreConfidence, TackleScoreComponent } from "@/types/recruiting";

export interface ScoreWeightConfig {
  version: string;
  filmEvaluation: number;
  production: number;
  athleticism: number;
  measurables: number;
  competitionLevel: number;
  consistency: number;
  recruitingSignals: number;
}

export const DEFAULT_WEIGHTS: ScoreWeightConfig = {
  version: "2026.1",
  filmEvaluation: 0.25,
  production: 0.2,
  athleticism: 0.2,
  measurables: 0.1,
  competitionLevel: 0.1,
  consistency: 0.1,
  recruitingSignals: 0.05,
};

export interface ScoreInputs {
  filmEvaluation?: number;
  production?: number;
  athleticism?: number;
  measurables?: number;
  competitionLevel?: number;
  consistency?: number;
  recruitingSignals?: number;
}

const COMPONENT_LABELS: Record<keyof Omit<ScoreWeightConfig, "version">, string> = {
  filmEvaluation: "Film Evaluation",
  production: "Production",
  athleticism: "Athleticism",
  measurables: "Measurables",
  competitionLevel: "Competition Level",
  consistency: "Consistency",
  recruitingSignals: "Recruiting Signals",
};

function clampScore(value: number): number {
  return Math.round(Math.min(10, Math.max(1, value)) * 10) / 10;
}

export function computeConfidence(
  inputs: ScoreInputs,
  componentCount: number,
): ScoreConfidence {
  const filled = Object.values(inputs).filter((v) => v != null).length;
  const ratio = filled / componentCount;

  if (ratio >= 0.85 && (inputs.filmEvaluation ?? 0) >= 5) return "high";
  if (ratio >= 0.6) return "medium";
  if (ratio >= 0.35) return "limited";
  return "insufficient";
}

export function computeTackleScore(
  inputs: ScoreInputs,
  weights: ScoreWeightConfig = DEFAULT_WEIGHTS,
): { score: number; confidence: ScoreConfidence; components: TackleScoreComponent[] } {
  const entries: Array<{
    key: keyof Omit<ScoreWeightConfig, "version">;
    weight: number;
    inputKey: keyof ScoreInputs;
  }> = [
    { key: "filmEvaluation", weight: weights.filmEvaluation, inputKey: "filmEvaluation" },
    { key: "production", weight: weights.production, inputKey: "production" },
    { key: "athleticism", weight: weights.athleticism, inputKey: "athleticism" },
    { key: "measurables", weight: weights.measurables, inputKey: "measurables" },
    { key: "competitionLevel", weight: weights.competitionLevel, inputKey: "competitionLevel" },
    { key: "consistency", weight: weights.consistency, inputKey: "consistency" },
    { key: "recruitingSignals", weight: weights.recruitingSignals, inputKey: "recruitingSignals" },
  ];

  const components: TackleScoreComponent[] = entries.map(({ key, weight, inputKey }) => ({
    key: key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, ""),
    label: COMPONENT_LABELS[key],
    score: clampScore(inputs[inputKey] ?? 5),
    weight,
  }));

  const weighted = components.reduce((sum, c) => sum + c.score * c.weight, 0);
  const score = clampScore(weighted);
  const confidence = computeConfidence(inputs, entries.length);

  return { score, confidence, components };
}

export function formatTackleScore(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return "—";
  return score.toFixed(1);
}

export function confidenceLabel(confidence: ScoreConfidence): string {
  const labels: Record<ScoreConfidence, string> = {
    high: "High confidence",
    medium: "Medium confidence",
    limited: "Limited data",
    insufficient: "Insufficient data",
  };
  return labels[confidence];
}
