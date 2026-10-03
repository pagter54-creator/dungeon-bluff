import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
import {beginAugmentChoices,chooseAugment} from '../supabase/functions/game-api/pve/augments.js';
import {IMP_CONTRACT_IDS} from '../supabase/functions/game-api/pve/imp-contracts.js';
import {applyImpPreCollisionSteal,scopedImpState} from '../supabase/functions/game-api/pve/imp-runtime.js';
import {initializeNumberHistories,finalizeNumbers} from '../supabase/functions/game-api/pve/number-mutation.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';

function make(ids=['imp','adventurer','warrior','mage'],augments=[]){
  const players=ids.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  players[0].augments=[...augments];
  const run={id:'imp-int',seed:'imp-int-seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'imp-node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});
  run.combat.id='imp-int-combat';beginTurn(run);return {run,players,p:players[0]};
}
const priv=(run,p)=>run.combat.privateByPlayer[p.playerId];
function idFor(run,p,n){return priv(run,p).remainingCardIds.find(id=>p.cardPool.find(c=>c.id===id)?.baseNumber===n);}
function submitNums(run,nums,skills={}){
  nums.forEach((n,i)=>submitCard(run,'p'+i,idFor(run,run.players[i],n),Boolean(skills[i]?.use),skills[i]?.data||null));
  return resolveBasicTurn(run);
}

