import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  runT04Fixtures,runT04,replayScenario,t04GoldenComparable,scenarioAvailability,STRESS_SCENARIOS
} from '../scripts/pve-stress-lib.mjs';
import {buildCollisionFarmIntent,planCollisionFarmTurn,planCollisionSafeTurn} from '../scripts/pve-collision-farm-policy.mjs';
import {PVE_CHARACTER_DEFS} from '../supabase/functions/game-api/pve/characters.js';
import {AUGMENT_BY_ID} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {PVE_RESOURCE_DEFS} from '../supabase/functions/game-api/pve/resources.js';

const fixtures=()=>runT04Fixtures('unit-t04-fixtures').fixtures;
const byId=(rows,id)=>{const row=rows.find(x=>x.id===id);assert.ok(row,id);return row;};
const card=(fixture,pid)=>{const row=fixture.resolvedCards?.find(x=>x.playerId===pid);assert.ok(row,`${fixture.id}:${pid}`);return row;};
const group=fixture=>{const row=fixture.collisionGroups?.[0];assert.ok(row,fixture.id);return row;};
const packet=(fixture,pid)=>{const row=fixture.damagePackets?.find(x=>x.sourcePlayerId===pid&&!x.followUp);assert.ok(row,`${fixture.id}:packet:${pid}`);return row;};

test('T04 availability is active only with all collision-farm runtime capabilities',()=>{
  const def=STRESS_SCENARIOS.find(x=>x.id==='T04');
  const a=scenarioAvailability(def);
  assert.equal(a.available,true);
  assert.deepEqual(a.missingCharacters,[]);
  assert.deepEqual(a.missingBuildEffects,[]);
  assert.deepEqual(a.missingCapabilities,[]);
  const status=Object.fromEntries(STRESS_SCENARIOS.map(s=>[s.id,scenarioAvailability(s).available]));
  for(const id of ['T00','T02','T03','T04','T05','T06','T09','T14'])assert.equal(status[id],true,id);
});

test('T04 uses canonical Berserker deck and BETA Tier-I configs without inventing values',()=>{
  assert.deepEqual(PVE_CHARACTER_DEFS.berserker.deck,[1,2,4,4,5]);
  assert.deepEqual(AUGMENT_BY_ID['aug-051'].config,{crushDamagePerCard:1,crushDamageCap:2});
  assert.deepEqual(AUGMENT_BY_ID['aug-131'].config,{collisionHealCapMode:'MAX_HP',revengeMax:1,revengeBonusDamage:2});
  assert.deepEqual(PVE_RESOURCE_DEFS.revenge,{resetScope:'COMBAT',baseMax:1});
});

test('T04 F1 Berserker base valid attack is final number +1 and pays one HP',()=>{
  const f=byId(fixtures(),'F1_BERSERKER_BASE_VALID');
  assert.equal(packet(f,'p2').amount,5);
  assert.equal(f.hpAfter.p2,2);
  assert.equal(card(f,'p2').berserkerAttackHpCost,1);
});

test('T04 F2 Berserker self attack cost never reduces HP below one',()=>{
  const f=byId(fixtures(),'F2_BERSERKER_HP_FLOOR');
  assert.equal(f.hpAfter.p2,1);
  assert.equal(card(f,'p2').berserkerAttackHpCost,0);
});

test('T04 F3 base Berserker collision heal is capped at HP 2',()=>{
  const f=byId(fixtures(),'F3_BERSERKER_BASE_COLLISION_HEAL');
  assert.equal(f.hpAfter.p2,2);
  assert.equal(group(f).berserkerHeal,1);
  assert.equal(card(f,'p2').invalidReason,'COLLISION');
});

test('T04 F4 Immortal Fighter extends collision heal to max HP',()=>{
  const f=byId(fixtures(),'F4_IMMORTAL_MAX_HP_HEAL');
  assert.equal(f.hpAfter.p2,3);
  assert.equal(group(f).berserkerHeal,1);
});

test('T04 F5 actual DIRECT damage gains exactly one Revenge',()=>{
  const f=byId(fixtures(),'F5_REVENGE_GAIN');
  const gains=f.combatEvents.filter(e=>e.type==='BERSERKER_REVENGE_GAINED');
  assert.equal(gains.length,1);
  assert.equal(gains[0].amount,1);
  assert.equal(f.revengeAfter,1);
});

test('T04 F6 next valid Berserker attack consumes Revenge exactly once for +2',()=>{
  const f=byId(fixtures(),'F6_REVENGE_CONSUME');
  assert.equal(packet(f,'p2').amount,7);
  assert.equal(card(f,'p2').revengeBonusDamage,2);
  assert.equal(card(f,'p2').revengeConsumed,1);
  assert.equal(f.combatEvents.filter(e=>e.type==='BERSERKER_REVENGE_CONSUMED').length,1);
  assert.equal(f.revengeAfter,0);
});

