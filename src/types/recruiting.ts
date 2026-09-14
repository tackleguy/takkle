/** Core recruiting domain types — player_id is independent of user_id. */

export type AccountType =
  | "player"
  | "parent"
  | "recruiter"
  | "school"
  | "business"
  | "coach"
  | "admin";

export type PlayerStatus =
  | "unclaimed"
  | "claimed"
  | "verified_player"
  | "verified_athlete";

export type ClaimStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "disputed"
  | "locked"
  | "withdrawn";

export type FilmType =
  | "highlights"
  | "full_game"
  | "game_film"
  | "individual_clips"
  | "training"
  | "camp"
  | "combine";

export type FilmVerificationStatus =
  | "unverified"
  | "player_confirmed"
  | "platform_verified";

export type DataOrigin =
  | "official_roster"
  | "player_submitted"
  | "parent_submitted"
  | "school_submitted"
  | "platform_evaluated"
  | "licensed"
  | "manual_import";

export type ScoreConfidence = "high" | "medium" | "limited" | "insufficient";

export type RankingScope =
  | "national"
  | "position"
  | "class"
  | "school"
  | "region";

export type OfferStatus =
  | "interested"
  | "offer"
  | "committed"
  | "decommitted"
  | "withdrawn";

export type FootballPosition =
  | "QB"
  | "RB"
  | "WR"
  | "TE"
  | "OL"
  | "DL"
  | "LB"
  | "DB"
  | "K"
  | "P"
  | "ATH";

export interface School {
  id: string;
  name: string;
  slug: string;
  city: string;
  stateCode: string;
  county?: string;
  region?: string;
  athleticAssociation?: string;
  /** NCES school ID (NCESSCH) when sourced from CCD. */
  ncesId?: string;
  websiteUrl?: string;
  isCharter?: boolean;
  schoolType?: string;
  level?: string;
  gradeLow?: string;
  gradeHigh?: string;
  leaName?: string;
  /** False for NCES/real imports; synthetic seed schools omit or leave undefined. */
  isSynthetic?: boolean;
  provenance?: PlayerProvenance & {
    schoolYear?: string;
    license?: string;
  };
}

export interface PlayerStat {
  statKey: string;
  statValue: number;
  statLabel: string;
  unit?: string;
  seasonYear: number;
  dataOrigin: DataOrigin;
}

export interface PlayerMeasurement {
  measuredAt?: string;
  fortyYard?: number;
  verticalInches?: number;
  benchPressLbs?: number;
  broadJumpInches?: number;
  shuttle?: number;
  threeCone?: number;
  dataOrigin: DataOrigin;
}

export interface PlayerFilm {
  id: string;
  title: string;
  description?: string;
  filmType: FilmType;
  seasonYear?: number;
  opponent?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  verificationStatus: FilmVerificationStatus;
  findMyFilmCandidate?: boolean;
  dataOrigin: DataOrigin;
}

export interface PlayerOffer {
  schoolName: string;
  conference?: string;
  status: OfferStatus;
  offeredOn?: string;
}

export interface PlayerRanking {
  scope: RankingScope;
  scopeKey: string;
  rank: number;
  totalInScope: number;
  label: string;
}

export interface TackleScoreComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
}

export interface TackleScore {
  score: number;
  version: string;
  confidence: ScoreConfidence;
  scoreDate: string;
  components: TackleScoreComponent[];
}

export interface PlayerProvenance {
  sourceName: string;
  sourceType: string;
  sourceUrl?: string;
  dataOrigin: DataOrigin;
  lastVerifiedAt?: string;
  ingestionDate?: string;
  /** CFBD-only provenance; never use for Tackle Score or displayed rank. */
  license?: string;
  cfbdRecruitId?: string;
  cfbdRating?: number;
  cfbdStars?: number;
  cfbdRanking?: number;
  note?: string;
}

export type CompetitionLevel = "hs" | "college";
export type CollegeDivision = "fbs" | "fcs";
export type TransferPortalStatus =
  | "not_in_portal"
  | "entered"
  | "withdrawn"
  | "committed"
  | "enrolled"
  | "unknown";

/** Public player profile — id is player_id, never auth user_id. */
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  slug: string;
  position: FootballPosition;
  classYear: number;
  schoolId: string;
  school: School;
  stateCode: string;
  heightInches: number;
  weightLbs: number;
  jerseyNumber?: number;
  status: PlayerStatus;
  bio?: string;
  hometownCity?: string;
  /** hs = dormant inventory; college = Transfer/NIL portal surface (FBS/FCS). */
  competitionLevel?: CompetitionLevel;
  division?: CollegeDivision | null;
  collegeName?: string | null;
  conference?: string | null;
  eligibilityYear?: number | null;
  transferPortalStatus?: TransferPortalStatus | null;
  portalEntryDate?: string | null;
  transferFromSchool?: string | null;
  transferToSchool?: string | null;
  isSynthetic: boolean;
  isFeatured?: boolean;
  tackleScore: TackleScore;
  rankings: PlayerRanking[];
  film: PlayerFilm[];
  stats: PlayerStat[];
  measurements: PlayerMeasurement[];
  offers: PlayerOffer[];
  provenance: PlayerProvenance;
  trendingScore?: number;
  risingDelta?: number;
}

export interface PlayerSearchFilters {
  query?: string;
  stateCode?: string;
  position?: FootballPosition;
  classYear?: number;
  minScore?: number;
  maxScore?: number;
  schoolSlug?: string;
  status?: PlayerStatus;
}

export interface PlayerSearchResult {
  players: Player[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RankingFilters {
  scope: RankingScope;
  stateCode?: string;
  position?: FootballPosition;
  classYear?: number;
}

export interface SeedManifest {
  version: string;
  generatedAt: string;
  playerCount: number;
  schoolCount: number;
  chunks: string[];
  featuredSlug: string | null;
  isSynthetic: boolean;
}
