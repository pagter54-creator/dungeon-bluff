import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  runT05Fixtures,runT05,replayScenario,t05GoldenComparable,scenarioAvailability,STRESS_SCENARIOS
} from '../scripts/pve-stress-lib.mjs';

const golden=JSON.parse(fs.readFileSync(new URL('./fixtures/pve-stress-t05-golden.json',import.meta.url),'utf8'));
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {planNumberMutationTurn} from '../scripts/pve-number-mutation-policy.mjs';

const fixtureSet=()=>runT05Fixtures('unit-t05-fixtures').fixtures;
const byId=(fixtures,id)=>{const f=fixtures.find(x=>x.id===id);assert.ok(f,id);return f;};
const hist=(fixture,pid)=>{const h=fixture.histories.find(x=>x.playerId===pid);assert.ok(h,`${fixture.id}:${pid}`);return h;};

test('T05 availability is active only after all four required builds and character engines are executable',()=>{
  const def=STRESS_SCENARIOS.find(x=>x.id==='T05');
  const availability=scenarioAvailability(def);
  assert.equal(availability.available,true);
  assert.deepEqual(availability.missingCharacters,[]);
  assert.deepEqual(availability.missingBuildEffects,[]);
});

test('T05 F1 Reverse Math +1 writes the complete unchanged-through-later-phases history',()=>{
  const f=byId(fixtureSet(),'F1_SELF_MODIFY_ONLY'),m=hist(f,'p0');
  assert.deepEqual(
    [m.baseNumber,m.selfModifiedNumber,m.postSwapNumber,m.postStealNumber,m.finalNumber],
    [3,4,4,4,4]
  );
  assert.deepEqual(f.events.map(x=>x.phase),['SELF_MODIFY']);
});

test('T05 Reverse Math -1 is executable and deterministic',()=>{
  const f=byId(fixtureSet(),'F9_REVERSE_MATH_MINUS'),m=hist(f,'p0');
  assert.deepEqual([m.baseNumber,m.selfModifiedNumber,m.finalNumber],[3,2,2]);
  assert.equal(f.events[0].direction,-1);
});

test('T05 F2 Vampire swaps post-self-modify numbers without transferring physical ownership',()=>{
  const f=byId(fixtureSet(),'F2_VAMPIRE_SWAP_ONLY');
  assert.equal(hist(f,'p0').postSwapNumber,5);
  assert.equal(hist(f,'p1').postSwapNumber,2);
  assert.equal(f.ownershipStable,true);
  const swap=f.events.find(x=>x.phase==='PRE_COLLISION_SWAP');
  assert.deepEqual(
    {actor:swap.actorId,target:swap.targetId,actorBefore:swap.actorBefore,targetBefore:swap.targetBefore,actorAfter:swap.actorAfter,targetAfter:swap.targetAfter},
    {actor:'p1',target:'p0',actorBefore:5,targetBefore:2,actorAfter:2,targetAfter:5}
  );
});

test('T05 Vampire base marks highest-growth collision target with seat order tie-break',()=>{
  const f=byId(fixtureSet(),'F3_IMP_MULTI_STEAL');
  const mark=f.combatEvents.find(x=>x.type==='THRALL_MARKED');
  assert.ok(mark);
  assert.equal(mark.playerId,'p1');
  assert.equal(mark.targetId,'p0');
});

test('T05 Imp single steal conserves one number point',()=>{
  const f=byId(fixtureSet(),'F7_STEAL_REMOVES_COLLISION');
  assert.equal(hist(f,'p0').postStealNumber,2);
  assert.equal(hist(f,'p2').postStealNumber,4);
  const summary=f.events.find(x=>x.effectId==='imp-steal-summary');
  assert.equal(summary.totalActuallyStolen,1);
});

test('T05 Imp multi-target steal conserves total stolen amount',()=>{
  const f=byId(fixtureSet(),'F3_IMP_MULTI_STEAL');
  assert.equal(hist(f,'p0').postStealNumber,2);
  assert.equal(hist(f,'p1').postStealNumber,2);
  assert.equal(hist(f,'p2').postStealNumber,5);
  const steals=f.events.filter(x=>x.effectId==='imp-steal');
  const summary=f.events.find(x=>x.effectId==='imp-steal-summary');
  assert.equal(steals.reduce((sum,x)=>sum+x.stolen,0),2);
  assert.equal(summary.totalActuallyStolen,2);
});

test('T05 Imp steal never reduces a victim below zero',()=>{
  const f=byId(fixtureSet(),'F10_STEAL_MIN_BOUNDARY');
  assert.equal(hist(f,'p0').baseNumber,1);
  assert.equal(hist(f,'p0').postStealNumber,0);
  assert.ok(f.histories.every(x=>x.postStealNumber>=0));
});

