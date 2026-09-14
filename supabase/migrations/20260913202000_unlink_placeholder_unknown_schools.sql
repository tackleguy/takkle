-- Unlink players from placeholder school rows so Discover does not show "Unknown" as a school.
UPDATE takkle.players p
SET school_id = NULL,
    updated_at = now()
FROM takkle.schools s
WHERE p.school_id = s.id
  AND p.class_year BETWEEN 2027 AND 2031
  AND (
    s.name IN ('Unknown', 'WL', 'N/A', 'TBD', '?')
    OR lower(trim(s.name)) = 'unknown'
  );
