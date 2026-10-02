import { formatTackleScore, confidenceLabel } from "@/lib/scoring/tackle-score";
import type { ScoreConfidence } from "@/types/recruiting";

interface TackleScoreDisplayProps {
  score: number | null | undefined;
  confidence?: ScoreConfidence;
  size?: "sm" | "md" | "lg" | "hero";
  showLabel?: boolean;
}

const sizes = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-6xl",
  hero: "text-7xl sm:text-8xl",
};

export default function TackleScoreDisplay({
  score,
  confidence,
  size = "md",
  showLabel = true,
}: TackleScoreDisplayProps) {
  const hasScore = typeof score === "number" && Number.isFinite(score) && score >= 1;
  return (
    <div className="flex flex-col items-start">
      {showLabel && (
        <span className="text-xs uppercase tracking-[0.2em] text-text-muted mb-1">
          Tackle Score™
        </span>
      )}
      <div className="flex items-baseline gap-1">
        <span
          className={hasScore ? `font-[family-name:var(--font-display)] leading-none text-accent ${sizes[size]}` : "text-sm text-text-secondary"}
        >
          {hasScore ? formatTackleScore(score) : "Not yet scored"}
        </span>
        {hasScore ? (
          <span className="text-sm text-text-muted">/10</span>
        ) : null}
      </div>
      {confidence && hasScore ? (
        <span className="mt-1 text-xs text-text-muted">{confidenceLabel(confidence)}</span>
      ) : null}
    </div>
  );
}
