import Link from "next/link";
import type { RankedPlayerRow } from "@/lib/rankings";
import { formatTackleScore } from "@/lib/scoring/tackle-score";

interface RankingsTableProps {
  rows: RankedPlayerRow[];
}

export default function RankingsTable({ rows }: RankingsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card px-6 py-12 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-text-primary">
          No ranked players yet
        </p>
        <p className="mt-2 text-sm text-text-muted">
          No ranked college players yet for this filter. Provisional Tackle Scores come from
          division, conference, and roster signals until film grades land.
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
            <th className="px-4 py-3 hidden sm:table-cell">School</th>
            <th className="px-4 py-3 hidden md:table-cell">Pos</th>
            <th className="px-4 py-3 hidden md:table-cell">Class</th>
            <th className="px-4 py-3 text-right">Tackle Score™</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ rank, score, isRising, player }) => (
            <tr
              key={player.id}
              className="border-b border-border/60 bg-bg-card transition-colors hover:bg-bg-card-hover"
            >
              <td className="px-4 py-3 font-[family-name:var(--font-display)] text-lg text-text-muted">
                {rank}
                {isRising && <span className="ml-1 text-turf text-xs">↑</span>}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/site/player/${player.slug}`}
                  className="font-medium text-text-primary hover:text-accent transition-colors"
                >
                  {player.displayName}
                </Link>
                <span className="sm:hidden block text-xs text-text-muted">
                  {player.school.name}
                </span>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-text-secondary">
                {player.school.name}, {player.stateCode}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-text-secondary">
                {player.position}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-text-secondary">
                {player.classYear}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-[family-name:var(--font-display)] text-xl text-accent">
                  {score != null ? formatTackleScore(score) : "—"}
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
