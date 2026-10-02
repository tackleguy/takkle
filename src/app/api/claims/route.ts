import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSession } from "@/lib/profile/access";
import {
  accountEmailProvesSchool,
  consumeEmailProofToken,
  domainIsVerified,
  normalizeEmail,
} from "@/lib/claims/email-proof";
import {
  CLAIM_RATE_LIMIT,
  buildClaimSignals,
  currentSeasonYear,
  evaluateClaimStrength,
  isWithinRateLimit,
  rosterMatchScore,
} from "@/lib/claims/security";

const bodySchema = z.object({
  playerSlug: z.string().trim().min(1).max(250),
  schoolEmail: z.string().email().max(254),
  notes: z.string().trim().min(20).max(2000),
  jerseyNumber: z.coerce.number().int().min(0).max(99),
  seasonYear: z.coerce.number().int().min(2000).max(2100),
  relationship: z.enum(["player", "guardian"]).default("player"),
  emailProofToken: z.string().trim().min(16).max(200).optional(),
});

export async function POST(request: Request) {
  const session = await profileSession();
  if (!session) {
    return NextResponse.json(
      {
        error:
          "Sign in before submitting a claim. Claims also require a configured server connection.",
      },
      { status: 401 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Enter school email, jersey number, season year, and at least 20 characters of verification details.",
      },
      { status: 400 },
    );
  }

  const { db, user } = session;
  const schoolEmail = normalizeEmail(parsed.data.schoolEmail);
  const seasonYear = parsed.data.seasonYear;
  const year = currentSeasonYear();
  if (seasonYear < year - 2 || seasonYear > year + 1) {
    return NextResponse.json(
      { error: `Season year should be near the current season (${year - 1}–${year + 1}).` },
      { status: 400 },
    );
  }

  const { data: player, error } = await db
    .from("players")
    .select("id, status, jersey_number, class_year")
    .eq("slug", parsed.data.playerSlug)
    .eq("is_synthetic", false)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Claims are temporarily unavailable. Please try again." }, { status: 503 });
  }
  if (!player) {
    return NextResponse.json(
      { error: "This roster profile must be available in the live database before it can be claimed." },
      { status: 404 },
    );
  }
  if (player.status !== "unclaimed") {
    return NextResponse.json(
      {
        error:
          "This player already has a claim. Use dispute ownership on the profile if you believe it’s wrong.",
        canDispute: true,
        playerSlug: parsed.data.playerSlug,
      },
      { status: 409 },
    );
  }

  const since = new Date(Date.now() - CLAIM_RATE_LIMIT.windowHours * 3600_000).toISOString();
  const { count, error: countError } = await db
    .from("player_claims")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (countError) {
    return NextResponse.json({ error: "Unable to check claims. Please try again." }, { status: 503 });
  }
  if (!isWithinRateLimit(count ?? 0)) {
    return NextResponse.json(
      { error: "You’ve reached the daily claim limit. Try again tomorrow." },
      { status: 429 },
    );
  }

  const confirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
  let emailProofMethod: "account_email" | "otp" | null = null;
  if (accountEmailProvesSchool(user.email, schoolEmail, confirmed)) {
    emailProofMethod = "account_email";
  } else if (parsed.data.emailProofToken) {
    const proof = await consumeEmailProofToken(db, {
      userId: user.id,
      playerId: player.id,
      schoolEmail,
      proofToken: parsed.data.emailProofToken,
    });
    if (!proof.ok) return NextResponse.json({ error: proof.error }, { status: 403 });
    emailProofMethod = proof.method;
  } else {
    return NextResponse.json(
      {
        error:
          "Verify your school email first (OTP), or sign in with that school email as your account email.",
      },
      { status: 403 },
    );
  }

  const domainVerified = await domainIsVerified(db, schoolEmail);
  const rosterScore = rosterMatchScore({
    submittedJersey: parsed.data.jerseyNumber,
    submittedSeason: seasonYear,
    playerJersey: player.jersey_number,
    playerClassYear: player.class_year,
  });
  const signals = buildClaimSignals({
    relationship: parsed.data.relationship,
    schoolEmailVerified: Boolean(emailProofMethod),
    domainVerified,
    jerseyNumber: parsed.data.jerseyNumber,
    seasonYear,
    rosterScore,
  });

  const decision = evaluateClaimStrength({
    playerId: player.id,
    userId: user.id,
    schoolEmail,
    jerseyNumber: parsed.data.jerseyNumber,
    seasonYear,
    signals,
    notes: parsed.data.notes,
  });
  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason }, { status: 400 });
  }

  const { data: claim, error: saveError } = await db
    .from("player_claims")
    .insert({
      player_id: player.id,
      user_id: user.id,
      school_email: schoolEmail,
      notes: parsed.data.notes,
      jersey_number: parsed.data.jerseyNumber,
      season_year: seasonYear,
      roster_match_score: rosterScore,
      relationship: parsed.data.relationship,
      signals,
      domain_verified: domainVerified,
      email_verified_at: new Date().toISOString(),
      email_proof_method: emailProofMethod,
      strength_notes: decision.reason ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (saveError) {
    return NextResponse.json(
      {
        error:
          saveError.code === "23505"
            ? "A claim for this player is already under review."
            : "We couldn’t save your claim. Please try again.",
      },
      { status: saveError.code === "23505" ? 409 : 503 },
    );
  }

  await db.from("verification_events").insert({
    player_id: player.id,
    user_id: user.id,
    claim_id: claim?.id ?? null,
    method_code: emailProofMethod === "otp" ? "school_email" : "school_email",
    success: true,
    evidence: {
      email_proof_method: emailProofMethod,
      domain_verified: domainVerified,
      signals,
      roster_match_score: rosterScore,
      relationship: parsed.data.relationship,
    },
  });

  return NextResponse.json({
    status: "pending",
    playerSlug: parsed.data.playerSlug,
    requiresManualReview: true,
    domainVerified,
    rosterMatchScore: rosterScore,
  });
}
