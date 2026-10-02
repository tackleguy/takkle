-- Service-role helper to load one CFBD high-school recruiting class (2027–2031).
-- The API key is an argument; it is not stored.

CREATE OR REPLACE FUNCTION takkle.ingest_cfbd_hs_year(p_year integer, p_api_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = takkle, public, extensions
AS $fn$
DECLARE
  resp extensions.http_response;
  source_id uuid;
  inserted integer := 0;
  raw_count integer := 0;
BEGIN
  IF p_year < 2027 OR p_year > 2031 THEN
    RAISE EXCEPTION 'HS class year must be 2027-2031';
  END IF;
  IF p_api_key IS NULL OR length(p_api_key) < 8 THEN
    RAISE EXCEPTION 'CFBD API key required';
  END IF;

  resp := extensions.http((
    'GET',
    'https://api.collegefootballdata.com/recruiting/players?year=' || p_year || '&classification=HighSchool',
    ARRAY[
      extensions.http_header('Authorization', 'Bearer ' || p_api_key),
      extensions.http_header('Accept', 'application/json'),
      extensions.http_header('User-Agent', 'TakkleCFBDImporter/1.0')
    ],
    NULL,
    NULL
  )::extensions.http_request);

  IF resp.status <> 200 OR left(COALESCE(resp.content, ''), 1) <> '[' THEN
    RAISE EXCEPTION 'CFBD HTTP %', resp.status;
  END IF;

  raw_count := jsonb_array_length(resp.content::jsonb);

  INSERT INTO takkle.seasons (year, label)
  VALUES (p_year, p_year::text)
  ON CONFLICT (year) DO NOTHING;

  INSERT INTO takkle.data_sources (name, source_type, base_url, robots_allowed, license_notes, permission_status)
  SELECT 'CollegeFootballData', 'cfbd_recruiting', 'https://collegefootballdata.com', true,
         'CFBD API — commercial use in websites/apps allowed; private cache OK; do not republish as a mirror.',
         'permitted'
  WHERE NOT EXISTS (SELECT 1 FROM takkle.data_sources WHERE name = 'CollegeFootballData');

  SELECT id INTO source_id FROM takkle.data_sources WHERE name = 'CollegeFootballData' LIMIT 1;

  DROP TABLE IF EXISTS cfbd_rows;
  CREATE TEMP TABLE cfbd_rows ON COMMIT DROP AS
  WITH raw AS (
    SELECT value AS rec FROM jsonb_array_elements(resp.content::jsonb)
  ),
  named AS (
    SELECT
      rec->>'id' AS cfbd_id,
      btrim(regexp_replace(btrim(rec->>'name'), '\s+\S+$', '')) AS first_name,
      btrim(regexp_replace(btrim(rec->>'name'), '^.*\s+', '')) AS last_name,
      upper(left(COALESCE(NULLIF(btrim(rec->>'position'), ''), 'ATH'), 12)) AS raw_pos,
      COALESCE(NULLIF(btrim(rec->>'school'), ''), 'Unknown High School') AS school_name,
      upper(left(COALESCE(NULLIF(btrim(rec->>'stateProvince'), ''), 'US'), 8)) AS state_code,
      NULLIF(btrim(rec->>'city'), '') AS city,
      CASE WHEN (rec->>'height') ~ '^[0-9]+(\.[0-9]+)?$' THEN (rec->>'height')::numeric END AS height_inches,
      CASE WHEN (rec->>'weight') ~ '^[0-9]+$' THEN (rec->>'weight')::int END AS weight_lbs,
      NULLIF(btrim(rec->>'year'), '')::int AS class_year
    FROM raw
    WHERE btrim(COALESCE(rec->>'name', '')) ~ '\s'
      AND (rec->>'year') ~ '^[0-9]{4}$'
      AND (rec->>'year')::int = p_year
  )
  SELECT
    (
      substr(h, 1, 8) || '-' || substr(h, 9, 4) || '-5' || substr(h, 14, 3) || '-' ||
      substr('89ab', (get_byte(decode(substr(h, 17, 2), 'hex'), 0) % 4) + 1, 1) || substr(h, 18, 3) || '-' ||
      substr(h, 21, 12)
    )::uuid AS player_id,
    cfbd_id, first_name, last_name,
    CASE raw_pos
      WHEN 'FB' THEN 'RB' WHEN 'OT' THEN 'OL' WHEN 'OG' THEN 'OL' WHEN 'OC' THEN 'OL'
      WHEN 'IOL' THEN 'OL' WHEN 'C' THEN 'OL' WHEN 'G' THEN 'OL' WHEN 'T' THEN 'OL'
      WHEN 'DE' THEN 'DL' WHEN 'DT' THEN 'DL' WHEN 'NT' THEN 'DL' WHEN 'EDGE' THEN 'DL'
      WHEN 'WDE' THEN 'DL' WHEN 'SDE' THEN 'DL'
      WHEN 'ILB' THEN 'LB' WHEN 'OLB' THEN 'LB' WHEN 'MLB' THEN 'LB'
      WHEN 'CB' THEN 'DB' WHEN 'S' THEN 'DB' WHEN 'FS' THEN 'DB' WHEN 'SS' THEN 'DB' WHEN 'SAF' THEN 'DB'
      WHEN 'PK' THEN 'K' WHEN 'LS' THEN 'ATH' WHEN 'DUAL' THEN 'QB' WHEN 'PRO' THEN 'ATH'
      ELSE CASE WHEN raw_pos IN ('QB','RB','WR','TE','OL','DL','LB','DB','K','P','ATH') THEN raw_pos ELSE 'ATH' END
    END AS position,
    school_name, state_code, city,
    CASE WHEN height_inches BETWEEN 48 AND 96 THEN height_inches END AS height_inches,
    CASE WHEN weight_lbs BETWEEN 80 AND 500 THEN weight_lbs END AS weight_lbs,
    class_year,
    left('cfbd-' || lower(state_code) || '-' || left(trim(both '-' from regexp_replace(lower(school_name), '[^a-z0-9]+', '-', 'g')), 70), 96) AS school_slug
  FROM named
  CROSS JOIN LATERAL (SELECT md5('takkle.cfbd.player:' || cfbd_id) AS h) ids
  WHERE length(first_name) >= 2 AND length(last_name) >= 2
    AND first_name !~* '^(athlete|unknown|none|n/?a|player|test|recruit)$'
    AND last_name !~* '^(athlete|unknown|none|n/?a|player|test|recruit)$';

  INSERT INTO takkle.schools (id, name, slug, city, state_code, source_url, source_type, source_name, is_synthetic, last_verified_at)
  SELECT DISTINCT ON (school_slug)
    (
      substr(sh, 1, 8) || '-' || substr(sh, 9, 4) || '-5' || substr(sh, 14, 3) || '-' ||
      substr('89ab', (get_byte(decode(substr(sh, 17, 2), 'hex'), 0) % 4) + 1, 1) || substr(sh, 18, 3) || '-' ||
      substr(sh, 21, 12)
    )::uuid,
    school_name, school_slug, city, state_code,
    'https://collegefootballdata.com', 'cfbd_recruiting', 'CollegeFootballData', false, now()
  FROM cfbd_rows
  CROSS JOIN LATERAL (SELECT md5('takkle.cfbd.school:' || school_slug) AS sh) s
  ORDER BY school_slug, school_name
  ON CONFLICT (slug) DO UPDATE SET last_verified_at = now(), updated_at = now();

  INSERT INTO takkle.players (
    id, first_name, last_name, slug, position, class_year, school_id, state_code, status,
    primary_source_id, source_url, source_name, source_type, source_state, source_school,
    verification_status, last_verified_at, source_last_checked, is_synthetic, ingestion_date,
    competition_level, player_level, height_inches, weight_lbs, hometown_city
  )
  SELECT
    r.player_id, r.first_name, r.last_name,
    left(trim(both '-' from regexp_replace(lower(r.first_name || '-' || r.last_name || '-' || r.position || '-' || r.class_year::text || '-' || r.cfbd_id), '[^a-z0-9]+', '-', 'g')), 120),
    r.position, r.class_year, s.id, r.state_code, 'unclaimed', source_id,
    'https://api.collegefootballdata.com/recruiting/players?year=' || r.class_year || '&classification=HighSchool',
    'CollegeFootballData', 'cfbd_recruiting', r.state_code, r.school_name,
    'source_verified', now(), now(), false, now(), 'hs', 'hs', r.height_inches, r.weight_lbs, r.city
  FROM cfbd_rows r
  JOIN takkle.schools s ON s.slug = r.school_slug
  ON CONFLICT (id) DO UPDATE SET
    position = COALESCE(EXCLUDED.position, takkle.players.position),
    height_inches = COALESCE(takkle.players.height_inches, EXCLUDED.height_inches),
    weight_lbs = COALESCE(takkle.players.weight_lbs, EXCLUDED.weight_lbs),
    hometown_city = COALESCE(takkle.players.hometown_city, EXCLUDED.hometown_city),
    source_last_checked = now(), last_verified_at = now(), updated_at = now()
  WHERE takkle.players.status = 'unclaimed' AND takkle.players.source_name = 'CollegeFootballData';

  GET DIAGNOSTICS inserted = ROW_COUNT;

  INSERT INTO takkle.player_source_refs (
    player_id, data_source_id, source_name, source_url, source_type, source_state, source_school, season_year, source_last_checked
  )
  SELECT r.player_id, source_id, 'CollegeFootballData',
    'https://api.collegefootballdata.com/recruiting/players?year=' || r.class_year || '&classification=HighSchool',
    'cfbd_recruiting', r.state_code, r.school_name, r.class_year, now()
  FROM cfbd_rows r
  ON CONFLICT (player_id, source_url, season_year) DO UPDATE SET source_last_checked = now();

  RETURN jsonb_build_object('year', p_year, 'raw', raw_count, 'kept', (SELECT count(*) FROM cfbd_rows), 'upserted', inserted);
END;
$fn$;

REVOKE ALL ON FUNCTION takkle.ingest_cfbd_hs_year(integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION takkle.ingest_cfbd_hs_year(integer, text) TO service_role;
