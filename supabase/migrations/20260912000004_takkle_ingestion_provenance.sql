-- Takkle ingestion provenance + school/player source metadata
-- Extends existing schema; does not duplicate tables.

ALTER TABLE takkle.schools
  ADD COLUMN IF NOT EXISTS nces_id text,
  ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS football_url text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS schools_nces_id_uidx
  ON takkle.schools (nces_id)
  WHERE nces_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS schools_is_synthetic_idx
  ON takkle.schools (is_synthetic);

CREATE INDEX IF NOT EXISTS schools_source_type_idx
  ON takkle.schools (source_type);

DO $$ BEGIN
  CREATE TYPE player_verification_status AS ENUM (
    'unverified', 'source_verified', 'player_verified', 'disputed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE takkle.players
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS source_state text,
  ADD COLUMN IF NOT EXISTS source_school text,
  ADD COLUMN IF NOT EXISTS source_last_checked timestamptz;

CREATE INDEX IF NOT EXISTS players_verification_status_idx
  ON takkle.players (verification_status);

CREATE INDEX IF NOT EXISTS players_is_synthetic_idx
  ON takkle.players (is_synthetic);

ALTER TABLE takkle.data_sources
  ADD COLUMN IF NOT EXISTS state_code text,
  ADD COLUMN IF NOT EXISTS permission_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS robots_checked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_checked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS active boolean;

UPDATE takkle.data_sources SET active = is_active WHERE active IS NULL;
ALTER TABLE takkle.data_sources ALTER COLUMN active SET DEFAULT true;
UPDATE takkle.data_sources SET active = COALESCE(active, is_active, true);

ALTER TABLE takkle.ingestion_runs
  ADD COLUMN IF NOT EXISTS state_code text,
  ADD COLUMN IF NOT EXISTS adapter_key text;

CREATE TABLE IF NOT EXISTS takkle.player_source_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  data_source_id uuid REFERENCES takkle.data_sources (id),
  source_name text NOT NULL,
  source_url text,
  source_type text,
  source_state text,
  source_school text,
  season_year integer,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_last_checked timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, source_url, season_year)
);

CREATE INDEX IF NOT EXISTS player_source_refs_player_idx
  ON takkle.player_source_refs (player_id);

CREATE INDEX IF NOT EXISTS player_source_refs_source_idx
  ON takkle.player_source_refs (data_source_id);

ALTER TABLE takkle.player_source_refs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS player_source_refs_public_read ON takkle.player_source_refs;
CREATE POLICY player_source_refs_public_read ON takkle.player_source_refs
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS player_source_refs_admin ON takkle.player_source_refs;
CREATE POLICY player_source_refs_admin ON takkle.player_source_refs
  FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

GRANT SELECT ON takkle.player_source_refs TO anon, authenticated;
GRANT ALL ON takkle.player_source_refs TO authenticated;

INSERT INTO takkle.data_sources (
  name, source_type, base_url, robots_allowed, license_notes,
  state_code, permission_status, robots_checked, terms_checked, notes, is_active, active
)
SELECT * FROM (VALUES
  (
    'NCES Common Core of Data (CCD)',
    'nces_ccd',
    'https://nces.ed.gov/ccd/files.asp',
    true,
    'U.S. government work / public domain. Cite NCES CCD.',
    NULL,
    'permitted',
    true,
    true,
    'Public school directory only — no athlete rosters.',
    true,
    true
  ),
  (
    'CIF Southern Section All-CIF Football',
    'state_association',
    'https://cifss.org/allcifss/',
    true,
    'Public association honor rolls; robots.txt allows crawling.',
    'CA',
    'permitted',
    true,
    true,
    'All-CIF Football 11 and Football 8 public lists.',
    true,
    true
  ),
  (
    'Texas Sports Writers Association All-State Football',
    'state_association',
    'https://txswa.org/',
    true,
    'Public all-state selections published for media use. No robots.txt restrictions found.',
    'TX',
    'permitted',
    true,
    true,
    'TSWA Blue Bell all-state football teams by classification.',
    true,
    true
  ),
  (
    'MaxPreps',
    'commercial_aggregator',
    'https://www.maxpreps.com/',
    false,
    'robots.txt Disallow: /school/ /team/ and roster endpoints — blocked.',
    NULL,
    'blocked',
    true,
    true,
    'Do not scrape. Partnership required for roster data.',
    false,
    false
  ),
  (
    'Scorebook Live / CIF-SS Scores',
    'commercial_platform',
    'https://scores.cifss.org/',
    false,
    'AWS WAF challenge blocks automation; commercial ToS restrict scraping.',
    'CA',
    'blocked',
    true,
    true,
    'Unavailable for automated ingestion without partnership.',
    false,
    false
  )
) AS v(name, source_type, base_url, robots_allowed, license_notes, state_code, permission_status, robots_checked, terms_checked, notes, is_active, active)
WHERE NOT EXISTS (
  SELECT 1 FROM takkle.data_sources ds WHERE ds.name = v.name
);

UPDATE takkle.data_sources
SET permission_status = 'permitted',
    robots_checked = true,
    terms_checked = true,
    notes = COALESCE(notes, 'Operator-provided permitted data'),
    active = true,
    is_active = true
WHERE name = 'Manual CSV import';
