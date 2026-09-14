import { DEFAULT_RECRUIT_CLASS, isRecruitClassYear } from "@/lib/recruiting/class-years";
import { ACTIVE_COMPETITION_LEVEL } from "@/lib/competition-level";
import {
  COLLEGE_RANKING_VERSION,
  scoreCollegePlayer,
} from "@/lib/scoring/college-provisional";
import { createTakkleClient } from "@/lib/takkle-client";
import type {
  CollegeDivision,
  CompetitionLevel,
  FootballPosition,
  Player,
  RankingFilters,
  RankingScope,
  School,
  ScoreConfidence,
  TransferPortalStatus,
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
  if (scope === "class") {
    const y = filters.classYear ?? DEFAULT_RECRUIT_CLASS;
    return { scope, scopeKey: String(y) };
  }
  const pos = filters.position ?? "QB";
  if (filters.classYear && isRecruitClassYear(filters.classYear)) {
    return { scope: "position", scopeKey: `${pos}:${filters.classYear}` };
  }
  return { scope: "position", scopeKey: pos };
}

function mapSchool(
  raw: { id?: string; name?: string; slug?: string; city?: string; state_code?: string } | null,
  stateCode: string,
  collegeName?: string | null,
): School {
  const rawName = raw?.name?.trim() ?? "";
  const college = collegeName?.trim() ?? "";
  const placeholder = new Set([
    "unknown",
    "wl",
    "n/a",
    "tbd",
    "?",
    "transfer portal",
    "the transfer portal",
  ]);
  const name =
    (college && !placeholder.has(college.toLowerCase()) && college) ||
    (rawName && !placeholder.has(rawName.toLowerCase()) && rawName) ||
    "Team";
  const isCollege = Boolean(college && !placeholder.has(college.toLowerCase()));
  return {
    id: raw?.id ?? "unknown",
    name,
    slug: raw?.slug ?? "unknown",
    city: isCollege ? "" : (raw?.city ?? ""),
    stateCode: isCollege ? (raw?.state_code ?? "") : (raw?.state_code ?? stateCode),
    isSynthetic: false,
  };
}

