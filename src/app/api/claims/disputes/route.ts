import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSession } from "@/lib/profile/access";

const bodySchema = z.object({
  playerSlug: z.string().trim().min(1).max(250),
  reason: z.string().trim().min(20).max(2000),
});

export async function POST(request: Request) {
  const session = await profileSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to dispute a claim." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Explain why this ownership is wrong (at least 20 characters)." },
      { status: 400 },
    );
  }

  const { db, user } = session;
  const { data: player, error } = await db
    .from("players")
    .select("id, status")
    .eq("slug", parsed.data.playerSlug)
    .eq("is_synthetic", false)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Disputes are temporarily unavailable." }, { status: 503 });
  if (!player) return NextResponse.json({ error: "Player not found." }, { status: 404 });
  if (player.status === "unclaimed") {
    return NextResponse.json(
      { error: "This profile isn’t claimed yet. Submit a claim instead." },
      { status: 400 },
    );
  }

  const { data: openDispute } = await db
    .from("claim_disputes")
    .select("id")
    .eq("player_id", player.id)
    .in("status", ["open", "under_review"])
    .maybeSingle();
  if (openDispute) {
    return NextResponse.json(
      { error: "A dispute is already open for this player." },
      { status: 409 },
    );
  }

  const { data: claim } = await db
    .from("player_claims")
    .select("id")
    .eq("player_id", player.id)
    .in("status", ["approved", "pending", "disputed", "locked"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: dispute, error: saveError } = await db
    .from("claim_disputes")
    .insert({
      player_id: player.id,
      claim_id: claim?.id ?? null,
      filed_by_user_id: user.id,
      reason: parsed.data.reason,
      status: "open",
    })
    .select("id")
    .single();

  if (saveError) {
    return NextResponse.json({ error: "Couldn’t file the dispute. Try again." }, { status: 503 });
  }

  if (claim?.id) {
    await db
      .from("player_claims")
      .update({ status: "disputed", updated_at: new Date().toISOString() })
      .eq("id", claim.id)
      .eq("status", "approved");
  }

  await db.from("audit_logs").insert({
    actor_user_id: user.id,
    action: "file_claim_dispute",
    entity_type: "player",
    entity_id: player.id,
    metadata: { dispute_id: dispute?.id, reason_length: parsed.data.reason.length },
  });

  return NextResponse.json({ status: "open", disputeId: dispute?.id });
}
