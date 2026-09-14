import type { CfbGame, CfbGameStatus, CfbTeamScore } from "@/lib/cfb-scores";

function statusTone(status: CfbGameStatus): string {
  if (status === "in") return "text-turf";
  if (status === "final") return "text-text-secondary";
  return "text-text-muted";
}

function formatKickoff(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function TeamRow({ team, emphasize }: { team: CfbTeamScore; emphasize: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {team.logo ? (
        // ESPN team marks
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt="" className="h-8 w-8 object-contain" width={32} height={32} />
      ) : (
        <div className="h-8 w-8 rounded bg-field" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-medium ${
            emphasize ? "text-text-primary" : "text-text-secondary"
          }`}
        >
          {team.rank != null ? (
            <span className="mr-1.5 text-xs text-text-muted">#{team.rank}</span>
          ) : null}
          {team.name}
        </p>
        {team.record ? (
          <p className="text-xs text-text-muted">{team.record}</p>
        ) : null}
      </div>
      <span
        className={`font-[family-name:var(--font-display)] text-2xl tabular-nums ${
          team.score == null
            ? "text-text-muted"
            : team.winner
              ? "text-accent"
              : "text-text-primary"
        }`}
      >
        {team.score == null ? "—" : team.score}
      </span>
    </div>
  );
}

export default function CfbScorecard({ game }: { game: CfbGame }) {
  const homeWin = game.status === "final" && game.home.winner;
  const awayWin = game.status === "final" && game.away.winner;

  return (
    <article className="rounded-xl border border-border bg-bg-card px-4 py-4 sm:px-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={`uppercase tracking-wider font-medium ${statusTone(game.status)}`}>
          {game.statusDetail || game.status}
        </span>
        <span className="text-text-muted">
          {game.broadcast || (game.status === "scheduled" ? formatKickoff(game.startTime) : null)}
        </span>
      </div>

      <TeamRow team={game.away} emphasize={!homeWin} />
      <TeamRow team={game.home} emphasize={!awayWin} />

      {game.venue ? (
        <p className="mt-2 border-t border-border/60 pt-2 text-xs text-text-muted">{game.venue}</p>
      ) : null}
    </article>
  );
}
