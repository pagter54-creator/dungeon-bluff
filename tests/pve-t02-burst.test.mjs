import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  replayScenario,t02GoldenComparable,semanticFingerprint,scenarioAvailability,STRESS_SCENARIOS,CANONICAL_RULES,SPEC_AMBIGUITIES
} from '../scripts/pve-stress-lib.mjs';
import {planBurstTurn} from '../scripts/pve-burst-ceiling-policy.mjs';
import {PVE_CHARACTER_DEFS} from '../supabase/functions/game-api/pve/characters.js';
import {AUGMENT_BY_ID} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {PVE_RESOURCE_DEFS} from '../supabase/functions/game-api/pve/resources.js';

let cached=null;
const run=()=>cached??=replayScenario('T02','unit-t02-burst');
const fixture=(r,id)=>{const f=r.fixtures.find(x=>x.id===id);assert.ok(f,id);return f;};
const card=(f,pid)=>{const c=f.result?.cards?.find(x=>x.playerId===pid);assert.ok(c,`${f.id}:${pid}`);return c;};
const packets=(f,pid)=>f.result?.packets?.filter(x=>x.sourcePlayerId===pid)||[];

test('T02 is ACTIVE while T06 remains unavailable',()=>{
  const def=STRESS_SCENARIOS.find(x=>x.id==='T02'),a=scenarioAvailability(def);
  assert.equal(a.available,true);
  assert.deepEqual(a.missingCharacters,[]);
  assert.deepEqual(a.missingBuildEffects,[]);
  assert.deepEqual(a.missingCapabilities,[]);
  const status=Object.fromEntries(STRESS_SCENARIOS.map(s=>[s.id,scenarioAvailability(s).available]));
  for(const id of ['T00','T02','T03','T04','T05','T09','T14'])assert.equal(status[id],true,id);
  assert.equal(status.T06,false);
});

test('T02 locks canonical Tier-I decks and BETA configs without retuning',()=>{
  assert.deepEqual(PVE_CHARACTER_DEFS.gunner.deck,[1,2,3]);
  assert.deepEqual(PVE_CHARACTER_DEFS.demon_swordsman.deck,[1,2,3,4,4]);
  assert.deepEqual(PVE_CHARACTER_DEFS.martial_artist.deck,[1,2,3,4,5]);
  assert.deepEqual(PVE_CHARACTER_DEFS.berserker.deck,[1,2,4,4,5]);
  assert.deepEqual(AUGMENT_BY_ID['aug-241'].config,{expandedDeck:[1,2,2,3]});
  assert.deepEqual(AUGMENT_BY_ID['aug-291'].config,{bonusDamagePerCombo:2,comboMax:3,maxUsesPerCycle:1,consumeOn:'VALID_SUCCESS',preserveComboOnCollision:true});
  assert.deepEqual(AUGMENT_BY_ID['aug-351'].config,{transformThreshold:6,transformedDeck:[2,4,5,6],resetDevourOnCombat:true,returnAfterCardsUsed:4});
  assert.deepEqual(AUGMENT_BY_ID['aug-121'].config,{bonusDamageOnActualHpCost:2});
  assert.equal(PVE_RESOURCE_DEFS.devour.resetScope,'RUN');
  assert.equal(PVE_RESOURCE_DEFS.combo.resetScope,'COMBAT');
});

