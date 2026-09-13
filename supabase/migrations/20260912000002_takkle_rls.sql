-- RLS policies for Takkle recruiting platform

-- Helpers (SECURITY INVOKER; authorize via auth.uid + users.account_type)
CREATE OR REPLACE FUNCTION takkle.current_account_type()
RETURNS account_type
LANGUAGE sql
STABLE
AS $$
  SELECT account_type FROM takkle.users WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION takkle.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM takkle.users
    WHERE id = (SELECT auth.uid()) AND account_type = 'admin' AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION takkle.owns_player(p_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM takkle.player_accounts pa
    WHERE pa.player_id = p_player_id
      AND pa.user_id = (SELECT auth.uid())
      AND pa.revoked_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION takkle.can_edit_player(p_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT takkle.is_admin() OR takkle.owns_player(p_player_id)
$$;

-- Enable RLS
ALTER TABLE takkle.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.school_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.player_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.player_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.player_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.film_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.player_film ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.player_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.player_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.player_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.score_weight_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.tackle_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.score_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.player_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.verification_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.player_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.claim_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.claim_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE takkle.player_duplicate_candidates ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY users_select_own ON takkle.users FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR takkle.is_admin());
CREATE POLICY users_update_own ON takkle.users FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR takkle.is_admin())
  WITH CHECK (id = (SELECT auth.uid()) OR takkle.is_admin());
CREATE POLICY users_insert_own ON takkle.users FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- Public read catalogs
CREATE POLICY schools_public_read ON takkle.schools FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY schools_admin_write ON takkle.schools FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

CREATE POLICY school_domains_public_read ON takkle.school_domains FOR SELECT TO anon, authenticated
  USING (verification_status = 'verified' OR takkle.is_admin());
CREATE POLICY school_domains_admin ON takkle.school_domains FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

CREATE POLICY teams_public_read ON takkle.teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY teams_admin_write ON takkle.teams FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

CREATE POLICY seasons_public_read ON takkle.seasons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY seasons_admin_write ON takkle.seasons FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

CREATE POLICY film_sources_public_read ON takkle.film_sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY verification_methods_public_read ON takkle.verification_methods FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY platform_settings_public_read ON takkle.platform_settings FOR SELECT TO anon, authenticated
  USING (key IN ('nil_rules'));
CREATE POLICY platform_settings_admin ON takkle.platform_settings FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

-- players: public recruiting profile fields readable; writes restricted
CREATE POLICY players_public_read ON takkle.players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY players_owner_update ON takkle.players FOR UPDATE TO authenticated
  USING (takkle.can_edit_player(id))
  WITH CHECK (takkle.can_edit_player(id));
CREATE POLICY players_admin_insert ON takkle.players FOR INSERT TO authenticated
  WITH CHECK (takkle.is_admin());
CREATE POLICY players_admin_delete ON takkle.players FOR DELETE TO authenticated
  USING (takkle.is_admin());

CREATE POLICY player_accounts_select ON takkle.player_accounts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR takkle.is_admin() OR takkle.owns_player(player_id));
CREATE POLICY player_accounts_admin ON takkle.player_accounts FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

CREATE POLICY rosters_public_read ON takkle.rosters FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY player_seasons_public_read ON takkle.player_seasons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY player_stats_public_read ON takkle.player_stats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY player_stats_owner_write ON takkle.player_stats FOR ALL TO authenticated
  USING (takkle.can_edit_player(player_id) OR takkle.is_admin())
  WITH CHECK (takkle.can_edit_player(player_id) OR takkle.is_admin());

CREATE POLICY player_measurements_public_read ON takkle.player_measurements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY player_measurements_owner_write ON takkle.player_measurements FOR ALL TO authenticated
  USING (takkle.can_edit_player(player_id) OR takkle.is_admin())
  WITH CHECK (takkle.can_edit_player(player_id) OR takkle.is_admin());

CREATE POLICY player_film_public_read ON takkle.player_film FOR SELECT TO anon, authenticated
  USING (
    verification_status IN ('player_confirmed', 'platform_verified')
    OR takkle.can_edit_player(player_id)
    OR takkle.is_admin()
    OR (find_my_film_candidate = true AND takkle.can_edit_player(player_id))
  );
-- Owners see their candidates via can_edit; public only confirmed/verified
DROP POLICY IF EXISTS player_film_public_read ON takkle.player_film;
CREATE POLICY player_film_public_read ON takkle.player_film FOR SELECT TO anon, authenticated
  USING (
    verification_status IN ('player_confirmed', 'platform_verified')
    OR takkle.can_edit_player(player_id)
    OR takkle.is_admin()
  );

CREATE POLICY player_film_owner_write ON takkle.player_film FOR INSERT TO authenticated
  WITH CHECK (takkle.can_edit_player(player_id) OR takkle.is_admin());
