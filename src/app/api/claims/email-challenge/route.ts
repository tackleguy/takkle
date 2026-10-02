import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSession } from "@/lib/profile/access";
import { sendClaimOtpEmail } from "@/lib/claims/mailer";
import {
  accountEmailProvesSchool,
  challengeExpiryIso,
  domainIsVerified,
  hashOtpCode,
  normalizeEmail,
} from "@/lib/claims/email-proof";
import { CLAIM_RATE_LIMIT, EMAIL_OTP, generateOtpCode, isWithinRateLimit } from "@/lib/claims/security";

const bodySchema = z.object({
  playerSlug: z.string().trim().min(1).max(250),
  schoolEmail: z.string().email().max(254),
});

export async function POST(request: Request) {
  const session = await profileSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in before verifying a school email." },
      { status: 401 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid school email." }, { status: 400 });
  }

  const schoolEmail = normalizeEmail(parsed.data.schoolEmail);
  const { db, user } = session;

  const { data: player, error: playerError } = await db
    .from("players")
    .select("id, status")
    .eq("slug", parsed.data.playerSlug)
    .eq("is_synthetic", false)
    .maybeSingle();

  if (playerError) {
    return NextResponse.json({ error: "Claims are temporarily unavailable." }, { status: 503 });
  }
  if (!player) {
    return NextResponse.json({ error: "Player profile not found." }, { status: 404 });
  }
  if (player.status !== "unclaimed") {
    return NextResponse.json(
      { error: "This player already has a claim. File a dispute if ownership is wrong." },
      { status: 409 },
    );
  }

  const confirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
  if (accountEmailProvesSchool(user.email, schoolEmail, confirmed)) {
    const domainVerified = await domainIsVerified(db, schoolEmail);
    return NextResponse.json({
      verified: true,
      method: "account_email",
      domainVerified,
      message: domainVerified
        ? "Your signed-in school email is verified for this claim."
        : "Your account email matches, but this domain isn’t in the verified school registry yet — manual review will confirm it.",
    });
  }

  const since = new Date(Date.now() - CLAIM_RATE_LIMIT.windowHours * 3600_000).toISOString();
  const { count, error: countError } = await db
    .from("claim_email_challenges")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (countError) {
    return NextResponse.json({ error: "Unable to start email verification." }, { status: 503 });
  }
  if (!isWithinRateLimit(count ?? 0)) {
    return NextResponse.json(
      { error: "Too many verification emails today. Try again tomorrow or sign in with your school email." },
      { status: 429 },
    );
  }

  const code = generateOtpCode(EMAIL_OTP.length);
  const { data: challenge, error: saveError } = await db
    .from("claim_email_challenges")
    .insert({
      user_id: user.id,
      player_id: player.id,
      school_email: schoolEmail,
      code_hash: hashOtpCode(code),
      expires_at: challengeExpiryIso(),
      max_attempts: EMAIL_OTP.maxAttempts,
    })
    .select("id")
    .single();

  if (saveError || !challenge) {
    return NextResponse.json({ error: "Couldn’t start school email verification." }, { status: 503 });
  }

  const mailed = await sendClaimOtpEmail(schoolEmail, code);
  if (!mailed.ok) {
    return NextResponse.json({ error: mailed.error }, { status: 503 });
  }

  return NextResponse.json({
    verified: false,
    method: "otp",
    challengeId: challenge.id,
    domainVerified: await domainIsVerified(db, schoolEmail),
    ...(mailed.delivered === false && mailed.devCode ? { devCode: mailed.devCode } : {}),
    message: mailed.delivered
      ? "Enter the code we sent to your school email."
      : "Enter the verification code (dev delivery — check server logs if needed).",
  });
}
