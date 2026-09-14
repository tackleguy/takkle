import Link from "next/link";
import type { NilRankedRow } from "@/lib/nil-rankings";
import { formatNilScore } from "@/lib/scoring/nil-provisional";
import { playerSchoolLine, playerSchoolName } from "@/lib/player-display";

interface NilScoresTableProps {
  rows: NilRankedRow[];
}

export default function NilScoresTable({ rows }: NilScoresTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card px-6 py-12 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-text-primary">
          No NIL scores yet
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Provisional NIL Scores come from division, conference reach, position visibility, and
          their teams until verified brand data lands.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-field text-left text-xs uppercase tracking-wider text-text-muted">
            <th className="px-4 py-3 w-12">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 hidden sm:table-cell">Their Team</th>
            <th className="px-4 py-3 hidden md:table-cell">Pos</th>
            <th className="px-4 py-3 hidden md:table-cell">Class</th>
            <th className="px-4 py-3 text-right">NIL Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ rank, score, player }) => (
            <tr
              key={player.id}
              className="border-b border-border/60 bg-bg-card transition-colors hover:bg-bg-card-hover"
            >
              <td className="px-4 py-3 font-[family-name:var(--font-display)] text-lg text-text-muted">
                {rank}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/site/player/${player.slug}`}
                  className="font-medium text-text-primary hover:text-accent transition-colors"
                >
                  {player.displayName}
                </Link>
                <span className="sm:hidden block text-xs text-text-muted">
                  {playerSchoolLine(player)}
                </span>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-text-secondary">
                {playerSchoolName(player)}
                {player.conference ? (
                  <span className="block text-xs text-text-muted">{player.conference}</span>
                ) : null}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-text-secondary">
                {player.position}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-text-secondary">
                {player.classYear}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-[family-name:var(--font-display)] text-xl text-accent">
                  {formatNilScore(score)}
                </span>
                <span className="block text-[10px] uppercase tracking-wide text-text-muted">
                  Limited data
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