CREATE POLICY player_film_owner_update ON takkle.player_film FOR UPDATE TO authenticated
  USING (takkle.can_edit_player(player_id) OR takkle.is_admin())
  WITH CHECK (takkle.can_edit_player(player_id) OR takkle.is_admin());
CREATE POLICY player_film_owner_delete ON takkle.player_film FOR DELETE TO authenticated
  USING (takkle.can_edit_player(player_id) OR takkle.is_admin());

CREATE POLICY player_awards_public_read ON takkle.player_awards FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY player_awards_owner_write ON takkle.player_awards FOR ALL TO authenticated
  USING (takkle.can_edit_player(player_id) OR takkle.is_admin())
  WITH CHECK (takkle.can_edit_player(player_id) OR takkle.is_admin());

CREATE POLICY player_offers_public_read ON takkle.player_offers FOR SELECT TO anon, authenticated
  USING (is_public = true OR takkle.can_edit_player(player_id) OR takkle.is_admin());
CREATE POLICY player_offers_owner_write ON takkle.player_offers FOR ALL TO authenticated
  USING (takkle.can_edit_player(player_id) OR takkle.is_admin())
  WITH CHECK (takkle.can_edit_player(player_id) OR takkle.is_admin());

CREATE POLICY player_interests_public_read ON takkle.player_interests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY player_interests_owner_write ON takkle.player_interests FOR ALL TO authenticated
  USING (takkle.can_edit_player(player_id) OR takkle.is_admin())
  WITH CHECK (takkle.can_edit_player(player_id) OR takkle.is_admin());

-- Scores & rankings: public read, admin/system write only
CREATE POLICY tackle_scores_public_read ON takkle.tackle_scores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY tackle_scores_admin_write ON takkle.tackle_scores FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

CREATE POLICY score_components_public_read ON takkle.score_components FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY score_components_admin_write ON takkle.score_components FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

CREATE POLICY score_weights_public_read ON takkle.score_weight_configs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY score_weights_admin_write ON takkle.score_weight_configs FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

CREATE POLICY rankings_public_read ON takkle.player_rankings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY rankings_admin_write ON takkle.player_rankings FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

-- Claims
CREATE POLICY claims_select ON takkle.player_claims FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR takkle.is_admin());
CREATE POLICY claims_insert ON takkle.player_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY claims_update_own_pending ON takkle.player_claims FOR UPDATE TO authenticated
  USING (
    (user_id = (SELECT auth.uid()) AND status = 'pending')
    OR takkle.is_admin()
  )
  WITH CHECK (
    (user_id = (SELECT auth.uid()) AND status IN ('pending', 'withdrawn'))
    OR takkle.is_admin()
  );

CREATE POLICY verification_events_select ON takkle.verification_events FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR takkle.is_admin());
CREATE POLICY verification_events_insert ON takkle.verification_events FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR takkle.is_admin());

CREATE POLICY disputes_select ON takkle.claim_disputes FOR SELECT TO authenticated
  USING (filed_by_user_id = (SELECT auth.uid()) OR takkle.is_admin());
CREATE POLICY disputes_insert ON takkle.claim_disputes FOR INSERT TO authenticated
  WITH CHECK (filed_by_user_id = (SELECT auth.uid()));
CREATE POLICY disputes_admin_update ON takkle.claim_disputes FOR UPDATE TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

CREATE POLICY audit_admin_read ON takkle.audit_logs FOR SELECT TO authenticated
  USING (takkle.is_admin());
CREATE POLICY audit_admin_insert ON takkle.audit_logs FOR INSERT TO authenticated
  WITH CHECK (takkle.is_admin() OR actor_user_id = (SELECT auth.uid()));

CREATE POLICY rate_limits_own ON takkle.claim_rate_limits FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR takkle.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR takkle.is_admin());

CREATE POLICY data_sources_admin ON takkle.data_sources FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());
CREATE POLICY data_sources_read ON takkle.data_sources FOR SELECT TO authenticated
  USING (true);

CREATE POLICY ingestion_admin ON takkle.ingestion_runs FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

CREATE POLICY duplicates_admin ON takkle.player_duplicate_candidates FOR ALL TO authenticated
  USING (takkle.is_admin()) WITH CHECK (takkle.is_admin());

-- Grants for Data API
GRANT USAGE ON SCHEMA takkle TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA takkle TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA takkle TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA takkle TO authenticated;

-- Auto-create users row on signup
CREATE OR REPLACE FUNCTION takkle.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = takkle, public
AS $$
BEGIN
  INSERT INTO takkle.users (id, email, display_name, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    coalesce((NEW.raw_app_meta_data->>'account_type')::account_type, 'player')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION takkle.handle_new_user();
