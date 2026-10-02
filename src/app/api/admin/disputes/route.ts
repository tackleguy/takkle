import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSession } from "@/lib/profile/access";

const bodySchema = z.object({
  disputeId: z.string().uuid(),
  revokeOwner: z.boolean(),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const session = await profileSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid dispute review." }, { status: 400 });
  }

  const { error } = await session.db.rpc("resolve_claim_dispute", {
    p_dispute_id: parsed.data.disputeId,
    p_admin_id: session.user.id,
    p_revoke_owner: parsed.data.revokeOwner,
    p_resolution_notes: parsed.data.notes ?? null,
  });

  if (error) {
    return NextResponse.json(
      {
        error:
          "Couldn’t resolve the dispute. Refresh to check whether it was already reviewed.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ saved: true });
}
