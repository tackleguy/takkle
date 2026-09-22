import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { safeNext, callbackNext, signUpAccount, SIGNUP_ROLES, accountActions } from '../src/lib/auth/flow.ts';
const require = createRequire(import.meta.url);
function loadTs(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => mocks[id] ?? require(id), process, console, URL });
  return module.exports;
}

test('auth redirects keep player destinations but reject external and login loops', () => {
  assert.equal(safeNext('/onboarding?player=test-player'), '/onboarding?player=test-player');
  for (const path of [null, 'https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil.test', '/%2fevil.test', '/auth/login', '/auth/callback', '/a\nb', '/%zz']) assert.equal(safeNext(path), '/account');
  assert.equal(callbackNext('/auth/reset-password'), '/auth/reset-password');
  assert.equal(safeNext('/auth/reset-password'), '/account');
});

test('every public signup role supports email confirmation without a second login attempt', async () => {
  for (const { value: role } of SIGNUP_ROLES) {
    let calls = 0;
    const client = { auth: { signUp: async input => {
      calls++;
      assert.equal(input.email, 'athlete@example.com');
      assert.equal(input.options.data.account_type, role);
      assert.equal(new URL(input.options.emailRedirectTo).searchParams.get('next'), '/onboarding?player=test');
      return { data: { user: { id: 'user' }, session: null }, error: null };
    }, signInWithPassword: () => { throw new Error('Confirmation must not trigger sign-in'); } } };
    const result = await signUpAccount(client, { email: ' athlete@example.com ', password: 'test-password', role, origin: 'https://takkle.example', next: '/onboarding?player=test' });
    assert.equal(result.state, 'confirmation_required');
    assert.equal(calls, 1);
    assert.ok(accountActions(role).length);
  }
});

test('confirmation-disabled signup accepts the session and public signup rejects reserved roles', async () => {
  const client = { auth: { signUp: async () => ({ data: { session: { user: { id: 'user' } } }, error: null }) } };
  assert.equal((await signUpAccount(client, { email: 'test@example.com', password: 'test-password', role: 'player', origin: 'https://takkle.example' })).state, 'signed_in');
  for (const role of ['admin', 'school', 'unknown']) await assert.rejects(signUpAccount(client, { role }), /available account types/);
  await assert.rejects(signUpAccount({ auth: { signUp: async () => ({ error: new Error('Rate limited') }) } }, { role: 'player', email: 'test@example.com', origin: 'https://takkle.example' }), /Rate limited/);
});

test('account roles use stored active profiles, independently of the service key', async () => {
  for (const role of [...SIGNUP_ROLES.map(role => role.value), 'school', 'admin']) {
    const query = { select: () => query, eq: (field, value) => { assert.equal(field, 'id'); assert.equal(value, 'verified-user'); return query; }, maybeSingle: async () => ({ data: { account_type: role, is_active: true, display_name: 'Test' }, error: null }) };
    const { accountSession } = loadTs('../src/lib/auth/session.ts', { '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'verified-user', user_metadata: { account_type: 'admin' } } } }) }, schema: () => ({ from: () => query }) }) } });
    const result = await accountSession();
    assert.equal(result.status, 'signed_in');
    assert.equal(result.role, role);
  }
});

test('missing, inactive, and unavailable accounts never fall back to metadata authority', async () => {
  for (const [profile, error, expected] of [[null, null, 'profile_unavailable'], [null, { message: 'policy failure' }, 'profile_unavailable'], [{ account_type: 'admin', is_active: false }, null, 'inactive']]) {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: profile, error }) };
    const { accountSession } = loadTs('../src/lib/auth/session.ts', { '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user', user_metadata: { account_type: 'admin' } } } }) }, schema: () => ({ from: () => query }) }) } });
    const result = await accountSession();
    assert.equal(result.status, expected);
    assert.equal(result.role, undefined);
  }
});

test('callback verifies auth code and preserves claim or password reset destination', async () => {
  for (const next of ['/onboarding?player=test', '/auth/reset-password', '//evil.test']) {
    const route = loadTs('../src/app/auth/callback/route.ts', { '@/lib/auth/flow': { callbackNext }, '@/lib/supabase/server': { createClient: async () => ({ auth: { exchangeCodeForSession: async code => { assert.equal(code, 'test-code'); return { error: null }; } } }) } });
    const response = await route.GET(new Request(`https://takkle.example/auth/callback?code=test-code&next=${encodeURIComponent(next)}`));
    assert.equal(response.headers.get('location'), `https://takkle.example${callbackNext(next)}`);
  }
  const route = loadTs('../src/app/auth/callback/route.ts', { '@/lib/auth/flow': { callbackNext }, '@/lib/supabase/server': { createClient: async () => ({ auth: { exchangeCodeForSession: async () => { throw new Error('Network failure'); } } }) } });
  const response = await route.GET(new Request('https://takkle.example/auth/callback?code=expired'));
  assert.match(response.headers.get('location'), /\/auth\/login\?error=confirm/);
});
