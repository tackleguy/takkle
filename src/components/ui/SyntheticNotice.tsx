import Badge from "./Badge";
import seedManifest from "@/data/seed/manifest.json";
import cfbdManifest from "@/data/seed/players-cfbd-manifest.json";
import collegeManifest from "@/data/seed/players-college-manifest.json";

function showingSyntheticData(): boolean {
  const source = (
    process.env.NEXT_PUBLIC_TAKKLE_PLAYERS_SOURCE ||
    process.env.TAKKLE_PLAYERS_SOURCE ||
    "college"
  ).toLowerCase();

  if (source === "supabase" || source === "live" || source === "college") {
    return false;
  }
  if (source === "cfbd") return Boolean(cfbdManifest.isSynthetic);

  if (source === "synthetic" || source === "seed") {
    return Boolean(seedManifest.isSynthetic);
  }
  return Boolean(collegeManifest.isSynthetic);
}

export default function SyntheticNotice({
  compact = false,
  forceHide = false,
}: {
  compact?: boolean;
  /** When true, live/college data is already loaded — never show the demo banner. */
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
      Profiles shown here are generated for UI preview. Real FBS/FCS athletes load from{" "}
      <code className="text-xs">data/college/</code> or Supabase when configured.
    </div>
  );
}
