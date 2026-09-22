import { redirect } from "next/navigation";
import Link from "next/link";
import { profileSession } from "@/lib/profile/access";
import ClaimReviewButtons from "@/components/admin/ClaimReviewButtons";
export const dynamic = "force-dynamic";
export default async function AdminClaimsPage() {
  const session = await profileSession();
  if (!session) redirect("/auth/login?next=/admin/claims");
  if (!session.isAdmin) return <p>Admin access is required to review claims.</p>;
  const { data, error } = await session.db.from("player_claims").select("id,status,school_email,notes,created_at,players(display_name,slug)").eq("status", "pending").order("created_at");
  return <div><h2 className="text-3xl">Review player claims</h2>
    {error ? <p role="alert" className="mt-4">Unable to load claims. Please try again.</p> : !data?.length ? <p className="mt-4 text-text-secondary">No claims are waiting for review.</p> :
      <div className="mt-6 space-y-5">{data.map(claim => {
        const player = Array.isArray(claim.players) ? claim.players[0] : claim.players;
        return <article key={claim.id} className="rounded-xl border border-border bg-field p-5"><h3 className="text-2xl">{player?.display_name}</h3><Link href={`/site/player/${player?.slug}`} className="text-sm text-accent hover:underline">View roster profile</Link><p className="mt-3 break-words text-text-secondary">School email: {claim.school_email}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-text-secondary">{claim.notes}</p><ClaimReviewButtons claimId={claim.id} /></article>;
      })}</div>}
  </div>;
}
