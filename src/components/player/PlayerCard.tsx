import Link from "next/link";
import type { Player } from "@/types/recruiting";
import TackleScoreDisplay from "@/components/ui/TackleScoreDisplay";
import SyntheticNotice from "@/components/ui/SyntheticNotice";

interface PlayerCardProps {
  player: Player;
  showSynthetic?: boolean;
}

export default function PlayerCard({ player, showSynthetic = true }: PlayerCardProps) {
  const heightFt = Math.floor(player.heightInches / 12);
  const heightIn = Math.round(player.heightInches % 12);

  return (
    <Link
      href={`/site/player/${player.slug}`}
      className="group block rounded-xl border border-border bg-bg-card p-4 transition-all hover:border-accent/40 hover:bg-bg-card-hover hover:shadow-[0_0_32px_rgba(255,106,0,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-[family-name:var(--font-display)] text-lg tracking-wide text-text-primary group-hover:text-accent transition-colors">
            {player.displayName}
          </h3>
          <p className="mt-0.5 text-sm text-text-secondary">
            {player.position} · Class of {player.classYear}
          </p>
          <p className="text-sm text-text-muted truncate">
            {player.school.name} · {player.school.city}, {player.stateCode}
          </p>
        </div>
        <TackleScoreDisplay score={player.tackleScore.score} size="sm" showLabel={false} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
        <span>
          {heightFt}&apos;{heightIn}&quot; · {player.weightLbs} lbs
        </span>
        {showSynthetic && player.isSynthetic && <SyntheticNotice compact />}
      </div>
    </Link>
  );
}
