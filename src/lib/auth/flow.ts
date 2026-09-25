import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountType } from "@/types/recruiting";

export const SIGNUP_ROLES = [
  { value: "player", label: "Player" },
  { value: "parent", label: "Parent / guardian" },
  { value: "recruiter", label: "Recruiter" },
  { value: "coach", label: "Coach" },
  { value: "business", label: "Business" },
] as const;
export type SignupRole = typeof SIGNUP_ROLES[number]["value"];

export function safeNext(raw: string | null | undefined, fallback = "/account"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u0020]/.test(raw)) return fallback;
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("//") || /[\\\u0000-\u0020]/.test(decoded)) return fallback;
    const url = new URL(raw, "https://takkle.invalid");
    if (url.origin !== "https://takkle.invalid" || url.pathname.startsWith("/auth/")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return fallback; }
}

/** Post-signup destination by role — discovery-first tutorials when no explicit next. */
export function signupNextForRole(role: SignupRole, rawNext?: string | null): string {
  const explicit = rawNext && rawNext !== "/account" ? safeNext(rawNext, "") : "";
  if (explicit) return explicit;
  switch (role) {
    case "player":
    case "parent":
      return "/tutorial/player";
    case "business":
      return "/tutorial/business";
    case "recruiter":
    case "coach":
      return "/discover";
    default:
      return "/";
  }
}

export function accountActions(role: AccountType | null) {
  switch (role) {
    case "player":
      return [
        { href: "/discover", label: "Browse live player dossiers" },
        { href: "/tutorial/player", label: "Player walkthrough" },
        { href: "/onboarding", label: "Claim or manage your player profile" },
        { href: "/guides", label: "Read player guides" },
      ];
    case "parent":
      return [
        { href: "/discover", label: "Browse live player dossiers" },
        { href: "/tutorial/player", label: "Player walkthrough" },
        { href: "/onboarding", label: "Help your athlete claim their profile" },
        { href: "/guides", label: "Read player and family guides" },
      ];
    case "recruiter":
      return [
        { href: "/discover", label: "Discover college players" },
        { href: "/rankings", label: "Browse player rankings" },
      ];
    case "coach":
      return [
        { href: "/discover", label: "Find players and school rosters" },
        { href: "/rankings", label: "Compare player rankings" },
      ];
    case "business":
      return [
        { href: "/nil/scores", label: "Explore college NIL profiles" },
        { href: "/tutorial/business", label: "Business walkthrough" },
        { href: "/discover", label: "Find athletes" },
      ];
    case "school":
      return [
        { href: "/discover", label: "Find your school’s players" },
        { href: "/college", label: "View college resources" },
      ];
    case "admin":
      return [
        { href: "/admin/claims", label: "Review player claims" },
        { href: "/admin", label: "Open administration" },
      ];
    default:
      return [
        { href: "/discover", label: "Discover college players" },
        { href: "/guides", label: "Read player guides" },
      ];
  }
}

export async function signUpAccount(client: SupabaseClient, input: { email: string; password: string; role: SignupRole; origin: string; next?: string | null }) {
  if (!SIGNUP_ROLES.some(role => role.value === input.role)) throw new Error("Choose one of the available account types.");
  const next = signupNextForRole(input.role, input.next);
  const { data, error } = await client.auth.signUp({
    email: input.email.trim(), password: input.password,
    options: { data: { account_type: input.role }, emailRedirectTo: `${input.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) throw error;
  // Confirmation-enabled projects correctly return a user without a session.
  return { state: data.session ? "signed_in" as const : "confirmation_required" as const, next };
}

export function callbackNext(raw: string | null | undefined): string {
  return raw === "/auth/reset-password" ? raw : safeNext(raw);
}