function toPlayer(row: Record<string, unknown>, score: number, confidence: ScoreConfidence): Player {
  const schoolRaw = Array.isArray(row.schools) ? row.schools[0] : row.schools;
  const stateCode = (row.state_code as string) ?? "NA";
  const division = (row.division as CollegeDivision | null) ?? null;
  const conference = (row.conference as string | null) ?? null;
  const transferPortalStatus =
    (row.transfer_portal_status as TransferPortalStatus | null) ?? null;
  let finalScore = score;
  let finalConfidence = confidence;
  if (!finalScore) {
    const provisional = scoreCollegePlayer({
      division,
      conference,
      heightInches: Number(row.height_inches ?? 0) || null,
      weightLbs: Number(row.weight_lbs ?? 0) || null,
      transferPortalStatus,
      position: (row.position as string) || "ATH",
    });
    finalScore = provisional.score;
    finalConfidence = provisional.confidence;
  }
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    displayName: (row.display_name as string) || `${row.first_name} ${row.last_name}`,
    slug: row.slug as string,
    position: ((row.position as string) || "ATH") as FootballPosition,
    classYear: (row.class_year as number) ?? DEFAULT_RECRUIT_CLASS,
    schoolId: (row.school_id as string) ?? "",
    school: mapSchool(
      schoolRaw as School & { state_code?: string },
      stateCode,
      row.college_name as string | null | undefined,
    ),
    stateCode,
    heightInches: Number(row.height_inches ?? 0) || 0,
    weightLbs: Number(row.weight_lbs ?? 0) || 0,
    jerseyNumber: (row.jersey_number as number) ?? undefined,
    status: (row.status as Player["status"]) ?? "unclaimed",
    competitionLevel: (row.competition_level as CompetitionLevel) ?? ACTIVE_COMPETITION_LEVEL,
    division,
    collegeName: (() => {
      const raw = (row.college_name as string | null) ?? null;
      if (!raw?.trim()) return null;
      const low = raw.trim().toLowerCase();
      if (low === "transfer portal" || low === "the transfer portal") return "Team";
      return raw;
    })(),
    conference,
    eligibilityYear: (row.eligibility_year as number | null) ?? null,
    transferPortalStatus,
    portalEntryDate: (row.portal_entry_date as string | null) ?? null,
    transferFromSchool: (row.transfer_from_school as string | null) ?? null,
    transferToSchool: (row.transfer_to_school as string | null) ?? null,
    isSynthetic: Boolean(row.is_synthetic),
    tackleScore: {
      score: finalScore,
      version: COLLEGE_RANKING_VERSION,
      confidence: finalConfidence,
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
 * Live rankings for college (FBS/FCS) athletes. HS inventory is dormant.
 * Falls back to committed college dump when Supabase is unavailable.
 */
export async function getLiveRankings(
  filters: RankingFilters,
  limit = 50,
): Promise<{ rows: RankedPlayerRow[]; source: "supabase" | "college" | "seed"; version: string }> {
  const client = createTakkleClient();
  if (!client) {
    const seed = getSeedRankings(
      {
        ...filters,
        // Don't force HS recruit-class window on college athletes
        classYear: filters.classYear,
      },
      limit,
    );
    return {
      rows: seed.map((player, i) => ({
        rank: i + 1,
        score: player.tackleScore.score,
        isRising: false,
        previousRank: null,
        player,
      })),
      source: "college",
      version: "college-dump",
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
      players!inner (
        id, first_name, last_name, display_name, slug, position, class_year,
        school_id, state_code, height_inches, weight_lbs, jersey_number,
        status, is_synthetic, source_name, source_url,
        competition_level, division, college_name, conference, eligibility_year,
        transfer_portal_status, portal_entry_date, transfer_from_school, transfer_to_school,
        schools ( id, name, slug, city, state_code )
      )
    `,
    )
    .eq("ranking_scope", scope)
    .eq("scope_key", scopeKey)
    .eq("ranking_version", COLLEGE_RANKING_VERSION)
    .eq("players.competition_level", ACTIVE_COMPETITION_LEVEL)
    .eq("players.is_synthetic", false)
    .order("rank", { ascending: true })
    .limit(limit);

  if (error || !ranks?.length) {
    if (scope === "position" && scopeKey.includes(":")) {
      const posOnly = scopeKey.split(":")[0];
      return getLiveRankings(
        {
          ...filters,
          classYear: undefined,
          position: posOnly as FootballPosition,
          scope: "position",
        },
        limit,
      );
    }

    // College rankings not yet in DB — use scored college dump (sorted by Tackle Score).
    const seed = getSeedRankings(
      {
        ...filters,
        classYear: filters.classYear,
      },
      limit,
    );
    if (seed.length) {
      return {
        rows: seed.map((player, i) => ({
          rank: i + 1,
          score: player.tackleScore.score,
          isRising: false,
          previousRank: null,
          player,
        })),
        source: "college",
        version: COLLEGE_RANKING_VERSION,
      };
    }

    let rosterQuery = client
      .from("players")
      .select(
        `
        id, first_name, last_name, display_name, slug, position, class_year,
        school_id, state_code, height_inches, weight_lbs, jersey_number,
        status, is_synthetic, source_name, source_url,
        competition_level, division, college_name, conference, eligibility_year,
        transfer_portal_status, portal_entry_date, transfer_from_school, transfer_to_school,
        schools ( id, name, slug, city, state_code )
      `,
      )
      .eq("competition_level", ACTIVE_COMPETITION_LEVEL)
      .eq("is_synthetic", false)
      .order("last_name", { ascending: true })
      .limit(Math.max(limit * 5, 200));

    if (filters.position) rosterQuery = rosterQuery.eq("position", filters.position);
    if (filters.stateCode) rosterQuery = rosterQuery.eq("state_code", filters.stateCode);
    if (filters.classYear) rosterQuery = rosterQuery.eq("class_year", filters.classYear);

    const { data: roster } = await rosterQuery;
    const rows: RankedPlayerRow[] = (roster ?? [])
      .map((raw) => {
        const player = toPlayer(raw as Record<string, unknown>, 0, "limited");
        return {
          rank: 0,
          score: player.tackleScore.score,
          isRising: false,
          previousRank: null,
          player,
        };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit)
      .map((row, i) => ({ ...row, rank: i + 1 }));
    return { rows, source: "supabase", version: COLLEGE_RANKING_VERSION };
  }

  const rows: RankedPlayerRow[] = [];
  for (const r of ranks) {
    const playerRaw = Array.isArray(r.players) ? r.players[0] : r.players;
    if (!playerRaw) continue;
    if ((playerRaw as { is_synthetic?: boolean }).is_synthetic) continue;
    if ((playerRaw as { competition_level?: string }).competition_level !== ACTIVE_COMPETITION_LEVEL) {
      continue;
    }
    const score = Number(r.score ?? 0);
    rows.push({
      rank: r.rank as number,
      score,
      isRising: Boolean(r.is_rising),
      previousRank: (r.previous_rank as number) ?? null,
      player: toPlayer(playerRaw as Record<string, unknown>, score, "limited"),
    });
  }

  return { rows, source: "supabase", version: COLLEGE_RANKING_VERSION };
}
