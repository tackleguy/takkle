import Link from "next/link";
import type { Player } from "@/types/recruiting";
import { formatTackleScore } from "@/lib/scoring/tackle-score";

interface RankingsTableProps {
  players: Player[];
  startRank?: number;
}

export default function RankingsTable({ players, startRank = 1 }: RankingsTableProps) {
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
          {players.map((player, i) => (
            <tr
              key={player.id}
              className="border-b border-border/60 bg-bg-card transition-colors hover:bg-bg-card-hover"
            >
              <td className="px-4 py-3 font-[family-name:var(--font-display)] text-lg text-text-muted">
                {startRank + i}
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
              <td className="px-4 py-3 hidden md:table-cell text-text-secondary">{player.position}</td>
              <td className="px-4 py-3 hidden md:table-cell text-text-secondary">{player.classYear}</td>
              <td className="px-4 py-3 text-right">
                <span className="font-[family-name:var(--font-display)] text-xl text-accent">
                  {formatTackleScore(player.tackleScore.score)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
