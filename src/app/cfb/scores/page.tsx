import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import CfbScorecard from "@/components/scores/CfbScorecard";
import CfbScoresFilters from "@/components/scores/CfbScoresFilters";
import {
  getCfbScoreboard,
  groupCfbGames,
  resolveCfbConference,
  resolveCfbDay,
  resolveCfbSort,
  resolveCollegeSport,
  collegeScoreSport,
  CFB_ESPN_CONFERENCES,
  type CollegeScoreSport,
} from "@/lib/cfb-scores";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}): Promise<Metadata> {
  const query = await searchParams;
  const sport = collegeScoreSport(resolveCollegeSport(query.sport));
  return {
    title: `${sport.label} Scores`,
    description: `Live ${sport.label.toLowerCase()} scores — filter by recent games and kickoff day.`,
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function CfbScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ conference?: string; sort?: string; day?: string; sport?: string }>;
}) {
  const query = await searchParams;
  const sport: CollegeScoreSport = resolveCollegeSport(query.sport);
  const sportMeta = collegeScoreSport(sport);
  const conference = sportMeta.hasConferences
    ? resolveCfbConference(query.conference)
    : "all";
  const sort = resolveCfbSort(query.sort);
  const day = resolveCfbDay(query.day);

  let board;
  let error: string | null = null;
  try {
    board = await getCfbScoreboard({ conference, day, sport });
  } catch {
    error = "Could not load the scoreboard right now. Try again in a minute.";
    board = null;
  }

  const grouped = board ? groupCfbGames(board.games, sort) : null;
  const confLabel =
    CFB_ESPN_CONFERENCES.find((c) => c.value === conference)?.label ?? "All conferences";
  const titleBits = [
    board?.seasonYear,
    board?.weekLabel,
    conference !== "all" ? confLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="hero-atmosphere field-lights relative overflow-hidden px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 text-sm text-text-muted" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-accent transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="text-text-secondary">Scores</li>
          </ol>
        </nav>

        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-text-primary">
          {sportMeta.label} Scores
        </h1>
        <p className="mt-2 text-text-secondary max-w-2xl">
          Live and final college {sportMeta.label.toLowerCase()} scores — sort by recent games
          {sportMeta.hasConferences ? " or filter by conference" : ""}.
        </p>
        {titleBits ? (
          <p className="mt-2 text-sm text-text-muted">{titleBits}</p>
        ) : null}

        <Suspense
          fallback={
            <div className="mt-6 h-24 animate-pulse rounded-xl border border-border bg-field/40" />
          }
        >
          <CfbScoresFilters />
        </Suspense>

        {error ? (
          <div className="mt-10 rounded-xl border border-border bg-bg-card px-6 py-12 text-center">
            <p className="text-text-secondary">{error}</p>
          </div>
        ) : null}

        {grouped && board && board.games.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-bg-card px-6 py-12 text-center">
            <p className="font-[family-name:var(--font-display)] text-2xl text-text-primary">
              No games listed
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Try another conference or day — or check back on gameday.
            </p>
          </div>
        ) : null}

        {grouped?.sections.map((section) =>
          section.games.length > 0 ? (
            <section key={section.key} className="mt-10">
              <h2
                className={`font-[family-name:var(--font-display)] text-2xl tracking-wide mb-4 ${section.tone}`}
              >
                {section.title}
                <span className="ml-2 text-sm font-sans tracking-normal text-text-muted tabular-nums">
                  {section.games.length}
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.games.map((g) => (
                  <CfbScorecard key={g.id} game={g} />
                ))}
              </div>
            </section>
          ) : null,
        )}

        {board ? (
          <p className="mt-8 text-xs text-text-muted">
            Scoreboard updates about every minute. Data from ESPN public feeds.
          </p>
        ) : null}
      </div>
    </div>
  );
}