test('T04 F7 Berserker attack HP cost cannot generate Revenge',()=>{
  const f=byId(fixtures(),'F7_SELF_COST_NO_REVENGE');
  assert.equal(f.hpAfter.p2,2);
  assert.equal(f.revengeAfter,0);
  assert.equal(f.combatEvents.filter(e=>e.type==='BERSERKER_REVENGE_GAINED').length,0);
});

test('T04 F8 Crush Knight counts exactly one finally collision-invalid card',()=>{
  const f=byId(fixtures(),'F8_KNIGHT_CRUSH_SINGLE'),k=card(f,'p0'),g=group(f);
  assert.equal(k.valid,true);
  assert.equal(k.collisionImmune,true);
  assert.equal(k.crushedCardCount,1);
  assert.equal(k.crushBonusDamage,1);
  assert.equal(g.crushedCardCount,1);
  assert.equal(new Set(g.crushedCardIds).size,1);
});

test('T04 F9 Crush Knight multi collision counts each invalid physical card once and caps bonus at +2',()=>{
  const f=byId(fixtures(),'F9_KNIGHT_CRUSH_MULTI'),k=card(f,'p0'),g=group(f);
  assert.equal(k.crushedCardCount,2);
  assert.equal(k.crushBonusDamage,2);
  assert.equal(g.crushedCardCount,2);
  assert.equal(new Set(g.crushedCardIds).size,g.crushedCardIds.length);
  assert.equal(g.crushedCardIds.includes(k.cardInstanceId),false);
});

test('T04 F10 Toughness without a final collision produces no Crush effect',()=>{
  const f=byId(fixtures(),'F10_TOUGHNESS_NO_COLLISION'),k=card(f,'p0');
  assert.equal(f.collisionGroups.length,0);
  assert.equal(k.crushedCardCount??0,0);
  assert.equal(k.crushBonusDamage??0,0);
});

test('T04 F11 Imp steal can remove a base-number farm collision before collision rewards',()=>{
  const f=byId(fixtures(),'F11_STEAL_REMOVES_COLLISION');
  assert.equal(card(f,'p0').baseNumber,3);
  assert.equal(card(f,'p1').baseNumber,3);
  assert.equal(card(f,'p0').finalNumber,2);
  assert.equal(card(f,'p1').finalNumber,4);
  assert.equal(f.collisionGroups.length,0);
  assert.equal(card(f,'p0').crushBonusDamage??0,0);
  assert.equal(card(f,'p2').berserkerCollisionHeal??0,0);
});

test('T04 F12 Vampire swap can create the final collision that drives heal and Crush',()=>{
  const f=byId(fixtures(),'F12_SWAP_CREATES_COLLISION'),g=group(f);
  assert.equal(g.finalNumber,5);
  assert.deepEqual(g.members,['p0','p2']);
  assert.equal(g.crushedCardCount,1);
  assert.equal(g.berserkerHeal,1);
  assert.equal(f.mutationEvents.filter(e=>e.phase==='PRE_COLLISION_SWAP').length,1);
});

test('T04 F13 full mixed fixture locks swap -> steal -> final -> collision -> post-collision -> damage order',()=>{
  const f=byId(fixtures(),'F13_FULL_MIXED'),g=group(f);
  assert.deepEqual(
    [card(f,'p0').baseNumber,card(f,'p0').numberHistory.postSwapNumber,card(f,'p0').numberHistory.postStealNumber,card(f,'p0').finalNumber],
    [4,4,3,3]
  );
  assert.deepEqual(
    [card(f,'p2').baseNumber,card(f,'p2').numberHistory.postSwapNumber,card(f,'p2').numberHistory.postStealNumber,card(f,'p2').finalNumber],
    [5,4,3,3]
  );
  assert.equal(g.impStolenBeforeCollision,2);
  assert.equal(g.vampireSwapCount,1);
  assert.equal(g.crushedCardCount,1);
  assert.equal(g.berserkerHeal,1);
  const order=['PRE_COLLISION_SWAP','PRE_COLLISION_STEAL','FINAL_NUMBER_REVEAL','COLLISION_RESOLVE','POST_COLLISION_EFFECTS','VALIDITY_DERIVE','DAMAGE_BUILD'];
  let last=-1;
  for(const phase of order){const index=f.phaseTrace.indexOf(phase);assert.ok(index>last,`${phase} order`);last=index;}
});

test('T04 F14 identical collisionEventId is rejected before a second reward application',()=>{
  const f=byId(fixtures(),'F14_NO_RECURSIVE_REWARDS');
  assert.equal(f.reentryRejected,true);
  assert.equal(f.rejectCode,'COLLISION_REWARD_REENTRY');
  assert.equal(f.hpUnchanged,true);
  assert.equal(f.processedCollisionEventIds.length,1);
});

