import { NextResponse } from "next/server";
import { z } from "zod";
import {
  evaluateClaimStrength,
  isWithinRateLimit,
  type ClaimVerificationSignal,
} from "@/lib/claims/security";
import { getPlayerBySlug } from "@/lib/players";

const bodySchema = z.object({
  playerSlug: z.string().min(1),
  userId: z.string().uuid().optional(),
  schoolEmail: z.string().email().optional(),
  jerseyNumber: z.number().int().min(0).max(99).optional(),
  seasonYear: z.number().int().min(2020).max(2035).optional(),
  signals: z.array(
    z.enum([
      "school_email",
      "parent_guardian",
      "roster_match",
      "school_info",
      "jersey_number",
      "season_info",
      "manual_review",
      "other_trusted",
    ]),
  ),
  notes: z.string().max(2000).optional(),
  attemptCount: z.number().int().min(0).default(0),
});

/**
 * Server-side claim evaluation.
 * Does not grant ownership without verification — queues review when needed.
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid claim payload" }, { status: 400 });
  }

  const data = parsed.data;
  if (!isWithinRateLimit(data.attemptCount)) {
    return NextResponse.json(
      { error: "Too many claim attempts. Try again later." },
      { status: 429 },
    );
  }

  const player = getPlayerBySlug(data.playerSlug);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (player.status === "verified_player" || player.status === "verified_athlete") {
    return NextResponse.json(
      {
        error: "This profile already has a verified owner. File a dispute if you believe this is wrong.",
        disputeRequired: true,
      },
      { status: 409 },
    );
  }

  const decision = evaluateClaimStrength({
    playerId: player.id,
    userId: data.userId ?? "00000000-0000-0000-0000-000000000000",
    schoolEmail: data.schoolEmail,
    jerseyNumber: data.jerseyNumber,
    seasonYear: data.seasonYear,
    signals: data.signals as ClaimVerificationSignal[],
    notes: data.notes,
  });

  return NextResponse.json({
    playerId: player.id,
    playerSlug: player.slug,
    status: decision.allowed
      ? decision.requiresManualReview
        ? "pending_review"
        : "approved_pending_verification"
      : "rejected",
    ...decision,
    notice:
      "Email ownership alone does not prove you are the athlete. Claims are audited and locked against takeover.",
  });
}
