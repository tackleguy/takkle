import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import CsvImportPanel from "@/components/admin/CsvImportPanel";

export const dynamic = "force-dynamic";

async function getIngestionStats() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = await createClient();
  if (!supabase) return null;

  // Prefer takkle schema when exposed; fall back gracefully
  const client = supabase.schema("takkle");

  const [
    schoolsRes,
    playersRes,
    byStateRes,
    runsRes,
    sourcesRes,
    dupesRes,
    reviewRes,
  ] = await Promise.all([
    client.from("schools").select("*", { count: "exact", head: true }),
    client.from("players").select("*", { count: "exact", head: true }).eq("is_synthetic", false),
    client.from("players").select("state_code"),
    client
      .from("ingestion_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    client.from("data_sources").select("*").order("name"),
    client
      .from("player_duplicate_candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    client
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "unverified"),
  ]);

  const stateCounts: Record<string, number> = {};
  for (const row of byStateRes.data || []) {
    const st = row.state_code || "??";
    stateCounts[st] = (stateCounts[st] || 0) + 1;
  }

  return {
    schools: schoolsRes.count ?? 0,
    players: playersRes.count ?? 0,
    stateCounts,
    runs: runsRes.data || [],
    sources: sourcesRes.data || [],
    duplicatesPending: dupesRes.count ?? 0,
    reviewQueue: reviewRes.count ?? 0,
    error: schoolsRes.error?.message || playersRes.error?.message || null,
  };
}

const PRIORITY = ["CA", "TX", "FL", "GA", "OH"];

export default async function AdminIngestionPage() {
  const stats = await getIngestionStats();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-text-primary">
          Ingestion
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Permitted sources only (NCES school directories, state-association public honor rolls,
          school/CSV submissions). Commercial aggregators blocked by robots/ToS are marked inactive.
        </p>
      </div>

      {!stats ? (
        <p className="rounded-xl border border-border bg-bg-card p-4 text-sm text-text-muted">
          Supabase is not configured in this environment. Run{" "}
          <code className="text-accent">npm run ingest:permitted</code> locally, then apply with{" "}
          <code className="text-accent">npm run ingest:apply</code>.
        </p>
      ) : stats.error ? (
        <p className="rounded-xl border border-border bg-bg-card p-4 text-sm text-amber-200">
          Could not query <code>takkle</code> schema via Data API ({stats.error}). Ensure the{" "}
          <code>takkle</code> schema is exposed in Supabase API settings. DB counts may still be
          correct in SQL.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Schools in DB", value: stats?.schools ?? "—" },
          { label: "Real players", value: stats?.players ?? "—" },
          { label: "Duplicates pending", value: stats?.duplicatesPending ?? "—" },
          { label: "Review queue", value: stats?.reviewQueue ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-accent">
              {value}
            </p>
          </div>
        ))}
      </div>

      <section>
        <h3 className="text-lg text-text-primary">Priority states</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-5">
          {PRIORITY.map((st) => (
            <div key={st} className="rounded-xl border border-border bg-bg-card p-3">
              <p className="text-xs text-text-muted">{st}</p>
              <p className="font-[family-name:var(--font-display)] text-xl text-text-primary">
                {stats?.stateCounts?.[st] ?? 0}
              </p>
              <p className="text-[11px] text-text-muted">players</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg text-text-primary">Data sources</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-bg-card text-xs uppercase text-text-muted">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Permission</th>
                <th className="px-3 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.sources || []).map((s: Record<string, unknown>) => (
                <tr key={String(s.id)} className="border-t border-border">
                  <td className="px-3 py-2 text-text-primary">{String(s.name)}</td>
                  <td className="px-3 py-2 text-text-secondary">{String(s.source_type)}</td>
                  <td className="px-3 py-2 text-text-secondary">{String(s.state_code || "—")}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {String(s.permission_status || "unknown")}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {s.active === false || s.is_active === false ? "no" : "yes"}
                  </td>
                </tr>
              ))}
              {!stats?.sources?.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-text-muted">
                    No sources loaded via API.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-lg text-text-primary">Recent runs</h3>
        <ul className="mt-3 space-y-2">
          {(stats?.runs || []).map((run: Record<string, unknown>) => (
            <li
              key={String(run.id)}
              className="rounded-xl border border-border bg-bg-card px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-text-primary">{String(run.adapter_key || "run")}</span>
                <span className="text-text-muted">{String(run.status)}</span>
              </div>
              <p className="mt-1 text-text-secondary">
                Schools discovered {String(run.schools_discovered)} · Players imported{" "}
                {String(run.players_imported)} · Dupes {String(run.duplicates_detected)}
              </p>
              {run.error_summary ? (
                <p className="mt-1 text-xs text-amber-200/90">{String(run.error_summary)}</p>
              ) : null}
            </li>
          ))}
          {!stats?.runs?.length && (
            <li className="text-sm text-text-muted">No ingestion runs recorded yet.</li>
          )}
        </ul>
      </section>

      <CsvImportPanel />

      <section className="rounded-xl border border-border bg-bg-card p-4 text-sm text-text-secondary">
        <h3 className="text-text-primary">CLI</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            <code className="text-accent">npm run ingest:permitted -- --states CA,TX,FL,GA,OH</code>
          </li>
          <li>
            <code className="text-accent">
              SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run ingest:apply -- &lt;run-dir&gt;
            </code>
          </li>
        </ol>
      </section>
    </div>
  );
}