test('T02 F1-F22 cover Full Burst, Devour/transform, One-Hit Kill, Blood Frenzy, thresholds and recursion',()=>{
  const r=run();
  assert.equal(r.fixtures.length,22);
  assert.deepEqual(r.fixtures.map(x=>x.id),[
    'F1_GUNNER_EXPANDED_MAGAZINE','F2_FULL_BURST_ALL_FOLLOWUPS','F3_FULL_BURST_NO_RECURSIVE_RESET','F4_FULL_BURST_FAILURE',
    'F5_DEMON_DEVOUR_GAIN','F6_DEVOUR_PERSISTENCE','F7_TRANSFORMATION_THRESHOLD','F8_NO_DUPLICATE_TRANSFORMATION',
    'F9_TRANSFORMED_ATTACK_BURST','F10_MARTIAL_COMBO_GAIN','F11_MARTIAL_COLLISION_PRESERVE','F12_ONE_HIT_KILL_CONSUME',
    'F13_FINISHER_FAILURE','F14_BLOOD_FRENZY_HIGH_HP','F15_BLOOD_FRENZY_HP1','F16_BERSERKER_SELF_COST_FLOOR',
    'F17_MIXED_PERSONAL_BURST','F18_FULL_PARTY_BURST','F19_BOSS_MULTI_THRESHOLD','F20_NO_FOLLOWUP_RECURSION',
    'F21_NO_DUPLICATE_MODIFIER','F22_RUN_VS_COMBAT_RESOURCE'
  ]);
  assert.deepEqual(fixture(r,'F1_GUNNER_EXPANDED_MAGAZINE').cardPools.p0.map(x=>x.baseNumber),[1,2,2,3]);
  const f2=fixture(r,'F2_FULL_BURST_ALL_FOLLOWUPS'),p0=packets(f2,'p0');
  assert.equal(p0.length,4);assert.equal(p0.filter(x=>x.followUp).length,3);assert.ok(p0.every(x=>(x.followUpDepth??0)<=1));
  const f4=fixture(r,'F4_FULL_BURST_FAILURE');assert.equal(card(f4,'p0').fullBurstOutcome,'FAIL_COLLISION');assert.equal(packets(f4,'p0').length,0);assert.equal(f4.hp.p0,2);
  assert.equal(fixture(r,'F6_DEVOUR_PERSISTENCE').afterKill,5);
  const f7=fixture(r,'F7_TRANSFORMATION_THRESHOLD');assert.equal(f7.resources.p1.transform,true);assert.deepEqual(f7.cardPools.p1.map(x=>x.baseNumber),[2,4,5,6]);
  assert.equal(fixture(r,'F8_NO_DUPLICATE_TRANSFORMATION').transformCount,1);
  assert.equal(fixture(r,'F10_MARTIAL_COMBO_GAIN').resources.p2.combo,1);
  const f12=fixture(r,'F12_ONE_HIT_KILL_CONSUME');assert.equal(card(f12,'p2').finisherComboConsumed,3);assert.equal(card(f12,'p2').finisherBonusDamage,6);
  assert.equal(fixture(r,'F13_FINISHER_FAILURE').resources.p2.combo,3);
  assert.equal(packets(fixture(r,'F14_BLOOD_FRENZY_HIGH_HP'),'p3')[0].amount,7);
  assert.equal(packets(fixture(r,'F15_BLOOD_FRENZY_HP1'),'p3')[0].amount,5);
  assert.equal(fixture(r,'F16_BERSERKER_SELF_COST_FLOOR').hp.p3,1);
  assert.ok(fixture(r,'F18_FULL_PARTY_BURST').partyTurnDamage>0);
  assert.ok(fixture(r,'F19_BOSS_MULTI_THRESHOLD').thresholdsCrossed.length>=2);
  assert.equal(fixture(r,'F20_NO_FOLLOWUP_RECURSION').recursiveFollowUpCount,0);
  assert.equal(fixture(r,'F21_NO_DUPLICATE_MODIFIER').duplicateModifierCount,0);
  const f22=fixture(r,'F22_RUN_VS_COMBAT_RESOURCE');assert.equal(f22.baseDevourPersisted,5);assert.equal(f22.resources.p1.transform,false);assert.equal(f22.resources.p2.combo,0);assert.deepEqual(f22.cardPools.p1.map(x=>x.baseNumber),[1,2,3,4,4]);
});

test('T02 fixed semantic golden fingerprint is deterministic',()=>{
  const golden=JSON.parse(fs.readFileSync(new URL('./fixtures/pve-stress-t02-golden.json',import.meta.url),'utf8'));
  const r=replayScenario('T02',golden.seed);
  assert.equal(semanticFingerprint(t02GoldenComparable(r)),golden.fingerprint);
  const b=replayScenario('T02',golden.seed);
  assert.equal(r.replayFingerprint,b.replayFingerprint);
  assert.deepEqual(t02GoldenComparable(r),t02GoldenComparable(b));
});

