import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  runT09Fixtures,runT09,replayScenario,t09GoldenComparable,scenarioAvailability,STRESS_SCENARIOS
} from '../scripts/pve-stress-lib.mjs';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {activateImmediateCharacterSkill} from '../supabase/functions/game-api/pve/characters.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';

const cases=()=>runT09Fixtures('unit-t09-fixtures').cases;
const byId=(rows,id)=>{const row=rows.find(x=>x.id===id);assert.ok(row,id);return row;};

test('T09 availability is active only after all basic resource capabilities are executable',()=>{
  const def=STRESS_SCENARIOS.find(x=>x.id==='T09');
  const a=scenarioAvailability(def);
  assert.equal(a.available,true);
  assert.deepEqual(a.missingCharacters,[]);
  assert.deepEqual(a.missingBuildEffects,[]);
  assert.deepEqual(a.missingCapabilities,[]);
});

test('T09 F1 Mage Mana 0 illegal cast is rejected without consuming state and turn can continue',()=>{
  const f=byId(cases(),'F1_MAGE_MANA_0_ILLEGAL');
  assert.equal(f.reject.code,'INSUFFICIENT_RESOURCE');
  assert.equal(f.manaAfterReject,0);
  assert.equal(f.turnAdvanced,true);
});

test('T09 F2 Mage exact 2-cost spends exactly once and modifies by +1',()=>{
  const f=byId(cases(),'F2_MAGE_EXACT_COST');
  assert.deepEqual([f.before,f.spent,f.after],[2,2,0]);
  assert.equal(f.workingNumber,2);
});

