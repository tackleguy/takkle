-- Additive college/FBS tagging for transfer+NIL pivot; keep HS dormant rows intact.
ALTER TABLE takkle.players
  ADD COLUMN IF NOT EXISTS competition_level text,
  ADD COLUMN IF NOT EXISTS division text,
  ADD COLUMN IF NOT EXISTS college_name text,
  ADD COLUMN IF NOT EXISTS conference text,
  ADD COLUMN IF NOT EXISTS transfer_portal_status text,
  ADD COLUMN IF NOT EXISTS college_class text,
  ADD COLUMN IF NOT EXISTS eligibility_year integer;

COMMENT ON COLUMN takkle.players.competition_level IS 'hs | college';
COMMENT ON COLUMN takkle.players.division IS 'fbs | fcs';
COMMENT ON COLUMN takkle.players.college_name IS 'College/university name for collegiate players';
COMMENT ON COLUMN takkle.players.conference IS 'Athletic conference name';
COMMENT ON COLUMN takkle.players.college_class IS 'FR/SO/JR/SR/etc from roster';
COMMENT ON COLUMN takkle.players.eligibility_year IS 'Expected final season year when known';

-- Default existing rows to hs (dormant inventory)
UPDATE takkle.players
SET competition_level = 'hs'
WHERE competition_level IS NULL;

-- Allow college rows outside recruit class window; keep HS in 2027–2031.
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_recruit_class_year_chk;
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_class_year_range_chk;
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_class_year_chk;

ALTER TABLE takkle.players
  ADD CONSTRAINT players_class_year_level_chk CHECK (
    (
      competition_level = 'college'
      AND (class_year IS NULL OR (class_year >= 2015 AND class_year <= 2035))
    )
    OR (
      COALESCE(competition_level, 'hs') <> 'college'
      AND class_year IS NOT NULL
      AND class_year >= 2027
      AND class_year <= 2031
    )
  );

CREATE INDEX IF NOT EXISTS players_competition_level_idx
  ON takkle.players (competition_level);
CREATE INDEX IF NOT EXISTS players_division_conf_idx
  ON takkle.players (division, conference);
CREATE INDEX IF NOT EXISTS players_college_name_idx
  ON takkle.players (college_name);
