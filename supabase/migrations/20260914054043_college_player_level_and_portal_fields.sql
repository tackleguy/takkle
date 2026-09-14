-- Product pivot: collegiate (FBS/FCS) as active inventory; HS sits dormant via competition_level.
-- Additive columns only — do not delete HS rows.

ALTER TABLE takkle.players
  ADD COLUMN IF NOT EXISTS competition_level text NOT NULL DEFAULT 'hs',
  ADD COLUMN IF NOT EXISTS division text,
  ADD COLUMN IF NOT EXISTS college_name text,
  ADD COLUMN IF NOT EXISTS conference text,
  ADD COLUMN IF NOT EXISTS eligibility_year integer,
  ADD COLUMN IF NOT EXISTS transfer_portal_status text,
  ADD COLUMN IF NOT EXISTS portal_entry_date date,
  ADD COLUMN IF NOT EXISTS transfer_from_school text,
  ADD COLUMN IF NOT EXISTS transfer_to_school text;

ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_recruit_class_year_chk;
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_class_year_range_chk;
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_competition_level_chk;
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_division_chk;
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_transfer_portal_status_chk;
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_class_year_by_level_chk;

ALTER TABLE takkle.players ADD CONSTRAINT players_competition_level_chk
  CHECK (competition_level IN ('hs', 'college'));

ALTER TABLE takkle.players ADD CONSTRAINT players_division_chk
  CHECK (division IS NULL OR division IN ('fbs', 'fcs'));

ALTER TABLE takkle.players ADD CONSTRAINT players_transfer_portal_status_chk
  CHECK (
    transfer_portal_status IS NULL
    OR transfer_portal_status IN (
      'not_in_portal', 'entered', 'withdrawn', 'committed', 'enrolled', 'unknown'
    )
  );

-- HS keeps recruit window 2027–2031. College allows null or broad eligibility years.
ALTER TABLE takkle.players ADD CONSTRAINT players_class_year_by_level_chk
  CHECK (
    (
      competition_level = 'hs'
      AND class_year IS NOT NULL
      AND class_year >= 2027
      AND class_year <= 2031
    )
    OR (
      competition_level = 'college'
      AND (class_year IS NULL OR (class_year >= 2018 AND class_year <= 2035))
    )
  );

CREATE INDEX IF NOT EXISTS players_competition_level_idx
  ON takkle.players (competition_level);

CREATE INDEX IF NOT EXISTS players_college_division_idx
  ON takkle.players (competition_level, division)
  WHERE competition_level = 'college';

CREATE INDEX IF NOT EXISTS players_transfer_portal_status_idx
  ON takkle.players (transfer_portal_status)
  WHERE transfer_portal_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS players_college_name_idx
  ON takkle.players (college_name)
  WHERE college_name IS NOT NULL;

COMMENT ON COLUMN takkle.players.competition_level IS
  'hs = high school (dormant in Discover/Rankings/Claim); college = NCAA D1 FBS/FCS active product inventory';
COMMENT ON COLUMN takkle.players.division IS
  'For competition_level=college: fbs | fcs only';
COMMENT ON COLUMN takkle.players.college_name IS
  'Current college / university name (denormalized for ingest + display)';
COMMENT ON COLUMN takkle.players.conference IS
  'College conference when known (e.g. SEC, Big Ten, CAA)';
COMMENT ON COLUMN takkle.players.eligibility_year IS
  'Expected final eligibility / graduation year when known';
COMMENT ON COLUMN takkle.players.transfer_portal_status IS
  'Transfer portal stub: not_in_portal | entered | withdrawn | committed | enrolled | unknown';
COMMENT ON COLUMN takkle.players.portal_entry_date IS
  'Date athlete entered the transfer portal when known';
COMMENT ON COLUMN takkle.players.transfer_from_school IS
  'Previous school when transferring (NIL/transfer portal surface)';
COMMENT ON COLUMN takkle.players.transfer_to_school IS
  'Destination school when committed/enrolled after portal';