test('T09 repeated Mage resubmission during SELECTION_OPEN does not spend Mana until resolve and spends once',()=>{
  const ids=['warrior','mage','prophet','gunner'];
  const players=ids.map((character_id,i)=>newPlayerRunState({id:`p${i}`,user_id:`u${i}`,member_type:'human',character_id,seat_index:i}));
  const monster={id:'resubmit-dummy',name:'Resubmit Dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'fixture',payload:{}}]};
  const run={id:'resubmit-run',roomId:'r',seed:'resubmit-seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'resubmit-node',players,map:{nodes:[],edges:{}},usedMonsterIds:[],chosenBossIds:{}};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',monster);beginTurn(run);
  players[1].publicResources.mana=2;
  const mage1=players[1].cardPool.find(card=>card.baseNumber===1),mage2=players[1].cardPool.find(card=>card.baseNumber===2);
  submitCard(run,'p1',mage1.id,true,{manaSpend:2});
  submitCard(run,'p1',mage2.id,true,{manaSpend:2});
  assert.equal(players[1].publicResources.mana,2);
  assert.equal(run.combat.turnSubmissions.p1.cardInstanceId,mage2.id);
  submitCard(run,'p0',players[0].cardPool.find(card=>card.baseNumber===5).id,false);
  submitCard(run,'p2',players[2].cardPool.find(card=>card.baseNumber===4).id,false);
  submitCard(run,'p3',players[3].cardPool.find(card=>card.baseNumber===3).id,false);
  const result=resolveBasicTurn(run);
  const resolvedMage=result.cards.find(card=>card.playerId==='p1');
  assert.equal(resolvedMage.resourceBefore,2);
  assert.equal(resolvedMage.resourceSpent,2);
  assert.equal(resolvedMage.resourceAfter,0);
  assert.equal(players[1].publicResources.mana,1);
});

test('T09 F3 Knight Toughness 0 is rejected and normal submission still advances',()=>{
  const f=byId(cases(),'F3_KNIGHT_TOUGHNESS_0');
  assert.equal(f.reject.code,'INSUFFICIENT_RESOURCE');
  assert.equal(f.toughnessAfterReject,0);
  assert.equal(f.turnAdvanced,true);
});

test('T09 F4 Prophet activation-turn valid refunds Revelation 0 to 1',()=>{
  const f=byId(cases(),'F4_SEER_ACTIVATION_VALID_GAIN');
  assert.equal(f.gain,1);
  assert.equal(f.revelation,1);
  assert.equal(f.valid,true);
});

test('T09 F5 Prophet activation-turn collision gains no Revelation',()=>{
  const f=byId(cases(),'F5_SEER_ACTIVATION_COLLISION_NO_GAIN');
  assert.equal(f.gain,0);
  assert.equal(f.revelation,0);
  assert.equal(f.valid,false);
});

test('T09 F6 Revelation consumes one and deterministically recovers an existing physical card',()=>{
  const f=byId(cases(),'F6_SEER_USE_RECOVERY');
  assert.equal(f.recoveredCardId,f.expectedCardId);
  assert.equal(f.revelationAfterUse,0);
  assert.equal(f.ownershipStable,true);
  assert.equal(f.peek.selectedNumber,2);
  assert.equal(f.peek.targetPlayerId,'p0');
});

test('T09 F7 Revelation use regains one only from same-turn valid result',()=>{
  const f=byId(cases(),'F7_SEER_USE_VALID_REGAIN');
  assert.equal(f.spent,1);
  assert.equal(f.gained,1);
  assert.equal(f.revelation,1);
});

test('T09 F8 Revelation with no spent card still succeeds and recovery is a no-op',()=>{
  const f=byId(cases(),'F8_SEER_NO_RECOVERY_TARGET');
  assert.equal(f.recoveredCardId,null);
  assert.equal(f.revelationAfterUse,0);
  assert.equal(f.spentCountBefore,0);
  assert.equal(f.peekTarget,'p0');
});

test('T09 F9 Gunner final card consumption starts exactly one new 1/2/3 cycle',()=>{
  const f=byId(cases(),'F9_GUNNER_FINAL_CARD_CYCLE');
  assert.equal(f.cycle,2);
  assert.deepEqual([...f.remaining].sort(),[...f.expected].sort());
  assert.deepEqual(f.spent,[]);
});

test('T09 F10 Full Burst success consumes follow-ups and immediately enters next cycle without recursion',()=>{
  const f=byId(cases(),'F10_FULL_BURST_SUCCESS');
  assert.equal(f.outcome,'SUCCESS');
  assert.equal(f.followUps.length,2);
  assert.equal(f.cycle,2);
  assert.equal(f.remaining.length,3);
  assert.equal(f.ready,false);
  assert.equal(f.readyCycle,3);
});

test('T09 F11 Full Burst collision failure keeps non-selected cards, self-damages once and remains stable',()=>{
  const f=byId(cases(),'F11_FULL_BURST_FAILURE');
  assert.equal(f.outcome,'FAIL_COLLISION');
  assert.deepEqual(f.followUps,[]);
  assert.equal(f.hp,2);
  assert.equal(f.cycle,1);
  assert.equal(f.remaining.length,2);
  assert.equal(f.spent.length,1);
  assert.equal(f.ready,false);
  assert.equal(f.readyCycle,2);
});

test('T09 F12 repeated invalid requests do not consume Mana or block later normal action',()=>{
  const f=byId(cases(),'F12_REPEATED_INVALID');
  assert.deepEqual(f.rejectCodes,['INSUFFICIENT_RESOURCE','INSUFFICIENT_RESOURCE','INSUFFICIENT_RESOURCE']);
  assert.equal(f.manaAfterRejects,0);
  assert.equal(f.turnAdvanced,true);
});

test('T09 fixtures are deterministic for the same seed',()=>{
  assert.deepEqual(runT09Fixtures('fixture-replay'),runT09Fixtures('fixture-replay'));
});

test('T09 semantic golden locks fixtures and the full compact resource timeline',()=>{
  const golden=JSON.parse(fs.readFileSync(new URL('./fixtures/pve-stress-t09-golden.json',import.meta.url),'utf8'));
  const result=replayScenario('T09','smoke:T09:0000');
  const actual=t09GoldenComparable(result);
  try{assert.deepEqual(actual,golden);}catch(error){console.log('T09_GOLDEN_ACTUAL='+JSON.stringify(actual));throw error;}
});

test('T09 stress replay reproduces the complete resource timeline',()=>{
  const a=replayScenario('T09','t09-resource-replay');
  const b=replayScenario('T09','t09-resource-replay');
  assert.equal(a.replayFingerprint,b.replayFingerprint);
  assert.deepEqual(a.resourceTimeline,b.resourceTimeline);
});

test('T09 stress metrics exercise rejection, cycle reset, Revelation, and Full Burst without hard invariant failures',()=>{
  const r=runT09('t09-metrics');
  assert.equal(r.status,'PASS');
  assert.equal(r.combats.length,1);
  assert.ok(r.resourceMetrics.invalidSkillRequestCount>0);
  assert.equal(r.resourceMetrics.invalidSkillRequestCount,r.resourceMetrics.rejectedRequestCount);
  assert.ok(r.resourceMetrics.cycleResetCount>0);
  assert.ok(r.resourceMetrics.revelationGain>0);
  assert.ok(r.resourceMetrics.revelationSpend>0);
  assert.ok(r.resourceMetrics.fullBurstSuccess+r.resourceMetrics.fullBurstFailure>0);
  assert.equal(r.resourceMetrics.negativeResourceOccurrence,0);
  assert.equal(r.resourceMetrics.resourceOverCapOccurrence,0);
  assert.equal(r.resourceMetrics.emptyHandSoftlockCount,0);
  assert.equal(r.resourceMetrics.duplicateCardInvariantFailure,0);
  assert.equal(r.resourceMetrics.resourceLeakAtCombatEnd,0);
});

function makePeekRun(){
  const ids=['warrior','mage','prophet','gunner'];
  const players=ids.map((character_id,i)=>newPlayerRunState({id:`p${i}`,user_id:`u${i}`,member_type:'human',character_id,seat_index:i}));
  const monster={id:'peek-dummy',name:'Peek Dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'fixture',payload:{}}]};
  const run={id:'peek-run',roomId:'r',seed:'peek-seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'peek-node',players,map:{nodes:[],edges:{}},usedMonsterIds:[],chosenBossIds:{}};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',monster);beginTurn(run);
  players[2].publicResources.revelation=1;
  const warriorCard=players[0].cardPool.find(card=>card.baseNumber===2);
  submitCard(run,'p0',warriorCard.id,false);
  return run;
}

test('T09 Revelation private peek is visible only to the Prophet projection',()=>{
  const run=makePeekRun();
  activateImmediateCharacterSkill(run,run.players[2]);
  const seer=projectRun(run,'p2'),target=projectRun(run,'p0'),other=projectRun(run,'p1');
  assert.deepEqual(seer.privateCombat.revelationPeek,{turn:1,targetPlayerId:'p0',selectedNumber:2,recoveredCardId:null});
  assert.equal(target.privateCombat.revelationPeek,undefined);
  assert.equal(other.privateCombat.revelationPeek,undefined);
  assert.equal(seer.combat.turnSubmissions,undefined);
  assert.deepEqual(seer.combat.readyPlayerIds,['p0']);
  assert.ok(!Object.hasOwn(seer.players.find(p=>p.playerId==='p0').cardPool[0],'id'));
});

test('T09 remains active after the final T06 scenario is enabled',()=>{
  const status=Object.fromEntries(STRESS_SCENARIOS.map(s=>[s.id,scenarioAvailability(s).available]));
  for(const id of ['T00','T02','T03','T04','T05','T06','T09','T14'])assert.equal(status[id],true,id);
});
