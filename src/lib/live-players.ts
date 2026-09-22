import { restoreCollegeRoster } from "@/lib/profile/college-roster";
import { publicHttpsUrl } from "@/lib/profile/links";
import { DEFAULT_RECRUIT_CLASS } from "@/lib/recruiting/class-years";
import { ACTIVE_COMPETITION_LEVEL } from "@/lib/competition-level";
import {
  COLLEGE_RANKING_VERSION,
  scoreCollegePlayer,
} from "@/lib/scoring/college-provisional";
import { createTakkleClient, isTakkleConfigured } from "@/lib/takkle-client";
import {
  getCollegePlayers,
  getFeaturedPlayer as getSeedFeaturedPlayer,
  getPlayerBySlug as getSeedPlayerBySlug,
  getRisingPlayers as getSeedRisingPlayers,
  getTrendingPlayers as getSeedTrendingPlayers,
  searchPlayers as searchSeedPlayers,
} from "@/lib/players";
import type {
  CollegeDivision,
  CompetitionLevel,
  FootballPosition,
  Player,
  PlayerSearchFilters,
  PlayerSearchResult,
  School,
  ScoreConfidence,
  TransferPortalStatus,
} from "@/types/recruiting";

const PLAYER_SELECT = `
  id, first_name, last_name, display_name, slug, position, class_year,
  school_id, state_code, height_inches, weight_lbs, jersey_number,
  status, is_synthetic, source_name, source_url, source_school, hometown_city,
  competition_level, division, college_name, conference, eligibility_year,
  transfer_portal_status, portal_entry_date, transfer_from_school, transfer_to_school,
  schools ( id, name, slug, city, state_code )
`;

