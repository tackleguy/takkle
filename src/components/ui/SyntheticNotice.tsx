import Badge from "./Badge";
import seedManifest from "@/data/seed/manifest.json";
import cfbdManifest from "@/data/seed/players-cfbd-manifest.json";

function showingSyntheticData(): boolean {
  const source = (
    process.env.NEXT_PUBLIC_TAKKLE_PLAYERS_SOURCE ||
    process.env.TAKKLE_PLAYERS_SOURCE ||
    "synthetic"
  ).toLowerCase();
  if (source === "cfbd") return Boolean(cfbdManifest.isSynthetic);
  return Boolean(seedManifest.isSynthetic);
}

export default function SyntheticNotice({ compact = false }: { compact?: boolean }) {
  if (!showingSyntheticData()) return null;

  if (compact) {
    return <Badge tone="warning">Demo data</Badge>;
  }

  return (
    <div className="rounded-lg border border-status-limited/30 bg-status-limited/5 px-4 py-3 text-sm text-text-secondary">
      <span className="font-medium text-status-limited">Synthetic demo data</span>
      {" — "}
      Profiles and stats shown here are generated for UI preview. Connect Supabase to
      load verified player records.
    </div>
  );
}
