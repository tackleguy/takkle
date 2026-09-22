import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLivePlayerBySlug } from "@/lib/live-players";
import { profileSession, ownsProfile } from "@/lib/profile/access";
import PlayerProfileEditor from "@/components/player/PlayerProfileEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage your player profile", robots: { index: false, follow: false } };

export default async function EditPlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await profileSession();
  if (!session) redirect(`/auth/login?next=${encodeURIComponent(`/site/player/${slug}/edit`)}`);
  const { player } = await getLivePlayerBySlug(slug);
  if (!player) notFound();
  const allowed = await ownsProfile(session, player.id);
  return <div className="mx-auto max-w-3xl px-4 py-10">
    <Link href={`/site/player/${slug}`} className="text-accent hover:underline">View public profile</Link>
    <h1 className="mt-4 text-4xl">{player.displayName}</h1>
    <p className="mb-6 mt-2 text-text-secondary">Manage your player details, stats links, and film.</p>
    {allowed ? <PlayerProfileEditor player={player} /> : <div className="rounded-xl border border-border bg-field p-6">
      <h2 className="text-2xl">Claim verification required</h2>
      <p className="mt-2 text-text-secondary">Only the verified owner can change this profile. If you’ve submitted a claim, editing will unlock after approval.</p>
      <Link href={`/onboarding?player=${encodeURIComponent(slug)}`} className="mt-4 inline-block text-accent hover:underline">View claim status or submit a claim</Link>
    </div>}
  </div>;
}
