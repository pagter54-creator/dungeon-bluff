import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {activateImmediateCharacterSkill} from '../supabase/functions/game-api/pve/characters.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {beginAugmentChoices,chooseAugment} from '../supabase/functions/game-api/pve/augments.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {SEER_CONTRACTS,SEER_CONTRACT_IDS} from '../supabase/functions/game-api/pve/seer-contracts.js';
import {
  SEER_HANDLER_IDS,assertSeerHandler,recoverSeerPhysicalCard,applySeerRuntime,scopedSeerState
} from '../supabase/functions/game-api/pve/seer-runtime.js';
import {resourceMax} from '../supabase/functions/game-api/pve/resources.js';

const aid=n=>'aug-'+String(n).padStart(3,'0');
function fixture(augments=[]){
  const ids=['prophet','adventurer','warrior','mage'];
  const players=ids.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  players[0].augments=[...augments];
  const run={id:'seer-test',seed:'seer-seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});
  run.combat.id='seer-combat';
  beginTurn(run);
  return {run,p:players[0]};
}
function moveToSpent(run,p,number){
  const priv=run.combat.privateByPlayer[p.playerId];
  const id=priv.remainingCardIds.find(id=>p.cardPool.find(c=>c.id===id)?.baseNumber===number);
  assert.ok(id);
  priv.remainingCardIds=priv.remainingCardIds.filter(x=>x!==id);
  priv.spentCardIds.push(id);
  return id;
}
function available(run,p,number){
  const priv=run.combat.privateByPlayer[p.playerId];
  return priv.remainingCardIds.find(id=>p.cardPool.find(c=>c.id===id)?.baseNumber===number);
}
function submitUnique(run,nums=[1,2,3,4]){
  nums.forEach((n,i)=>submitCard(run,'p'+i,available(run,run.players[i],n)));
  return resolveBasicTurn(run);
}

test('005C-A registry has exactly aug-151..180 executable with no missing handler',()=>{
  assert.deepEqual(SEER_CONTRACT_IDS,[...Array(30)].map((_,i)=>aid(151+i)));
  assert.deepEqual(SEER_HANDLER_IDS,SEER_CONTRACT_IDS);
  for(const id of SEER_CONTRACT_IDS){
    assertSeerHandler(id);
    assert.equal(SEER_CONTRACTS[id].executable,true);
    assert.equal(EXECUTABLE_AUGMENT_RUNTIME[id]?.executable,true,id);
    assert.ok(EXECUTABLE_AUGMENT_RUNTIME[id]?.specialHandlers?.includes('SEER_V02'),id);
  }
});

test('005C-A Seer candidate tree is 3 archetypes x 10 and stages 3/9/9/9',()=>{
  const defs=SEER_CONTRACT_IDS.map(id=>AUGMENT_BY_ID[id]);
  assert.ok(defs.every(Boolean));
  assert.equal(new Set(defs.map(x=>x.build)).size,3);
  for(const build of new Set(defs.map(x=>x.build))){
    const xs=defs.filter(x=>x.build===build);
    assert.equal(xs.length,10);
    assert.deepEqual([1,2,3,4].map(t=>xs.filter(x=>x.tier===t).length),[1,3,3,3]);
  }
  assert.deepEqual([1,2,3,4].map(t=>defs.filter(x=>x.tier===t).length),[3,9,9,9]);
  for(let tier=1;tier<=4;tier++)assert.ok(augmentCandidates('prophet',tier).every(x=>x.executable));
});

test('005C-A candidate acquisition respects build lock through stage 4',()=>{
  const {run,p}=fixture(); p.growthExp=50;run.phase='ROOM_RESULT';
  beginAugmentChoices(run);assert.ok(run.augmentChoice.offersByPlayer.p0.includes('aug-151'));
  chooseAugment(run,'p0','aug-151');assert.equal(p.augmentBuild,'완전한 계시');
  for(const [threshold,tier] of [[150,2],[350,3],[750,4]]){
    p.growthExp=threshold;run.phase='ROOM_RESULT';beginAugmentChoices(run);
    const offer=run.augmentChoice.offersByPlayer.p0;
    assert.ok(offer.length>0);assert.ok(offer.every(id=>AUGMENT_BY_ID[id].tier===tier&&AUGMENT_BY_ID[id].build==='완전한 계시'));
    chooseAugment(run,'p0',offer[0]);
  }
  assert.equal(p.augments.length,4);
});

test('005C-A Revelation canonical max is 3 and selected-before-submit does not block activation',()=>{
  const {run,p}=fixture();assert.equal(resourceMax(p,'revelation'),3);
  p.publicResources.revelation=1;
  const priv=run.combat.privateByPlayer.p0;
  priv.selectedCardId=available(run,p,5); // local-selection state, not finalized submission
  const spent=moveToSpent(run,p,1);
  const event=activateImmediateCharacterSkill(run,p);
  assert.equal(event.type,'REVELATION_USED');
  assert.equal(p.publicResources.revelation,0);
  assert.ok(priv.remainingCardIds.includes(spent));
  assert.throws(()=>{run.combat.turnSubmissions.p0={playerId:'p0',cardInstanceId:priv.selectedCardId};activateImmediateCharacterSkill(run,p);},/확정 제출|스킬|사용/);
});

test('005C-A activation-turn valid grants exactly +1 Revelation; collision grants +0',()=>{
  const a=fixture();a.p.publicResources.revelation=1;moveToSpent(a.run,a.p,5);activateImmediateCharacterSkill(a.run,a.p);
  const result=submitUnique(a.run,[1,2,3,4]);assert.equal(result.cards.find(x=>x.playerId==='p0').valid,true);assert.equal(a.p.publicResources.revelation,1);
  const b=fixture();b.p.publicResources.revelation=1;moveToSpent(b.run,b.p,5);activateImmediateCharacterSkill(b.run,b.p);
  submitCard(b.run,'p0',available(b.run,b.p,1));submitCard(b.run,'p1',available(b.run,b.run.players[1],1));submitCard(b.run,'p2',available(b.run,b.run.players[2],3));submitCard(b.run,'p3',available(b.run,b.run.players[3],4));
  const collision=resolveBasicTurn(b.run);assert.equal(collision.cards.find(x=>x.playerId==='p0').invalidReason,'COLLISION');assert.equal(b.p.publicResources.revelation,0);
});

test('005C-A recovery preserves physical card identity and provenance and excludes selected/submitted',()=>{
  const {run,p}=fixture(['aug-151']);const id=moveToSpent(run,p,2);
  const r=recoverSeerPhysicalCard(run,p,p,id,{sourceAugmentId:'SEER_BASE_REVELATION',rootActionId:'root'});
  assert.equal(r.applied,true);assert.equal(r.cardInstanceId,id);assert.equal(r.provenance.originalCardInstanceId,id);assert.equal(r.provenance.recoveredFromZone,'SPENT');
  const priv=run.combat.privateByPlayer.p0;assert.ok(priv.remainingCardIds.includes(id));assert.ok(!priv.spentCardIds.includes(id));
  const id2=moveToSpent(run,p,3);priv.selectedCardId=id2;
  assert.equal(recoverSeerPhysicalCard(run,p,p,id2,{rootActionId:'root2'}).applied,false);
});

test('005C-A aug-151 refunds only recovered valid card and only once per combat',()=>{
  const {run,p}=fixture(['aug-151']);p.publicResources.revelation=0;
  const id=moveToSpent(run,p,2);recoverSeerPhysicalCard(run,p,p,id,{rootActionId:'recovery-1'});
  const resolved={playerId:p.playerId,cardInstanceId:id,finalNumber:2,valid:true};
  applySeerRuntime(run,'CARD_VALIDATED',{player:p,resolved,cards:[resolved]});assert.equal(p.publicResources.revelation,1);
  applySeerRuntime(run,'CARD_VALIDATED',{player:p,resolved,cards:[resolved]});assert.equal(p.publicResources.revelation,1);
  const ordinary={playerId:p.playerId,cardInstanceId:available(run,p,1),finalNumber:1,valid:true};
  p.publicResources.revelation=0;applySeerRuntime(run,'CARD_VALIDATED',{player:p,resolved:ordinary,cards:[ordinary]});assert.equal(p.publicResources.revelation,0);
});

test('005C-A aug-161 explicit ally recovery uses same eligible BASE physical card deterministically',()=>{
  const {run,p}=fixture(['aug-161']);const ally=run.players[1],first=moveToSpent(run,ally,1),second=moveToSpent(run,ally,2);
  p.publicResources.revelation=1;
  const event=activateImmediateCharacterSkill(run,p,{target_player_id:'p1'});
  assert.equal(event.recoveredCount,1);const priv=run.combat.privateByPlayer.p1;
  assert.ok(priv.remainingCardIds.includes(second));assert.ok(priv.spentCardIds.includes(first));
  const prov=run.augmentFramework.seer.recoveredCards[second];assert.equal(prov.recoveredByPlayerId,'p0');assert.equal(prov.targetPlayerId,'p1');
});

test('005C-A base Revelation never inspects selected numbers; aug-177 is owner-only',()=>{
  {
    const {run,p}=fixture();p.publicResources.revelation=1;
    submitCard(run,'p1',available(run,run.players[1],4));moveToSpent(run,p,5);
    activateImmediateCharacterSkill(run,p);
    for(const viewer of ['p0','p1','p2'])assert.equal(projectRun(run,viewer).privateCombat?.revelationPeek,undefined);
  }
  {
    const {run,p}=fixture(['aug-171','aug-177']);p.publicResources.revelation=1;
    submitCard(run,'p1',available(run,run.players[1],4));moveToSpent(run,p,5);
    activateImmediateCharacterSkill(run,p,{prediction:{type:'COLLISION'}});
    const owner=projectRun(run,'p0'),target=projectRun(run,'p1'),other=projectRun(run,'p2');
    assert.equal(owner.privateCombat.revelationPeek.selectedNumber,4);
    assert.equal(target.privateCombat?.revelationPeek,undefined);
    assert.equal(other.privateCombat?.revelationPeek,undefined);
    assert.ok(!JSON.stringify(target).includes('"selectedNumber":4'));
    assert.ok(!JSON.stringify(other).includes('"selectedNumber":4'));
  }
});

test('005C-A aug-171 prediction persists through reconnect and cannot leak to another combat',()=>{
  const {run,p}=fixture(['aug-171']);p.publicResources.revelation=1;moveToSpent(run,p,5);
  const event=activateImmediateCharacterSkill(run,p,{prediction:{type:'COLLISION'}});
  assert.ok(event.predictionId);
  const snap=structuredClone(run),state=scopedSeerState(snap,snap.players[0]);
  assert.equal(state.prediction.originCombatId,'seer-combat');assert.equal(state.prediction.targetTurn,2);
  applySeerRuntime(snap,'COMBAT_END',{player:snap.players[0]});
  assert.equal(snap.augmentFramework.cardState['p0:seer'],undefined);
  snap.combat=newCombatState(snap.players,999);snap.combat.id='next-combat';beginTurn(snap);
  assert.equal(scopedSeerState(snap,snap.players[0]).prediction,null);
});

test('005C-A all thirty cards have explicit positive/negative runtime contracts and no silent-noop registry entries',()=>{
  for(const id of SEER_CONTRACT_IDS){
    const c=SEER_CONTRACTS[id];
    assert.ok(c.testCasesRequired?.minimumPositiveCase,id);
    assert.ok(c.testCasesRequired?.minimumNegativeCase,id);
    assert.equal(c.runtimeHandler,'SEER_V02',id);
    assert.ok(Array.isArray(c.runtimePrimitivesRequired)&&c.runtimePrimitivesRequired.length,id);
  }
});

for(const id of SEER_CONTRACT_IDS)test('005C-A positive runtime registration '+id,()=>{
  assertSeerHandler(id);
  const rt=EXECUTABLE_AUGMENT_RUNTIME[id];
  assert.equal(rt.executable,true);assert.ok(rt.specialHandlers.includes('SEER_V02'));
  assert.equal(rt.candidatePool.classId,'prophet');
});

test('005C-A reconnect preserves Revelation, recovery provenance, once ledger and prediction state',()=>{
  const {run,p}=fixture(['aug-151','aug-171']);p.publicResources.revelation=2;
  const id=moveToSpent(run,p,2);recoverSeerPhysicalCard(run,p,p,id,{rootActionId:'reconnect-root'});
  scopedSeerState(run,p).prediction={id:'pred',status:'ARMED',targetTurn:2,originCombatId:run.combat.id,originRoomId:run.currentRoomNodeId,expiryTurn:2};
  const saved=JSON.parse(JSON.stringify(run));
  assert.equal(saved.players[0].publicResources.revelation,2);
  assert.equal(saved.augmentFramework.seer.recoveredCards[id].originalCardInstanceId,id);
  assert.equal(saved.augmentFramework.cardState['p0:seer'].prediction.id,'pred');
});

test('005C-A multiple Seers keep private state and provenance owners independent',()=>{
  const {run}=fixture();run.players[1].characterId='prophet';run.players[1].augments=['aug-151'];
  const a=run.players[0],b=run.players[1];a.augments=['aug-151'];
  const ia=moveToSpent(run,a,1),ib=moveToSpent(run,b,1);
  recoverSeerPhysicalCard(run,a,a,ia,{rootActionId:'a'});recoverSeerPhysicalCard(run,b,b,ib,{rootActionId:'b'});
  assert.equal(run.augmentFramework.seer.recoveredCards[ia].recoveredByPlayerId,'p0');
  assert.equal(run.augmentFramework.seer.recoveredCards[ib].recoveredByPlayerId,'p1');
});

test('005C-A 005B executable registry remains 150/150',()=>{
  const ids=Object.keys(EXECUTABLE_AUGMENT_RUNTIME).filter(id=>{const n=Number(id.slice(4));return n>=1&&n<=150;});
  assert.equal(new Set(ids).size,150);
  assert.ok(ids.every(id=>EXECUTABLE_AUGMENT_RUNTIME[id].executable===true));
});
