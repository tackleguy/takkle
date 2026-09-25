import Button from "@/components/ui/Button";
import PlayerCard from "@/components/player/PlayerCard";
import TackleScoreDisplay from "@/components/ui/TackleScoreDisplay";
import SyntheticNotice from "@/components/ui/SyntheticNotice";
import RolePaths from "@/components/home/RolePaths";
import WelcomeBand from "@/components/home/WelcomeBand";
import {
  getLiveFeaturedPlayer,
  getLiveRisingPlayers,
  getLiveTrendingPlayers,
} from "@/lib/live-players";
import { playerSchoolLine } from "@/lib/player-display";
import { accountSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [session, { player: featured, source: featuredSource }, trending, rising] = await Promise.all([
    accountSession(),
    getLiveFeaturedPlayer(),
    getLiveTrendingPlayers(4),
    getLiveRisingPlayers(4),
  ]);
  const live =
    featuredSource === "supabase" ||
    featuredSource === "college" ||
    trending.source === "supabase" ||
    trending.source === "college";
  const signedIn = session.status === "signed_in";
  const role = signedIn ? session.role : null;
  const email =
    session.status === "signed_in" || session.status === "profile_unavailable"
      ? session.user.email
      : null;

  return (
    <>
      {/*
        THESIS: Discovery is the aha — brand + live players before claim ceremony.
        OWN-WORLD: Night-field navy, orange TAKKLE, Bebas, turf sparingly.
        STORY: Visitor sees players immediately; new users pick a light path.
        FIRST VIEWPORT: TAKKLE wordmark, one headline, one sentence, CTAs, atmosphere.
        FORM: Discovery-first onboard (user lock aha-discovery).
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
      */}
      {signedIn || session.status === "profile_unavailable" ? (
        <WelcomeBand role={role} email={email} />
      ) : null}

      <section className="hero-atmosphere field-lights relative overflow-hidden px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-turf/30 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center home-hero-enter">
          <p className="font-[family-name:var(--font-display)] text-5xl sm:text-7xl tracking-[0.15em] text-accent mb-6">
            TAKKLE
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl tracking-wide text-text-primary leading-tight text-balance">
            {signedIn
              ? "Live dossiers. Real Tackle Scores™. Your next recruit starts here."
              : "See the players. Claim your game. Get discovered."}
          </h1>
          <p className="mt-5 text-lg text-text-secondary max-w-2xl mx-auto text-pretty">
            {signedIn
              ? "Browse college athletes with film and Tackle Score™ — tutorials are optional."
              : "Player-first recruiting identity with film, stats, Tackle Score™, and recruiter discovery."}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button href="/discover" size="lg">
              Find Players
            </Button>
            <Button href={signedIn ? "/account" : "/onboarding"} variant="outline" size="lg">
              {signedIn ? "My account" : "Claim Profile"}
            </Button>
          </div>
        </div>
      </section>

      {!signedIn ? <RolePaths /> : null}

      {featured && (
        <section className="px-4 py-16 border-t border-border">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl tracking-wide text-text-primary">
                  {featured.displayName}
                </h2>
                <p className="mt-2 text-text-secondary">
                  {featured.position} · Class of {featured.classYear} · {playerSchoolLine(featured)}
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
                      <li
                        key={`${r.scope}-${r.scopeKey}`}
                        className="rounded-md border border-border bg-field/50 px-3 py-1.5"
                      >
                        <span className="text-accent font-semibold tabular-nums">#{r.rank}</span>{" "}
                        {r.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button href={`/site/player/${featured.slug}`} variant="secondary">
                    View full dossier
                  </Button>
                  <Button href="/rankings" variant="ghost">
                    Browse rankings
                  </Button>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-border bg-field p-6 sm:p-8">
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
                <p className="relative text-text-secondary leading-relaxed">
                  Tackle Score™ is Takkle&apos;s proprietary 1.0–10.0 evaluation — no star ratings.
                  Film, production, athleticism, and competition level combine into one transparent
                  score with confidence levels.
                </p>
                <SyntheticNotice compact forceHide={live} />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-4 py-16 bg-field/50 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-text-primary">
                Players moving now
              </h2>
              <p className="mt-2 text-text-secondary">Trending and rising college dossiers this week.</p>
            </div>
            <Button href="/discover" variant="outline" size="sm">
              Open Discover
            </Button>
          </div>
          <SyntheticNotice forceHide={live} />
          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-text-primary mb-4">
                Trending
              </h3>
              <div className="grid gap-3">
                {trending.players.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-text-primary mb-4">
                Rising
              </h3>
              <div className="grid gap-3">
                {rising.players.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-text-primary">
            College Eligibility Calculator
          </h2>
          <p className="mt-3 text-text-secondary max-w-xl mx-auto">
            Estimate remaining NCAA D1 football seasons, redshirt impact, and your five-year clock.
          </p>
          <div className="mt-6">
            <Button href="/college" variant="outline">
              Calculate eligibility
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
