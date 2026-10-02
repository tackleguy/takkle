import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nodeRequire = require;

function loadTs(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id) => mocks[id] ?? nodeRequire(id),
    process,
    console,
    Date,
    Buffer,
    URL,
  });
  return module.exports;
}

const security = loadTs('../src/lib/claims/security.ts');

test('evaluateClaimStrength rejects school email alone', () => {
  const decision = security.evaluateClaimStrength({
    playerId: 'p',
    userId: 'u',
    schoolEmail: 'a@school.edu',
    signals: ['school_email'],
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.requiresManualReview, true);
});

test('evaluateClaimStrength allows email plus jersey/season for manual review only', () => {
  const decision = security.evaluateClaimStrength({
    playerId: 'p',
    userId: 'u',
    schoolEmail: 'a@school.edu',
    jerseyNumber: 12,
    seasonYear: 2026,
    signals: ['school_email', 'jersey_number', 'season_info', 'manual_review'],
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.requiresManualReview, true);
});

test('isVerifiedSchoolDomain ignores TLD assumptions', () => {
  assert.equal(security.isVerifiedSchoolDomain('a@stanford.edu', []), false);
  assert.equal(security.isVerifiedSchoolDomain('a@stanford.edu', ['Stanford.EDU']), true);
  assert.equal(security.isVerifiedSchoolDomain('a@gmail.com', ['stanford.edu']), false);
});

test('rosterMatchScore rewards jersey alignment', () => {
  assert.ok(security.rosterMatchScore({
    submittedJersey: 7,
    submittedSeason: new Date().getFullYear(),
    playerJersey: 7,
    playerClassYear: new Date().getFullYear(),
  }) >= 0.5);
  assert.equal(security.rosterMatchScore({
    submittedJersey: 7,
    playerJersey: 99,
  }) < 0.5, true);
});

test('buildClaimSignals requires domain for school_email signal', () => {
  const weak = security.buildClaimSignals({
    relationship: 'player',
    schoolEmailVerified: true,
    domainVerified: false,
    jerseyNumber: 1,
    seasonYear: 2026,
    rosterScore: 0,
  });
  assert.ok(weak.includes('school_info'));
  assert.ok(!weak.includes('school_email'));

  const strong = security.buildClaimSignals({
    relationship: 'player',
    schoolEmailVerified: true,
    domainVerified: true,
    jerseyNumber: 1,
    seasonYear: 2026,
    rosterScore: 0.8,
  });
  assert.ok(strong.includes('school_email'));
  assert.ok(strong.includes('roster_match'));
});
