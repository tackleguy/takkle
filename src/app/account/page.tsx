import Link from "next/link";
import { redirect } from "next/navigation";
import { accountSession } from "@/lib/auth/session";
import { accountActions } from "@/lib/auth/flow";
export const dynamic = "force-dynamic";
export const metadata = { title: "My account", robots: { index: false } };
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const session = await accountSession();
  const query = await searchParams;
  if (session.status === "signed_out") redirect("/auth/login?next=/account");
  if (session.status === "unavailable") return <div className="mx-auto max-w-2xl px-4 py-12"><h1 className="text-3xl">Account services unavailable</h1><p className="mt-3 text-text-secondary">We couldn’t reach the account service. Please try again later.</p><Link href="/discover" className="mt-4 inline-block text-accent">Browse players</Link></div>;
  if (session.status === "inactive") return <div className="mx-auto max-w-2xl px-4 py-12"><h1 className="text-3xl">Account inactive</h1><p className="mt-3 text-text-secondary">Your account is inactive. Contact the Takkle administrator for help restoring access.</p></div>;
  const role = session.status === "signed_in" ? session.role : null;
  const owned = session.status === "signed_in" && (role === "player" || role === "parent") ? await session.db.from("player_accounts").select("player_id,players(display_name,slug)").eq("user_id", session.user.id).is("revoked_at", null).not("verified_at", "is", null) : null;
  return <div className="mx-auto w-full max-w-3xl px-4 py-12">
    <h1 className="text-4xl">My account</h1>
    <p className="mt-3 break-words text-text-secondary">{session.user.email}</p>
    {role && <p className="mt-1 text-sm capitalize text-text-secondary">{role === "parent" ? "Parent / guardian" : role} account</p>}
    {query.password === "updated" && <p role="status" className="mt-5 text-text-primary">Your password has been updated.</p>}
    {session.status === "profile_unavailable" && <p role="status" className="mt-5 rounded-lg border border-border bg-field p-4 text-text-secondary">You’re signed in, but we couldn’t load your account details. Please try again shortly. You can still browse players and guides.</p>}
    <section className="mt-8"><h2 className="text-2xl">Your next steps</h2><ul className="mt-3 divide-y divide-border">{accountActions(role).map(action => <li key={action.href}><Link className="block py-4 text-accent hover:underline focus-visible:outline-accent" href={action.href}>{action.label}</Link></li>)}</ul></section>
    {owned?.error && <p role="status" className="mt-5 text-text-secondary">Your player profiles couldn’t be loaded. Refresh to try again.</p>}
    {!!owned?.data?.length && <section className="mt-8"><h2 className="text-2xl">Your player profiles</h2><ul className="mt-3 divide-y divide-border">{owned.data.map(row => { const player = Array.isArray(row.players) ? row.players[0] : row.players; return player && <li key={row.player_id}><Link className="block py-4 text-accent hover:underline" href={`/site/player/${player.slug}/edit`}>{player.display_name} — manage details, stats & film</Link></li>; })}</ul></section>}
    <Link href="/auth/forgot-password" className="mt-8 inline-block text-sm text-accent hover:underline">Reset password</Link>
  </div>;
}
