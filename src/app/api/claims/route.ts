import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSession } from "@/lib/profile/access";

const bodySchema = z.object({
  playerSlug: z.string().trim().min(1).max(250),
  schoolEmail: z.string().email().max(254),
  notes: z.string().trim().min(20).max(2000),
});

export async function POST(request: Request) {
  const session = await profileSession();
  if (!session) return NextResponse.json({ error: "Sign in before submitting a claim. Claims also require a configured server connection." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your school email and at least 20 characters of verification details." }, { status: 400 });
  const { db, user } = session;
  const { data: player, error } = await db.from("players").select("id, status").eq("slug", parsed.data.playerSlug).eq("is_synthetic", false).maybeSingle();
  if (error) return NextResponse.json({ error: "Claims are temporarily unavailable. Please try again." }, { status: 503 });
  if (!player) return NextResponse.json({ error: "This roster profile must be available in the live database before it can be claimed." }, { status: 404 });
  if (player.status !== "unclaimed") return NextResponse.json({ error: "This player already has a claim. Contact support if you need to dispute ownership." }, { status: 409 });
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count, error: countError } = await db.from("player_claims").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if (countError) return NextResponse.json({ error: "Unable to check claims. Please try again." }, { status: 503 });
  if ((count ?? 0) >= 5) return NextResponse.json({ error: "You’ve reached the daily claim limit. Try again tomorrow." }, { status: 429 });
  const { error: saveError } = await db.from("player_claims").insert({ player_id: player.id, user_id: user.id, school_email: parsed.data.schoolEmail, notes: parsed.data.notes, status: "pending" });
  if (saveError) return NextResponse.json({ error: saveError.code === "23505" ? "A claim for this player is already under review." : "We couldn’t save your claim. Please try again." }, { status: saveError.code === "23505" ? 409 : 503 });
  return NextResponse.json({ status: "pending", playerSlug: parsed.data.playerSlug });
}
