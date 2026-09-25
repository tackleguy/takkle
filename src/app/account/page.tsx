import Link from "next/link";
import { redirect } from "next/navigation";
import { accountSession } from "@/lib/auth/session";
import { accountActions } from "@/lib/auth/flow";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  const session = await accountSession();
  const query = await searchParams;
  if (session.status === "signed_out") redirect("/auth/login?next=/account");
  if (session.status === "unavailable") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
          Account services unavailable
        </h1>
        <p className="mt-3 text-text-secondary">
          We couldn’t reach the account service. Please try again later.
        </p>
        <Link href="/discover" className="mt-4 inline-block text-accent hover:underline">
          Browse players
        </Link>
      </div>
    );
  }
  if (session.status === "inactive") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
          Account inactive
        </h1>
        <p className="mt-3 text-text-secondary">
          Your account is inactive. Contact the Takkle administrator for help restoring access.
        </p>
      </div>
    );
  }

  const role = session.status === "signed_in" ? session.role : null;
  const owned =
    session.status === "signed_in" && (role === "player" || role === "parent")
      ? await session.db
          .from("player_accounts")
          .select("player_id,players(display_name,slug)")
          .eq("user_id", session.user.id)
          .is("revoked_at", null)
          .not("verified_at", "is", null)
      : null;

  const roleLabel =
    role === "parent" ? "Parent / guardian" : role ? role.charAt(0).toUpperCase() + role.slice(1) : null;

  return (
    <div className="hero-atmosphere min-h-[70vh] px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-wide text-text-primary">
          My account
        </h1>
        <p className="mt-3 break-words text-text-secondary">{session.user.email}</p>
        {roleLabel ? (
          <p className="mt-1 text-sm text-text-muted">{roleLabel} account</p>
        ) : null}

        {query.password === "updated" ? (
          <p
            role="status"
            className="mt-5 rounded-lg border border-turf/30 bg-turf/10 px-4 py-3 text-text-primary"
          >
            Your password has been updated.
          </p>
        ) : null}

        {session.status === "profile_unavailable" ? (
          <p
            role="status"
            className="mt-5 rounded-lg border border-border bg-field p-4 text-text-secondary"
          >
            You’re signed in, but we couldn’t load your account details. Please try again shortly.
            You can still browse players and guides.
          </p>
        ) : null}

        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-text-primary">
            Your next steps
          </h2>
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-bg-card overflow-hidden">
            {accountActions(role).map((action) => (
              <li key={action.href}>
                <Link
                  className="flex items-center justify-between gap-4 px-5 py-4 text-text-primary transition-colors hover:bg-bg-card-hover focus-visible:outline-accent"
                  href={action.href}
                >
                  <span>{action.label}</span>
                  <span className="text-accent" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {owned?.error ? (
          <p role="status" className="mt-5 text-text-secondary">
            Your player profiles couldn’t be loaded. Refresh to try again.
          </p>
        ) : null}

        {!!owned?.data?.length ? (
          <section className="mt-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-text-primary">
              Your player profiles
            </h2>
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-bg-card overflow-hidden">
              {owned.data.map((row) => {
                const player = Array.isArray(row.players) ? row.players[0] : row.players;
                return player ? (
                  <li key={row.player_id}>
                    <Link
                      className="block px-5 py-4 transition-colors hover:bg-bg-card-hover focus-visible:outline-accent"
                      href={`/site/player/${player.slug}/edit`}
                    >
                      <span className="font-[family-name:var(--font-display)] text-lg tracking-wide text-text-primary">
                        {player.display_name}
                      </span>
                      <span className="mt-1 block text-sm text-text-secondary">
                        Manage details, stats & film
                      </span>
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          </section>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button href="/" variant="outline" size="sm">
            Back to home
          </Button>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-accent hover:underline focus-visible:outline-accent"
          >
            Reset password
          </Link>
        </div>
      </div>
    </div>
  );
}
