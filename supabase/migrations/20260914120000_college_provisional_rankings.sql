-- Provisional college FBS/FCS rankings from division / conference / measurables / portal.
-- Version: college-provisional-2026.1 (confidence remains limited until film grades exist).

CREATE OR REPLACE FUNCTION takkle.upsert_player_rankings_jsonb(payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = takkle, public
AS $$
DECLARE
  n integer;
BEGIN
  INSERT INTO takkle.player_rankings (
    id, player_id, ranking_scope, scope_key, class_year, position, state_code,
    rank, score, ranking_version, ranking_date, previous_rank, is_rising
  )
  SELECT
    (r->>'id')::uuid,
    (r->>'player_id')::uuid,
    r->>'ranking_scope',
    r->>'scope_key',
    (r->>'class_year')::int,
    r->>'position',
    r->>'state_code',
    (r->>'rank')::int,
    (r->>'score')::numeric,
    r->>'ranking_version',
    (r->>'ranking_date')::date,
    NULLIF(r->>'previous_rank','')::int,
    COALESCE((r->>'is_rising')::boolean, false)
  FROM jsonb_array_elements(payload) AS r
  ON CONFLICT (ranking_scope, scope_key, player_id, ranking_version)
  DO UPDATE SET
    rank = EXCLUDED.rank,
    score = EXCLUDED.score,
    ranking_date = EXCLUDED.ranking_date,
    previous_rank = EXCLUDED.previous_rank,
    is_rising = EXCLUDED.is_rising;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION takkle.upsert_player_rankings_jsonb(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION takkle.upsert_player_rankings_jsonb(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION takkle.upsert_player_rankings_jsonb(jsonb) TO postgres;

DELETE FROM takkle.player_rankings WHERE ranking_version = 'college-provisional-2026.1';

WITH base AS (
  SELECT
    p.id AS player_id,
    COALESCE(NULLIF(UPPER(TRIM(p.position)), ''), 'ATH') AS position,
    COALESCE(p.class_year, 2026) AS class_year,
    COALESCE(NULLIF(UPPER(TRIM(p.state_code)), ''), 'NA') AS state_code,
    LOWER(COALESCE(p.division, '')) AS division,
    COALESCE(p.conference, '') AS conference,
    p.height_inches,
    p.weight_lbs,
    LOWER(COALESCE(p.transfer_portal_status, '')) AS portal
  FROM takkle.players p
  WHERE p.competition_level = 'college'
    AND COALESCE(p.is_synthetic, false) = false
),
scored AS (
  SELECT
    b.*,
    CASE b.division WHEN 'fbs' THEN 8.6 WHEN 'fcs' THEN 7.2 ELSE 7.0 END AS division_score,
    CASE
      WHEN b.conference ILIKE '%SEC%' THEN 9.6
      WHEN b.conference ILIKE '%Big Ten%' THEN 9.5
      WHEN b.conference ILIKE '%Big 12%' THEN 9.2
      WHEN b.conference ILIKE '%ACC%' THEN 9.1
      WHEN b.conference ILIKE '%Pac-12%' THEN 8.8
      WHEN b.conference ILIKE '%FBS Independents%' OR b.conference ILIKE 'Independents' THEN 8.5
      WHEN b.conference ILIKE '%American Athletic%' OR b.conference = 'AAC' THEN 8.2
      WHEN b.conference ILIKE '%Mountain West%' THEN 8.0
      WHEN b.conference ILIKE '%Sun Belt%' THEN 7.9
      WHEN b.conference = 'MAC' OR b.conference ILIKE '% MAC%' THEN 7.7
      WHEN b.conference ILIKE '%Conference USA%' THEN 7.6
      WHEN b.conference = 'MVFC' OR b.conference ILIKE '%Missouri Valley%' THEN 7.4
      WHEN b.conference ILIKE '%Big Sky%' THEN 7.3
      WHEN b.conference = 'CAA' OR b.conference ILIKE '% CAA%' THEN 7.2
      WHEN b.conference ILIKE '%Southern%' THEN 7.1
      WHEN b.conference ILIKE '%Southland%' THEN 7.0
      WHEN b.conference ILIKE '%Ohio Valley%' OR b.conference = 'OVC' THEN 6.9
      WHEN b.conference ILIKE '%United Athletic%' OR b.conference = 'UAC' THEN 6.9
      WHEN b.conference = 'SWAC' OR b.conference ILIKE '%SWAC%' THEN 6.8
      WHEN b.conference ILIKE 'Ivy%' THEN 6.8
      WHEN b.conference ILIKE '%MEAC%' THEN 6.7
      WHEN b.conference ILIKE 'Patriot%' THEN 6.7
      WHEN b.conference ILIKE 'Pioneer%' THEN 6.6
      WHEN b.conference ILIKE 'NEC%' THEN 6.5
      ELSE 7.0
    END AS conference_score,
    LEAST(
      9.5::numeric,
      (
        6.2
        + CASE
            WHEN b.height_inches >= 76 THEN 1.4
            WHEN b.height_inches >= 74 THEN 1.0
            WHEN b.height_inches >= 72 THEN 0.5
            ELSE 0
          END
        + CASE
            WHEN b.weight_lbs >= 280 THEN 0.6
            WHEN b.weight_lbs >= 240 THEN 0.4
            WHEN b.weight_lbs >= 200 THEN 0.2
            ELSE 0
          END
      )::numeric
    ) AS athleticism,
    CASE b.portal
      WHEN 'entered' THEN 7.8
      WHEN 'committed' THEN 8.2
      WHEN 'enrolled' THEN 7.4
      WHEN 'withdrawn' THEN 6.8
      ELSE 6.5
    END AS portal_signal
  FROM base b
),
final_scores AS (
  SELECT
    s.*,
    ROUND(
      (
        s.division_score * 0.35
        + s.conference_score * 0.30
        + s.athleticism * 0.20
        + s.portal_signal * 0.15
      )::numeric,
      1
    ) AS score
  FROM scored s
),
national AS (
  SELECT
    player_id, position, class_year, state_code, score,
    ROW_NUMBER() OVER (ORDER BY score DESC, player_id) AS rank
  FROM final_scores
),
position_ranks AS (
  SELECT
    player_id, position, class_year, state_code, score,
    ROW_NUMBER() OVER (PARTITION BY position ORDER BY score DESC, player_id) AS rank
  FROM final_scores
)
INSERT INTO takkle.player_rankings (
  id, player_id, ranking_scope, scope_key, class_year, position, state_code,
  rank, score, ranking_version, ranking_date, previous_rank, is_rising
)
SELECT
  gen_random_uuid(),
  n.player_id,
  'national'::text,
  'national'::text,
  n.class_year,
  n.position,
  n.state_code,
  n.rank::int,
  n.score,
  'college-provisional-2026.1'::text,
  DATE '2026-09-14',
  NULL::integer,
  false
FROM national n
UNION ALL
SELECT
  gen_random_uuid(),
  p.player_id,
  'position'::text,
  p.position,
  p.class_year,
  p.position,
  p.state_code,
  p.rank::int,
  p.score,
  'college-provisional-2026.1'::text,
  DATE '2026-09-14',
  NULL::integer,
  false
FROM position_ranks p;
