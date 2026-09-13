-- Resolve school_id by slug; handle id/slug unique collisions during bulk player upsert.
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
      class_year int, primary_source_id uuid, source_state text, source_school text, season_year int
    )
    JOIN takkle.schools s ON s.slug = x.school_slug
    ORDER BY x.id, x.season_year DESC NULLS LAST
  ), ins AS (
    INSERT INTO takkle.players (
      id, first_name, last_name, slug, position, class_year, school_id, state_code, status,
      primary_source_id, source_url, source_name, source_type, source_state, source_school,
      verification_status, last_verified_at, source_last_checked, is_synthetic, ingestion_date
    )
    SELECT id, first_name, last_name, slug, position, class_year, resolved_school_id, state_code,
           'unclaimed'::player_status, primary_source_id, source_url, source_name, source_type,
           source_state, source_school, 'source_verified', now(), now(), false, now()
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
      class_year int, primary_source_id uuid, source_state text, source_school text, season_year int
    )
    ORDER BY id, season_year DESC NULLS LAST
  ) r
  ON CONFLICT (player_id, source_url, season_year) DO UPDATE SET
    source_last_checked = now();

  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION takkle.bulk_upsert_players(jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bulk_upsert_players(jsonb) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION takkle.bulk_upsert_players(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_players(jsonb) TO service_role;
