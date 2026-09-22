import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const corrections=JSON.parse(fs.readFileSync(new URL('../src/data/seed/college-profile-corrections.json',import.meta.url)));
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../src/lib/profile/college-roster.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:()=>corrections});
const {restoreCollegeRoster}=module.exports;
test('known transfer-feed placeholders restore source-backed college details, preserving owner edits',()=>{
  const id='615659b6-891c-56f2-8dce-206df3613d2e';
  const player={id,status:'unclaimed',collegeName:'Transfer Portal',school:{name:'Transfer Portal'},provenance:{sourceName:'ESPN Transfer Portal Rankings'}};
  const restored=restoreCollegeRoster(player);
  assert.equal(restored.collegeName,'Texas');
  assert.equal(restored.school.name,'Texas');
  assert.equal(restored.heightInches,76);
  assert.ok(restored.provenance.lastVerifiedAt);
  assert.equal(restoreCollegeRoster({...player,status:'verified_player',collegeName:'Owner supplied school'}).collegeName,'Owner supplied school');
});
