-- Product hard rule: ALL players must be class 2027–2031.
-- Replaces the relaxed players_class_year_range_chk (null/2015–2035) so getters cannot reintroduce alumni.
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_class_year_range_chk;
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_recruit_class_year_chk;
ALTER TABLE takkle.players ADD CONSTRAINT players_recruit_class_year_chk
  CHECK (class_year IS NOT NULL AND class_year >= 2027 AND class_year <= 2031);
COMMENT ON CONSTRAINT players_recruit_class_year_chk ON takkle.players IS
  'Hard recruit window: only class years 2027-2031; null and alumni blocked.';
