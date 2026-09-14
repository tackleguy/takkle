-- Expose takkle on PostgREST so the app can read real players (not seed fallback).
-- Without this, Accept-Profile: takkle returns PGRST106 and UI falls back to synthetic seed.
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, takkle, graphql_public';

GRANT USAGE ON SCHEMA takkle TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA takkle TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA takkle TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA takkle TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA takkle TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA takkle
  GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA takkle
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA takkle
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA takkle
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
