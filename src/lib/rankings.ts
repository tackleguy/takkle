import {
  DEFAULT_RECRUIT_CLASS,
  RECRUIT_CLASS_MAX,
  RECRUIT_CLASS_MIN,
  isRecruitClassYear,
} from "@/lib/recruiting/class-years";
import { RANKING_VERSION } from "@/lib/scoring/research-rankings";
import { createTakkleClient } from "@/lib/takkle-client";
import type {
  FootballPosition,
  Player,
  RankingFilters,
  RankingScope,
  School,
  ScoreConfidence,
} from "@/types/recruiting";
import { getRankings as getSeedRankings } from "@/lib/players";

export type RankedPlayerRow = {
  rank: number;
  score: number | null;
  isRising: boolean;
  previousRank: number | null;
  player: Player;
};

function scopeKeyFor(filters: RankingFilters): { scope: RankingScope; scopeKey: string } {
  const scope = filters.scope ?? "position";
  if (scope === "national") return { scope, scopeKey: "national" };
  if (scope === "state") return { scope, scopeKey: filters.stateCode ?? "CA" };
  if (scope === "class") {
    const y = filters.classYear ?? DEFAULT_RECRUIT_CLASS;
    return { scope, scopeKey: String(y) };
  }
  // position (default): prefer position:class when both set
  const pos = filters.position ?? "QB";
  if (filters.classYear && isRecruitClassYear(filters.classYear)) {
    return { scope: "position", scopeKey: `${pos}:${filters.classYear}` };
  }
  return { scope: "position", scopeKey: pos };
}

function mapSchool(raw: { id?: string; name?: string; slug?: string; city?: string; state_code?: string } | null, stateCode: string): School {
  const rawName = raw?.name?.trim() ?? "";
  const placeholder = new Set(["unknown", "wl", "n/a", "tbd", "?"]);
  return {
    id: raw?.id ?? "unknown",
    name: rawName && !placeholder.has(rawName.toLowerCase()) ? rawName : "High school TBD",
    slug: raw?.slug ?? "unknown",
    city: raw?.city ?? "",
    stateCode: raw?.state_code ?? stateCode,
    isSynthetic: false,
  };
}

function toPlayer(row: Record<string, unknown>, score: number, confidence: ScoreConfidence): Player {
  const schoolRaw = Array.isArray(row.schools) ? row.schools[0] : row.schools;
  const stateCode = (row.state_code as string) ?? "NA";
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    displayName: (row.display_name as string) || `${row.first_name} ${row.last_name}`,
    slug: row.slug as string,
    position: ((row.position as string) || "ATH") as FootballPosition,
    classYear: (row.class_year as number) ?? DEFAULT_RECRUIT_CLASS,
    schoolId: (row.school_id as string) ?? "",
    school: mapSchool(schoolRaw as School & { state_code?: string }, stateCode),
    stateCode,
    heightInches: Number(row.height_inches ?? 0) || 0,
    weightLbs: Number(row.weight_lbs ?? 0) || 0,
    jerseyNumber: (row.jersey_number as number) ?? undefined,
    status: (row.status as Player["status"]) ?? "unclaimed",
    isSynthetic: Boolean(row.is_synthetic),
    tackleScore: {
      score,
      version: RANKING_VERSION,
      confidence,
      scoreDate: new Date().toISOString(),
      components: [],
    },
    rankings: [],
    film: [],
    stats: [],
    measurements: [],
    offers: [],
    provenance: {
      sourceName: (row.source_name as string) ?? "Takkle research rankings",
      sourceType: "association_honor_roll",
      sourceUrl: (row.source_url as string) ?? undefined,
      dataOrigin: "licensed",
    },
  };
}

/**
 * Live rankings from takkle.player_rankings for recruiting classes 2027–2031.
 * Falls back to seed only when Supabase is unavailable.
 */
export async function getLiveRankings(
  filters: RankingFilters,
  limit = 50,
): Promise<{ rows: RankedPlayerRow[]; source: "supabase" | "seed"; version: string }> {
  const client = createTakkleClient();
  if (!client) {
    const seed = getSeedRankings(
      {
        ...filters,
        classYear:
          filters.classYear && isRecruitClassYear(filters.classYear)
            ? filters.classYear
            : undefined,
      },
      limit,
    ).filter((p) => isRecruitClassYear(p.classYear));
    return {
      rows: seed.map((player, i) => ({
        rank: i + 1,
        score: player.tackleScore.score,
        isRising: false,
        previousRank: null,
        player,
      })),
      source: "seed",
      version: "seed",
    };
  }

  const { scope, scopeKey } = scopeKeyFor(filters);

  const { data: ranks, error } = await client
    .from("player_rankings")
    .select(
      `
      rank,
      score,
      is_rising,
      previous_rank,
      ranking_version,
      players (
        id, first_name, last_name, display_name, slug, position, class_year,
        school_id, state_code, height_inches, weight_lbs, jersey_number,
        status, is_synthetic, source_name, source_url,
        schools ( id, name, slug, city, state_code )
      )
    `,
    )
    .eq("ranking_scope", scope)
    .eq("scope_key", scopeKey)
    .eq("ranking_version", RANKING_VERSION)
    .gte("class_year", RECRUIT_CLASS_MIN)
    .lte("class_year", RECRUIT_CLASS_MAX)
    .order("rank", { ascending: true })
    .limit(limit);

  if (error || !ranks?.length) {
    // Fallback: try position-only if position:class was empty
    if (scope === "position" && scopeKey.includes(":")) {
      const posOnly = scopeKey.split(":")[0];
      return getLiveRankings({ ...filters, classYear: undefined, position: posOnly as FootballPosition, scope: "position" }, limit);
    }
    return { rows: [], source: "supabase", version: RANKING_VERSION };
  }

  const rows: RankedPlayerRow[] = [];
  for (const r of ranks) {
    const playerRaw = Array.isArray(r.players) ? r.players[0] : r.players;
    if (!playerRaw) continue;
    if ((playerRaw as { is_synthetic?: boolean }).is_synthetic) continue;
    const cy = (playerRaw as { class_year?: number }).class_year;
    if (!isRecruitClassYear(cy)) continue;
    const score = Number(r.score ?? 0);
    rows.push({
      rank: r.rank as number,
      score,
      isRising: Boolean(r.is_rising),
      previousRank: (r.previous_rank as number) ?? null,
      player: toPlayer(playerRaw as Record<string, unknown>, score, "limited"),
    });
  }

  return { rows, source: "supabase", version: RANKING_VERSION };
}