test('T02 stress metrics expose bounded burst identity and Burst vs Steady comparison',()=>{
  const r=run(),m=r.burstMetrics,c=r.comparison;
  assert.equal(r.status,'PASS');assert.equal(r.combats.length,3);assert.deepEqual(r.combats.map(x=>x.roomType),['NORMAL_COMBAT','ELITE_COMBAT','BOSS']);
  assert.equal(m.recursiveFollowUpAttempts,0);assert.equal(m.duplicateDamagePacketCount,0);assert.equal(m.duplicateModifierCount,0);
  assert.equal(m.behaviorSkipMeasurable,false);assert.equal(m.bossBehaviorSkipCount,null);
  for(const k of ['maxSingleCardDamage','maxSinglePlayerTurnDamage','maxPartyTurnDamage','averageBurstTurnDamage','averageNonBurstTurnDamage','fullBurstFollowUpCount','transformationCount','oneHitKillUses','berserkerHpCost'])assert.ok(Number.isFinite(m[k]),k);
  for(const k of ['burstDpt','steadyDpt','dptRatio','burstFinalHp','steadyFinalHp','burstFlameSpent','steadyFlameSpent'])assert.ok(Number.isFinite(c[k]),k);
  assert.equal(c.burstDominates,false);
});

test('T02 burst and steady planners are deterministic and never exchange physical card IDs',()=>{
  const intents=[
    {playerId:'p0',characterId:'gunner',seat:0,hp:3,maxHp:3,availableNumbers:[1,2,3],remainingCount:4,cycleIndex:1,publicResources:{fullBurstReady:true},finisherUsedCycle:null},
    {playerId:'p1',characterId:'demon_swordsman',seat:1,hp:3,maxHp:3,availableNumbers:[2,4,5,6],remainingCount:4,cycleIndex:1,publicResources:{transformationActive:true},finisherUsedCycle:null},
    {playerId:'p2',characterId:'martial_artist',seat:2,hp:3,maxHp:3,availableNumbers:[1,3,5],remainingCount:3,cycleIndex:1,publicResources:{combo:3,lastSubmittedNumber:3},finisherUsedCycle:null},
    {playerId:'p3',characterId:'berserker',seat:3,hp:2,maxHp:3,availableNumbers:[1,4,5],remainingCount:3,cycleIndex:1,publicResources:{},finisherUsedCycle:null}
  ];
  const a=planBurstTurn(intents,{seed:'policy',contextKey:'turn',optimized:true}),b=planBurstTurn(intents,{seed:'policy',contextKey:'turn',optimized:true});
  const steady=planBurstTurn(intents,{seed:'policy',contextKey:'turn',optimized:false});
  assert.deepEqual(a,b);assert.equal(a.policy,'BURST_OPTIMIZED');assert.equal(steady.policy,'STEADY_PLAY');
  assert.ok(a.decisions.every(x=>!Object.hasOwn(x,'cardInstanceId')));
  assert.ok(steady.decisions.every(x=>!Object.hasOwn(x,'cardInstanceId')));
});

test('T02 ambiguities resolved by source specs are canonicalized without inventing follow-up builds',()=>{
  for(const id of ['RULE-T02-A','RULE-T02-B','RULE-T02-C','RULE-T02-D','RULE-T02-E'])assert.ok(CANONICAL_RULES.some(x=>x.id===id),id);
  assert.equal(SPEC_AMBIGUITIES.some(x=>['AMB-T02-MARTIAL-PREVIOUS','AMB-T02-FINISHER-COLLISION','AMB-T02-DEVOUR-KILL-PRECEDENCE','AMB-T02-TRANSFORM-POOL','AMB-T02-FOLLOWUP-TRIGGERS'].includes(x.id)),false);
  assert.ok(SPEC_AMBIGUITIES.some(x=>x.id==='AMB-T02-MARTIAL-COMBO-DAMAGE-TIMING'));
});
