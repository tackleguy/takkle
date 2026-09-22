import { formatHeight, formatWeight, playerDisplayName, playerClassLabel } from "@/lib/player-display";
import Link from "next/link";
import type { Player } from "@/types/recruiting";
import TackleScoreDisplay from "@/components/ui/TackleScoreDisplay";
import SyntheticNotice from "@/components/ui/SyntheticNotice";
import { playerSchoolLine } from "@/lib/player-display";

interface PlayerCardProps {
  player: Player;
  showSynthetic?: boolean;
}

export default function PlayerCard({ player, showSynthetic = true }: PlayerCardProps) {

  return (
    <Link
      href={`/site/player/${player.slug}`}
      className="group block rounded-xl border border-border bg-bg-card p-4 transition-all hover:border-accent/40 hover:bg-bg-card-hover hover:shadow-[0_0_32px_rgba(255,106,0,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-[family-name:var(--font-display)] text-lg tracking-wide text-text-primary group-hover:text-accent transition-colors">
            {playerDisplayName(player)}
          </h3>
          <p className="mt-0.5 text-sm text-text-secondary">
            {player.position} · {playerClassLabel(player)}
          </p>
          <p className="text-sm text-text-secondary break-words">{playerSchoolLine(player)}</p>
        </div>
        <TackleScoreDisplay score={player.tackleScore.score} size="sm" showLabel={false} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
        <span>
          {formatHeight(player.heightInches)} · {formatWeight(player.weightLbs)}
        </span>
        {showSynthetic && player.isSynthetic && <SyntheticNotice compact />}
      </div>
    </Link>
  );
}
