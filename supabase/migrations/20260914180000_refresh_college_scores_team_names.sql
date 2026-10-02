-- Snapshot: resolved Transfer Portal college_name values to real team names (2026-09-14)
-- and refreshed college-provisional-2026.1 Tackle Scores / rankings.
-- Data fix applied via ops SQL; this migration documents the ranking refresh for history.

COMMENT ON COLUMN takkle.players.college_name IS
  'Current team/school display name for college athletes (never Transfer Portal).';
