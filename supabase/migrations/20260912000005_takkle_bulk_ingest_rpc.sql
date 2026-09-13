-- Bulk ingest RPCs (service_role only after revoke migration).
-- Used by scripts/apply-ingestion-rpc.mjs for permitted NCES + association loads.

CREATE OR REPLACE FUNCTION takkle.bulk_upsert_schools(payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = takkle, public
AS $$
DECLARE
  n integer;
BEGIN
  WITH rows AS (
    SELECT * FROM jsonb_to_recordset(payload) AS x(
      id uuid, name text, slug text, city text, state_code text,
      nces_id text, website_url text, source_url text, source_type text, source_name text
    )
  ), ins AS (
    INSERT INTO takkle.schools (
      id, name, slug, city, state_code, nces_id, website_url,
      source_url, source_type, source_name, is_synthetic, last_verified_at
    )
    SELECT id, name, slug, city, state_code, nces_id, website_url,
           source_url, source_type, source_name, false, now()
    FROM rows
    ON CONFLICT (slug) DO UPDATE SET
      nces_id = COALESCE(EXCLUDED.nces_id, takkle.schools.nces_id),
      city = COALESCE(EXCLUDED.city, takkle.schools.city),
      website_url = COALESCE(EXCLUDED.website_url, takkle.schools.website_url),
      source_url = COALESCE(EXCLUDED.source_url, takkle.schools.source_url),
      source_type = COALESCE(EXCLUDED.source_type, takkle.schools.source_type),
      source_name = COALESCE(EXCLUDED.source_name, takkle.schools.source_name),
      is_synthetic = false,
      last_verified_at = now(),
      updated_at = now()
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO n FROM ins;
  RETURN n;
END;
$$;

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
      class_year int, primary_source_id uuid, source_state text, source_school text, season_year int
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

  WITH rows AS (
    SELECT DISTINCT ON (id) *
    FROM jsonb_to_recordset(payload) AS x(
      school_id uuid, school_name text, school_slug text, state_code text,
      source_url text, source_type text, source_name text,
      id uuid, first_name text, last_name text, slug text, position text,
      class_year int, primary_source_id uuid, source_state text, source_school text, season_year int
    )
    ORDER BY id, season_year DESC
  ), ins AS (
    INSERT INTO takkle.players (
      id, first_name, last_name, slug, position, class_year, school_id, state_code, status,
      primary_source_id, source_url, source_name, source_type, source_state, source_school,
      verification_status, last_verified_at, source_last_checked, is_synthetic, ingestion_date
    )
    SELECT id, first_name, last_name, slug, position, class_year, school_id, state_code,
           'unclaimed'::player_status, primary_source_id, source_url, source_name, source_type,
           source_state, source_school, 'source_verified', now(), now(), false, now()
    FROM rows
    ON CONFLICT (id) DO UPDATE SET
      position = COALESCE(EXCLUDED.position, takkle.players.position),
      class_year = COALESCE(EXCLUDED.class_year, takkle.players.class_year),
      school_id = COALESCE(EXCLUDED.school_id, takkle.players.school_id),
      slug = EXCLUDED.slug,
      source_url = COALESCE(EXCLUDED.source_url, takkle.players.source_url),
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
      class_year int, primary_source_id uuid, source_state text, source_school text, season_year int
    )
    ORDER BY id, season_year DESC
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
      class_year int, primary_source_id uuid, source_state text, source_school text, season_year int
    )
    ORDER BY id, season_year DESC
  ) r
  ON CONFLICT (player_id, source_url, season_year) DO UPDATE SET
    source_last_checked = now();

  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_upsert_schools(payload jsonb)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = takkle, public
AS $$ SELECT takkle.bulk_upsert_schools(payload) $$;

CREATE OR REPLACE FUNCTION public.bulk_upsert_players(payload jsonb)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = takkle, public
AS $$ SELECT takkle.bulk_upsert_players(payload) $$;

REVOKE EXECUTE ON FUNCTION public.bulk_upsert_schools(jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bulk_upsert_players(jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION takkle.bulk_upsert_schools(jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION takkle.bulk_upsert_players(jsonb) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_schools(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_players(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION takkle.bulk_upsert_schools(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION takkle.bulk_upsert_players(jsonb) TO service_role;
