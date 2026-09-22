import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSession } from "@/lib/profile/access";

export async function POST(request: Request) {
  const session = await profileSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = z.object({ claimId: z.string().uuid(), approve: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  const { error } = await session.db.rpc("review_player_claim", { p_claim_id: parsed.data.claimId, p_reviewer_id: session.user.id, p_approve: parsed.data.approve });
  if (error) return NextResponse.json({ error: "Couldn’t complete the review. Refresh to check whether this claim has already been reviewed or the player has an owner." }, { status: 409 });
  return NextResponse.json({ saved: true });
}
