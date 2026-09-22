import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('account migration repairs self access and creates all signup roles without privilege escalation', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth; CREATE SCHEMA takkle;
      CREATE TYPE public.account_type AS ENUM ('player','parent','recruiter','coach','business','school','admin');
      CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      CREATE TABLE takkle.users (id uuid PRIMARY KEY REFERENCES auth.users, email text, display_name text, account_type public.account_type DEFAULT 'player', is_active boolean DEFAULT true);
      CREATE TABLE takkle.player_accounts (user_id uuid REFERENCES takkle.users, player_id uuid);
      ALTER TABLE takkle.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE takkle.player_accounts ENABLE ROW LEVEL SECURITY;
      CREATE FUNCTION takkle.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM takkle.users WHERE id=auth.uid() AND account_type='admin' AND is_active) $$;
      CREATE FUNCTION takkle.owns_player(player uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM takkle.player_accounts WHERE user_id=auth.uid() AND player_id=player) $$;
      CREATE POLICY users_select_own ON takkle.users FOR SELECT TO authenticated USING (id=auth.uid() OR takkle.is_admin());
      CREATE POLICY player_accounts_select ON takkle.player_accounts FOR SELECT TO authenticated USING (user_id=auth.uid() OR takkle.owns_player(player_id));
      CREATE POLICY player_accounts_admin ON takkle.player_accounts FOR ALL TO authenticated USING (takkle.is_admin());
      GRANT USAGE ON SCHEMA takkle,auth TO authenticated;
      GRANT SELECT ON ALL TABLES IN SCHEMA takkle TO authenticated;
      INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('00000000-0000-0000-0000-000000000001','existing@example.com','{"account_type":"admin"}'),('00000000-0000-0000-0000-000000000002','missing@example.com','{"account_type":"coach"}');
      INSERT INTO takkle.users(id,email,account_type,is_active) VALUES ('00000000-0000-0000-0000-000000000001','existing@example.com','parent',false);
    `);
    const migration = fs.readFileSync(new URL('../supabase/migrations/20260922061313_fix_account_self_access.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(`CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION takkle.handle_new_user()`);
    assert.equal((await db.query(`SELECT account_type FROM takkle.users WHERE email='missing@example.com'`)).rows[0].account_type, 'coach');
    assert.deepEqual((await db.query(`SELECT account_type,is_active FROM takkle.users WHERE email='existing@example.com'`)).rows[0], { account_type: 'parent', is_active: false });
    for (const role of ['player','parent','recruiter','coach','business','admin','school','invalid']) {
      await db.query(`INSERT INTO auth.users(email,raw_user_meta_data) VALUES ($1,$2)`, [`${role}@example.com`, JSON.stringify({ account_type: role })]);
      assert.equal((await db.query(`SELECT account_type FROM takkle.users WHERE email=$1`, [`${role}@example.com`])).rows[0].account_type, ['admin','school','invalid'].includes(role) ? 'player' : role);
    }
    for (const role of ['school','admin']) {
      await db.query(`INSERT INTO auth.users(email,raw_app_meta_data) VALUES ($1,$2)`, [`trusted-${role}@example.com`, JSON.stringify({ account_type: role })]);
      assert.equal((await db.query(`SELECT account_type FROM takkle.users WHERE email=$1`, [`trusted-${role}@example.com`])).rows[0].account_type, role);
    }
    await db.exec(`INSERT INTO takkle.player_accounts VALUES ('00000000-0000-0000-0000-000000000001',gen_random_uuid()),('00000000-0000-0000-0000-000000000002',gen_random_uuid());
      SET ROLE authenticated; SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';`);
    assert.equal((await db.query(`SELECT email FROM takkle.users`)).rows.length, 1);
    assert.equal((await db.query(`SELECT email FROM takkle.users`)).rows[0].email, 'missing@example.com');
    assert.equal((await db.query(`SELECT user_id FROM takkle.player_accounts`)).rows.length, 1);
    assert.equal((await db.query(`SELECT user_id FROM takkle.player_accounts`)).rows[0].user_id, '00000000-0000-0000-0000-000000000002');
    await assert.rejects(db.exec(`UPDATE takkle.users SET account_type='admin'`), /permission denied/);
    await db.exec(`RESET ROLE`);
    await db.exec(migration);
    assert.equal((await db.query(`SELECT is_active FROM takkle.users WHERE email='existing@example.com'`)).rows[0].is_active, false);
  } finally { await db.close(); }
});
