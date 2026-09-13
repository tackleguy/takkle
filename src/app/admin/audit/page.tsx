const LOG = [
  { at: "2026-02-11 14:32", action: "score_recompute", target: "player:featured" },
  { at: "2026-02-11 12:01", action: "claim_approved", target: "claim:2" },
  { at: "2026-02-10 09:15", action: "seed_generated", target: "manifest:2026.1" },
];

export default function AdminAuditPage() {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-text-primary">Audit Log</h2>
      <ul className="mt-6 space-y-2">
        {LOG.map((entry) => (
          <li key={entry.at + entry.action} className="rounded-lg border border-border bg-bg-card px-4 py-3 text-sm">
            <span className="text-text-muted">{entry.at}</span>
            <span className="mx-2 text-text-muted">·</span>
            <span className="text-accent">{entry.action}</span>
            <span className="mx-2 text-text-muted">→</span>
            <span className="text-text-secondary">{entry.target}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
