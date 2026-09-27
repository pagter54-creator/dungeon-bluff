import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  projectRefFromSupabaseUrl,
  productionUrlFromConfig,
  assertBetaTarget,
  assertPublishableKey,
  inspectBetaRepo,
  REPO_ROOT
} from '../scripts/pve-beta-preflight.mjs';

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
  assert.deepEqual(repo.migrations,['202609280001_game_modes_pve_beta.sql','202609280002_pve_beta_reward_canonical.sql']);
});

test('PVE beta preflight rejects malformed/mismatched targets and secret keys',async()=>{
  const source=await readFile(new URL('../config.js',import.meta.url),'utf8');
  const productionUrl=productionUrlFromConfig(source);
  assert.throws(()=>assertBetaTarget({targetRef:'short',productionUrl}),/20자/);
  assert.throws(()=>assertBetaTarget({
    targetRef:'aaaaaaaaaaaaaaaaaaaa',
    productionUrl,
    targetUrl:'https://bbbbbbbbbbbbbbbbbbbb.supabase.co'
  }),/project ref가 다릅니다/);
  assert.equal(assertPublishableKey('sb_publishable_test_value'),true);
  assert.equal(assertPublishableKey('eyJabc.def.ghi'),true);
  assert.throws(()=>assertPublishableKey('sb_secret_do_not_use'),/secret\/service-role/);
  assert.throws(()=>assertPublishableKey('service_role_key'),/secret\/service-role/);
});
