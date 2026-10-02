import { redirect } from "next/navigation";
import Link from "next/link";
import { profileSession } from "@/lib/profile/access";
import DisputeReviewButtons from "@/components/admin/DisputeReviewButtons";

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage() {
  const session = await profileSession();
  if (!session) redirect("/auth/login?next=/admin/disputes");
  if (!session.isAdmin) return <p>Admin access is required to review disputes.</p>;

  const { data, error } = await session.db
    .from("claim_disputes")
    .select(
      "id,status,reason,created_at,players(display_name,slug,status),filed_by_user_id",
    )
    .in("status", ["open", "under_review"])
    .order("created_at");

  return (
    <div>
      <h2 className="text-3xl">Ownership disputes</h2>
      <p className="mt-2 max-w-2xl text-sm text-text-secondary">
        Open disputes pause trust in the current claim. Revoking clears ownership and returns the
        roster to unclaimed so the rightful athlete can claim.
      </p>
      {error ? (
        <p role="alert" className="mt-4">
          Unable to load disputes. Please try again.
        </p>
      ) : !data?.length ? (
        <p className="mt-4 text-text-secondary">No open disputes requiring review.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {data.map((dispute) => {
            const player = Array.isArray(dispute.players) ? dispute.players[0] : dispute.players;
            return (
              <article key={dispute.id} className="rounded-xl border border-border bg-field p-5">
                <h3 className="text-2xl">{player?.display_name ?? "Player"}</h3>
                {player?.slug && (
                  <Link
                    href={`/site/player/${player.slug}`}
                    className="text-sm text-accent hover:underline"
                  >
                    View roster profile
                  </Link>
                )}
                <p className="mt-2 text-sm text-text-secondary">
                  Player status: {player?.status ?? "—"} · Filed{" "}
                  {new Date(dispute.created_at).toLocaleString()}
                </p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm text-text-secondary">
                  {dispute.reason}
                </p>
                <DisputeReviewButtons disputeId={dispute.id} />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
