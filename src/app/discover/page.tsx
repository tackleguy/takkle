import { Suspense } from "react";
import type { Metadata } from "next";
import DiscoveryFilters from "@/components/discovery/DiscoveryFilters";
import PlayerCard from "@/components/player/PlayerCard";
import SyntheticNotice from "@/components/ui/SyntheticNotice";
import { searchLivePlayers } from "@/lib/live-players";
import type { FootballPosition } from "@/types/recruiting";

export const metadata: Metadata = {
  title: "Discover Players",
  description:
    "Search NCAA D1 FBS/FCS football athletes and their teams for recruiting and NIL discovery.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const result = await searchLivePlayers(
    {
      query: params.q,
      stateCode: params.state,
      position: params.position as FootballPosition | undefined,
      classYear: params.class ? Number(params.class) : undefined,
      minScore: params.minScore ? Number(params.minScore) : undefined,
    },
    page,
    24,
  );

  return (
    <div className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-text-primary">
          Discover Players
        </h1>
        <p className="mt-2 text-text-secondary max-w-2xl">
          Discover FBS and FCS athletes and their teams — filter by school, position, eligibility
          year, and Tackle Score™.
        </p>

        <div className="mt-8">
          <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-bg-card" />}>
            <DiscoveryFilters />
          </Suspense>
        </div>

        <div className="mt-6">
          <SyntheticNotice forceHide={result.source === "supabase" || result.source === "college"} />
        </div>

        <p className="mt-4 text-sm text-text-muted">
          {result.total.toLocaleString()} players found
          {result.source === "supabase"
            ? " · verified sources"
            : result.source === "college"
              ? " · college roster dump"
              : " · local seed"}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>

        {result.players.length === 0 && (
          <p className="mt-8 text-center text-text-muted">No players match your filters.</p>
        )}
      </div>
    </div>
  );
}
