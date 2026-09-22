-- Avoid recursive users -> is_admin -> users and accounts -> owns_player -> accounts
-- policies. Admin workflows read other users through authenticated server endpoints.
DROP POLICY IF EXISTS users_select_own ON takkle.users;
CREATE POLICY users_select_own ON takkle.users FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
DROP POLICY IF EXISTS player_accounts_select ON takkle.player_accounts;
CREATE POLICY player_accounts_select ON takkle.player_accounts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Normal signup roles cannot assign administrator or school authority.
-- Trusted app_metadata may assign invited roles; user_metadata is a preference only.
CREATE OR REPLACE FUNCTION takkle.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE requested text; resolved public.account_type;
BEGIN
  requested := NEW.raw_app_meta_data->>'account_type';
  IF requested IN ('player','parent','recruiter','coach','business','school','admin') THEN
    resolved := requested::public.account_type;
  ELSE
    requested := NEW.raw_user_meta_data->>'account_type';
    IF requested IN ('player','parent','recruiter','coach','business') THEN
      resolved := requested::public.account_type;
    ELSE resolved := 'player'::public.account_type;
    END IF;
  END IF;
  INSERT INTO takkle.users(id,email,display_name,account_type)
    VALUES (NEW.id,NEW.email,coalesce(NEW.raw_user_meta_data->>'display_name',split_part(NEW.email,'@',1)),resolved)
    ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION takkle.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Repair Auth users created before the application-profile trigger was installed.
-- Preserve every existing role and inactive-account flag.
INSERT INTO takkle.users(id,email,display_name,account_type)
SELECT id,email,coalesce(raw_user_meta_data->>'display_name',split_part(email,'@',1)),
  CASE
    WHEN raw_app_meta_data->>'account_type' IN ('player','parent','recruiter','coach','business','school','admin')
      THEN (raw_app_meta_data->>'account_type')::public.account_type
    WHEN raw_user_meta_data->>'account_type' IN ('player','parent','recruiter','coach','business')
      THEN (raw_user_meta_data->>'account_type')::public.account_type
    ELSE 'player'::public.account_type
  END
FROM auth.users ON CONFLICT (id) DO NOTHING;
