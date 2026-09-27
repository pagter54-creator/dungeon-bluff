import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  projectRefFromSupabaseUrl,
  productionUrlFromConfig,
  assertBetaTarget,
  assertPublishableKey,
  inspectBetaRepo,
  REQUIRED_BETA_FILES,
  REPO_ROOT
} from '../scripts/pve-beta-preflight.mjs';
import {parseDryRunMigrations,parseRemoteMigrationVersions,assertReleaseState,destructiveFindings,inspectProductionRelease} from '../scripts/pve-production-preflight.mjs';

test('PVE beta preflight derives production ref and rejects production target',async()=>{
  const source=await readFile(new URL('../config.js',import.meta.url),'utf8');
  const productionUrl=productionUrlFromConfig(source);
  const productionRef=projectRefFromSupabaseUrl(productionUrl);
  assert.match(productionRef,/^[a-z0-9]{20}$/);
  assert.throws(()=>assertBetaTarget({targetRef:productionRef,productionUrl}),/production Supabase project ref/);
});

test('PVE beta preflight accepts isolated test target and matching URL',async()=>{
  const source=await readFile(new URL('../config.js',import.meta.url),'utf8');
  const productionUrl=productionUrlFromConfig(source);
  const targetRef='aaaaaaaaaaaaaaaaaaaa';
  const result=assertBetaTarget({targetRef,productionUrl,targetUrl:`https://${targetRef}.supabase.co`});
  assert.equal(result.targetRef,targetRef);
  assert.notEqual(result.productionRef,targetRef);
  const repo=await inspectBetaRepo(REPO_ROOT);
  assert.deepEqual(repo.migrations,[
    '202609270001_pve_core.sql',
    '202609270002_pve_hardening_telemetry.sql',
    '202609280001_game_modes_pve_beta.sql',
    '202609280002_pve_beta_reward_canonical.sql'
  ]);
  assert.equal(repo.requiredFiles,16);
  assert.ok(REQUIRED_BETA_FILES.includes('scripts/prepare-pve-beta-frontend.mjs'));
});

test('PVE beta preflight rejects malformed/mismatched targets and secret keys',async()=>{
  const source=await readFile(new URL('../config.js',import.meta.url),'utf8');
  const productionUrl=productionUrlFromConfig(source);
  assert.throws(()=>assertBetaTarget({targetRef:'short',productionUrl}),/20자/);
  assert.throws(()=>assertBetaTarget({targetRef:'aaaaaaaaaaaaaaaaaaaa',productionUrl}),/PVE_BETA_SUPABASE_URL/);
  assert.throws(()=>assertBetaTarget({
    targetRef:'aaaaaaaaaaaaaaaaaaaa',
    productionUrl,
    targetUrl:'https://bbbbbbbbbbbbbbbbbbbb.supabase.co'
  }),/project ref가 다릅니다/);
  assert.throws(()=>assertPublishableKey(''),/PVE_BETA_PUBLISHABLE_KEY/);
  assert.equal(assertPublishableKey('sb_publishable_test_value'),true);
  assert.equal(assertPublishableKey('eyJabc.def.ghi'),true);
  assert.throws(()=>assertPublishableKey('sb_secret_do_not_use'),/secret\/service-role/);
  assert.throws(()=>assertPublishableKey('service_role_key'),/secret\/service-role/);
});

test('production release preflight locks the exact four-migration chain',async()=>{
  const manifest=await inspectProductionRelease(REPO_ROOT);
  const expected=manifest.requiredMigrations;
  const dry='Would push these migrations:\n'+expected.map(x=>' • '+x).join('\n')+'\nFinished';
  assert.deepEqual(parseDryRunMigrations(dry),expected);
  const list=expected.map(x=>` ${x.split('_')[0]} | ${x.split('_')[0]} | ${x.split('_')[0]}`).join('\n');
  const remote=parseRemoteMigrationVersions(list);
  assert.equal(assertReleaseState(expected,expected,new Set()),'READY_TO_APPLY');
  assert.equal(assertReleaseState(expected,[],remote),'ALREADY_APPLIED');
  assert.throws(()=>assertReleaseState(expected,[...expected,'202609290001_unexpected.sql'],remote),/mismatch/);
  assert.deepEqual(destructiveFindings('drop trigger if exists x on y; create trigger x after update on y execute function z();'),[]);
  assert.deepEqual(destructiveFindings('drop table public.bad;'),['DROP TABLE']);
});