test('T05 full chain locks SELF_MODIFY then SWAP then STEAL',()=>{
  const f=byId(fixtureSet(),'F4_FULL_CHAIN');
  const mage=hist(f,'p0'),vamp=hist(f,'p1'),imp=hist(f,'p2');
  assert.deepEqual([mage.baseNumber,mage.selfModifiedNumber,mage.postSwapNumber,mage.postStealNumber,mage.finalNumber],[3,4,5,5,5]);
  assert.deepEqual([vamp.baseNumber,vamp.selfModifiedNumber,vamp.postSwapNumber,vamp.postStealNumber,vamp.finalNumber],[5,5,4,3,3]);
  assert.deepEqual([imp.baseNumber,imp.selfModifiedNumber,imp.postSwapNumber,imp.postStealNumber,imp.finalNumber],[4,4,4,5,5]);
  const phases=f.events.filter(x=>x.effectId!=='imp-steal-summary').map(x=>x.phase);
  assert.deepEqual(phases,['SELF_MODIFY','PRE_COLLISION_SWAP','PRE_COLLISION_STEAL']);
});

test('T05 mutation can create new collision groups from final numbers',()=>{
  const f=byId(fixtureSet(),'F6_STEAL_CREATES_COLLISION');
  assert.deepEqual(hist(f,'p0').collisionGroup,['p0','p3']);
  assert.deepEqual(hist(f,'p3').collisionGroup,['p0','p3']);
  assert.deepEqual(hist(f,'p1').collisionGroup,['p1','p2']);
  assert.deepEqual(hist(f,'p2').collisionGroup,['p1','p2']);
  assert.ok(f.histories.every(x=>x.valid===false));
});

test('T05 mutation can resolve a collision that existed at base-number stage',()=>{
  const f=byId(fixtureSet(),'F7_STEAL_REMOVES_COLLISION');
  assert.equal(hist(f,'p0').baseNumber,hist(f,'p2').baseNumber);
  assert.notEqual(hist(f,'p0').finalNumber,hist(f,'p2').finalNumber);
  assert.equal(hist(f,'p0').valid,true);
  assert.equal(hist(f,'p2').valid,true);
});

test('T05 Knight Toughness applies after mutation and does not erase the collision group',()=>{
  const f=byId(fixtureSet(),'F5_KNIGHT_POST_MUTATION_IMMUNITY');
  const imp=hist(f,'p2'),knight=hist(f,'p3');
  assert.equal(imp.finalNumber,4);assert.equal(knight.finalNumber,4);
  assert.deepEqual(knight.collisionGroup,['p2','p3']);
  assert.equal(knight.collisionImmune,true);
  assert.equal(knight.valid,true);
  assert.equal(imp.collisionImmune,false);
  assert.equal(imp.valid,false);
});

test('T05 swap creates an Imp steal target only because SWAP precedes STEAL',()=>{
  const f=byId(fixtureSet(),'F8_SWAP_CREATES_IMP_TARGET');
  const vamp=hist(f,'p1'),imp=hist(f,'p2');
  assert.equal(vamp.selfModifiedNumber,5);
  assert.equal(vamp.postSwapNumber,4);
  assert.equal(vamp.postStealNumber,3);
  assert.equal(imp.postSwapNumber,4);
  assert.equal(imp.postStealNumber,5);
});

test('T05 Bold Steal adds +2 damage after stealing from at least two players without recursive steal',()=>{
  const f=byId(fixtureSet(),'F11_BOLD_STEAL_BONUS'),imp=hist(f,'p2');
  assert.equal(imp.finalNumber,5);
  assert.equal(imp.damage,7);
  assert.equal(f.events.filter(x=>x.effectId==='imp-steal-summary').length,1);
});

test('T05 Full Thrall consumes existing Dominance for damage on a valid next command',()=>{
  const f=byId(fixtureSet(),'F12_FULL_THRALL_DOMINANCE_DAMAGE'),vamp=hist(f,'p1');
  assert.equal(vamp.finalNumber,2);
  assert.equal(vamp.valid,true);
  assert.equal(vamp.damage,4);
});

test('T05 fixture mutation event order is deterministic',()=>{
  const a=runT05Fixtures('event-order-seed'),b=runT05Fixtures('event-order-seed');
  assert.deepEqual(a,b);
});

test('T05 full number-history golden locks every intermediate mutation stage',()=>{
  const result=replayScenario('T05','smoke:T05:0000');
  assert.deepEqual(t05GoldenComparable(result),golden);
});

