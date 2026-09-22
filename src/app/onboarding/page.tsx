import { getLivePlayerBySlug } from "@/lib/live-players";
import { profileSession } from "@/lib/profile/access";
import { playerSchoolName } from "@/lib/player-display";
import type { Metadata } from "next";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Claim Your Profile",
  description: "Find and claim your collegiate football profile on Takkle (FBS/FCS).",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ player?: string }> }) {
  const query = await searchParams;
  const session = await profileSession();
  const player = query.player ? (await getLivePlayerBySlug(query.player)).player : null;
  const initialPlayer = player ? { slug: player.slug, displayName: player.displayName, schoolName: playerSchoolName(player), position: player.position, classYear: player.classYear, stateCode: player.stateCode } : null;
  const claims = session ? await session.db.from("player_claims").select("id,status,players(display_name,slug)").eq("user_id", session.user.id).order("created_at", { ascending: false }) : null;
  return (
    <div className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center mb-10">
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-text-primary">
          Claim Your Profile
        </h1>
        <p className="mt-2 text-text-secondary">
          Your player record is separate from your login. Find, claim, verify, and build your dossier.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          College athletes and their teams —{" "}
          <Link href="/guides" className="text-accent hover:underline">
            Player Guides
          </Link>
          {" · "}
          <Link href="/college" className="text-accent hover:underline">
            Eligibility
          </Link>
        </p>
      </div>
      {claims?.data && claims.data.length > 0 && <section className="mx-auto mb-6 max-w-2xl rounded-xl border border-border bg-field p-5">
        <h2 className="text-2xl">Your claims</h2>
        <ul className="mt-3 space-y-3">{claims.data.map(claim => {
          const record = Array.isArray(claim.players) ? claim.players[0] : claim.players;
          return <li key={claim.id} className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>{record?.display_name} · {claim.status === "pending" ? "Under review" : claim.status}</span>{record?.slug && claim.status === "approved" && <Link href={`/site/player/${record.slug}/edit`} className="text-accent hover:underline">Manage profile, stats & film</Link>}</li>;
        })}</ul>
      </section>}
      <OnboardingWizard initialPlayer={initialPlayer} signedIn={Boolean(session)} available={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)} />
    </div>
  );
}
