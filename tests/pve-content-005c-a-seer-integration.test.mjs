import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {activateImmediateCharacterSkill} from '../supabase/functions/game-api/pve/characters.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {recoverSeerPhysicalCard,applySeerRuntime,scopedSeerState} from '../supabase/functions/game-api/pve/seer-runtime.js';

function make(ids=['prophet','adventurer','warrior','mage'],augments=[]){
  const players=ids.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  players[0].augments=[...augments];
  const run={id:'seer-integration',seed:'seer-integration-seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'mix-node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});
  run.combat.id='mix-combat';beginTurn(run);return {run,p:players[0]};
}
const pv=(run,p)=>run.combat.privateByPlayer[p.playerId];
function idFor(run,p,n){return pv(run,p).remainingCardIds.find(id=>p.cardPool.find(c=>c.id===id)?.baseNumber===n);}
function spend(run,p,n){const id=idFor(run,p,n);assert.ok(id);pv(run,p).remainingCardIds=pv(run,p).remainingCardIds.filter(x=>x!==id);pv(run,p).spentCardIds.push(id);return id;}
function resolved(player,id,n){return {playerId:player.playerId,cardInstanceId:id,workingNumber:n,finalNumber:n,valid:true};}

test('005C-A full build 완전한 계시 combines recovery refund repeat recovery and one +3 strengthen',()=>{
  const {run,p}=make(undefined,['aug-151','aug-153','aug-157','aug-160']);
  const older=spend(run,p,4),latest=spend(run,p,5);p.publicResources.revelation=1;
  const e=activateImmediateCharacterSkill(run,p);assert.equal(e.recoveredCardId,latest);
  submitCard(run,'p0',latest);submitCard(run,'p1',idFor(run,run.players[1],1));submitCard(run,'p2',idFor(run,run.players[2],2));submitCard(run,'p3',idFor(run,run.players[3],3));
  const out=resolveBasicTurn(run),seer=out.cards.find(x=>x.playerId==='p0');
  assert.equal(seer.valid,true);assert.equal(p.publicResources.revelation,2);
  assert.ok(pv(run,p).remainingCardIds.includes(older));
  assert.ok((seer.seerModifierIds||[]).includes('SEER_RUNTIME_BONUS'));
});

test('005C-A full build 운명 조작자 preserves ally physical identity, pre-collision shift, self-chain recovery and shared future',()=>{
  const {run,p}=make(undefined,['aug-161','aug-163','aug-166','aug-170']),ally=run.players[1];
  const own=spend(run,p,4),aid=spend(run,ally,2);p.publicResources.revelation=1;
  const e=activateImmediateCharacterSkill(run,p,{target_player_id:'p1',ally_number_delta:1});assert.equal(e.recoveredCardId,aid);assert.ok(pv(run,p).remainingCardIds.includes(own));
  submitCard(run,'p0',idFor(run,p,5));submitCard(run,'p1',aid);submitCard(run,'p2',idFor(run,run.players[2],2));submitCard(run,'p3',idFor(run,run.players[3],4));
  const out=resolveBasicTurn(run),a=out.cards.find(x=>x.playerId==='p1'),owner=out.cards.find(x=>x.playerId==='p0');
  assert.equal(a.finalNumber,3);assert.equal(a.valid,true);assert.ok((a.seerRuntimeBonus||0)>=2);
  assert.ok((owner.damageValue||0)>=7);
});

