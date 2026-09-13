import type { ReactNode } from "react";
import type { Player } from "@/types/recruiting";
import FilmWindow from "@/components/film/FilmWindow";
import TackleScoreDisplay from "@/components/ui/TackleScoreDisplay";
import SyntheticNotice from "@/components/ui/SyntheticNotice";
import Badge from "@/components/ui/Badge";
import { formatTackleScore } from "@/lib/scoring/tackle-score";
import Link from "next/link";

interface PlayerProfileSectionsProps {
  player: Player;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-bg-card p-6">
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl tracking-wide text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function PlayerProfileSections({ player }: PlayerProfileSectionsProps) {
  const heightFt = Math.floor(player.heightInches / 12);
  const heightIn = Math.round(player.heightInches % 12);
  const m = player.measurements[0];

  return (
    <div className="space-y-6">
      {player.isSynthetic && <SyntheticNotice />}

      <Section title="About">
        <p className="text-text-secondary leading-relaxed">
          {player.bio ??
            `${player.displayName} is a ${player.position} at ${player.school.name} (Class of ${player.classYear}).`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{player.status.replace(/_/g, " ")}</Badge>
          <Badge tone="turf">{player.stateCode}</Badge>
          {player.jerseyNumber && <Badge>#{player.jerseyNumber}</Badge>}
        </div>
      </Section>

      <Section title="Film">
        <FilmWindow films={player.film} />
      </Section>

      <Section title="Athletic Profile">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase text-text-muted">Height</dt>
            <dd className="mt-1 text-lg text-text-primary">{heightFt}&apos;{heightIn}&quot;</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-text-muted">Weight</dt>
            <dd className="mt-1 text-lg text-text-primary">{player.weightLbs} lbs</dd>
          </div>
          {m?.fortyYard && (
            <div>
              <dt className="text-xs uppercase text-text-muted">40-yard</dt>
              <dd className="mt-1 text-lg text-text-primary">{m.fortyYard}s</dd>
            </div>
          )}
          {m?.verticalInches && (
            <div>
              <dt className="text-xs uppercase text-text-muted">Vertical</dt>
              <dd className="mt-1 text-lg text-text-primary">{m.verticalInches}&quot;</dd>
            </div>
          )}
        </dl>
      </Section>

      {player.stats.length > 0 && (
        <Section title="Stats">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {player.stats.map((s) => (
              <div key={s.statKey}>
                <dt className="text-xs uppercase text-text-muted">{s.statLabel}</dt>
                <dd className="mt-1 text-lg text-text-primary">
                  {s.statValue}
                  {s.unit ? ` ${s.unit}` : ""}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Section title="Recruiting">
        {player.offers.length > 0 ? (
          <ul className="space-y-2">
            {player.offers.map((o, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{o.schoolName}</span>
                <Badge tone={o.status === "offer" ? "accent" : "default"}>{o.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted text-sm">No public recruiting activity listed.</p>
        )}
      </Section>

      <Section title="Tackle Score™ Breakdown">
        <div className="mb-6">
          <TackleScoreDisplay
            score={player.tackleScore.score}
            confidence={player.tackleScore.confidence}
            size="lg"
          />
        </div>
        <div className="space-y-3">
          {player.tackleScore.components.map((c) => (
            <div key={c.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-text-secondary">{c.label}</span>
                <span className="text-text-primary">{formatTackleScore(c.score)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-field">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-turf"
                  style={{ width: `${(c.score / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Rankings">
        <div className="grid gap-3 sm:grid-cols-2">
          {player.rankings.map((r) => (
            <div key={r.scopeKey + r.scope} className="rounded-lg border border-border bg-field px-4 py-3">
              <p className="text-xs uppercase text-text-muted">{r.scope}</p>
              <p className="font-[family-name:var(--font-display)] text-xl text-accent">
                #{r.rank}
              </p>
              <p className="text-xs text-text-muted">of {r.totalInScope}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Data Provenance">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">Source</dt>
            <dd className="text-text-secondary">{player.provenance.sourceName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Origin</dt>
            <dd className="text-text-secondary">{player.provenance.dataOrigin.replace(/_/g, " ")}</dd>
          </div>
          {player.provenance.lastVerifiedAt && (
            <div className="flex justify-between">
              <dt className="text-text-muted">Last verified</dt>
              <dd className="text-text-secondary">
                {new Date(player.provenance.lastVerifiedAt).toLocaleDateString()}
              </dd>
            </div>
          )}
        </dl>
      </Section>

      <div className="rounded-xl border border-status-limited/30 bg-status-limited/5 p-4 text-sm text-text-secondary">
        <p className="font-medium text-text-primary">High School NIL Notice</p>
        <p className="mt-1">
          NIL rules vary by state and change frequently.{" "}
          <Link href="/nil-rules" className="text-accent hover:underline">
            Check your state&apos;s High School NIL Rules
          </Link>{" "}
          before pursuing deals.
        </p>
      </div>
    </div>
  );
}
