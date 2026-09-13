const MOCK_CLAIMS = [
  { id: "1", player: "John Smith", status: "pending", submitted: "2026-02-10" },
  { id: "2", player: "Marcus Johnson", status: "approved", submitted: "2026-02-09" },
  { id: "3", player: "Tyler Williams", status: "disputed", submitted: "2026-02-08" },
];

export default function AdminClaimsPage() {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-text-primary">Claims</h2>
      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-field text-left text-xs uppercase text-text-muted">
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CLAIMS.map((c) => (
              <tr key={c.id} className="border-b border-border bg-bg-card">
                <td className="px-4 py-3">{c.player}</td>
                <td className="px-4 py-3 capitalize">{c.status}</td>
                <td className="px-4 py-3 text-text-muted">{c.submitted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
