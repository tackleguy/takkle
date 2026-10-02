import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSession } from "@/lib/profile/access";
import {
  generateProofToken,
  hashSecret,
  proofExpiryIso,
  otpMatches,
} from "@/lib/claims/email-proof";
import { EMAIL_OTP } from "@/lib/claims/security";

const bodySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().trim().min(4).max(12),
});

export async function POST(request: Request) {
  const session = await profileSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in before confirming a school email." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the verification code from your school email." }, { status: 400 });
  }

  const { db, user } = session;
  const { data: challenge, error } = await db
    .from("claim_email_challenges")
    .select("id, code_hash, attempts, max_attempts, expires_at, verified_at, user_id")
    .eq("id", parsed.data.challengeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Unable to confirm the code." }, { status: 503 });
  if (!challenge) return NextResponse.json({ error: "Verification challenge not found." }, { status: 404 });
  if (challenge.verified_at) {
    return NextResponse.json({ error: "This code was already used. Request a new one if needed." }, { status: 409 });
  }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "That code expired. Request a new one." }, { status: 410 });
  }
  if ((challenge.attempts ?? 0) >= (challenge.max_attempts ?? EMAIL_OTP.maxAttempts)) {
    return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
  }

  if (!otpMatches(parsed.data.code, String(challenge.code_hash))) {
    await db
      .from("claim_email_challenges")
      .update({ attempts: (challenge.attempts ?? 0) + 1 })
      .eq("id", challenge.id);
    return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
  }

  const proofToken = generateProofToken();
  const { error: updateError } = await db
    .from("claim_email_challenges")
    .update({
      verified_at: new Date().toISOString(),
      proof_token_hash: hashSecret(proofToken),
      proof_expires_at: proofExpiryIso(),
    })
    .eq("id", challenge.id);

  if (updateError) {
    return NextResponse.json({ error: "Couldn’t confirm school email. Try again." }, { status: 503 });
  }

  return NextResponse.json({
    verified: true,
    method: "otp",
    proofToken,
    expiresInMinutes: EMAIL_OTP.proofTtlMinutes,
  });
}
