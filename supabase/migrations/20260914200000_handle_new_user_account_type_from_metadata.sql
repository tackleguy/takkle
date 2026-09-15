-- Clients can only set raw_user_meta_data on signup; app_metadata requires service role.
-- Whitelist non-privileged roles so signup cannot self-assign admin/school.
CREATE OR REPLACE FUNCTION takkle.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = takkle, public
AS $$
DECLARE
  requested text;
  resolved account_type;
BEGIN
  requested := coalesce(
    NEW.raw_app_meta_data->>'account_type',
    NEW.raw_user_meta_data->>'account_type'
  );

  IF requested IN ('player', 'parent', 'recruiter', 'coach', 'business') THEN
    resolved := requested::account_type;
  ELSE
    resolved := 'player'::account_type;
  END IF;

  INSERT INTO takkle.users (id, email, display_name, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    resolved
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
