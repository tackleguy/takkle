import manifest from "@/data/seed/manifest.json";
import schoolsData from "@/data/seed/schools.json";
import ncesSchoolsSample from "@/data/seed/schools-nces-sample.json";
import cfbdSample from "@/data/seed/players-cfbd-sample.json";
import cfbdManifest from "@/data/seed/players-cfbd-manifest.json";
import chunk0 from "@/data/seed/players-chunk-0.json";
import chunk1 from "@/data/seed/players-chunk-1.json";
import chunk2 from "@/data/seed/players-chunk-2.json";
import chunk3 from "@/data/seed/players-chunk-3.json";
import chunk4 from "@/data/seed/players-chunk-4.json";
import chunk5 from "@/data/seed/players-chunk-5.json";
import { isRecruitClassYear } from "@/lib/recruiting/class-years";
import type {
  Player,
  PlayerSearchFilters,
  PlayerSearchResult,
  RankingFilters,
  School,
  SeedManifest,
} from "@/types/recruiting";

const SYNTHETIC_CHUNKS: Player[][] = [
  chunk0,
  chunk1,
  chunk2,
  chunk3,
  chunk4,
  chunk5,
] as Player[][];

let _allPlayers: Player[] | null = null;

/**
 * Local seed switch only (Discover/Home/Rankings prefer live Supabase via live-players).
 * Default remains synthetic for offline UI demos; set cfbd for real CFBD sample names.
 * Prefer TAKKLE_PLAYERS_SOURCE=supabase with Supabase credentials for production.
 */
function playersSource(): string {
  return (
    process.env.TAKKLE_PLAYERS_SOURCE ||
    process.env.NEXT_PUBLIC_TAKKLE_PLAYERS_SOURCE ||
    "synthetic"
  ).toLowerCase();
}

export function getSeedManifest(): SeedManifest {
  if (playersSource() === "cfbd") {
    return cfbdManifest as SeedManifest;
  }
  return manifest as SeedManifest;
}

/** Synthetic 50-school backbone used by demo players (stable IDs). */
export function getSyntheticSchools(): School[] {
  return schoolsData as School[];
}

/**
 * NCES CCD high-school sample (isSynthetic: false).
 * Full dump lives at data/nces/schools.json (gitignored; npm run import:nces-schools).
 */
export function getNcesSchoolsSample(): School[] {
  return ncesSchoolsSample as School[];
}

/**
 * Default: synthetic schools so player seed schoolIds remain valid.
 * Set TAKKLE_SCHOOLS_SOURCE=nces to browse the NCES sample instead.
 */
export function getAllSchools(): School[] {
  if (process.env.TAKKLE_SCHOOLS_SOURCE === "nces") {
    return getNcesSchoolsSample();
  }
  return getSyntheticSchools();
}

/** Commit-sized CFBD sample (always present in repo). */
export function getCfbdPlayersSample(): Player[] {
  return cfbdSample as Player[];
}

/**
 * Prefer full local CFBD dump under data/cfbd/ (from npm run import:cfbd-recruits).
 * Falls back to the committed sample when the dump is missing.
 * Uses dynamic require so client bundles that import this module still build.
 */
function loadCfbdPlayersFromDisk(): Player[] | null {
  if (typeof window !== "undefined") return null;
  try {
    // Dynamic require keeps `fs` out of the static client graph when tree-shaken away.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path");
    const dir = path.join(process.cwd(), "data", "cfbd");
    const manifestPath = path.join(dir, "manifest.json");
    if (!fs.existsSync(manifestPath)) return null;
    const meta = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      chunks?: string[];
    };
    const chunks = meta.chunks?.length
      ? meta.chunks
      : fs
          .readdirSync(dir)
          .filter((f: string) => /^players-chunk-\d+\.json$/.test(f))
          .sort();
    if (!chunks.length) {
      const combined = path.join(dir, "players.json");
      if (fs.existsSync(combined)) {
        return JSON.parse(fs.readFileSync(combined, "utf8")) as Player[];
      }
      return null;
    }
    const players: Player[] = [];
    for (const chunk of chunks) {
      const filePath = path.join(dir, chunk);
      if (!fs.existsSync(filePath)) continue;
      const rows = JSON.parse(fs.readFileSync(filePath, "utf8")) as Player[];
      if (Array.isArray(rows)) players.push(...rows);
    }
    return players.length ? players : null;
  } catch {
    return null;
  }
}

