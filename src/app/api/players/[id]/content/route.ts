import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSession, ownsProfile } from "@/lib/profile/access";
import { normalizeStatsUrl, youtubeVideo } from "@/lib/profile/links";

const provider = z.enum(["maxpreps", "247sports", "on3", "espn", "hudl", "other"]);
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("details"), firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), collegeName: z.string().trim().min(2).max(160), heightInches: z.number().min(48).max(96).nullable(), weightLbs: z.number().int().min(80).max(500).nullable() }),
  z.object({ action: z.literal("source"), provider, label: z.string().trim().min(1).max(100), url: z.string().max(2048) }),
  z.object({ action: z.literal("film"), title: z.string().trim().min(1).max(140), url: z.string().max(2048), filmType: z.enum(["highlights", "full_game", "game_film", "individual_clips", "training", "camp", "combine"]), seasonYear: z.number().int().min(2000).max(2100) }),
  z.object({ action: z.literal("remove_source"), id: z.string().uuid() }),
  z.object({ action: z.literal("remove_film"), id: z.string().uuid() }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid player." }, { status: 400 });
  const session = await profileSession();
  if (!session) return NextResponse.json({ error: "Sign in to your player account. Profile editing also requires the server connection to be configured." }, { status: 401 });
  if (!await ownsProfile(session, id)) return NextResponse.json({ error: "Your claim must be verified before you can edit this profile." }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the required fields and measurements, then try again." }, { status: 400 });
  const input = parsed.data;
  const db = session.db;
  let result;
  if (input.action === "details") {
    result = await db.from("players").update({ first_name: input.firstName, last_name: input.lastName, college_name: input.collegeName, height_inches: input.heightInches, weight_lbs: input.weightLbs }).eq("id", id).select("id").single();
  } else if (input.action === "source") {
    const url = normalizeStatsUrl(input.provider, input.url);
    if (!url) return NextResponse.json({ error: "Use an HTTPS player or stats page from the selected site." }, { status: 400 });
    result = await db.from("player_external_profiles").upsert({ player_id: id, provider: input.provider, label: input.label, source_url: url, created_by_user_id: session.user.id }, { onConflict: "player_id,provider,source_url" }).select("id").single();
  } else if (input.action === "film") {
    const video = youtubeVideo(input.url);
    if (!video) return NextResponse.json({ error: "Paste a YouTube watch, share, Shorts, or live video link." }, { status: 400 });
    result = await db.from("player_film").insert({ player_id: id, title: input.title, film_type: input.filmType, season_year: input.seasonYear, source_url: video.sourceUrl, embed_url: video.embedUrl, verification_status: "player_confirmed", data_origin: "player_submitted", created_by_user_id: session.user.id }).select("id").single();
  } else {
    result = await db.from(input.action === "remove_source" ? "player_external_profiles" : "player_film").delete().eq("player_id", id).eq("id", input.id).select("id").single();
  }
  if (result.error) {
    console.error("Profile content save failed", result.error.code);
    return NextResponse.json({ error: "We couldn’t save that change. Try again; if it continues, contact support." }, { status: 503 });
  }
  return NextResponse.json({ saved: true });
}
