import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  replayScenario,t03GoldenComparable,scenarioAvailability,STRESS_SCENARIOS,CANONICAL_RULES,SPEC_AMBIGUITIES
} from '../scripts/pve-stress-lib.mjs';
import {buildSustainIntent,planSustainTurn} from '../scripts/pve-sustain-fortress-policy.mjs';
import {AUGMENT_BY_ID} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {PVE_RESOURCE_DEFS} from '../supabase/functions/game-api/pve/resources.js';

const run=()=>replayScenario('T03','unit-t03-sustain');
const fixture=(r,id)=>{const f=r.fixtures.find(x=>x.id===id);assert.ok(f,id);return f;};

test('T03 is ACTIVE only with Guardian Wall Transfusion White Mage and sustain runner capabilities',()=>{
  const def=STRESS_SCENARIOS.find(x=>x.id==='T03'),a=scenarioAvailability(def);
  assert.equal(a.available,true);assert.deepEqual(a.missingCharacters,[]);assert.deepEqual(a.missingBuildEffects,[]);assert.deepEqual(a.missingCapabilities,[]);
  const status=Object.fromEntries(STRESS_SCENARIOS.map(s=>[s.id,scenarioAvailability(s).available]));
  for(const id of ['T00','T02','T03','T04','T05','T06','T09','T14'])assert.equal(status[id],true,id);
});

test('T03 uses the locked BETA Tier-I sustain configs without balance invention',()=>{
  assert.deepEqual(AUGMENT_BY_ID['aug-041'].config,{guardedAlliesPerTurn:1,redirectCount:1,redirectDamageMode:'FULL'});
  assert.deepEqual(AUGMENT_BY_ID['aug-101'].config,{healAmount:1,maxTargetsPerTurn:1,excludeSelf:true});
  assert.equal(AUGMENT_BY_ID['aug-321'].executable,true);assert.equal(AUGMENT_BY_ID['aug-321'].executionRuleSource,'USER_CONFIRMED_PROPHET_VAMPIRE_CORE_REWORK_20261006');
  assert.deepEqual(PVE_RESOURCE_DEFS.blood,{resetScope:'COMBAT',baseMax:6});
});

test('T03 F1-F24 cover guard redirect blood White Magic Immortal Fighter and recursion edges',()=>{
  const r=run();
  assert.equal(r.fixtures.length,24);
  assert.deepEqual(r.fixtures.map(x=>x.id),[
    'F1_GUARD_COLLISION_RESCUE','F2_GUARD_NO_COLLISION','F3_GUARD_MULTI_ALLY','F4_DAMAGE_REDIRECT','F5_REDIRECT_ONCE',
    'F6_VAMPIRE_BLOOD_GAIN','F7_TRANSFUSION_INSUFFICIENT','F8_TRANSFUSION_SUCCESS','F9_TRANSFUSION_TIE','F10_NO_RESURRECTION',
    'F11_WHITE_MAGIC_SUCCESS','F12_WHITE_MAGIC_NO_MANA','F13_WHITE_MAGIC_NO_COLLISION','F14_BERSERKER_COLLISION_HEAL',
    'F15_REVENGE_DIRECT','F16_ZERO_DAMAGE_NO_REVENGE','F17_GUARD_TRANSFUSION','F18_GUARD_WHITE_MAGIC','F19_FULL_SUSTAIN_CHAIN','F20_NO_SUSTAIN_RECURSION','F21_FULL_HP_NO_SPEND','F22_RETRY_RECONNECT_ONCE','F23_LETHAL_PRE_DOWN_NO_REVIVE','F24_DAMAGE_THEN_AUTO_PRE_DOWN'
  ]);
  const f1=fixture(r,'F1_GUARD_COLLISION_RESCUE');assert.equal(f1.cards.p0.valid,false);assert.equal(f1.cards.p1.valid,true);
  assert.equal(fixture(r,'F5_REDIRECT_ONCE').rejectCode,'DAMAGE_PACKET_REENTRY');
  assert.equal(fixture(r,'F6_VAMPIRE_BLOOD_GAIN').blood,1);
  assert.equal(fixture(r,'F8_TRANSFUSION_SUCCESS').hp.p0,2);
  assert.equal(fixture(r,'F10_NO_RESURRECTION').hp.p0,0);
  assert.equal(fixture(r,'F11_WHITE_MAGIC_SUCCESS').hp.p1,3);
  assert.equal(fixture(r,'F16_ZERO_DAMAGE_NO_REVENGE').revenge,0);
  assert.equal(fixture(r,'F20_NO_SUSTAIN_RECURSION').redirectCount,1);
  assert.equal(fixture(r,'F20_NO_SUSTAIN_RECURSION').healCount,1);
});

test('T03 semantic golden locks guard redirect transfusion White Magic Revenge HP and recursion identities',()=>{
  const golden=JSON.parse(fs.readFileSync(new URL('./fixtures/pve-stress-t03-core-rework-golden.json',import.meta.url),'utf8'));
  const r=replayScenario('T03','smoke:T03:0000');
  assert.deepEqual(t03GoldenComparable(r),golden);
});

test('T03 deterministic replay is exact across fixtures sustain timelines metrics and comparison',()=>{
  const a=replayScenario('T03','t03-deterministic'),b=replayScenario('T03','t03-deterministic');
  assert.equal(a.replayFingerprint,b.replayFingerprint);
  assert.deepEqual(t03GoldenComparable(a),t03GoldenComparable(b));
  assert.deepEqual(a.sustainMetrics,b.sustainMetrics);assert.deepEqual(a.comparison,b.comparison);
});

