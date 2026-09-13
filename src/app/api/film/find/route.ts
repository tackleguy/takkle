import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlayerBySlug, getAllPlayers } from "@/lib/players";

const querySchema = z.object({
  playerSlug: z.string().min(1),
});

/**
 * FIND MY FILM — suggest public film candidates.
 * Never auto-attach ambiguous film. No facial recognition.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    playerSlug: searchParams.get("playerSlug"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "playerSlug required" }, { status: 400 });
  }

  const player = getPlayerBySlug(parsed.data.playerSlug);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const ownCandidates = (player.film ?? [])
    .filter((f) => f.verificationStatus === "unverified" || f.findMyFilmCandidate)
    .map((f) => ({
      id: f.id,
      title: f.title,
      seasonYear: f.seasonYear,
      opponent: f.opponent,
      filmType: f.filmType,
      sourceUrl: f.sourceUrl,
      status: "suggested" as const,
      prompt: "Is this you?",
    }));

  // Nearby school/season titles as additional suggestions (permitted public metadata only)
  const peers = getAllPlayers()
    .filter(
      (p) =>
        p.id !== player.id &&
        p.school.slug === player.school.slug &&
        p.classYear === player.classYear,
    )
    .slice(0, 3);

  const peerSuggestions = peers.flatMap((p) =>
    (p.film ?? []).slice(0, 1).map((f) => ({
      id: `peer-${f.id}`,
      title: `${player.school.name} vs ${f.opponent ?? "Opponent"} — ${f.seasonYear ?? player.classYear - 1}`,
      seasonYear: f.seasonYear,
      opponent: f.opponent,
      filmType: f.filmType,
      sourceUrl: f.sourceUrl,
      status: "suggested" as const,
      prompt: "Is this you?",
      ambiguous: true,
    })),
  );

  return NextResponse.json({
    playerSlug: player.slug,
    candidates: [...ownCandidates, ...peerSuggestions].slice(0, 8),
    policy: {
      autoAttach: false,
      facialRecognition: false,
      confirmActions: ["THAT'S ME", "NOT ME"],
    },
  });
}

const confirmSchema = z.object({
  playerSlug: z.string(),
  filmId: z.string(),
  decision: z.enum(["thats_me", "not_me"]),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.decision === "not_me") {
    return NextResponse.json({
      attached: false,
      verificationStatus: "rejected_by_player",
    });
  }

  // Ambiguous peer suggestions never auto-confirm to platform_verified
  const ambiguous = parsed.data.filmId.startsWith("peer-");
  return NextResponse.json({
    attached: !ambiguous,
    verificationStatus: ambiguous ? "unverified" : "player_confirmed",
    notice: ambiguous
      ? "Ambiguous match — not attached. Add the link manually if it is yours."
      : "Film marked Player Confirmed. Platform verification may follow.",
  });
}
