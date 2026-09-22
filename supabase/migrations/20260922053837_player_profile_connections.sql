-- Profile writes go through authenticated server endpoints. Public reads remain open.
CREATE TABLE takkle.player_external_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES takkle.players(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('maxpreps', '247sports', 'on3', 'espn', 'hudl', 'other')),
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 100),
  source_url text NOT NULL CHECK (source_url LIKE 'https://%' AND length(source_url) <= 2048),
  created_by_user_id uuid REFERENCES takkle.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, provider, source_url)
);
ALTER TABLE takkle.player_external_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY external_profiles_public_read ON takkle.player_external_profiles
  FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON takkle.player_external_profiles TO anon, authenticated;
GRANT ALL ON takkle.player_external_profiles TO service_role;

-- Prevent clients from promoting their role, approving their own claim, forging
-- ownership, or bypassing validation in the profile endpoints.
REVOKE INSERT, UPDATE, DELETE ON takkle.users, takkle.player_accounts,
  takkle.player_claims, takkle.player_film, takkle.players FROM anon, authenticated;
GRANT UPDATE (display_name, phone, avatar_url, state_code) ON takkle.users TO authenticated;
GRANT ALL ON takkle.users, takkle.player_accounts, takkle.player_claims,
  takkle.player_film, takkle.players TO service_role;
GRANT USAGE ON SCHEMA takkle TO service_role;

-- Invoker rights, service role only; the API supplies the verified reviewer ID.
-- Lock both records so approval and ownership are committed together.
CREATE OR REPLACE FUNCTION takkle.review_player_claim(p_claim_id uuid, p_reviewer_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE c takkle.player_claims;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM takkle.users WHERE id = p_reviewer_id AND account_type = 'admin' AND is_active) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  SELECT * INTO c FROM takkle.player_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND OR c.status <> 'pending' THEN RAISE EXCEPTION 'Claim is no longer pending'; END IF;
  PERFORM 1 FROM takkle.players WHERE id = c.player_id FOR UPDATE;
  IF p_approve THEN
    IF EXISTS (SELECT 1 FROM takkle.player_accounts WHERE player_id = c.player_id AND revoked_at IS NULL) THEN
      RAISE EXCEPTION 'Player already has an owner';
    END IF;
    INSERT INTO takkle.player_accounts (player_id, user_id, is_primary_owner, verified_at)
      VALUES (c.player_id, c.user_id, true, now())
      ON CONFLICT (player_id, user_id) DO UPDATE SET verified_at = now(), revoked_at = NULL, is_primary_owner = true;
    UPDATE takkle.players SET status = 'verified_player' WHERE id = c.player_id;
  END IF;
  UPDATE takkle.player_claims SET status = CASE WHEN p_approve THEN 'approved'::public.claim_status ELSE 'rejected'::public.claim_status END,
    reviewed_by = p_reviewer_id, reviewed_at = now(), updated_at = now() WHERE id = c.id;
END;
$$;
REVOKE ALL ON FUNCTION takkle.review_player_claim(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION takkle.review_player_claim(uuid, uuid, boolean) TO service_role;
