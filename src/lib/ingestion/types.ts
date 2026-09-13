export type PermissionStatus =
  | "permitted"
  | "blocked"
  | "manual_only"
  | "partnership_required"
  | "unknown";

export type VerificationStatus =
  | "unverified"
  | "source_verified"
  | "player_verified"
  | "disputed";

export type IngestionSourceType =
  | "csv_import"
  | "school_submission"
  | "player_submission"
  | "licensed"
  | "state_association"
  | "media_public"
  | "nces_ccd"
  | "manual"
  | "commercial_aggregator"
  | "commercial_platform"
  | "synthetic";

export interface NormalizedSchoolRecord {
  name: string;
  stateCode: string;
  city?: string;
  county?: string;
  ncesId?: string;
  websiteUrl?: string;
  athleticsUrl?: string;
  footballUrl?: string;
  athleticAssociation?: string;
  sourceUrl?: string;
  sourceName: string;
  sourceType: string;
  isSynthetic?: boolean;
}

export interface NormalizedPlayerRecord {
  firstName: string;
  lastName: string;
  position?: string;
  classYear?: number;
  gradeLevel?: number;
  jerseyNumber?: number;
  heightInches?: number;
  weightLbs?: number;
  schoolName: string;
  city?: string;
  stateCode: string;
  seasonYear: number;
  sourceUrl?: string;
  sourceName: string;
  sourceType: string;
  sourceState?: string;
  sourceSchool?: string;
  raw?: Record<string, unknown>;
}

export interface DuplicateMatch {
  confidence: "high" | "medium" | "low";
  signals: string[];
}

export interface IngestionRunSummary {
  adapterKey: string;
  stateCode?: string;
  schoolsDiscovered: number;
  schoolsImported: number;
  playersDiscovered: number;
  playersImported: number;
  duplicatesDetected: number;
  playersRequiringReview: number;
  sourcesFailing: number;
  stoppedAtCap: boolean;
  lastSuccessfulAt?: string;
  errors: string[];
  blockedSources: string[];
}

export interface StateAdapterResult {
  schools: NormalizedSchoolRecord[];
  players: NormalizedPlayerRecord[];
  summary: IngestionRunSummary;
}