function mapSchool(
  raw: { id?: string; name?: string; slug?: string; city?: string; state_code?: string } | null,
  stateCode: string,
  sourceSchool?: string | null,
  collegeName?: string | null,
): School {
  const placeholder = new Set([
    "unknown",
    "wl",
    "n/a",
    "tbd",
    "?",
    "",
    "transfer portal",
    "the transfer portal",
  ]);
  const rawName = raw?.name?.trim() ?? "";
  const sourceName = sourceSchool?.trim() ?? "";
  const college = collegeName?.trim() ?? "";
  const name =
    (college && !placeholder.has(college.toLowerCase()) && college) ||
    (rawName && !placeholder.has(rawName.toLowerCase()) && rawName) ||
    (sourceName && !placeholder.has(sourceName.toLowerCase()) && sourceName) ||
    "School not listed";

  // For college athletes, school.city often holds hometown — omit it.
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

function toPlayer(
  row: Record<string, unknown>,
  score = 0,
  confidence: ScoreConfidence = "limited",
): Player {
  const schoolRaw = Array.isArray(row.schools) ? row.schools[0] : row.schools;
  const stateCode = (row.state_code as string) ?? "NA";
  const firstName = (row.first_name as string) ?? "";
  const lastName = (row.last_name as string) ?? "";
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
  return restoreCollegeRoster({
    id: row.id as string,
    firstName,
    lastName,
    displayName: (row.display_name as string) || `${firstName} ${lastName}`.trim(),
    slug: row.slug as string,
    position: ((row.position as string) || "ATH") as FootballPosition,
    classYear: (row.class_year as number) ?? DEFAULT_RECRUIT_CLASS,
    schoolId: (row.school_id as string) ?? "",
    school: mapSchool(
      schoolRaw as School & { state_code?: string },
      stateCode,
      row.source_school as string | null | undefined,
      row.college_name as string | null | undefined,
    ),
    stateCode,
    heightInches: Number(row.height_inches ?? 0) || 0,
    weightLbs: Number(row.weight_lbs ?? 0) || 0,
    jerseyNumber: (row.jersey_number as number) ?? undefined,
    status: (row.status as Player["status"]) ?? "unclaimed",
    hometownCity: (row.hometown_city as string) ?? undefined,
    competitionLevel: (row.competition_level as CompetitionLevel) ?? ACTIVE_COMPETITION_LEVEL,
    division,
    collegeName: (() => {
      const raw = (row.college_name as string | null) ?? null;
      if (!raw?.trim()) return null;
      const low = raw.trim().toLowerCase();
      if (low === "transfer portal" || low === "the transfer portal") return null;
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
      sourceName: (row.source_name as string) ?? "Takkle verified sources",
      sourceType: "association_honor_roll",
      sourceUrl: (row.source_url as string) ?? undefined,
      dataOrigin: "licensed",
    },
  });
}

export type LivePlayersSource = "supabase" | "college" | "seed";

function collegeSeedSearch(
  filters: PlayerSearchFilters = {},
  page = 1,
  pageSize = 24,
): PlayerSearchResult & { source: LivePlayersSource } {
  return { ...searchSeedPlayers(filters, page, pageSize), source: "college" };
}

/**
 * Prefer live takkle.players (college FBS/FCS). HS rows are dormant.
 * Fall back to committed college dump (data/college/), never synthetic HS demo.
 */
export async function searchLivePlayers(
  filters: PlayerSearchFilters = {},
  page = 1,
  pageSize = 24,
): Promise<PlayerSearchResult & { source: LivePlayersSource }> {
  const client = createTakkleClient();
  if (!client) {
    return collegeSeedSearch(filters, page, pageSize);
  }

  try {
    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;

    let query = client
      .from("players")
      .select(PLAYER_SELECT, { count: "exact" })
      .eq("is_synthetic", false)
      .eq("competition_level", ACTIVE_COMPETITION_LEVEL)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .range(from, to);

    if (filters.stateCode) query = query.eq("state_code", filters.stateCode);
    if (filters.position) query = query.eq("position", filters.position);
    if (filters.classYear && Number.isFinite(filters.classYear)) {
      query = query.eq("class_year", filters.classYear);
    }
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.schoolSlug) {
      query = query.eq("schools.slug", filters.schoolSlug);
    }
    if (filters.query?.trim()) {
      const q = filters.query.trim().replace(/"/g, "");
      const pattern = `"%${q}%"`;
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

    const { data, error, count } = await query;
    if (error) {
      console.error("searchLivePlayers", error.message);
      return collegeSeedSearch(filters, page, pageSize);
    }

    let players = (data ?? []).map((row) => toPlayer(row as Record<string, unknown>));

    if (filters.minScore != null || filters.maxScore != null) {
      const scored = await attachNationalScores(client, players);
      players = scored.filter((p) => {
        if (filters.minScore != null && p.tackleScore.score < filters.minScore) return false;
        if (filters.maxScore != null && p.tackleScore.score > filters.maxScore) return false;
        return true;
      });
      return {
        players,
        total: players.length,
        page,
        pageSize,
        source: "supabase",
      };
    }

    if (!players.length && (count ?? 0) === 0) {
      return collegeSeedSearch(filters, page, pageSize);
    }

    return {
      players,
      total: count ?? players.length,
      page,
      pageSize,
      source: "supabase",
    };
  } catch (err) {
    console.error("searchLivePlayers failed", err);
    return collegeSeedSearch(filters, page, pageSize);
  }
}

async function attachNationalScores(
  client: NonNullable<ReturnType<typeof createTakkleClient>>,
  players: Player[],
): Promise<Player[]> {
  if (!players.length) return players;
  const ids = players.map((p) => p.id);
  const { data } = await client
    .from("player_rankings")
    .select("player_id, score")
    .eq("ranking_scope", "national")
    .eq("scope_key", "national")
    .eq("ranking_version", COLLEGE_RANKING_VERSION)
    .in("player_id", ids);

  const byId = new Map<string, number>();
  for (const row of data ?? []) {
    byId.set(row.player_id as string, Number(row.score ?? 0));
  }
  return players.map((p) => ({
    ...p,
    tackleScore: {
      ...p.tackleScore,
      score: byId.get(p.id) ?? p.tackleScore.score,
    },
  }));
}

export async function getLivePlayerBySlug(
  slug: string,
): Promise<{ player: Player | null; source: LivePlayersSource }> {
  const client = createTakkleClient();
  if (!client) {
    return { player: getSeedPlayerBySlug(slug) ?? null, source: "college" };
  }

  try {
    const { data, error } = await client
      .from("players")
      .select(PLAYER_SELECT)
      .eq("slug", slug)
      .eq("is_synthetic", false)
      .eq("competition_level", ACTIVE_COMPETITION_LEVEL)
      .maybeSingle();

    if (error || !data) {
      const seed = getSeedPlayerBySlug(slug);
      return { player: seed ?? null, source: seed ? "college" : "supabase" };
    }

    const player = toPlayer(data as Record<string, unknown>);
    const [filmResult, linksResult, statsResult] = await Promise.all([
      client.from("player_film").select("id,title,film_type,season_year,source_url,embed_url,verification_status,data_origin")
        .eq("player_id", player.id).in("verification_status", ["player_confirmed", "platform_verified"]).order("created_at", { ascending: false }),
      client.from("player_external_profiles").select("id,provider,label,source_url").eq("player_id", player.id).order("created_at"),
      client.from("player_stats").select("stat_key,stat_value,stat_label,unit,data_origin,seasons(year)").eq("player_id", player.id),
    ]);
    player.film = (filmResult.data ?? []).map(row => ({ id: row.id, title: row.title, filmType: row.film_type, seasonYear: row.season_year, sourceUrl: row.source_url, embedUrl: row.embed_url, verificationStatus: row.verification_status, dataOrigin: row.data_origin }));
    player.externalProfiles = (linksResult.data ?? []).filter(row => publicHttpsUrl(row.source_url)).map(row => ({ id: row.id, provider: row.provider, label: row.label, sourceUrl: row.source_url }));
    player.stats = (statsResult.data ?? []).map(row => ({ statKey: row.stat_key, statValue: Number(row.stat_value), statLabel: row.stat_label || row.stat_key, unit: row.unit, seasonYear: Number((Array.isArray(row.seasons) ? row.seasons[0] : row.seasons)?.year ?? 0), dataOrigin: row.data_origin }));
    const [withScore] = await attachNationalScores(client, [player]);
    return { player: withScore ?? player, source: "supabase" };
  } catch (err) {
    console.error("getLivePlayerBySlug failed", err);
    return { player: getSeedPlayerBySlug(slug) ?? null, source: "college" };
  }
}

async function playersFromRisingRankings(limit: number): Promise<Player[]> {
  const client = createTakkleClient();
  if (!client) return [];

  const { data, error } = await client
    .from("player_rankings")
    .select(
      `
      rank, score, is_rising, previous_rank,
      players!inner (
        ${PLAYER_SELECT}
      )
    `,
    )
    .eq("ranking_scope", "national")
    .eq("scope_key", "national")
    .eq("ranking_version", COLLEGE_RANKING_VERSION)
    .eq("is_rising", true)
    .eq("players.competition_level", ACTIVE_COMPETITION_LEVEL)
    .eq("players.is_synthetic", false)
    .order("rank", { ascending: true })
    .limit(limit * 3);

  if (error || !data?.length) return [];

  const out: Player[] = [];
  for (const row of data) {
    const raw = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!raw || (raw as { is_synthetic?: boolean }).is_synthetic) continue;
    if ((raw as { competition_level?: string }).competition_level !== ACTIVE_COMPETITION_LEVEL) {
      continue;
    }
    out.push(toPlayer(raw as Record<string, unknown>, Number(row.score ?? 0)));
    if (out.length >= limit) break;
  }
  return out;
}

async function playersFromNationalRankings(limit: number): Promise<Player[]> {
  const client = createTakkleClient();
  if (!client) return [];

  const { data, error } = await client
    .from("player_rankings")
    .select(
      `
      rank, score,
      players!inner (
        ${PLAYER_SELECT}
      )
    `,
    )
    .eq("ranking_scope", "national")
    .eq("scope_key", "national")
    .eq("ranking_version", COLLEGE_RANKING_VERSION)
    .eq("players.competition_level", ACTIVE_COMPETITION_LEVEL)
    .eq("players.is_synthetic", false)
    .order("rank", { ascending: true })
    .limit(limit * 3);

  if (error || !data?.length) {
    // Fallback: plain college roster list when rankings are empty
    const { data: rows } = await client
      .from("players")
      .select(PLAYER_SELECT)
      .eq("is_synthetic", false)
      .eq("competition_level", ACTIVE_COMPETITION_LEVEL)
      .order("last_name", { ascending: true })
      .limit(limit);
    return (rows ?? []).map((row) => toPlayer(row as Record<string, unknown>));
  }

  const out: Player[] = [];
  for (const row of data) {
    const raw = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!raw || (raw as { is_synthetic?: boolean }).is_synthetic) continue;
    if ((raw as { competition_level?: string }).competition_level !== ACTIVE_COMPETITION_LEVEL) {
      continue;
    }
    out.push(toPlayer(raw as Record<string, unknown>, Number(row.score ?? 0)));
    if (out.length >= limit) break;
  }
  return out;
}

export async function getLiveFeaturedPlayer(): Promise<{
  player: Player | null;
  source: LivePlayersSource;
}> {
  if (!isTakkleConfigured()) {
    return { player: getSeedFeaturedPlayer() ?? null, source: "college" };
  }
  const top = await playersFromNationalRankings(1);
  if (top[0]) return { player: top[0], source: "supabase" };
  const college = getCollegePlayers()[0];
  if (college) return { player: college, source: "college" };
  return { player: getSeedFeaturedPlayer() ?? null, source: "college" };
}

export async function getLiveTrendingPlayers(limit = 8): Promise<{
  players: Player[];
  source: LivePlayersSource;
}> {
  if (!isTakkleConfigured()) {
    return { players: getSeedTrendingPlayers(limit), source: "college" };
  }
  const players = await playersFromNationalRankings(limit);
  if (players.length) return { players, source: "supabase" };
  const college = getCollegePlayers().slice(0, limit);
  if (college.length) return { players: college, source: "college" };
  return { players: getSeedTrendingPlayers(limit), source: "college" };
}

export async function getLiveRisingPlayers(limit = 8): Promise<{
  players: Player[];
  source: LivePlayersSource;
}> {
  if (!isTakkleConfigured()) {
    return { players: getSeedRisingPlayers(limit), source: "college" };
  }
  const rising = await playersFromRisingRankings(limit);
  if (rising.length) return { players: rising, source: "supabase" };
  const fallback = await playersFromNationalRankings(limit);
  if (fallback.length) return { players: fallback, source: "supabase" };
  const college = getCollegePlayers().slice(0, limit);
  if (college.length) return { players: college, source: "college" };
  return { players: getSeedRisingPlayers(limit), source: "college" };
}
