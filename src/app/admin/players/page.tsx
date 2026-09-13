import { searchPlayers } from "@/lib/players";
import RankingsTable from "@/components/rankings/RankingsTable";

export default function AdminPlayersPage() {
  const { players } = searchPlayers({}, 1, 25);
  const rows = players.map((player, i) => ({
    rank: i + 1,
    score: player.tackleScore.score,
    isRising: false,
    previousRank: null,
    player,
  }));
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-text-primary">Players</h2>
      <p className="mt-1 text-sm text-text-muted">
        Recruit classes 2027–2031 (seed preview). Live rankings live on /rankings.
      </p>
      <div className="mt-6">
        <RankingsTable rows={rows} />
      </div>
    </div>
  );
}
