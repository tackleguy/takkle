import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { normalizeStatsUrl, youtubeVideo, publicHttpsUrl } from '../src/lib/profile/links.ts';
import { formatHeight, formatWeight, playerSchoolName, playerDisplayName, playerClassLabel } from '../src/lib/player-display.ts';
const require = createRequire(import.meta.url);
function loadTs(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => mocks[id] ?? require(id), process, console, Date });
  return module.exports;
}

test('college identity and measurements never show zero or hide a valid school', () => {
  assert.equal(formatHeight(74), '6′ 2″');
  assert.equal(formatHeight(71.9), '6′ 0″');
  assert.equal(formatHeight(0), 'Not listed');
  assert.equal(formatWeight(NaN), 'Not listed');
  assert.equal(formatWeight(215), '215 lbs');
  assert.equal(playerSchoolName({ collegeName: 'Transfer Portal', school: { name: 'Georgia' } }), 'Georgia');
  assert.equal(playerDisplayName({ displayName: ' ', firstName: 'Alex', lastName: 'Smith' }), 'Alex Smith');
  assert.equal(playerClassLabel({ competitionLevel: 'college', classYear: 0 }), 'College football');
});

test('stats links validate provider domains and reject unsafe or homepage URLs', () => {
  assert.equal(normalizeStatsUrl('maxpreps', 'https://www.maxpreps.com/athlete/alex/stats/'), 'https://www.maxpreps.com/athlete/alex/stats/');
  assert.ok(normalizeStatsUrl('247sports', 'https://247sports.com/player/alex-123/'));
  assert.ok(normalizeStatsUrl('other', 'https://athletics.example.edu/roster/alex'));
  for (const url of ['javascript:alert(1)', 'http://maxpreps.com/player', 'https://maxpreps.com.evil.com/player', 'https://evilmaxpreps.com/player', 'https://maxpreps.com/', 'https://user:pass@maxpreps.com/player']) assert.equal(normalizeStatsUrl('maxpreps', url), null);
  for (const url of ['https://127.0.0.1/profile', 'https://localhost/profile', 'https://[::1]/profile']) assert.equal(publicHttpsUrl(url), null);
});

test('YouTube supports watch, share, shorts, live and embeds without trusting arbitrary iframe URLs', () => {
  for (const url of ['https://youtu.be/Abcdef_1234?si=x', 'https://www.youtube.com/watch?v=Abcdef_1234&t=15', 'https://m.youtube.com/shorts/Abcdef_1234', 'https://youtube.com/live/Abcdef_1234', 'https://www.youtube-nocookie.com/embed/Abcdef_1234']) assert.equal(youtubeVideo(url)?.embedUrl, 'https://www.youtube-nocookie.com/embed/Abcdef_1234');
  for (const url of ['https://youtube.com.evil.com/watch?v=Abcdef_1234', 'https://youtu.be/not-an-id', 'https://youtube.com/playlist?list=Abcdef_1234', 'javascript:alert(1)']) assert.equal(youtubeVideo(url), null);
});

test('content API rejects anonymous users, pending claims, and other owners before writing', async () => {
  for (const session of [null, { user: { id: 'other-user' }, db: { from: () => { throw new Error('Must not write'); } } }]) {
    const route = loadTs('../src/app/api/players/[id]/content/route.ts', {
      '@/lib/profile/access': { profileSession: async () => session, ownsProfile: async () => false },
      '@/lib/profile/links': { normalizeStatsUrl, youtubeVideo },
    });
    const response = await route.POST(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ action: 'film' }) }), { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });
    assert.equal(response.status, session ? 403 : 401);
  }
});

test('approved-owner film writes derive trusted embed and ownership fields', async () => {
  let saved;
  const route = loadTs('../src/app/api/players/[id]/content/route.ts', {
    '@/lib/profile/access': { profileSession: async () => ({ user: { id: 'owner-id' }, db: { from: table => { assert.equal(table, 'player_film'); return { insert: fields => { saved = fields; return { select: () => ({ single: async () => ({ error: null }) }) }; } }; } } }), ownsProfile: async () => true },
    '@/lib/profile/links': { normalizeStatsUrl, youtubeVideo },
  });
  const response = await route.POST(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ action: 'film', title: 'Season highlights', url: 'https://youtu.be/Abcdef_1234', filmType: 'highlights', seasonYear: 2026, verification_status: 'platform_verified', created_by_user_id: 'attacker' }) }), { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });
  assert.equal(response.status, 200);
  assert.equal(saved.verification_status, 'player_confirmed');
  assert.equal(saved.created_by_user_id, 'owner-id');
  assert.equal(saved.embed_url, 'https://www.youtube-nocookie.com/embed/Abcdef_1234');
});

test('ownership requires verified, non-revoked grant for the exact signed-in user', async () => {
  const filters = [];
  const query = { select: () => query, eq: (...args) => { filters.push(args); return query; }, is: (...args) => { filters.push(args); return query; }, not: (...args) => { filters.push(args); return query; }, maybeSingle: async () => ({ data: { player_id: 'player' }, error: null }) };
  const { ownsProfile } = loadTs('../src/lib/profile/access.ts', { '@/lib/supabase/server': {}, '@/lib/takkle-client': {} });
  assert.equal(await ownsProfile({ user: { id: 'owner' }, db: { from: () => query } }, 'player'), true);
  assert.deepEqual(filters, [['player_id', 'player'], ['user_id', 'owner'], ['revoked_at', null], ['verified_at', 'is', null]]);
});

test('claim submission persists pending review using the session identity, ignoring client approval claims', async () => {
  let inserted;
  const db={from:table=>{
    const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{id:'player-id',status:'unclaimed'},error:null}),gte:async()=>({count:0,error:null}),insert:async fields=>{inserted=fields;return {error:null};}};
    assert.ok(['players','player_claims'].includes(table));
    return query;
  }};
  const route=loadTs('../src/app/api/claims/route.ts',{'@/lib/profile/access':{profileSession:async()=>({db,user:{id:'verified-session-user'}})}});
  const response=await route.POST(new Request('http://localhost/api/claims',{method:'POST',body:JSON.stringify({playerSlug:'test-player',schoolEmail:'athlete@example.edu',notes:'Official roster and jersey number available for review.',userId:'attacker',status:'approved',signals:['school_email']})}));
  assert.equal(response.status,200);
  assert.equal(inserted.user_id,'verified-session-user');
  assert.equal(inserted.status,'pending');
});

test('removing connected sources is scoped to the owned player and selected source', async () => {
  const filters=[];
  const query={delete:()=>query,eq:(...args)=>{filters.push(args);return query;},select:()=>query,single:async()=>({error:null})};
  const route=loadTs('../src/app/api/players/[id]/content/route.ts',{
    '@/lib/profile/access':{profileSession:async()=>({user:{id:'owner'},db:{from:table=>{assert.equal(table,'player_external_profiles');return query;}}}),ownsProfile:async()=>true},
    '@/lib/profile/links':{normalizeStatsUrl,youtubeVideo},
  });
  const playerId='11111111-1111-4111-8111-111111111111', sourceId='22222222-2222-4222-8222-222222222222';
  const response=await route.POST(new Request('http://localhost/api',{method:'POST',body:JSON.stringify({action:'remove_source',id:sourceId})}),{params:Promise.resolve({id:playerId})});
  assert.equal(response.status,200);
  assert.deepEqual(filters,[['player_id',playerId],['id',sourceId]]);
});
