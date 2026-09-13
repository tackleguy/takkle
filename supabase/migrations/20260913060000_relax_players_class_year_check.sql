-- Allow historical honor-roll volume (mission: real players, historical OK when provenanced).
-- Rankings still target class 2027–2031; ingestion may include earlier class years / NULL.
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_recruit_class_year_chk;
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_class_year_range_chk;
ALTER TABLE takkle.players
  ADD CONSTRAINT players_class_year_range_chk
  CHECK (class_year IS NULL OR (class_year >= 2015 AND class_year <= 2035));
