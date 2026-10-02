import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
function loadTs(file, mocks, env = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => mocks[id] ?? require(id), process: { env }, console, Date, URL });
  return module.exports;
}

const rows = [
  { id: 'hs', slug: 'alex-high-school', first_name: 'Alex', last_name: 'Adams', display_name: 'Alex Adams', status: 'unclaimed', competition_level: 'hs', is_synthetic: false, state_code: 'CA' },
  { id: 'college', slug: 'alex-college', first_name: 'Alex', last_name: 'Baker', display_name: 'Alex Baker', status: 'unclaimed', competition_level: 'college', is_synthetic: false, state_code: 'TX' },
  { id: 'claimed', status: 'verified_player', competition_level: 'hs', is_synthetic: false, state_code: 'CA' },
  { id: 'demo', status: 'unclaimed', competition_level: 'hs', is_synthetic: true, state_code: 'CA' },
];

function searchRoute({ live = true, seed = [] } = {}) {
  let selected = rows;
  const query = {
    select: () => query,
    eq: (key, value) => { selected = selected.filter(row => row[key] === value); return query; },
    in: (key, values) => { selected = selected.filter(row => values.includes(row[key])); return query; },
    order: () => query,
    limit: () => query,
    or: () => query,
    then: resolve => resolve({ data: selected, error: null }),
  };
  return loadTs('../src/app/api/players/search/route.ts', {
    '@supabase/supabase-js': { createClient: () => ({ from: () => query }) },
    '@/lib/player-display': { displaySchoolLabel: value => value ?? null },
    '@/lib/players': { searchPlayers: () => ({ players: seed }) },
  }, live ? { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test' } : {});
}

test('claim search includes existing high-school and college players, excluding claimed and synthetic records', async () => {
  const response = await searchRoute().GET(new Request('https://example.test/api/players/search?q=Alex'));
  const data = await response.json();
  assert.deepEqual(data.players.map(player => [player.id, player.competitionLevel]), [['hs', 'hs'], ['college', 'college']]);
});

test('claim search respects competition level and state and rejects unknown levels', async () => {
  for (const [level, expected] of [['hs', ['hs']], ['college', ['college']]]) {
    const response = await searchRoute().GET(new Request(`https://example.test/api/players/search?q=Alex&level=${level}`));
    assert.deepEqual((await response.json()).players.map(player => player.id), expected);
  }
  const response = await searchRoute().GET(new Request('https://example.test/api/players/search?state=CA'));
  assert.deepEqual((await response.json()).players.map(player => player.id), ['hs']);
  assert.equal((await searchRoute().GET(new Request('https://example.test/api/players/search?q=Alex&level=pro'))).status, 400);
});

test('fallback filters level, ownership and synthetic records before applying the result limit', async () => {
  const seed = rows.map(row => ({ id: row.id, slug: row.slug, displayName: row.display_name, competitionLevel: row.competition_level, status: row.status, isSynthetic: row.is_synthetic }));
  const response = await searchRoute({ live: false, seed: [seed[1], seed[2], seed[3], seed[0]] }).GET(new Request('https://example.test/api/players/search?q=Alex&level=hs&limit=1'));
  const data = await response.json();
  assert.equal(data.source, 'seed');
  assert.deepEqual(data.players.map(player => player.id), ['hs']);
});

test('high-school profile lookup opens existing records without applying college scores or rankings', async () => {
  const filters = [];
  const query = { select: () => query, eq: (...args) => { filters.push(args); return query; }, in: (...args) => { filters.push(args); return query; }, maybeSingle: async () => ({ data: rows[0], error: null }) };
  const content = { select: () => content, eq: () => content, in: () => content, order: () => content, then: resolve => resolve({ data: [], error: null }) };
  const client = { from: table => {
    assert.notEqual(table, 'player_rankings', 'HS players must not query college rankings');
    return table === 'players' ? query : content;
  } };
  const { getLivePlayerBySlug } = loadTs('../src/lib/live-players.ts', {
    '@/lib/profile/college-roster': { restoreCollegeRoster: player => player },
    '@/lib/profile/links': { publicHttpsUrl: value => value },
    '@/lib/recruiting/class-years': { DEFAULT_RECRUIT_CLASS: 2027 },
    '@/lib/competition-level': { ACTIVE_COMPETITION_LEVEL: 'college' },
    '@/lib/scoring/college-provisional': { COLLEGE_RANKING_VERSION: 'college', scoreCollegePlayer: () => { throw new Error('HS must not receive a college score'); } },
    '@/lib/takkle-client': { createTakkleClient: () => client },
    '@/lib/players': { getPlayerBySlug: () => null },
  });
  const { player } = await getLivePlayerBySlug(rows[0].slug);
  assert.equal(player?.id, 'hs');
  assert.equal(player.competitionLevel, 'hs');
  assert.equal(player.tackleScore.score, 0);
  assert.equal(player.tackleScore.version, 'unscored');
  assert.deepEqual(JSON.parse(JSON.stringify(filters)), [['slug', rows[0].slug], ['is_synthetic', false], ['competition_level', ['hs', 'college']]]);
});

test('provisional profile scoring applies only to college football across competition levels and sports', async () => {
  for (const [level, sport, expectedCalls] of [['college', 'football', 1], ['college', 'basketball', 0], ['hs', 'football', 0], ['hs', 'basketball', 0]]) {
    const row = { ...rows[0], competition_level: level, sport };
    let scoringCalls = 0;
    const query = { select: () => query, eq: () => query, in: () => query, maybeSingle: async () => ({ data: row, error: null }) };
    const content = { select: () => content, eq: () => content, in: () => content, order: () => content, then: resolve => resolve({ data: [], error: null }) };
    const { getLivePlayerBySlug } = loadTs('../src/lib/live-players.ts', {
      '@/lib/profile/college-roster': { restoreCollegeRoster: player => player },
      '@/lib/profile/links': { publicHttpsUrl: value => value },
      '@/lib/recruiting/class-years': { DEFAULT_RECRUIT_CLASS: 2027 },
      '@/lib/competition-level': { ACTIVE_COMPETITION_LEVEL: 'college' },
      '@/lib/scoring/college-provisional': { COLLEGE_RANKING_VERSION: 'college', scoreCollegePlayer: () => { scoringCalls++; return { score: 6.4, confidence: 'limited' }; } },
      '@/lib/takkle-client': { createTakkleClient: () => ({ from: table => table === 'players' ? query : content }) },
      '@/lib/players': { getPlayerBySlug: () => null },
    });
    const { player } = await getLivePlayerBySlug(row.slug);
    assert.equal(scoringCalls, expectedCalls, `${level} ${sport}`);
    assert.equal(player?.tackleScore.score, expectedCalls ? 6.4 : 0, `${level} ${sport}`);
    assert.equal(player.sport, sport);
    assert.equal(player.competitionLevel, level);
  }
});
