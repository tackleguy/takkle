import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMAIL_OTP,
  emailsMatch,
  generateProofToken,
  hashSecret,
  isVerifiedSchoolDomain,
  normalizeEmail,
  safeEqualHash,
} from "@/lib/claims/security";

// Takkle clients use schema "takkle"; keep this loose so callers type-check.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export async function loadVerifiedDomains(db: Db): Promise<string[]> {
  const { data, error } = await db
    .from("school_domains")
    .select("domain")
    .eq("verification_status", "verified");
  if (error) {
    console.error("school_domains lookup failed", error.code);
    return [];
  }
  return (data ?? []).map((row) => String(row.domain));
}

export async function domainIsVerified(db: Db, email: string): Promise<boolean> {
  const domains = await loadVerifiedDomains(db);
  return isVerifiedSchoolDomain(email, domains);
}

/** Prefer proving the school mailbox via the already-confirmed auth email. */
export function accountEmailProvesSchool(
  authEmail: string | undefined,
  schoolEmail: string,
  emailConfirmed: boolean,
): boolean {
  if (!authEmail || !emailConfirmed) return false;
  return emailsMatch(authEmail, schoolEmail);
}

export async function consumeEmailProofToken(
  db: Db,
  input: { userId: string; playerId: string; schoolEmail: string; proofToken: string },
): Promise<{ ok: true; method: "otp" } | { ok: false; error: string }> {
  const tokenHash = hashSecret(input.proofToken);
  const { data, error } = await db
    .from("claim_email_challenges")
    .select("id, school_email, verified_at, proof_expires_at, proof_used_at")
    .eq("user_id", input.userId)
    .eq("player_id", input.playerId)
    .eq("proof_token_hash", tokenHash)
    .maybeSingle();

  if (error) return { ok: false, error: "Unable to verify school email proof. Try again." };
  if (!data?.verified_at || data.proof_used_at) {
    return { ok: false, error: "Verify your school email before submitting this claim." };
  }
  if (!data.proof_expires_at || new Date(data.proof_expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Your school email verification expired. Request a new code." };
  }
  if (!emailsMatch(String(data.school_email), input.schoolEmail)) {
    return { ok: false, error: "School email doesn’t match the verified address." };
  }

  const { error: useError } = await db
    .from("claim_email_challenges")
    .update({ proof_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .is("proof_used_at", null);

  if (useError) return { ok: false, error: "Unable to use school email proof. Request a new code." };
  return { ok: true, method: "otp" };
}

export function proofExpiryIso(now = Date.now()): string {
  return new Date(now + EMAIL_OTP.proofTtlMinutes * 60_000).toISOString();
}

export function challengeExpiryIso(now = Date.now()): string {
  return new Date(now + EMAIL_OTP.ttlMinutes * 60_000).toISOString();
}

export function hashOtpCode(code: string): string {
  return hashSecret(code.trim());
}

export function otpMatches(code: string, codeHash: string): boolean {
  return safeEqualHash(hashOtpCode(code), codeHash);
}

export { normalizeEmail, hashSecret, generateProofToken };
