import type { Metadata } from "next";
import { getAllPlayers, getSeedManifest } from "@/lib/players";
import SyntheticNotice from "@/components/ui/SyntheticNotice";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  const manifest = getSeedManifest();
  const players = getAllPlayers();

  const stats = [
    { label: "Total players", value: players.length.toLocaleString() },
    { label: "Schools", value: manifest.schoolCount.toLocaleString() },
    { label: "Pending claims", value: "12" },
    { label: "Open disputes", value: "3" },
  ];

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-text-primary">Overview</h2>
      <SyntheticNotice />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-bg-card p-4">
            <p className="text-xs uppercase text-text-muted">{label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-accent">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-text-muted">
        Seed version {manifest.version} · Generated {new Date(manifest.generatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
