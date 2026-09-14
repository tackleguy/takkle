-- Move nicknames out of last_name (display_name is generated from first+last).
-- e.g. '"Kiko" Farinas' → 'Farinas'; '(CJ) Bludso-Cohen' → 'Bludso-Cohen'
UPDATE takkle.players
SET
  last_name = trim(regexp_replace(last_name, '^("[^"]+"|\([^)]+\))\s+', '', '')),
  updated_at = now()
WHERE last_name ~ '^("[^"]+"|\([^)]+\))\s+'
  AND class_year BETWEEN 2027 AND 2031;

UPDATE takkle.players
SET
  source_school = NULL,
  updated_at = now()
WHERE class_year BETWEEN 2027 AND 2031
  AND source_school IN ('Unknown', 'WL', 'N/A', 'TBD', '?');
