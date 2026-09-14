import Badge from "./Badge";
import seedManifest from "@/data/seed/manifest.json";
import cfbdManifest from "@/data/seed/players-cfbd-manifest.json";

function showingSyntheticData(): boolean {
  const source = (
    process.env.NEXT_PUBLIC_TAKKLE_PLAYERS_SOURCE ||
    process.env.TAKKLE_PLAYERS_SOURCE ||
    ""
  ).toLowerCase();

  // Live Supabase / explicit non-demo modes
  if (source === "supabase" || source === "live") return false;
  if (source === "cfbd") return Boolean(cfbdManifest.isSynthetic);

  // Default seed is synthetic demo data unless env opts into something else.
  if (!source || source === "synthetic" || source === "seed") {
    return Boolean(seedManifest.isSynthetic);
  }
  return Boolean(seedManifest.isSynthetic);
}

export default function SyntheticNotice({
  compact = false,
  forceHide = false,
}: {
  compact?: boolean;
  /** When true, live data is already loaded — never show the demo banner. */
  forceHide?: boolean;
}) {
  if (forceHide || !showingSyntheticData()) return null;

  if (compact) {
    return <Badge tone="warning">Demo data</Badge>;
  }

  return (
    <div className="rounded-lg border border-status-limited/30 bg-status-limited/5 px-4 py-3 text-sm text-text-secondary">
      <span className="font-medium text-status-limited">Synthetic demo data</span>
      {" — "}
      Profiles and stats shown here are generated for UI preview. Set{" "}
      <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> /{" "}
      <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
      <code className="text-xs">TAKKLE_PLAYERS_SOURCE=supabase</code> to load verified recruits.
    </div>
  );
}
