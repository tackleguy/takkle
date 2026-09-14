import type { Metadata } from "next";
import Link from "next/link";
import CfbScorecard from "@/components/scores/CfbScorecard";
import { getCfbScoreboard, type CfbGame } from "@/lib/cfb-scores";

export const metadata: Metadata = {
  title: "CFB Scores",
  description:
    "Live college football scores — FBS games, their teams, and kickoff times on Takkle.",
};

export const dynamic = "force-dynamic";
export const revalidate = 60;

function groupGames(games: CfbGame[]) {
  const live = games.filter((g) => g.status === "in");
  const final = games.filter((g) => g.status === "final");
  const upcoming = games.filter((g) => g.status === "scheduled" || g.status === "other");
  return { live, final, upcoming };
}

export default async function CfbScoresPage() {
  let board;
  let error: string | null = null;
  try {
    board = await getCfbScoreboard();
  } catch {
    error = "Could not load the scoreboard right now. Try again in a minute.";
    board = null;
  }

  const groups = board ? groupGames(board.games) : null;
  const titleBits = [board?.seasonYear, board?.weekLabel].filter(Boolean).join(" · ");

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
            <li className="text-text-secondary">CFB Scores</li>
          </ol>
        </nav>

        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-text-primary">
          CFB Scores
        </h1>
        <p className="mt-2 text-text-secondary max-w-2xl">
          Live and upcoming college football scores for their teams — refresh every minute while
          games are on.
        </p>
        {titleBits ? (
          <p className="mt-2 text-sm text-text-muted">{titleBits}</p>
        ) : null}

        {error ? (
          <div className="mt-10 rounded-xl border border-border bg-bg-card px-6 py-12 text-center">
            <p className="text-text-secondary">{error}</p>
          </div>
        ) : null}

        {groups && board && board.games.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-bg-card px-6 py-12 text-center">
            <p className="font-[family-name:var(--font-display)] text-2xl text-text-primary">
              No games listed
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Check back on gameday for live scores from their teams.
            </p>
          </div>
        ) : null}

        {groups && groups.live.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-turf mb-4">
              Live
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.live.map((g) => (
                <CfbScorecard key={g.id} game={g} />
              ))}
            </div>
          </section>
        ) : null}

        {groups && groups.upcoming.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-text-primary mb-4">
              Upcoming
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.upcoming.map((g) => (
                <CfbScorecard key={g.id} game={g} />
              ))}
            </div>
          </section>
        ) : null}

        {groups && groups.final.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-text-primary mb-4">
              Final
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.final.map((g) => (
                <CfbScorecard key={g.id} game={g} />
              ))}
            </div>
          </section>
        ) : null}

        {board ? (
          <p className="mt-8 text-xs text-text-muted">
            Scoreboard updates about every minute. Data from ESPN public feeds.
          </p>
        ) : null}
      </div>
    </div>
  );
}