function getSyntheticPlayers(): Player[] {
  return SYNTHETIC_CHUNKS.flat();
}

function getCfbdPlayers(): Player[] {
  const fromDisk = loadCfbdPlayersFromDisk();
  if (fromDisk?.length) return fromDisk;
  return getCfbdPlayersSample();
}

export function getAllPlayers(): Player[] {
  if (!_allPlayers) {
    const source = playersSource();
    const pool = source === "cfbd" ? getCfbdPlayers() : getSyntheticPlayers();
    _allPlayers = [...pool].sort(
      (a, b) => b.tackleScore.score - a.tackleScore.score,
    );
  }
  return _allPlayers;
}

export function getPlayerBySlug(slug: string): Player | undefined {
  return getAllPlayers().find((p) => p.slug === slug);
}

export function getFeaturedPlayer(): Player | undefined {
  const { featuredSlug } = getSeedManifest();
  if (featuredSlug) {
    const featured = getPlayerBySlug(featuredSlug);
    if (featured) return featured;
  }
  return getAllPlayers()[0];
}

export function getTrendingPlayers(limit = 8): Player[] {
  return [...getAllPlayers()]
    .sort((a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0))
    .slice(0, limit);
}

export function getRisingPlayers(limit = 8): Player[] {
  return [...getAllPlayers()]
    .filter((p) => (p.risingDelta ?? 0) > 0)
    .sort((a, b) => (b.risingDelta ?? 0) - (a.risingDelta ?? 0))
    .slice(0, limit);
}

function matchesFilters(player: Player, filters: PlayerSearchFilters): boolean {
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const haystack = [
      player.displayName,
      player.school.name,
      player.position,
      player.stateCode,
      player.hometownCity ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.stateCode && player.stateCode !== filters.stateCode) return false;
  if (filters.position && player.position !== filters.position) return false;
  if (filters.classYear && player.classYear !== filters.classYear) return false;
  if (filters.minScore != null && player.tackleScore.score < filters.minScore) return false;
  if (filters.maxScore != null && player.tackleScore.score > filters.maxScore) return false;
  if (filters.schoolSlug && player.school.slug !== filters.schoolSlug) return false;
  if (filters.status && player.status !== filters.status) return false;
  return true;
}

export function searchPlayers(
  filters: PlayerSearchFilters = {},
  page = 1,
  pageSize = 24,
): PlayerSearchResult {
  const filtered = getAllPlayers().filter((p) => {
    if (!isRecruitClassYear(p.classYear)) return false;
    return matchesFilters(p, filters);
  });
  const start = (page - 1) * pageSize;
  return {
    players: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

export function getRankings(
  filters: RankingFilters,
  limit = 50,
): Player[] {
  let pool = getAllPlayers().filter((p) => isRecruitClassYear(p.classYear));

  if (filters.stateCode) {
    pool = pool.filter((p) => p.stateCode === filters.stateCode);
  }
  if (filters.position) {
    pool = pool.filter((p) => p.position === filters.position);
  }
  if (filters.classYear) {
    pool = pool.filter((p) => p.classYear === filters.classYear);
  }

  return pool
    .sort((a, b) => b.tackleScore.score - a.tackleScore.score)
    .slice(0, limit);
}

export function getAllPlayerSlugs(): string[] {
  return getAllPlayers().map((p) => p.slug);
}

export function getSchoolBySlug(slug: string): School | undefined {
  return getAllSchools().find((s) => s.slug === slug);
}