test('T04 every real fixture resolve executes collision resolution and POST_COLLISION_EFFECTS exactly once',()=>{
  for(const f of fixtures().filter(x=>x.resolvedCards)){
    assert.equal(f.collisionResolutionPasses,1,f.id);
    assert.equal(f.postCollisionEffectPasses,1,f.id);
    for(const g of f.collisionGroups||[])assert.equal(g.recursiveCollisionTriggerCount,0,f.id);
  }
});

test('T04 collision farm and safe policies are deterministic and share only voluntary number intents',()=>{
  const intents=[
    {playerId:'p0',characterId:'warrior',seat:0,availableNumbers:[2,4,5],preferredCollisionNumbers:[2,4,5],publicResources:{toughnessCharges:1},privateCycle:{cycleIndex:1,bloodCommandUsedCycle:null}},
    {playerId:'p1',characterId:'imp',seat:1,availableNumbers:[1,4,5],preferredCollisionNumbers:[1,4,5],publicResources:{},privateCycle:{cycleIndex:1,bloodCommandUsedCycle:null}},
    {playerId:'p2',characterId:'berserker',seat:2,availableNumbers:[1,4,5],preferredCollisionNumbers:[1,4,5],publicResources:{revenge:0},privateCycle:{cycleIndex:1,bloodCommandUsedCycle:null}},
    {playerId:'p3',characterId:'vampire',seat:3,availableNumbers:[2,4,5],preferredCollisionNumbers:[2,4,5],publicResources:{},privateCycle:{cycleIndex:1,bloodCommandUsedCycle:null}}
  ];
  assert.deepEqual(planCollisionFarmTurn(intents,{seed:'policy',contextKey:'turn'}),planCollisionFarmTurn(intents,{seed:'policy',contextKey:'turn'}));
  assert.deepEqual(planCollisionSafeTurn(intents,{seed:'policy',contextKey:'turn'}),planCollisionSafeTurn(intents,{seed:'policy',contextKey:'turn'}));
  const farm=planCollisionFarmTurn(intents,{seed:'policy',contextKey:'turn'});
  assert.ok(farm.intentionalParticipantIds.length>=2);
  assert.ok(farm.decisions.every(x=>!Object.hasOwn(x,'cardInstanceId')));
});

test('T04 semantic golden locks mutation, collision, Revenge, damage and HP timelines',()=>{
  const golden=JSON.parse(fs.readFileSync(new URL('./fixtures/pve-stress-t04-golden.json',import.meta.url),'utf8'));
  const result=replayScenario('T04','smoke:T04:0000');
  assert.deepEqual(t04GoldenComparable(result),golden);
});

test('T04 same-seed stress replay reproduces collision timelines and comparison',()=>{
  const a=replayScenario('T04','t04-replay'),b=replayScenario('T04','t04-replay');
  assert.equal(a.replayFingerprint,b.replayFingerprint);
  assert.deepEqual(a.collisionTurns,b.collisionTurns);
  assert.deepEqual(a.safePlayTurns,b.safePlayTurns);
  assert.deepEqual(a.comparison,b.comparison);
});

test('T04 stress runner emits bounded collision value with zero recursive triggers',()=>{
  const r=runT04('t04-metrics');
  assert.equal(r.status,'PASS');
  assert.equal(r.combats.length,1);
  assert.equal(r.safeCombats.length,1);
  assert.ok(r.collisionMetrics.intentionalCollisionAttempts>0);
  assert.ok(r.collisionMetrics.collisionGroups>0);
  assert.ok(r.collisionMetrics.successfulIntentionalCollisions>0);
  assert.equal(r.collisionMetrics.recursiveCollisionTriggerCount,0);
  assert.ok(Number.isFinite(r.collisionMetrics.avgExtraDamagePerCollision));
  assert.ok(Number.isFinite(r.collisionMetrics.avgHealingPerCollision));
  assert.ok(Number.isFinite(r.comparison.dptRatio));
});

test('buildCollisionFarmIntent exposes owner available numbers but no physical card IDs',()=>{
  const view={
    players:[{playerId:'p0',characterId:'warrior',seat:0,status:'ACTIVE',publicResources:{toughnessCharges:1},cardPool:[{id:'c2',baseNumber:2},{id:'c5',baseNumber:5}]}],
    privateCombat:{playerId:'p0',remainingCardIds:['c2','c5'],cycleIndex:1}
  };
  const intent=buildCollisionFarmIntent(view,'p0');
  assert.deepEqual(intent.availableNumbers,[2,5]);
  assert.equal(JSON.stringify(intent).includes('c2'),false);
  assert.equal(JSON.stringify(intent).includes('c5'),false);
});