test('T05 stress policy uses seed only for deterministic tie diversity, never Math.random',()=>{
  const intents=[
    {playerId:'p0',characterId:'mage',seat:0,availableNumbers:[1,2,3],publicResources:{mana:0},privateCycle:{cycleIndex:1,bloodCommandUsedCycle:null}},
    {playerId:'p1',characterId:'vampire',seat:1,availableNumbers:[1,2,3],publicResources:{},privateCycle:{cycleIndex:1,bloodCommandUsedCycle:null}},
    {playerId:'p2',characterId:'imp',seat:2,availableNumbers:[1,2,3],publicResources:{},privateCycle:{cycleIndex:1,bloodCommandUsedCycle:null}},
    {playerId:'p3',characterId:'warrior',seat:3,availableNumbers:[1,2,3],publicResources:{toughnessCharges:1},privateCycle:{cycleIndex:1,bloodCommandUsedCycle:null}}
  ];
  const a=planNumberMutationTurn(intents,{seed:'same-seed',contextKey:'tie'});
  const b=planNumberMutationTurn(intents,{seed:'same-seed',contextKey:'tie'});
  assert.deepEqual(a,b);
  const targets=new Set(Array.from({length:20},(_,i)=>planNumberMutationTurn(intents,{seed:`tie-${i}`,contextKey:'tie'}).targetNumber));
  assert.ok(targets.size>1);
});

test('T05 same-seed stress replay includes identical intermediate history',()=>{
  const a=replayScenario('T05','t05-replay-seed');
  const b=replayScenario('T05','t05-replay-seed');
  assert.equal(a.replayFingerprint,b.replayFingerprint);
  assert.deepEqual(t05GoldenComparable(a),t05GoldenComparable(b));
});

test('T05 stress runner emits mutation metrics and exercises self/swap/steal',()=>{
  const result=runT05('t05-metrics-seed');
  assert.equal(result.status,'PASS');
  assert.equal(result.combats.length,1);
  assert.ok(result.mutationMetrics.selfModifications>=1);
  assert.ok(result.mutationMetrics.stealEvents>=1);
  assert.equal(result.mutationMetrics.invalidMutationAttempts,0);
  assert.equal(result.mutationMetrics.numberHistoryMismatchCount,0);
  assert.equal(result.mutationMetrics.deterministicReplayMismatchCount,0);
});

function makeProjectionLeakRun(){
  const ids=['mage','vampire','imp','warrior'],augments=[['aug-111'],['aug-301'],['aug-181'],['aug-031']];
  const players=ids.map((character_id,i)=>newPlayerRunState({id:`p${i}`,user_id:`u${i}`,member_type:'human',character_id,seat_index:i}));
  players.forEach((p,i)=>{p.augments=[...augments[i]];});
  const monster={id:'hidden-debug',name:'Hidden Debug Dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'fixture',payload:{}}]};
  const run={id:'hidden-run',roomId:'r',seed:'hidden-seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'hidden-node',players,map:{nodes:[],edges:{}},usedMonsterIds:[],chosenBossIds:{}};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',monster);beginTurn(run);
  players[0].publicResources.mana=2;
  const card=(pid,n)=>players.find(p=>p.playerId===pid).cardPool.find(x=>x.baseNumber===n&&run.combat.privateByPlayer[pid].remainingCardIds.includes(x.id)).id;
  submitCard(run,'p0',card('p0',3),true,{direction:1,manaSpend:2});
  submitCard(run,'p1',card('p1',5),false);
  submitCard(run,'p2',card('p2',4),false);
  submitCard(run,'p3',card('p3',2),false);
  resolveBasicTurn(run);
  return run;
}
test('T05 full number mutation debug history never leaks through ordinary PlayerView',()=>{
  const run=makeProjectionLeakRun();
  assert.ok(run.combat.publicTurnResult.numberHistories?.length);
  const view=projectRun(run,'p0');
  assert.equal(view.combat.publicTurnResult.numberHistories,undefined);
  assert.equal(view.combat.publicTurnResult.mutationEvents,undefined);
  assert.ok(view.combat.publicTurnResult.cards.every(card=>card.numberHistory===undefined));
});

test('T05 activation does not activate unrelated stress scenarios',()=>{
  const status=Object.fromEntries(STRESS_SCENARIOS.map(s=>[s.id,scenarioAvailability(s).available]));
  assert.equal(status.T00,true);assert.equal(status.T05,true);assert.equal(status.T09,true);assert.equal(status.T04,true);assert.equal(status.T14,true);
  for(const id of ['T02','T03','T06'])assert.equal(status[id],false,id);
});
