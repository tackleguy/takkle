import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import RankingsFilters from "@/components/rankings/RankingsFilters";
import NilScoresTable from "@/components/nil/NilScoresTable";
import { getNilRankings } from "@/lib/nil-rankings";
import type { FootballPosition, RankingScope } from "@/types/recruiting";

export const metadata: Metadata = {
  title: "NIL Scores",
  description:
    "Provisional NIL Scores for FBS/FCS athletes and their teams — marketability proxies for business discovery.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function NilScoresPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawScope = params.scope ?? "national";
  const scope = (rawScope === "state" ? "national" : rawScope) as RankingScope;
  const classYearRaw = params.class ? Number(params.class) : undefined;
  const classYear =
    classYearRaw && Number.isFinite(classYearRaw) ? classYearRaw : undefined;
  const position = (params.position ?? "QB") as FootballPosition;

  const { rows, source, version } = await getNilRankings(
    {
      scope,
      position: scope === "position" ? position : undefined,
      classYear: scope === "position" || scope === "class" ? classYear : undefined,
    },
    50,
  );

  const title =
    scope === "national"
      ? "National NIL Scores"
      : scope === "class"
        ? `Eligibility ${classYear} NIL Scores`
        : `${position} NIL Scores · College`;

  return (
    <div className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 text-sm text-text-muted" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-accent transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="text-text-secondary">NIL Scores</li>
          </ol>
        </nav>

        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-text-primary">
          {title}
        </h1>
        <p className="mt-2 text-text-secondary max-w-2xl">
          Provisional NIL Scores for FBS and FCS athletes and their teams — built for business
          discovery. Not deal valuations; film and verified brand data raise confidence later.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Source: {source} · {version}
        </p>

        <div className="mt-8">
          <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-bg-card" />}>
            <RankingsFilters basePath="/nil/scores" />
          </Suspense>
        </div>

        <div className="mt-6">
          <NilScoresTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
