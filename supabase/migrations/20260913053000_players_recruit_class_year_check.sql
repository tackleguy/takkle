-- Hard recruit window: only class years 2027–2031 (null/alumni blocked).
ALTER TABLE takkle.players DROP CONSTRAINT IF EXISTS players_recruit_class_year_chk;
ALTER TABLE takkle.players ADD CONSTRAINT players_recruit_class_year_chk
  CHECK (class_year IS NOT NULL AND class_year >= 2027 AND class_year <= 2031);
COMMENT ON CONSTRAINT players_recruit_class_year_chk ON takkle.players IS
  'Hard recruit window: only class years 2027-2031; null and alumni blocked.';