test('005C-A full build 불길한 예언 keeps owner-only inspection and fulfills three-type prediction reward',()=>{
  const {run,p}=make(undefined,['aug-171','aug-175','aug-177','aug-180']);p.publicResources.revelation=1;
  submitCard(run,'p1',idFor(run,run.players[1],2));activateImmediateCharacterSkill(run,p,{prediction:{type:'COLLISION'}});
  assert.equal(projectRun(run,'p0').privateCombat.revelationPeek.selectedNumber,2);assert.equal(projectRun(run,'p1').privateCombat?.revelationPeek,undefined);
  const s=scopedSeerState(run,p);s.predictionSuccessTypes=['COLLISION','NO_COLLISION'];run.combat.turn=2;
  s.prediction={id:'full-pred',status:'ARMED',type:'NUMBER_VALID',number:1,targetPlayerId:null,targetTurn:2,originCombatId:run.combat.id,originRoomId:run.currentRoomNodeId};
  const before=run.players.map(x=>x.growthExp),r=resolved(p,idFor(run,p,1),1);
  applySeerRuntime(run,'CARD_VALIDATED',{player:p,resolved:r,cards:[r],rootActionId:'full-prophecy'});
  assert.deepEqual(run.players.map((x,i)=>x.growthExp-before[i]),[2,2,2,2]);
});

test('005C-A mixed Seer Knight Rogue Mage party preserves recovery, collision override and FINAL_NUMBER ordering',()=>{
  const {run,p}=make(['prophet','warrior','rogue','mage'],[]);const recovered=spend(run,p,5);p.publicResources.revelation=1;activateImmediateCharacterSkill(run,p);
  run.players[1].publicResources.toughnessCharges=1;
  submitCard(run,'p0',recovered);submitCard(run,'p1',idFor(run,run.players[1],3),true);submitCard(run,'p2',idFor(run,run.players[2],1));submitCard(run,'p3',idFor(run,run.players[3],3));
  const out=resolveBasicTurn(run),by=Object.fromEntries(out.cards.map(x=>[x.playerId,x]));
  assert.equal(by.p0.valid,true);assert.equal(p.publicResources.revelation,1);assert.equal(by.p1.valid,true);assert.equal(by.p1.finalNumber,3);assert.equal(by.p3.valid,false);assert.equal(by.p3.invalidReason,'COLLISION');assert.ok(pv(run,p).spentCardIds.includes(recovered));
});

test('005C-A reconnect and retry keep inspection private and do not duplicate recovered-card refund or prediction resolve telemetry',()=>{
  const {run,p}=make(undefined,['aug-151','aug-171','aug-177']);const rid=spend(run,p,4);recoverSeerPhysicalCard(run,p,p,rid,{rootActionId:'retry-recovery'});p.publicResources.revelation=0;
  const r=resolved(p,rid,4);applySeerRuntime(run,'CARD_VALIDATED',{player:p,resolved:r,cards:[r],rootActionId:'same-action'});applySeerRuntime(run,'CARD_VALIDATED',{player:p,resolved:r,cards:[r],rootActionId:'same-action'});assert.equal(p.publicResources.revelation,1);
  p.publicResources.revelation=1;submitCard(run,'p1',idFor(run,run.players[1],2));activateImmediateCharacterSkill(run,p,{prediction:{type:'COLLISION'}});
  const snap=structuredClone(run);assert.equal(projectRun(snap,'p0').privateCombat.revelationPeek.selectedNumber,2);assert.equal(projectRun(snap,'p1').privateCombat?.revelationPeek,undefined);assert.deepEqual(snap.players[0].augments,p.augments);
  snap.combat.turn=2;const sr=resolved(snap.players[0],idFor(snap,snap.players[0],1),1),cards=[sr,{playerId:'p2',valid:false,finalNumber:3,invalidReason:'COLLISION'}];
  applySeerRuntime(snap,'CARD_VALIDATED',{player:snap.players[0],resolved:sr,cards,rootActionId:'prediction-retry'});const before=(snap.augmentFramework.telemetry||[]).filter(x=>x.augmentId==='aug-171'&&x.trigger==='PREDICTION_RESOLVED').length;
  applySeerRuntime(snap,'CARD_VALIDATED',{player:snap.players[0],resolved:sr,cards,rootActionId:'prediction-retry'});const after=(snap.augmentFramework.telemetry||[]).filter(x=>x.augmentId==='aug-171'&&x.trigger==='PREDICTION_RESOLVED').length;assert.equal(after,before);
});
