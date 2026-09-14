import Button from "@/components/ui/Button";
import PlayerCard from "@/components/player/PlayerCard";
import TackleScoreDisplay from "@/components/ui/TackleScoreDisplay";
import SyntheticNotice from "@/components/ui/SyntheticNotice";
import {
  getLiveFeaturedPlayer,
  getLiveRisingPlayers,
  getLiveTrendingPlayers,
} from "@/lib/live-players";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ player: featured, source: featuredSource }, trending, rising] = await Promise.all([
    getLiveFeaturedPlayer(),
    getLiveTrendingPlayers(4),
    getLiveRisingPlayers(4),
  ]);
  const live =
    featuredSource === "supabase" ||
    featuredSource === "college" ||
    trending.source === "supabase" ||
    trending.source === "college";

  return (
    <>
      {/* Hero — first viewport: brand + headline + sentence + CTAs + atmosphere */}
      <section className="hero-atmosphere field-lights relative overflow-hidden px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-turf/30 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="font-[family-name:var(--font-display)] text-5xl sm:text-7xl tracking-[0.15em] text-accent mb-6">
            TAKKLE
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl tracking-wide text-text-primary leading-tight">
            Build your recruiting profile. Show your game. Get discovered.
          </h1>
          <p className="mt-5 text-lg text-text-secondary max-w-2xl mx-auto">
            Your player-first recruiting identity — film, stats, Tackle Score™, and recruiter discovery.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button href="/onboarding" size="lg">
              Claim Profile
            </Button>
            <Button href="/discover" variant="outline" size="lg">
              Find Players
            </Button>
          </div>
        </div>
      </section>

      {/* Tackle Score teaser */}
      {featured && (
        <section className="px-4 py-16 border-t border-border">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-2">Featured profile</p>
                <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-text-primary">
                  {featured.displayName}
                </h2>
                <p className="mt-2 text-text-secondary">
                  {featured.position} · Class of {featured.classYear} · {featured.school.name}
                </p>
                <div className="mt-6">
                  <TackleScoreDisplay
                    score={featured.tackleScore.score}
                    confidence={featured.tackleScore.confidence}
                    size="lg"
                  />
                </div>
                {featured.rankings?.length ? (
                  <ul className="mt-4 flex flex-wrap gap-3 text-sm text-text-secondary">
                    {featured.rankings.slice(0, 4).map((r) => (
                      <li key={`${r.scope}-${r.scopeKey}`} className="rounded-md border border-border px-3 py-1">
                        <span className="text-accent font-semibold">#{r.rank}</span> {r.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-6">
                  <Button href={`/site/player/${featured.slug}`} variant="secondary">
                    View full dossier
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-field p-6">
                <p className="text-sm text-text-secondary leading-relaxed">
                  Tackle Score™ is Takkle&apos;s proprietary 1.0–10.0 evaluation — no star ratings.
                  Film evaluation, production, athleticism, and competition level combine into one
                  transparent score with confidence levels.
                </p>
                <SyntheticNotice compact forceHide={live} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trending & Rising */}
      <section className="px-4 py-16 bg-field/50">
        <div className="mx-auto max-w-6xl">
          <SyntheticNotice forceHide={live} />
          <div className="mt-6 grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-text-primary mb-4">
                Trending Players
              </h2>
              <div className="grid gap-3">
                {trending.players.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-text-primary mb-4">
                Rising This Week
              </h2>
              <div className="grid gap-3">
                {rising.players.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* College eligibility banner */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border border-turf/30 bg-turf/5 p-6 sm:p-8 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-text-primary">
              College Eligibility Calculator
            </h2>
            <p className="mt-2 text-text-secondary max-w-xl mx-auto">
              Estimate remaining NCAA D1 football seasons, redshirt impact, and your five-year clock.
            </p>
            <div className="mt-6">
              <Button href="/college" variant="outline">
                Calculate eligibility
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
