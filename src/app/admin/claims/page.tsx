import { redirect } from "next/navigation";
import Link from "next/link";
import { profileSession } from "@/lib/profile/access";
import ClaimReviewButtons from "@/components/admin/ClaimReviewButtons";

export const dynamic = "force-dynamic";

export default async function AdminClaimsPage() {
  const session = await profileSession();
  if (!session) redirect("/auth/login?next=/admin/claims");
  if (!session.isAdmin) return <p>Admin access is required to review claims.</p>;

  const { data, error } = await session.db
    .from("player_claims")
    .select(
      "id,status,school_email,notes,created_at,jersey_number,season_year,relationship,signals,domain_verified,email_verified_at,email_proof_method,roster_match_score,strength_notes,players(display_name,slug,jersey_number,class_year,college_name)",
    )
    .eq("status", "pending")
    .order("created_at");

  return (
    <div>
      <h2 className="text-3xl">Review player claims</h2>
      <p className="mt-2 max-w-2xl text-sm text-text-secondary">
        Approve only when school email proof, jersey/season signals, and notes independently match the
        roster. Unregistered domains still need a human check.
      </p>
      {error ? (
        <p role="alert" className="mt-4">
          Unable to load claims. Please try again.
        </p>
      ) : !data?.length ? (
        <p className="mt-4 text-text-secondary">No claims are waiting for review.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {data.map((claim) => {
            const player = Array.isArray(claim.players) ? claim.players[0] : claim.players;
            const signals = Array.isArray(claim.signals) ? claim.signals.join(", ") : "—";
            return (
              <article key={claim.id} className="rounded-xl border border-border bg-field p-5">
                <h3 className="text-2xl">{player?.display_name}</h3>
                <Link
                  href={`/site/player/${player?.slug}`}
                  className="text-sm text-accent hover:underline"
                >
                  View roster profile
                </Link>
                <dl className="mt-4 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                  <div>
                    <dt className="text-text-primary">School email</dt>
                    <dd className="break-words">{claim.school_email}</dd>
                  </div>
                  <div>
                    <dt className="text-text-primary">Email proof</dt>
                    <dd>
                      {claim.email_verified_at
                        ? `${claim.email_proof_method ?? "verified"} · ${new Date(claim.email_verified_at).toLocaleString()}`
                        : "Not verified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-primary">Domain registry</dt>
                    <dd>{claim.domain_verified ? "Verified domain" : "Not in verified registry"}</dd>
                  </div>
                  <div>
                    <dt className="text-text-primary">Relationship</dt>
                    <dd>{claim.relationship}</dd>
                  </div>
                  <div>
                    <dt className="text-text-primary">Submitted jersey / season</dt>
                    <dd>
                      #{claim.jersey_number ?? "—"} · {claim.season_year ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-primary">Roster jersey / class</dt>
                    <dd>
                      #{player?.jersey_number ?? "—"} · {player?.class_year ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-primary">Roster match score</dt>
                    <dd>{claim.roster_match_score ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-text-primary">Signals</dt>
                    <dd className="break-words">{signals}</dd>
                  </div>
                </dl>
                {claim.strength_notes && (
                  <p className="mt-3 text-sm text-text-secondary">{claim.strength_notes}</p>
                )}
                <p className="mt-3 whitespace-pre-wrap break-words text-sm text-text-secondary">
                  {claim.notes}
                </p>
                <ClaimReviewButtons claimId={claim.id} />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