CREATE OR REPLACE FUNCTION takkle.players_search_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_document :=
    setweight(to_tsvector('english', coalesce(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.position, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.college_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.source_school, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.state_code, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_search_trg ON takkle.players;
CREATE TRIGGER players_search_trg
  BEFORE INSERT OR UPDATE OF first_name, last_name, position, state_code, college_name, source_school
  ON takkle.players
  FOR EACH ROW EXECUTE FUNCTION takkle.players_search_update();

-- Extend bulk upsert so college getters can write FBS/FCS rows in one pass.
CREATE OR REPLACE FUNCTION takkle.bulk_upsert_players(payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = takkle, public
AS $$
DECLARE
  n integer;
BEGIN
  WITH assoc AS (
    SELECT DISTINCT ON (school_slug)
      school_id, school_name, school_slug, state_code, source_url, source_type, source_name
    FROM jsonb_to_recordset(payload) AS x(
      school_id uuid, school_name text, school_slug text, state_code text,
      source_url text, source_type text, source_name text,
      id uuid, first_name text, last_name text, slug text, position text,
      class_year int, primary_source_id uuid, source_state text, source_school text, season_year int,
      competition_level text, division text, college_name text, conference text,
      eligibility_year int, transfer_portal_status text, portal_entry_date date,
      transfer_from_school text, transfer_to_school text,
      height_inches numeric, weight_lbs int, jersey_number int, hometown_city text
    )
    ORDER BY school_slug, school_id
  )
  INSERT INTO takkle.schools (
    id, name, slug, state_code, source_url, source_type, source_name, is_synthetic, last_verified_at
  )
  SELECT school_id, school_name, school_slug, state_code, source_url, source_type, source_name, false, now()
  FROM assoc
  ON CONFLICT (slug) DO UPDATE SET
    source_url = COALESCE(takkle.schools.source_url, EXCLUDED.source_url),
    updated_at = now();

  UPDATE takkle.players p
  SET slug = left(p.slug, 100) || '-' || substr(replace(p.id::text, '-', ''), 1, 8),
      updated_at = now()
  WHERE p.slug IN (
    SELECT DISTINCT x.slug
    FROM jsonb_to_recordset(payload) AS x(slug text, id uuid)
  )
  AND p.id NOT IN (
    SELECT DISTINCT x.id
    FROM jsonb_to_recordset(payload) AS x(slug text, id uuid)
  );

  WITH rows AS (
    SELECT DISTINCT ON (x.id)
      x.*,
      s.id AS resolved_school_id
    FROM jsonb_to_recordset(payload) AS x(
      school_id uuid, school_name text, school_slug text, state_code text,
      source_url text, source_type text, source_name text,
      id uuid, first_name text, last_name text, slug text, position text,
      class_year int, primary_source_id uuid, source_state text, source_school text, season_year int,
      competition_level text, division text, college_name text, conference text,
      eligibility_year int, transfer_portal_status text, portal_entry_date date,
      transfer_from_school text, transfer_to_school text,
      height_inches numeric, weight_lbs int, jersey_number int, hometown_city text
    )
    JOIN takkle.schools s ON s.slug = x.school_slug
    ORDER BY x.id, x.season_year DESC NULLS LAST
  ), ins AS (
    INSERT INTO takkle.players (
      id, first_name, last_name, slug, position, class_year, school_id, state_code, status,
      primary_source_id, source_url, source_name, source_type, source_state, source_school,
      verification_status, last_verified_at, source_last_checked, is_synthetic, ingestion_date,
      competition_level, division, college_name, conference, eligibility_year,
      transfer_portal_status, portal_entry_date, transfer_from_school, transfer_to_school,
      height_inches, weight_lbs, jersey_number, hometown_city
    )
    SELECT id, first_name, last_name, slug, position, class_year, resolved_school_id, state_code,
           'unclaimed'::player_status, primary_source_id, source_url, source_name, source_type,
           source_state, source_school, 'source_verified', now(), now(), false, now(),
           COALESCE(NULLIF(competition_level, ''), 'hs'),
           NULLIF(division, ''),
           COALESCE(NULLIF(college_name, ''), NULLIF(school_name, '')),
           NULLIF(conference, ''),
           eligibility_year,
           NULLIF(transfer_portal_status, ''),
           portal_entry_date,
           NULLIF(transfer_from_school, ''),
           NULLIF(transfer_to_school, ''),
           height_inches, weight_lbs, jersey_number, hometown_city
    FROM rows
    ON CONFLICT (id) DO UPDATE SET
      position = COALESCE(EXCLUDED.position, takkle.players.position),
      class_year = COALESCE(EXCLUDED.class_year, takkle.players.class_year),
      school_id = COALESCE(EXCLUDED.school_id, takkle.players.school_id),
      slug = EXCLUDED.slug,
      source_url = COALESCE(EXCLUDED.source_url, takkle.players.source_url),
      source_name = COALESCE(EXCLUDED.source_name, takkle.players.source_name),
      source_type = COALESCE(EXCLUDED.source_type, takkle.players.source_type),
      primary_source_id = COALESCE(EXCLUDED.primary_source_id, takkle.players.primary_source_id),
      competition_level = COALESCE(EXCLUDED.competition_level, takkle.players.competition_level),
      division = COALESCE(EXCLUDED.division, takkle.players.division),
      college_name = COALESCE(EXCLUDED.college_name, takkle.players.college_name),
      conference = COALESCE(EXCLUDED.conference, takkle.players.conference),
      eligibility_year = COALESCE(EXCLUDED.eligibility_year, takkle.players.eligibility_year),
      transfer_portal_status = COALESCE(EXCLUDED.transfer_portal_status, takkle.players.transfer_portal_status),
      portal_entry_date = COALESCE(EXCLUDED.portal_entry_date, takkle.players.portal_entry_date),
      transfer_from_school = COALESCE(EXCLUDED.transfer_from_school, takkle.players.transfer_from_school),
      transfer_to_school = COALESCE(EXCLUDED.transfer_to_school, takkle.players.transfer_to_school),
      height_inches = COALESCE(EXCLUDED.height_inches, takkle.players.height_inches),
      weight_lbs = COALESCE(EXCLUDED.weight_lbs, takkle.players.weight_lbs),
      jersey_number = COALESCE(EXCLUDED.jersey_number, takkle.players.jersey_number),
      hometown_city = COALESCE(EXCLUDED.hometown_city, takkle.players.hometown_city),
      source_school = COALESCE(EXCLUDED.source_school, takkle.players.source_school),
      verification_status = 'source_verified',
      last_verified_at = now(),
      is_synthetic = false,
      updated_at = now()
    RETURNING id
  )
  SELECT COUNT(*)::int INTO n FROM ins;

  INSERT INTO takkle.player_seasons (player_id, season_id, position, data_origin, source_url)
  SELECT r.id, s.id, r.position, 'official_roster'::data_origin, r.source_url
  FROM (
    SELECT DISTINCT ON (id) *
    FROM jsonb_to_recordset(payload) AS x(
      school_id uuid, school_name text, school_slug text, state_code text,
      source_url text, source_type text, source_name text,
      id uuid, first_name text, last_name text, slug text, position text,
      class_year int, primary_source_id uuid, source_state text, source_school text, season_year int,
      competition_level text, division text, college_name text, conference text,
      eligibility_year int, transfer_portal_status text, portal_entry_date date,
      transfer_from_school text, transfer_to_school text,
      height_inches numeric, weight_lbs int, jersey_number int, hometown_city text
    )
    ORDER BY id, season_year DESC NULLS LAST
  ) r
  JOIN takkle.seasons s ON s.year = r.season_year
  ON CONFLICT (player_id, season_id) DO UPDATE SET
    position = COALESCE(EXCLUDED.position, takkle.player_seasons.position);

  INSERT INTO takkle.player_source_refs (
    player_id, data_source_id, source_name, source_url, source_type,
    source_state, source_school, season_year, source_last_checked
  )
  SELECT r.id, r.primary_source_id, r.source_name, r.source_url, r.source_type,
         r.source_state, r.source_school, r.season_year, now()
  FROM (
    SELECT DISTINCT ON (id) *
    FROM jsonb_to_recordset(payload) AS x(
      school_id uuid, school_name text, school_slug text, state_code text,
      source_url text, source_type text, source_name text,
      id uuid, first_name text, last_name text, slug text, position text,
      class_year int, primary_source_id uuid, source_state text, source_school text, season_year int,
      competition_level text, division text, college_name text, conference text,
      eligibility_year int, transfer_portal_status text, portal_entry_date date,
      transfer_from_school text, transfer_to_school text,
      height_inches numeric, weight_lbs int, jersey_number int, hometown_city text
    )
    ORDER BY id, season_year DESC NULLS LAST
  ) r
  ON CONFLICT (player_id, source_url, season_year) DO UPDATE SET
    source_last_checked = now();

  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION takkle.bulk_upsert_players(jsonb) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION takkle.bulk_upsert_players(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_players(jsonb) TO service_role;