test('T03 stress result exposes Normal Elite Boss and zero recursive sustain triggers',()=>{
  const r=run();
  assert.equal(r.status,'PASS');assert.equal(r.combats.length,3);
  assert.deepEqual(r.combats.map(x=>x.roomType),['NORMAL_COMBAT','ELITE_COMBAT','BOSS']);
  assert.equal(r.sustainMetrics.recursiveHealCount,0);assert.equal(r.sustainMetrics.recursiveRedirectCount,0);
  for(const key of ['healingRatio','mitigationRatio','effectiveSustainValue','partyDpt','finalPartyHp'])assert.ok(Number.isFinite(r.sustainMetrics[key]),key);
  assert.ok(Number.isFinite(r.comparison.dptRatio));
});

test('T03 sustain policy uses voluntary projected numbers and never physical card ids',()=>{
  const view={players:[
    {playerId:'p0',characterId:'warrior',seat:0,status:'ACTIVE',hp:2,maxHp:3,publicResources:{toughnessCharges:1},cardPool:[{id:'w2',baseNumber:2},{id:'w5',baseNumber:5}]},
    {playerId:'p1',characterId:'vampire',seat:1,status:'ACTIVE',hp:3,maxHp:3,publicResources:{blood:4},cardPool:[{baseNumber:2},{baseNumber:5}]}
  ],privateCombat:{playerId:'p0',remainingCardIds:['w2','w5']},combat:{monster:{intent:null}}};
  const intent=buildSustainIntent(view,'p0');assert.deepEqual(intent.availableNumbers,[2,5]);
  assert.equal(JSON.stringify(intent).includes('w2'),false);assert.equal(JSON.stringify(intent).includes('w5'),false);
  const intents=[
    {playerId:'p0',characterId:'warrior',seat:0,hp:2,maxHp:3,availableNumbers:[2,5],publicResources:{toughnessCharges:1},monsterIntent:null},
    {playerId:'p1',characterId:'vampire',seat:1,hp:2,maxHp:3,availableNumbers:[1,2,5],publicResources:{blood:4},monsterIntent:null},
    {playerId:'p2',characterId:'berserker',seat:2,hp:2,maxHp:3,availableNumbers:[1,4,5],publicResources:{revenge:0},monsterIntent:null},
    {playerId:'p3',characterId:'mage',seat:3,hp:3,maxHp:3,availableNumbers:[1,2,3,4],publicResources:{mana:2},monsterIntent:null}
  ];
  const a=planSustainTurn(intents,{seed:'policy',contextKey:'turn',optimized:true}),b=planSustainTurn(intents,{seed:'policy',contextKey:'turn',optimized:true});
  assert.deepEqual(a,b);assert.ok(a.decisions.every(x=>!Object.hasOwn(x,'cardInstanceId')));
});

test('T03 canonicalizes T04 zero-damage Revenge semantics and reports only unresolved T03 ambiguities',()=>{
  assert.ok(CANONICAL_RULES.some(x=>x.id==='RULE-T04-A'));assert.ok(CANONICAL_RULES.some(x=>x.id==='RULE-T04-B'));
  assert.equal(SPEC_AMBIGUITIES.some(x=>x.id==='AMB-T04-REVENGE-ZERO-DIRECT'),false);
  assert.ok(CANONICAL_RULES.some(x=>x.id==='RULE-T03-A'));assert.ok(CANONICAL_RULES.some(x=>x.id==='RULE-T03-B'));
  assert.equal(SPEC_AMBIGUITIES.some(x=>x.id==='AMB-T03-GUARD-OVERWRITE'),false);
  assert.equal(SPEC_AMBIGUITIES.some(x=>x.id==='AMB-T03-WHITE-MULTI-TARGET'),false);
});

test('T03 automatic Transfusion has no activation with insufficient Blood or full party HP',()=>{
 const r=run();assert.equal(fixture(r,'F7_TRANSFUSION_INSUFFICIENT').stateUnchanged,true);
 assert.equal(fixture(r,'F21_FULL_HP_NO_SPEND').blood,4);
 assert.equal(fixture(r,'F21_FULL_HP_NO_SPEND').directEvents.length,0);
 const f=fixture(r,'F8_TRANSFUSION_SUCCESS');assert.equal(f.skillEvent.automatic,true);assert.equal(f.skillEvent.phase,'POST_DAMAGE_PRE_DOWN');assert.equal(f.skillEvent.bloodSpent,4);
});
test('T03 automatic Transfusion retries and authoritative reconnect restore without another heal or spend',()=>{
 const f=fixture(run(),'F22_RETRY_RECONNECT_ONCE');assert.equal(f.stateUnchanged,true);assert.deepEqual(f.retryEvents,[]);assert.deepEqual(f.reconnectEvents,[]);assert.equal(f.blood,2);
});
test('T03 automatic Transfusion cannot revive DOWNED or a lethal pending-down HP0 target',()=>{
 const r=run();assert.equal(fixture(r,'F10_NO_RESURRECTION').statuses.p0,'DOWNED');assert.equal(fixture(r,'F23_LETHAL_PRE_DOWN_NO_REVIVE').hp.p0,0);
});
test('T03 automatic healing follows real incoming damage before DOWN and never recursively heals',()=>{
 const r=run(),f=fixture(r,'F24_DAMAGE_THEN_AUTO_PRE_DOWN');assert.ok(f.healIndex>f.damageIndex);assert.equal(f.statuses.p0,'ACTIVE');assert.equal(fixture(r,'F20_NO_SUSTAIN_RECURSION').healCount,1);
});
