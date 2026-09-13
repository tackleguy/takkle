import { DEFAULT_WEIGHTS } from "@/lib/scoring/tackle-score";

export default function AdminScoresPage() {
  const weights = Object.entries(DEFAULT_WEIGHTS).filter(([k]) => k !== "version");

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-text-primary">Score Weights</h2>
      <p className="mt-1 text-sm text-text-muted">Version {DEFAULT_WEIGHTS.version}</p>
      <div className="mt-6 space-y-3 max-w-md">
        {weights.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-bg-card px-4 py-3">
            <span className="text-sm capitalize text-text-secondary">{key.replace(/([A-Z])/g, " $1")}</span>
            <span className="text-accent font-medium">{((value as number) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
