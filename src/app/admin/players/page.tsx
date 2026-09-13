import { searchPlayers } from "@/lib/players";
import RankingsTable from "@/components/rankings/RankingsTable";

export default function AdminPlayersPage() {
  const { players } = searchPlayers({}, 1, 25);
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-text-primary">Players</h2>
      <p className="mt-1 text-sm text-text-muted">Moderate player records and synthetic flags.</p>
      <div className="mt-6">
        <RankingsTable players={players} />
      </div>
    </div>
  );
}
