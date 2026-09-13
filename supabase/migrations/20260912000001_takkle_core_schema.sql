CREATE SCHEMA IF NOT EXISTS takkle;
-- Takkle recruiting platform schema
-- player_id is independent of user_id; profiles may exist unclaimed.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('player', 'parent', 'recruiter', 'school', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE player_status AS ENUM ('unclaimed', 'claimed', 'verified_player', 'verified_athlete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected', 'disputed', 'locked', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE film_type AS ENUM ('highlights', 'full_game', 'game_film', 'individual_clips', 'training', 'camp', 'combine');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE film_verification_status AS ENUM ('unverified', 'player_confirmed', 'platform_verified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE data_origin AS ENUM (
    'official_roster', 'player_submitted', 'parent_submitted',
    'school_submitted', 'platform_evaluated', 'licensed', 'manual_import'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE score_confidence AS ENUM ('high', 'medium', 'limited', 'insufficient');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE domain_verification_status AS ENUM ('pending', 'verified', 'rejected', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('interested', 'offer', 'committed', 'decommitted', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Helper: updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION takkle.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- users (app profile; auth.users is separate — player_id != user_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS takkle.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  account_type account_type NOT NULL DEFAULT 'player',
  display_name text,
  email text,
  phone text, -- never expose publicly
  avatar_url text,
  state_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON takkle.users
  FOR EACH ROW EXECUTE FUNCTION takkle.set_updated_at();

-- ---------------------------------------------------------------------------
-- schools / teams / seasons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS takkle.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  city text,
  state_code text NOT NULL,
  county text,
  region text,
  athletic_association text,
  website_url text,
  athletics_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schools_state_idx ON takkle.schools (state_code);
CREATE INDEX IF NOT EXISTS schools_name_idx ON takkle.schools (name);

CREATE TABLE IF NOT EXISTS takkle.school_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES takkle.schools (id) ON DELETE CASCADE,
  domain text NOT NULL,
  verification_status domain_verification_status NOT NULL DEFAULT 'pending',
  source_url text,
  verification_method text,
  date_verified timestamptz,
  dns_evidence jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, domain)
);

CREATE UNIQUE INDEX IF NOT EXISTS school_domains_domain_idx ON takkle.school_domains (lower(domain));

CREATE TABLE IF NOT EXISTS takkle.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES takkle.schools (id) ON DELETE CASCADE,
  sport text NOT NULL DEFAULT 'football',
  name text NOT NULL,
  level text DEFAULT 'varsity',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teams_school_idx ON takkle.teams (school_id);

CREATE TABLE IF NOT EXISTS takkle.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  label text NOT NULL,
  starts_on date,
  ends_on date,
  UNIQUE (year)
);

-- ---------------------------------------------------------------------------
-- data provenance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS takkle.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL,
  base_url text,
  robots_allowed boolean NOT NULL DEFAULT false,
  license_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS takkle.ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id uuid REFERENCES takkle.data_sources (id),
  status text NOT NULL DEFAULT 'queued',
  schools_discovered integer NOT NULL DEFAULT 0,
  players_discovered integer NOT NULL DEFAULT 0,
  players_imported integer NOT NULL DEFAULT 0,
  duplicates_detected integer NOT NULL DEFAULT 0,
  players_requiring_review integer NOT NULL DEFAULT 0,
  sources_failing integer NOT NULL DEFAULT 0,
  error_summary text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- players (independent of accounts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS takkle.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  display_name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  slug text NOT NULL UNIQUE,
  position text,
  class_year integer,
  school_id uuid REFERENCES takkle.schools (id),
  team_id uuid REFERENCES takkle.teams (id),
  state_code text,
  height_inches numeric(4,1),
  weight_lbs integer,
  jersey_number integer,
  status player_status NOT NULL DEFAULT 'unclaimed',
  bio text,
  hometown_city text,
  -- privacy: never store home address / exact DOB in public profile fields
  search_document tsvector,
  primary_source_id uuid REFERENCES takkle.data_sources (id),
  source_url text,
  source_name text,
  source_type text,
  last_verified_at timestamptz,
  ingestion_date timestamptz,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS players_school_idx ON takkle.players (school_id);
CREATE INDEX IF NOT EXISTS players_state_class_pos_idx ON takkle.players (state_code, class_year, position);
CREATE INDEX IF NOT EXISTS players_status_idx ON takkle.players (status);
CREATE INDEX IF NOT EXISTS players_name_idx ON takkle.players (last_name, first_name);
CREATE INDEX IF NOT EXISTS players_search_idx ON takkle.players USING gin (search_document);

CREATE OR REPLACE FUNCTION takkle.players_search_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_document :=
    setweight(to_tsvector('english', coalesce(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.position, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.state_code, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_search_trg ON takkle.players;
CREATE TRIGGER players_search_trg
  BEFORE INSERT OR UPDATE OF first_name, last_name, position, state_code
  ON takkle.players
  FOR EACH ROW EXECUTE FUNCTION takkle.players_search_update();

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON takkle.players
  FOR EACH ROW EXECUTE FUNCTION takkle.set_updated_at();

-- One active verified owner link
CREATE TABLE IF NOT EXISTS takkle.player_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES takkle.users (id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'player', -- player | parent | guardian
  is_primary_owner boolean NOT NULL DEFAULT true,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, user_id)
);

-- Enforce at most one primary owner per player
CREATE UNIQUE INDEX IF NOT EXISTS player_accounts_one_primary_owner
  ON takkle.player_accounts (player_id)
  WHERE is_primary_owner = true AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS takkle.rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES takkle.teams (id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES takkle.seasons (id) ON DELETE CASCADE,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, season_id)
);

CREATE TABLE IF NOT EXISTS takkle.player_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES takkle.seasons (id) ON DELETE CASCADE,
  team_id uuid REFERENCES takkle.teams (id),
  roster_id uuid REFERENCES takkle.rosters (id),
  position text,
  jersey_number integer,
  data_origin data_origin NOT NULL DEFAULT 'official_roster',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, season_id)
);

CREATE TABLE IF NOT EXISTS takkle.player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  season_id uuid REFERENCES takkle.seasons (id),
  stat_key text NOT NULL,
  stat_value numeric,
  stat_label text,
  unit text,
  data_origin data_origin NOT NULL DEFAULT 'player_submitted',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_stats_player_idx ON takkle.player_stats (player_id);

CREATE TABLE IF NOT EXISTS takkle.player_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  measured_at date,
  forty_yard numeric(4,2),
  vertical_inches numeric(4,1),
  bench_press_lbs integer,
  broad_jump_inches numeric(5,1),
  shuttle numeric(4,2),
  three_cone numeric(4,2),
  data_origin data_origin NOT NULL DEFAULT 'player_submitted',
  source_url text,
  verification_status text DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_measurements_player_idx ON takkle.player_measurements (player_id);

-- ---------------------------------------------------------------------------
-- film
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS takkle.film_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL, -- youtube | hudl | direct_upload | other
  embed_supported boolean NOT NULL DEFAULT true,
  rehost_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS takkle.player_film (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  film_type film_type NOT NULL DEFAULT 'highlights',
  season_year integer,
  game_event text,
  opponent text,
  position_focus text,
  tags text[] DEFAULT '{}',
  source_url text,
  embed_url text,
  thumbnail_url text,
  storage_path text, -- only for permitted direct uploads
  film_source_id uuid REFERENCES takkle.film_sources (id),
  verification_status film_verification_status NOT NULL DEFAULT 'unverified',
  suggested_match_score numeric(4,3),
  find_my_film_candidate boolean NOT NULL DEFAULT false,
  data_origin data_origin NOT NULL DEFAULT 'player_submitted',
  created_by_user_id uuid REFERENCES takkle.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_film_player_idx ON takkle.player_film (player_id);
CREATE INDEX IF NOT EXISTS player_film_find_idx ON takkle.player_film (find_my_film_candidate)
  WHERE find_my_film_candidate = true;

CREATE TABLE IF NOT EXISTS takkle.player_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  title text NOT NULL,
  season_year integer,
  organization text,
  data_origin data_origin NOT NULL DEFAULT 'player_submitted',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS takkle.player_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  school_name text NOT NULL,
  conference text,
  status offer_status NOT NULL DEFAULT 'interested',
  offered_on date,
  notes text,
  data_origin data_origin NOT NULL DEFAULT 'player_submitted',
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS takkle.player_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  school_name text NOT NULL,
  level text, -- fbs | fcs | d2 | d3 | naia | juco
  notes text,
  data_origin data_origin NOT NULL DEFAULT 'player_submitted',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Tackle Score™ (server-side only; never pay-to-raise)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS takkle.score_weight_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  film_evaluation numeric(5,4) NOT NULL DEFAULT 0.25,
  production numeric(5,4) NOT NULL DEFAULT 0.20,
  athleticism numeric(5,4) NOT NULL DEFAULT 0.20,
  measurables numeric(5,4) NOT NULL DEFAULT 0.10,
  competition_level numeric(5,4) NOT NULL DEFAULT 0.10,
  consistency numeric(5,4) NOT NULL DEFAULT 0.10,
  recruiting_signals numeric(5,4) NOT NULL DEFAULT 0.05,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES takkle.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT score_weights_sum_check CHECK (
    abs(
      film_evaluation + production + athleticism + measurables +
      competition_level + consistency + recruiting_signals - 1.0
    ) < 0.001
  )
);

CREATE TABLE IF NOT EXISTS takkle.tackle_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  score numeric(3,1) NOT NULL CHECK (score >= 1.0 AND score <= 10.0),
  score_version text NOT NULL,
  score_date timestamptz NOT NULL DEFAULT now(),
  confidence score_confidence NOT NULL DEFAULT 'limited',
  component_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluator text NOT NULL DEFAULT 'system',
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tackle_scores_one_current
  ON takkle.tackle_scores (player_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS tackle_scores_score_idx ON takkle.tackle_scores (score DESC);

CREATE TABLE IF NOT EXISTS takkle.score_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tackle_score_id uuid NOT NULL REFERENCES takkle.tackle_scores (id) ON DELETE CASCADE,
  component_key text NOT NULL,
  component_score numeric(3,1) NOT NULL,
  weight numeric(5,4) NOT NULL,
  notes text,
  UNIQUE (tackle_score_id, component_key)
);

CREATE TABLE IF NOT EXISTS takkle.player_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  ranking_scope text NOT NULL, -- national | state | position | class | school | region
  scope_key text NOT NULL, -- e.g. FL, QB, 2028, FL:QB:2028
  class_year integer,
  position text,
  state_code text,
  rank integer NOT NULL,
  score numeric(3,1),
  ranking_version text NOT NULL,
  ranking_date date NOT NULL DEFAULT CURRENT_DATE,
  previous_rank integer,
  is_rising boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ranking_scope, scope_key, player_id, ranking_version)
);

CREATE INDEX IF NOT EXISTS player_rankings_lookup_idx
  ON takkle.player_rankings (ranking_scope, scope_key, ranking_version, rank);

-- ---------------------------------------------------------------------------
-- claims / verification / disputes / audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS takkle.verification_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS takkle.player_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES takkle.users (id) ON DELETE CASCADE,
  status claim_status NOT NULL DEFAULT 'pending',
  school_email text,
  jersey_number integer,
  season_year integer,
  roster_match_score numeric(4,3),
  notes text,
  locked_until timestamptz,
  reviewed_by uuid REFERENCES takkle.users (id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_claims_player_idx ON takkle.player_claims (player_id, status);
CREATE INDEX IF NOT EXISTS player_claims_user_idx ON takkle.player_claims (user_id);

-- Only one active pending/locked claim per player from non-rejected statuses that block others
CREATE UNIQUE INDEX IF NOT EXISTS player_claims_one_active
  ON takkle.player_claims (player_id)
  WHERE status IN ('pending', 'locked', 'approved');

CREATE TABLE IF NOT EXISTS takkle.verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES takkle.players (id),
  user_id uuid REFERENCES takkle.users (id),
  claim_id uuid REFERENCES takkle.player_claims (id),
  method_code text REFERENCES takkle.verification_methods (code),
  success boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS takkle.claim_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  claim_id uuid REFERENCES takkle.player_claims (id),
  filed_by_user_id uuid NOT NULL REFERENCES takkle.users (id),
  reason text NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  resolution_notes text,
  resolved_by uuid REFERENCES takkle.users (id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS takkle.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES takkle.users (id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON takkle.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON takkle.audit_logs (created_at DESC);

-- Rate limiting / abuse signals for claims
CREATE TABLE IF NOT EXISTS takkle.claim_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES takkle.users (id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 1,
  UNIQUE (user_id, window_start)
);

-- Platform settings (NIL resource URL, etc.)
CREATE TABLE IF NOT EXISTS takkle.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES takkle.users (id)
);

-- Duplicate review queue
CREATE TABLE IF NOT EXISTS takkle.player_duplicate_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_a_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  player_b_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  match_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending | merged | dismissed
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (player_a_id <> player_b_id)
);

-- ---------------------------------------------------------------------------
-- Seed reference data
-- ---------------------------------------------------------------------------
INSERT INTO takkle.verification_methods (code, label, description) VALUES
  ('school_email', 'School email', 'One-time code to a verified school/district domain mailbox'),
  ('parent_guardian', 'Parent/guardian verification', 'Trusted adult confirms athlete identity'),
  ('roster_match', 'Roster matching', 'Name/school/jersey/season alignment with official roster'),
  ('school_info', 'School/team information', 'Correct school and team details'),
  ('jersey_number', 'Jersey number', 'Jersey confirmation for the season'),
  ('season_info', 'Season information', 'Season-specific details'),
  ('manual_review', 'Manual platform review', 'Human admin review'),
  ('other_trusted', 'Other trusted signal', 'Additional trusted verification signals')
ON CONFLICT (code) DO NOTHING;

INSERT INTO takkle.film_sources (name, source_type, embed_supported, rehost_allowed) VALUES
  ('YouTube', 'youtube', true, false),
  ('Hudl (link/embed when permitted)', 'hudl', true, false),
  ('Direct upload', 'direct_upload', false, true),
  ('Other public source', 'other', true, false)
ON CONFLICT DO NOTHING;

INSERT INTO takkle.score_weight_configs (
  version, film_evaluation, production, athleticism, measurables,
  competition_level, consistency, recruiting_signals, is_active
) VALUES (
  'v1.0', 0.25, 0.20, 0.20, 0.10, 0.10, 0.10, 0.05, true
) ON CONFLICT (version) DO NOTHING;

INSERT INTO takkle.platform_settings (key, value) VALUES
  ('nil_rules', '{"path":"/nil-rules","label":"High School NIL Rules","notice":"NIL rules vary by state and athletic association. Check the current rules before taking action. Not legal advice."}'::jsonb),
  ('ingestion_cap', '{"max_players":3000,"stop_at_cap":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO takkle.seasons (year, label) VALUES
  (2025, '2025'),
  (2026, '2026'),
  (2027, '2027'),
  (2028, '2028'),
  (2029, '2029')
ON CONFLICT (year) DO NOTHING;

INSERT INTO takkle.data_sources (name, source_type, base_url, robots_allowed, license_notes) VALUES
  ('Manual CSV import', 'csv_import', null, false, 'Operator-provided permitted data'),
  ('School athletics submission', 'school_submission', null, false, 'Submitted by school/program'),
  ('Player submission', 'player_submission', null, false, 'Entered by verified player'),
  ('Synthetic demo seed', 'synthetic', null, false, 'Labeled demo data for development')
ON CONFLICT DO NOTHING;
