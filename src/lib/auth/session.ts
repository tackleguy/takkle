import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/types/recruiting";

/** Basic account access uses the user's verified session, never the service key. */
export async function accountSession() {
  try {
    const client = await createClient();
    if (!client) return { status: "unavailable" as const };
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return { status: "signed_out" as const };
    const db = client.schema("takkle");
    const { data: account, error: accountError } = await db.from("users")
      .select("account_type,display_name,is_active").eq("id", user.id).maybeSingle();
    if (accountError || !account) return { status: "profile_unavailable" as const, user };
    if (!account.is_active) return { status: "inactive" as const, user };
    return { status: "signed_in" as const, user, db, role: account.account_type as AccountType, displayName: account.display_name as string | null };
  } catch { return { status: "unavailable" as const }; }
}
