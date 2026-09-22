import { createClient } from "@/lib/supabase/server";
import { createTakkleClient } from "@/lib/takkle-client";

/** All mutations use verified Auth identity plus server-owned account grants. */
export async function profileSession() {
  const auth = await createClient();
  if (!auth || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) return null;
  const db = createTakkleClient();
  if (!db) return null;
  const { data: account } = await db.from("users").select("is_active, account_type").eq("id", user.id).maybeSingle();
  if (!account?.is_active) return null;
  return { db, user, isAdmin: account.account_type === "admin" };
}

export async function ownsProfile(session: NonNullable<Awaited<ReturnType<typeof profileSession>>>, playerId: string) {
  const { data, error } = await session.db.from("player_accounts").select("player_id")
    .eq("player_id", playerId).eq("user_id", session.user.id)
    .is("revoked_at", null).not("verified_at", "is", null).maybeSingle();
  return !error && Boolean(data);
}
