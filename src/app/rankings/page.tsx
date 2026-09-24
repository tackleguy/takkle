import { Suspense } from "react";
import type { Metadata } from "next";
import RankingsFilters from "@/components/rankings/RankingsFilters";
import RankingsTable from "@/components/rankings/RankingsTable";
import { getLiveRankings } from "@/lib/rankings";
import {
  defaultConferenceForDivision,
  divisionLabel,
  isCollegeDivision,
} from "@/lib/recruiting/college-conferences";
import type { CollegeDivision, FootballPosition, RankingScope } from "@/types/recruiting";

export const metadata: Metadata = {
  title: "Rankings",
  description:
    "FBS, FCS, DII, and DIII rankings for athletes and their teams, powered by research-informed Tackle Score™.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function RankingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawScope = params.scope ?? "national";
  const scope = (rawScope === "state" ? "national" : rawScope) as RankingScope;
  const classYearRaw = params.class ? Number(params.class) : undefined;
  const classYear =
    classYearRaw && Number.isFinite(classYearRaw) ? classYearRaw : undefined;
  const position = (params.position ?? "QB") as FootballPosition;
  const division: CollegeDivision = isCollegeDivision(params.division) ? params.division : "fbs";
  const conference = params.conference ?? defaultConferenceForDivision(division);

  const { rows, source, version } = await getLiveRankings(
    {
      scope,
      position: scope === "position" ? position : undefined,
      classYear: scope === "position" || scope === "class" ? classYear : undefined,
      conference: scope === "conference" ? conference : undefined,
      division: scope === "division" ? division : undefined,
    },
    50,
  );

  const title =
    scope === "national"
      ? "National College Rankings"
      : scope === "class"
        ? `Eligibility ${classYear} Rankings`
        : scope === "conference"
          ? `${conference} Rankings · ${divisionLabel(division)}`
          : scope === "division"
            ? `${divisionLabel(division)} Rankings`
            : `${position} Rankings · College`;

  return (
    <div className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-text-primary">
          {title}
        </h1>
        <p className="mt-2 text-text-secondary">
          FBS, FCS, DII, and DIII rankings for athletes and their teams — Tackle Score™ from
          permitted sources, with film grades added when evaluations exist. No star ratings.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Methodology adapts as college depth arrives from roster ingest. Confidence remains Limited
          until film is confirmed. Source: {source} · {version}
        </p>

        <div className="mt-8">
          <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-bg-card" />}>
            <RankingsFilters />
          </Suspense>
        </div>

        <div className="mt-6">
          <RankingsTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
