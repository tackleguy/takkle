import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('migration enforces public reads, server-only writes, and atomic verified claims', async () => {
  const db = new PGlite();
  try {
    // Existing schema shape relevant to this migration; real Postgres grants/RLS.
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA takkle;
      CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected');
      CREATE TABLE takkle.users (id uuid PRIMARY KEY, account_type text, is_active boolean, display_name text, phone text, avatar_url text, state_code text);
      CREATE TABLE takkle.players (id uuid PRIMARY KEY, status text);
      CREATE TABLE takkle.player_accounts (player_id uuid REFERENCES takkle.players, user_id uuid REFERENCES takkle.users, is_primary_owner boolean, verified_at timestamptz, revoked_at timestamptz, UNIQUE(player_id,user_id));
      CREATE UNIQUE INDEX one_owner ON takkle.player_accounts(player_id) WHERE is_primary_owner AND revoked_at IS NULL;
      CREATE TABLE takkle.player_claims (id uuid PRIMARY KEY, player_id uuid REFERENCES takkle.players, user_id uuid REFERENCES takkle.users, status public.claim_status, reviewed_by uuid, reviewed_at timestamptz, updated_at timestamptz);
      CREATE TABLE takkle.player_film (id uuid);
      GRANT USAGE ON SCHEMA takkle TO anon, authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA takkle TO authenticated;
      INSERT INTO takkle.users(id,account_type,is_active) VALUES ('00000000-0000-0000-0000-000000000001','player',true),('00000000-0000-0000-0000-000000000002','admin',true),('00000000-0000-0000-0000-000000000003','player',true);
      INSERT INTO takkle.players VALUES ('10000000-0000-0000-0000-000000000001','unclaimed');
      INSERT INTO takkle.player_claims(id,player_id,user_id,status) VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','pending');
    `);
    await db.exec(fs.readFileSync(new URL('../supabase/migrations/20260922053837_player_profile_connections.sql', import.meta.url), 'utf8'));
    await db.exec(`SET ROLE authenticated`);
    await assert.rejects(db.exec(`UPDATE takkle.users SET account_type='admin'`), /permission denied/);
    await assert.rejects(db.exec(`UPDATE takkle.player_claims SET status='approved'`), /permission denied/);
    await assert.rejects(db.exec(`INSERT INTO takkle.player_film VALUES (gen_random_uuid())`), /permission denied/);
    await assert.rejects(db.exec(`SELECT takkle.review_player_claim('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',true)`), /permission denied/);
    await db.exec(`SET ROLE service_role`);
    await assert.rejects(db.exec(`SELECT takkle.review_player_claim('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',true)`), /Admin access required/);
    await db.exec(`SELECT takkle.review_player_claim('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',true)`);
    assert.equal((await db.query(`SELECT status FROM takkle.players`)).rows[0].status, 'verified_player');
    assert.equal((await db.query(`SELECT count(*)::int n FROM takkle.player_accounts WHERE verified_at IS NOT NULL AND revoked_at IS NULL`)).rows[0].n, 1);
    assert.equal((await db.query(`SELECT status FROM takkle.player_claims`)).rows[0].status, 'approved');
    await assert.rejects(db.exec(`SELECT takkle.review_player_claim('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',true)`), /no longer pending/);
    await db.exec(`INSERT INTO takkle.player_external_profiles(player_id,provider,label,source_url) VALUES ('10000000-0000-0000-0000-000000000001','maxpreps','Stats','https://maxpreps.com/athlete/test')`);
    await db.exec(`SET ROLE anon`);
    assert.equal((await db.query(`SELECT label FROM takkle.player_external_profiles`)).rows[0].label, 'Stats');
    await assert.rejects(db.exec(`DELETE FROM takkle.player_external_profiles`), /permission denied/);
    await db.exec(`SET ROLE authenticated`);
    await assert.rejects(db.exec(`INSERT INTO takkle.player_external_profiles(player_id,provider,label,source_url) VALUES ('10000000-0000-0000-0000-000000000001','espn','Stats','https://espn.com/player/test')`), /permission denied/);
    await db.exec(`SET ROLE service_role`);
    await db.exec(`INSERT INTO takkle.player_claims(id,player_id,user_id,status) VALUES ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','pending')`);
    await assert.rejects(db.exec(`SELECT takkle.review_player_claim('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',true)`), /already has an owner/);
    assert.equal((await db.query(`SELECT status FROM takkle.player_claims WHERE id='20000000-0000-0000-0000-000000000002'`)).rows[0].status, 'pending');
    await db.exec(`SELECT takkle.review_player_claim('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',false)`);
    assert.equal((await db.query(`SELECT status FROM takkle.player_claims WHERE id='20000000-0000-0000-0000-000000000002'`)).rows[0].status, 'rejected');
  } finally { await db.close(); }
});

test('roster repair updates damaged unclaimed records and preserves owner details', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA takkle; CREATE TABLE takkle.players (id uuid PRIMARY KEY, status text, first_name text, last_name text, college_name text, source_school text, conference text, height_inches numeric, weight_lbs integer, source_name text, source_url text, last_verified_at timestamptz);
      INSERT INTO takkle.players(id,status,source_name,college_name) VALUES ('615659b6-891c-56f2-8dce-206df3613d2e','unclaimed','ESPN Transfer Portal Rankings','Transfer Portal'),('6575e7c6-b440-5201-b719-c0f05eb3f913','verified_player','ESPN Transfer Portal Rankings','Owner school');`);
    const migration=fs.readFileSync(new URL('../supabase/migrations/20260922055234_repair_college_roster_identity.sql',import.meta.url),'utf8');
    await db.exec(migration);
    const result=await db.query(`SELECT first_name,college_name,height_inches,weight_lbs FROM takkle.players WHERE id='615659b6-891c-56f2-8dce-206df3613d2e'`);
    assert.equal(result.rows[0].college_name,'Texas');
    assert.equal(Number(result.rows[0].height_inches),76);
    assert.equal(result.rows[0].weight_lbs,222);
    assert.equal((await db.query(`SELECT college_name FROM takkle.players WHERE status='verified_player'`)).rows[0].college_name,'Owner school');
    await db.exec(migration); // Safe to apply after rows have already been repaired.
  } finally { await db.close(); }
});
