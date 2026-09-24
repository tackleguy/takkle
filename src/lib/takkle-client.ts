import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function resolveServiceRoleKey(): string | null {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    null;
  if (!key) return null;
  if (
    key === "paste_service_role_key_here" ||
    key === "your_service_role_key_here" ||
    key.length < 40
  ) {
    return null;
  }
  return key;
}

function resolveAnyKey(): string | null {
  return (
    resolveServiceRoleKey() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    null
  );
}

/** Server-side Supabase client scoped to the `takkle` schema. Prefers service role. */
export function createTakkleClient(): SupabaseClient<any, "takkle", any> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = resolveAnyKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    db: { schema: "takkle" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Admin client that requires a real service role / secret key. */
export function createTakkleAdminClient(): SupabaseClient<any, "takkle", any> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = resolveServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    db: { schema: "takkle" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isTakkleConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) && resolveAnyKey(),
  );
}

export function hasTakkleServiceRole(): boolean {
  return Boolean(resolveServiceRoleKey());
}
