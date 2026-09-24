-- Add conference + division ranking scopes for college-provisional-2026.1
-- Reuses existing national scores so ranks stay consistent with National / Position boards.

DELETE FROM takkle.player_rankings
WHERE ranking_version = 'college-provisional-2026.1'
  AND ranking_scope IN ('conference', 'division');

WITH national_scores AS (
  SELECT
    pr.player_id,
    pr.score,
    pr.class_year,
    pr.position,
    pr.state_code,
    LOWER(NULLIF(TRIM(p.division), '')) AS division,
    NULLIF(TRIM(p.conference), '') AS conference
  FROM takkle.player_rankings pr
  JOIN takkle.players p ON p.id = pr.player_id
  WHERE pr.ranking_version = 'college-provisional-2026.1'
    AND pr.ranking_scope = 'national'
    AND pr.scope_key = 'national'
    AND p.competition_level = 'college'
    AND COALESCE(p.is_synthetic, false) = false
),
division_ranks AS (
  SELECT
    player_id,
    position,
    class_year,
    state_code,
    score,
    division AS scope_key,
    ROW_NUMBER() OVER (
      PARTITION BY division
      ORDER BY score DESC, player_id
    ) AS rank
  FROM national_scores
  WHERE division IN ('fbs', 'fcs')
),
conference_ranks AS (
  SELECT
    player_id,
    position,
    class_year,
    state_code,
    score,
    conference AS scope_key,
    ROW_NUMBER() OVER (
      PARTITION BY conference
      ORDER BY score DESC, player_id
    ) AS rank
  FROM national_scores
  WHERE conference IS NOT NULL
)
INSERT INTO takkle.player_rankings (
  id, player_id, ranking_scope, scope_key, class_year, position, state_code,
  rank, score, ranking_version, ranking_date, previous_rank, is_rising
)
SELECT
  gen_random_uuid(),
  d.player_id,
  'division'::text,
  d.scope_key,
  d.class_year,
  d.position,
  d.state_code,
  d.rank::int,
  d.score,
  'college-provisional-2026.1'::text,
  CURRENT_DATE,
  NULL::integer,
  false
FROM division_ranks d
UNION ALL
SELECT
  gen_random_uuid(),
  c.player_id,
  'conference'::text,
  c.scope_key,
  c.class_year,
  c.position,
  c.state_code,
  c.rank::int,
  c.score,
  'college-provisional-2026.1'::text,
  CURRENT_DATE,
  NULL::integer,
  false
FROM conference_ranks c;
