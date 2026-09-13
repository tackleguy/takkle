import { NextRequest, NextResponse } from "next/server";
import { parsePlayerCsv, validateCsvPreview, scoreDuplicateMatch } from "@/lib/ingestion/pipeline";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "takkle" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.csv || typeof body.csv !== "string") {
    return NextResponse.json({ error: "csv string required" }, { status: 400 });
  }
  const mode = body.mode === "confirm" ? "confirm" : "preview";
  const { records, errors } = parsePlayerCsv(body.csv);
  const preview = { ...validateCsvPreview(records), errors };

  if (mode === "preview") {
    return NextResponse.json({ preview });
  }

  const supabase = adminClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "CSV confirm requires SUPABASE_SERVICE_ROLE_KEY on the server. Preview-only is available without it.",
      },
      { status: 503 },
    );
  }

  // Cap
  const { count: existing } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("is_synthetic", false);
  const remaining = Math.max(0, 10000 - (existing || 0));
  const toImport = records.slice(0, remaining);

  let imported = 0;
  let duplicates = 0;

  for (const r of toImport) {
    const { data: existingPlayers } = await supabase
      .from("players")
      .select("id, first_name, last_name, class_year, position, jersey_number, schools(name)")
      .ilike("first_name", r.firstName)
      .ilike("last_name", r.lastName)
      .eq("state_code", r.stateCode)
      .limit(5);

    let skip = false;
    for (const ep of existingPlayers || []) {
      const schoolName =
        (ep as { schools?: { name?: string } | null }).schools?.name || "";
      const match = scoreDuplicateMatch(
        {
          ...r,
          seasonYear: r.seasonYear,
        },
        {
          firstName: ep.first_name,
          lastName: ep.last_name,
          schoolName,
          stateCode: r.stateCode,
          classYear: ep.class_year ?? undefined,
          position: ep.position ?? undefined,
          jerseyNumber: ep.jersey_number ?? undefined,
          seasonYear: r.seasonYear,
          sourceName: "existing",
          sourceType: "existing",
        },
      );
      if (match.confidence === "high") {
        duplicates += 1;
        skip = true;
        break;
      }
    }
    if (skip) continue;

    // Ensure school
    const slugBase = `${r.schoolName}-${r.stateCode}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    let schoolId: string | null = null;
    const { data: school } = await supabase
      .from("schools")
      .select("id")
      .eq("slug", slugBase)
      .maybeSingle();
    if (school?.id) schoolId = school.id;
    else {
      const { data: created } = await supabase
        .from("schools")
        .insert({
          name: r.schoolName,
          slug: slugBase,
          state_code: r.stateCode,
          source_url: r.sourceUrl,
          source_type: "csv_import",
          source_name: "Manual CSV import",
          is_synthetic: false,
          last_verified_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      schoolId = created?.id ?? null;
    }

    const playerSlug = `${r.firstName}-${r.lastName}-${r.position || "ath"}-${r.classYear || r.seasonYear}-${r.schoolName}-${r.stateCode}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120);

    const { data: player, error } = await supabase
      .from("players")
      .insert({
        first_name: r.firstName,
        last_name: r.lastName,
        slug: playerSlug,
        position: r.position,
        class_year: r.classYear,
        school_id: schoolId,
        state_code: r.stateCode,
        jersey_number: r.jerseyNumber,
        height_inches: r.heightInches,
        weight_lbs: r.weightLbs,
        status: "unclaimed",
        source_url: r.sourceUrl,
        source_name: r.sourceName,
        source_type: r.sourceType,
        source_state: r.stateCode,
        source_school: r.schoolName,
        verification_status: "source_verified",
        last_verified_at: new Date().toISOString(),
        source_last_checked: new Date().toISOString(),
        is_synthetic: false,
        ingestion_date: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !player) {
      errors.push(error?.message || `Failed ${r.firstName} ${r.lastName}`);
      continue;
    }
    imported += 1;
  }

  return NextResponse.json({ imported, duplicates, errors, remaining });
}
