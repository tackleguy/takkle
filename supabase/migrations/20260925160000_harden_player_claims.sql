-- Harden player claims: email proof columns, OTP challenges, review/revoke RPCs.
-- Claim mutations stay service-role only via authenticated API routes.

ALTER TABLE takkle.player_claims
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_proof_method text,
  ADD COLUMN IF NOT EXISTS relationship text NOT NULL DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS signals text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS domain_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS strength_notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'player_claims_email_proof_method_check'
      AND conrelid = 'takkle.player_claims'::regclass
  ) THEN
    ALTER TABLE takkle.player_claims
      ADD CONSTRAINT player_claims_email_proof_method_check
      CHECK (email_proof_method IS NULL OR email_proof_method IN ('account_email', 'otp', 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'player_claims_relationship_check'
      AND conrelid = 'takkle.player_claims'::regclass
  ) THEN
    ALTER TABLE takkle.player_claims
      ADD CONSTRAINT player_claims_relationship_check
      CHECK (relationship IN ('player', 'guardian'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS takkle.claim_email_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES takkle.users (id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES takkle.players (id) ON DELETE CASCADE,
  school_email text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  proof_token_hash text,
  proof_expires_at timestamptz,
  proof_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claim_email_challenges_user_idx
  ON takkle.claim_email_challenges (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS claim_email_challenges_proof_idx
  ON takkle.claim_email_challenges (proof_token_hash)
  WHERE proof_token_hash IS NOT NULL AND proof_used_at IS NULL;

ALTER TABLE takkle.claim_email_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON takkle.claim_email_challenges FROM PUBLIC, anon, authenticated;
GRANT ALL ON takkle.claim_email_challenges TO service_role;

-- Prevent clients from forging claims, ownership, or roster identity.
REVOKE INSERT, UPDATE, DELETE ON takkle.users, takkle.player_accounts,
  takkle.player_claims, takkle.player_film, takkle.players FROM anon, authenticated;
GRANT UPDATE (display_name, phone, avatar_url, state_code) ON takkle.users TO authenticated;
GRANT ALL ON takkle.users, takkle.player_accounts, takkle.player_claims,
  takkle.player_film, takkle.players, takkle.claim_email_challenges,
  takkle.verification_events, takkle.claim_disputes, takkle.audit_logs TO service_role;

-- Atomic claim approval (may not have been applied yet on hosted projects).
CREATE OR REPLACE FUNCTION takkle.review_player_claim(p_claim_id uuid, p_reviewer_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  c takkle.player_claims;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM takkle.users
    WHERE id = p_reviewer_id AND account_type = 'admin' AND is_active
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO c FROM takkle.player_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND OR c.status <> 'pending' THEN
    RAISE EXCEPTION 'Claim is no longer pending';
  END IF;

  PERFORM 1 FROM takkle.players WHERE id = c.player_id FOR UPDATE;

  IF p_approve THEN
    IF EXISTS (
      SELECT 1 FROM takkle.player_accounts
      WHERE player_id = c.player_id AND revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Player already has an owner';
    END IF;

    INSERT INTO takkle.player_accounts (player_id, user_id, is_primary_owner, verified_at)
    VALUES (c.player_id, c.user_id, true, now())
    ON CONFLICT (player_id, user_id) DO UPDATE
      SET verified_at = now(), revoked_at = NULL, is_primary_owner = true;

    UPDATE takkle.players
    SET status = 'verified_player'
    WHERE id = c.player_id;
  END IF;

  UPDATE takkle.player_claims
  SET status = CASE
        WHEN p_approve THEN 'approved'::public.claim_status
        ELSE 'rejected'::public.claim_status
      END,
      reviewed_by = p_reviewer_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = c.id;

  INSERT INTO takkle.verification_events (player_id, user_id, claim_id, method_code, success, evidence)
  VALUES (
    c.player_id,
    c.user_id,
    c.id,
    'manual_review',
    p_approve,
    jsonb_build_object(
      'reviewer_id', p_reviewer_id,
      'signals', COALESCE(to_jsonb(c.signals), '[]'::jsonb),
      'domain_verified', c.domain_verified,
      'email_proof_method', c.email_proof_method
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION takkle.review_player_claim(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION takkle.review_player_claim(uuid, uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION takkle.revoke_player_ownership(
  p_player_id uuid,
  p_admin_id uuid,
  p_dispute_id uuid DEFAULT NULL,
  p_resolution_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM takkle.users
    WHERE id = p_admin_id AND account_type = 'admin' AND is_active
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  PERFORM 1 FROM takkle.players WHERE id = p_player_id FOR UPDATE;

  UPDATE takkle.player_accounts
  SET revoked_at = now(), is_primary_owner = false
  WHERE player_id = p_player_id AND revoked_at IS NULL;

  UPDATE takkle.player_claims
  SET status = 'rejected'::public.claim_status,
      updated_at = now()
  WHERE player_id = p_player_id
    AND status IN ('pending', 'approved', 'locked', 'disputed');

  UPDATE takkle.players
  SET status = 'unclaimed'
  WHERE id = p_player_id;

  IF p_dispute_id IS NOT NULL THEN
    UPDATE takkle.claim_disputes
    SET status = 'resolved'::public.dispute_status,
        resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
        resolved_by = p_admin_id,
        resolved_at = now()
    WHERE id = p_dispute_id AND player_id = p_player_id;
  END IF;

  INSERT INTO takkle.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_admin_id,
    'revoke_player_ownership',
    'player',
    p_player_id,
    jsonb_build_object('dispute_id', p_dispute_id, 'notes', p_resolution_notes)
  );
END;
$$;

REVOKE ALL ON FUNCTION takkle.revoke_player_ownership(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION takkle.revoke_player_ownership(uuid, uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION takkle.resolve_claim_dispute(
  p_dispute_id uuid,
  p_admin_id uuid,
  p_revoke_owner boolean,
  p_resolution_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  d takkle.claim_disputes;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM takkle.users
    WHERE id = p_admin_id AND account_type = 'admin' AND is_active
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO d FROM takkle.claim_disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND OR d.status NOT IN ('open', 'under_review') THEN
    RAISE EXCEPTION 'Dispute is not open';
  END IF;

  IF p_revoke_owner THEN
    PERFORM takkle.revoke_player_ownership(d.player_id, p_admin_id, d.id, p_resolution_notes);
  ELSE
    UPDATE takkle.claim_disputes
    SET status = 'rejected'::public.dispute_status,
        resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
        resolved_by = p_admin_id,
        resolved_at = now()
    WHERE id = d.id;

    -- Restore approved claim status if ownership still stands.
    UPDATE takkle.player_claims
    SET status = 'approved'::public.claim_status, updated_at = now()
    WHERE player_id = d.player_id
      AND status = 'disputed'
      AND EXISTS (
        SELECT 1 FROM takkle.player_accounts
        WHERE player_id = d.player_id AND revoked_at IS NULL
      );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION takkle.resolve_claim_dispute(uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION takkle.resolve_claim_dispute(uuid, uuid, boolean, text) TO service_role;