test('005C-B registry/candidates are exactly Imp aug-181..210 with 3/9/9/9 and 3x10 archetypes',()=>{
  assert.deepEqual(IMP_CONTRACT_IDS,[...Array(30)].map((_,i)=>'aug-'+String(181+i).padStart(3,'0')));
  const defs=IMP_CONTRACT_IDS.map(id=>AUGMENT_BY_ID[id]);assert.ok(defs.every(Boolean));assert.ok(defs.every(x=>x.executable===true));
  assert.deepEqual([1,2,3,4].map(t=>defs.filter(x=>x.tier===t).length),[3,9,9,9]);
  const builds=[...new Set(defs.map(x=>x.build))];assert.deepEqual(new Set(builds),new Set(['대담한 슬쩍','소매치기 악동','장난의 연쇄']));
  assert.ok(builds.every(b=>defs.filter(x=>x.build===b).length===10));
  for(let t=1;t<=4;t++)assert.equal(augmentCandidates('imp',t,t===1?undefined:'대담한 슬쩍').every(x=>x.executable),true);
});
test('005C-B candidate acquisition locks Imp build after Stage1 through Stage4',()=>{
  const {run,p}=make();run.phase='ROOM_RESULT';p.growthExp=50;beginAugmentChoices(run);
  const stage1=run.augmentChoice.offersByPlayer.p0;assert.ok(stage1.includes('aug-181')&&stage1.includes('aug-191')&&stage1.includes('aug-201'));
  chooseAugment(run,'p0','aug-181');assert.equal(p.augmentBuild,'대담한 슬쩍');
  for(const [exp,tier] of [[150,2],[350,3],[750,4]]){p.growthExp=exp;run.phase='ROOM_RESULT';beginAugmentChoices(run);const offers=run.augmentChoice.offersByPlayer.p0;assert.ok(offers.length);assert.ok(offers.every(id=>AUGMENT_BY_ID[id].tier===tier&&AUGMENT_BY_ID[id].build==='대담한 슬쩍'));chooseAugment(run,'p0',offers[0]);}
});
test('005C-B base steal uses actual amount floor 0 and recomputes collision after steal',()=>{
  const {run}=make();const out=submitNums(run,[1,1,3,4]),by=Object.fromEntries(out.cards.map(x=>[x.playerId,x]));
  assert.equal(by.p0.finalNumber,2);assert.equal(by.p1.finalNumber,0);assert.equal(by.p0.valid,true);assert.equal(by.p1.valid,true);
  const ev=out.mutationEvents.find(x=>x.effectId==='imp-steal');assert.equal(ev.requestedAmount,1);assert.equal(ev.actualAmount,1);assert.equal(ev.before,1);assert.equal(ev.after,0);
});
test('005C-B steal can create a new collision from post-steal FINAL_NUMBER',()=>{
  const {run}=make(['imp','adventurer','warrior','mage']);const out=submitNums(run,[2,3,2,4]),by=Object.fromEntries(out.cards.map(x=>[x.playerId,x]));
  assert.equal(by.p0.finalNumber,3);assert.equal(by.p1.finalNumber,3);assert.equal(by.p0.invalidReason,'COLLISION');assert.equal(by.p1.invalidReason,'COLLISION');
});
test('005C-B multiple Imps resolve sequentially by seat and later Imp sees mutated victim value',()=>{
  const {run}=make(['imp','imp','adventurer','mage']);const out=submitNums(run,[1,1,1,4]);
  const steals=out.mutationEvents.filter(x=>x.effectId==='imp-steal'&&x.actualAmount>0);
  assert.equal(steals.length,1);assert.equal(steals[0].sourcePlayerId,'p0');assert.equal(steals[0].victimPlayerId,'p2');
  assert.equal(out.cards.find(x=>x.playerId==='p1').stealTotal,0);
});
test('005C-B PRE_COLLISION_STEAL sees Mage SELF_MODIFY output before stealing',()=>{
  const {run}=make(['imp','mage','adventurer','warrior']);run.players[1].publicResources.mana=2;
  const out=submitNums(run,[2,1,4,5],{1:{use:true,data:{manaSpend:2}}}),by=Object.fromEntries(out.cards.map(x=>[x.playerId,x]));
  assert.equal(by.p1.numberHistory.selfModifiedNumber,2);assert.equal(by.p1.finalNumber,1);assert.equal(by.p0.finalNumber,3);
});
test('005C-B Knight collision override runs after Imp steal FINAL_NUMBER',()=>{
  const {run}=make(['imp','adventurer','warrior','mage']);run.players[2].publicResources.toughnessCharges=1;
  const out=submitNums(run,[1,1,2,4],{2:{use:true}}),by=Object.fromEntries(out.cards.map(x=>[x.playerId,x]));
  assert.equal(by.p0.finalNumber,2);assert.equal(by.p2.finalNumber,2);assert.equal(by.p0.valid,false);assert.equal(by.p2.valid,true);
});
test('005C-B Rogue soloLowest is derived from post-steal final values',()=>{
  const {run}=make(['imp','rogue','warrior','mage']);const out=submitNums(run,[1,1,3,4]),by=Object.fromEntries(out.cards.map(x=>[x.playerId,x]));
  assert.equal(by.p1.finalNumber,0);assert.equal(by.p1.soloLowest,true);
});
test('005C-B Imp state does not expose hidden selected numbers through public projection',()=>{
  const {run}=make(['imp','prophet','adventurer','mage'],['aug-201']);submitCard(run,'p2',idFor(run,run.players[2],3));
  const projected=projectRun(run,'p0'),other=projectRun(run,'p1');assert.ok(!JSON.stringify(projected).includes('"selectedNumber":3'));assert.ok(!JSON.stringify(other).includes('"selectedNumber":3'));
});
test('005C-B reconnect preserves independent multi-Imp scoped state and Mischief ownership',()=>{
  const {run}=make(['imp','imp','adventurer','mage'],['aug-201']);run.players[1].augments=['aug-201'];
  const cs=run.players.map((p,i)=>({playerId:p.playerId,cardInstanceId:p.cardPool[0].id,baseNumber:[1,2,1,4][i],workingNumber:[1,2,1,4][i],finalNumber:[1,2,1,4][i],valid:true}));initializeNumberHistories(cs);applyImpPreCollisionSteal(run,cs,[]);finalizeNumbers(cs);
  scopedImpState(run,run.players[0]).excitement=2;scopedImpState(run,run.players[1]).excitement=1;const snap=structuredClone(run);
  assert.equal(snap.augmentFramework.imp.state.p0.excitement,2);assert.equal(snap.augmentFramework.imp.state.p1.excitement,1);assert.notEqual(snap.augmentFramework.imp.state.p0,snap.augmentFramework.imp.state.p1);
});
test('005C executable counts retain 005B, Seer, Imp and add Gambler 30/30 without new Gunslinger runtime',()=>{
  const ids=Object.keys(EXECUTABLE_AUGMENT_RUNTIME);
  const range=(a,b)=>ids.filter(id=>{const n=+id.slice(4);return n>=a&&n<=b&&EXECUTABLE_AUGMENT_RUNTIME[id]?.executable===true});
  assert.equal(new Set(range(1,150)).size,150);assert.equal(new Set(range(151,180)).size,30);assert.equal(new Set(range(181,210)).size,30);
  assert.equal(new Set(range(211,240)).size,30);assert.equal(new Set(range(241,270)).size,1);
  assert.equal(new Set(range(151,270)).size,91);assert.equal(new Set(range(1,270)).size,241);
});
test('005C-B all Imp contracts have executable IMP_V02 handlers and actual runtime entry',()=>{
  for(const id of IMP_CONTRACT_IDS){const rt=EXECUTABLE_AUGMENT_RUNTIME[id];assert.equal(rt?.executable,true,id);assert.ok(rt.specialHandlers?.includes('IMP_V02'),id);}
});
