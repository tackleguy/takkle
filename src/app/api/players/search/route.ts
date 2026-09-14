import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ACTIVE_COMPETITION_LEVEL } from "@/lib/competition-level";
import { displaySchoolLabel } from "@/lib/player-display";
import { searchPlayers } from "@/lib/players";
import type { ClaimSearchHit } from "@/types/claim-search";

export type { ClaimSearchHit };

function sanitizeQuery(raw: string): string {
  return raw
    .trim()
    .replace(/[%_,.()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function seedFallback(query: string, state: string | null, limit: number): ClaimSearchHit[] {
  const { players } = searchPlayers(
    { query, stateCode: state || undefined },
    1,
    limit,
  );
  return players.map((p) => ({
    id: p.id,
    slug: p.slug,
    displayName: p.displayName,
    firstName: p.firstName,
    lastName: p.lastName,
    position: p.position,
    classYear: p.classYear,
    stateCode: p.stateCode,
    jerseyNumber: p.jerseyNumber ?? null,
    status: p.status,
    verificationStatus: null,
    schoolName: displaySchoolLabel(p.collegeName ?? p.school?.name),
    schoolCity: null,
    source: "seed" as const,
  }));
}

/**
 * Public player search for claim-onboarding (college FBS/FCS only; HS dormant).
 * Prefers live takkle.players; falls back to local seed when Supabase is unset/unreachable.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = sanitizeQuery(searchParams.get("q") ?? "");
  const state = (searchParams.get("state") ?? "").toUpperCase().slice(0, 2) || null;
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 40) || 40, 1), 75);
  const claimableOnly = searchParams.get("claimable") !== "0";

  if (q.length < 2 && !state) {
    return NextResponse.json({ players: [] as ClaimSearchHit[], source: "none" });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      players: seedFallback(q || "a", state, limit),
      source: "seed",
    });
  }

  try {
    const supabase = createClient(url, key, {
      db: { schema: "takkle" },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = supabase
      .from("players")
      .select(
        `
        id,
        slug,
        display_name,
        first_name,
        last_name,
        position,
        class_year,
        state_code,
        jersey_number,
        status,
        verification_status,
        source_school,
        college_name,
        schools ( name, city, state_code )
      `,
      )
      .eq("is_synthetic", false)
      .eq("competition_level", ACTIVE_COMPETITION_LEVEL)
      .order("last_name", { ascending: true })
      .limit(limit);

    if (claimableOnly) {
      query = query.eq("status", "unclaimed");
    }
    if (state) {
      query = query.eq("state_code", state);
    }
    if (q.length >= 2) {
      const pattern = `"%${q.replace(/"/g, "")}%"`;
      query = query.or(
        [
          `display_name.ilike.${pattern}`,
          `first_name.ilike.${pattern}`,
          `last_name.ilike.${pattern}`,
          `source_school.ilike.${pattern}`,
          `college_name.ilike.${pattern}`,
          `slug.ilike.${pattern}`,
        ].join(","),
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("players search supabase error", error.message);
      return NextResponse.json({
        players: seedFallback(q || "a", state, limit),
        source: "seed",
        warning: error.message,
      });
    }

    const players: ClaimSearchHit[] = (data ?? []).map((row) => {
      const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;
      return {
        id: row.id as string,
        slug: row.slug as string,
        displayName: (row.display_name as string) || `${row.first_name} ${row.last_name}`,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        position: (row.position as string) ?? null,
        classYear: (row.class_year as number) ?? null,
        stateCode: (row.state_code as string) ?? null,
        jerseyNumber: (row.jersey_number as number) ?? null,
        status: row.status as string,
        verificationStatus: (row.verification_status as string) ?? null,
        schoolName: displaySchoolLabel(
          (row.college_name as string) ??
            (school as { name?: string } | null)?.name ??
            (row.source_school as string) ??
            null,
        ),
        schoolCity: null,
        source: "supabase" as const,
      };
    });

    return NextResponse.json({ players, source: "supabase" });
  } catch (err) {
    console.error("players search failed", err);
    return NextResponse.json({
      players: seedFallback(q || "a", state, limit),
      source: "seed",
    });
  }
}
