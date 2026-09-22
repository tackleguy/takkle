import { formatHeight, formatWeight, playerDisplayName, playerClassLabel } from "@/lib/player-display";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllPlayerSlugs } from "@/lib/players";
import { getLivePlayerBySlug } from "@/lib/live-players";
import { playerSchoolLine, playerSchoolName } from "@/lib/player-display";
import PlayerProfileSections from "@/components/player/PlayerProfileSections";
import TackleScoreDisplay from "@/components/ui/TackleScoreDisplay";
import FilmWindow from "@/components/film/FilmWindow";
import Badge from "@/components/ui/Badge";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateStaticParams() {
  return getAllPlayerSlugs()
    .slice(0, 100)
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { player } = await getLivePlayerBySlug(slug);
  if (!player) return {};

  const school = playerSchoolName(player);
  return {
    title: `${playerDisplayName(player)} — ${player.position} ${playerClassLabel(player)}`,
    description: `${playerDisplayName(player)} recruiting profile at ${school}. Tackle Score™ ${player.tackleScore.score}.`,
    openGraph: {
      title: `${playerDisplayName(player)} | Takkle`,
      description: `Tackle Score™ ${player.tackleScore.score} — ${school}`,
    },
  };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const { player } = await getLivePlayerBySlug(slug);
  if (!player) notFound();

  const shareUrl = `https://takkle.com/site/player/${player.slug}`;

  return (
    <div className="px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Dossier header */}
        <div className="rounded-xl border border-border bg-field overflow-hidden">
          <div className="grid lg:grid-cols-5 gap-0">
            <div className="lg:col-span-3 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Official Visit Dossier</p>
                  <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-text-primary tracking-wide">
                    {playerDisplayName(player)}
                  </h1>
                  <p className="mt-2 text-lg text-text-secondary">
                    {player.position} · {playerClassLabel(player)}
                  </p>
                  <p className="text-text-muted">{playerSchoolLine(player)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="turf">{player.status.replace(/_/g, " ")}</Badge>
                    <Badge>{formatHeight(player.heightInches)} · {formatWeight(player.weightLbs)}</Badge>
                    {player.isSynthetic && <Badge tone="warning">Demo data</Badge>}
                  </div>
                </div>
                <TackleScoreDisplay
                  score={player.tackleScore.score}
                  confidence={player.tackleScore.confidence}
                  size="lg"
                />
              </div>
            </div>
            <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-border">
              <FilmWindow films={player.film} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href={`/site/player/${player.slug}/edit`} className="text-accent hover:underline">Manage profile, stats & film</Link>
          <Link href={`/onboarding?player=${encodeURIComponent(player.slug)}`} className="text-accent hover:underline">Claim this profile</Link>
        </div>

        {/* Share */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-text-muted">Share:</span>
          <code className="break-all rounded bg-bg-card px-2 py-1 text-xs text-text-secondary">{shareUrl}</code>
          <Link href="/guides" className="ml-auto text-accent hover:underline text-sm">
            Player Guides →
          </Link>
        </div>

        <div className="mt-8">
          <PlayerProfileSections player={player} />
        </div>
      </div>
    </div>
  );
}
