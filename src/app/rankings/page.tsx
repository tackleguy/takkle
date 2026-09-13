import { Suspense } from "react";
import type { Metadata } from "next";
import RankingsFilters from "@/components/rankings/RankingsFilters";
import RankingsTable from "@/components/rankings/RankingsTable";
import SyntheticNotice from "@/components/ui/SyntheticNotice";
import { getRankings } from "@/lib/players";
import type { FootballPosition, RankingScope } from "@/types/recruiting";

export const metadata: Metadata = {
  title: "Rankings",
  description: "National, state, position, and class rankings powered by Tackle Score™.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function RankingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const scope = (params.scope ?? "national") as RankingScope;

  const players = getRankings(
    {
      scope,
      stateCode: params.state,
      position: params.position as FootballPosition | undefined,
      classYear: params.class ? Number(params.class) : undefined,
    },
    50,
  );

  const title =
    scope === "national"
      ? "National Rankings"
      : scope === "state"
        ? `${params.state ?? "FL"} State Rankings`
        : scope === "position"
          ? `${params.position ?? "QB"} Rankings`
          : `Class of ${params.class ?? "2028"} Rankings`;

  return (
    <div className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-text-primary">
          {title}
        </h1>
        <p className="mt-2 text-text-secondary">
          Rankings based on Tackle Score™ — no star ratings.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Rankings coming as player evaluations are completed. Imported roster honor-roll
          players start as Not Yet Rated until film and evaluations exist.
        </p>

        <div className="mt-8">
          <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-bg-card" />}>
            <RankingsFilters />
          </Suspense>
        </div>

        <div className="mt-6">
          <SyntheticNotice />
        </div>

        <div className="mt-6">
          <RankingsTable players={players} />
        </div>
      </div>
    </div>
  );
}
