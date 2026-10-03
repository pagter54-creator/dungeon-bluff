import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard} from '../supabase/functions/game-api/pve/combat.js';
import {activateImmediateCharacterSkill} from '../supabase/functions/game-api/pve/characters.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {recoverSeerPhysicalCard,applySeerRuntime,scopedSeerState} from '../supabase/functions/game-api/pve/seer-runtime.js';

function fixture(augments=[]){
  const ids=['prophet','adventurer','warrior','mage'];
  const players=ids.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  players[0].augments=[...augments];
  const run={id:'seer-effects',seed:'seer-effects-seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'seer-node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});
  run.combat.id='seer-effects-combat';
  beginTurn(run);
  return {run,p:players[0]};
}
function priv(run,p){return run.combat.privateByPlayer[p.playerId];}
function card(run,p,number){return p.cardPool.find(c=>c.baseNumber===number);}
function remaining(run,p,number){const c=card(run,p,number);return c&&priv(run,p).remainingCardIds.includes(c.id)?c.id:null;}
function moveToSpent(run,p,number){
  const id=remaining(run,p,number);assert.ok(id,'missing remaining '+number);
  priv(run,p).remainingCardIds=priv(run,p).remainingCardIds.filter(x=>x!==id);
  if(!priv(run,p).spentCardIds.includes(id))priv(run,p).spentCardIds.push(id);
  return id;
}
function respent(run,p,id){
  priv(run,p).remainingCardIds=priv(run,p).remainingCardIds.filter(x=>x!==id);
  if(!priv(run,p).spentCardIds.includes(id))priv(run,p).spentCardIds.push(id);
}
function recoveredOwn(run,p,number,root='own'){
  const id=moveToSpent(run,p,number);
  const rr=recoverSeerPhysicalCard(run,p,p,id,{rootActionId:root,sourceAugmentId:'SEER_BASE_REVELATION',recoveryMode:'SELF'});
  assert.equal(rr.applied,true);return id;
}
function recoveredAlly(run,p,ally,number,{root='ally',skillData=null}={}){
  const id=moveToSpent(run,ally,number);
  const rr=recoverSeerPhysicalCard(run,p,ally,id,{rootActionId:root,sourceAugmentId:'aug-161',recoveryMode:'ALLY',skillData});
  assert.equal(rr.applied,true);return id;
}
function ctx(player,id,number,{valid=true,cards=null,rootActionId=null}={}){
  const resolved={playerId:player.playerId,cardInstanceId:id,workingNumber:number,finalNumber:number,valid,...(!valid?{invalidReason:'COLLISION'}:{})};
  return {player,resolved,cards:cards||[resolved],damage:{amount:number},rootActionId:rootActionId||'effect:'+player.playerId+':'+id};
}
function arm(run,p,prediction){
  const s=scopedSeerState(run,p);
  s.prediction={id:'pred:'+run.combat.turn+':'+prediction.type,status:'ARMED',declaredTurn:run.combat.turn-1,targetTurn:run.combat.turn,createdTurn:run.combat.turn-1,expiryTurn:run.combat.turn,originCombatId:run.combat.id,originRoomId:run.currentRoomNodeId,cancelRule:'COMBAT_END_OR_SOURCE_INVALIDATED',rootActionId:'prediction-root',sourceAugmentId:'aug-171',...prediction};
  return s;
}
function telemetry(run,id){return (run.augmentFramework?.telemetry||[]).filter(x=>x.augmentId===id);}

test('aug-151 actual refund uses recovered provenance once/combat and ignores normal cards',()=>{
  const {run,p}=fixture(['aug-151']);p.publicResources.revelation=0;
  const id=recoveredOwn(run,p,2,'151-r');
  applySeerRuntime(run,'CARD_VALIDATED',ctx(p,id,2,{rootActionId:'151-use-1'}));assert.equal(p.publicResources.revelation,1);
  p.publicResources.revelation=0;respent(run,p,id);recoverSeerPhysicalCard(run,p,p,id,{rootActionId:'151-r2'});
  applySeerRuntime(run,'CARD_VALIDATED',ctx(p,id,2,{rootActionId:'151-use-2'}));assert.equal(p.publicResources.revelation,0);
  const ordinary=remaining(run,p,1);applySeerRuntime(run,'CARD_VALIDATED',ctx(p,ordinary,1,{rootActionId:'151-normal'}));assert.equal(p.publicResources.revelation,0);
});

test('aug-152 actual selector exposes two deterministic own recovery candidates and honors explicit choice',()=>{
  const {run,p}=fixture(['aug-152']);const a=moveToSpent(run,p,1),b=moveToSpent(run,p,2);p.publicResources.revelation=1;
  const e=activateImmediateCharacterSkill(run,p,{recover_card_id:a});
  assert.equal(e.recoveredCardId,a);assert.deepEqual(new Set(priv(run,p).seerRecoveryCandidates.candidateIds),new Set([a,b]));
  const n=fixture(['aug-152']);n.p.publicResources.revelation=1;activateImmediateCharacterSkill(n.run,n.p);assert.equal(priv(n.run,n.p).seerRecoveryCandidates.candidateIds.length,0);
});

test('aug-153 recovered own valid card performs one additional physical recovery per cycle',()=>{
  const {run,p}=fixture(['aug-153']);const first=recoveredOwn(run,p,1,'153-first'),second=moveToSpent(run,p,2);
  applySeerRuntime(run,'CARD_VALIDATED',ctx(p,first,1,{rootActionId:'153-use'}));
  assert.ok(priv(run,p).remainingCardIds.includes(second));
  const before=[...priv(run,p).remainingCardIds];applySeerRuntime(run,'CARD_VALIDATED',ctx(p,first,1,{rootActionId:'153-use-2'}));assert.deepEqual(priv(run,p).remainingCardIds,before);
});

test('aug-154 recovered own valid card grants exactly 1 EXP and invalid gives none',()=>{
  const {run,p}=fixture(['aug-154']);const id=recoveredOwn(run,p,1,'154-r'),before=p.growthExp;
  applySeerRuntime(run,'CARD_VALIDATED',ctx(p,id,1,{rootActionId:'154-valid'}));assert.equal(p.growthExp,before+1);
  const id2=recoveredOwn(run,p,2,'154-r2'),before2=p.growthExp;applySeerRuntime(run,'CARD_VALIDATED',ctx(p,id2,2,{valid:false,rootActionId:'154-invalid'}));assert.equal(p.growthExp,before2);
});

test('aug-155 recovered own card within two turns refunds Revelation once/combat',()=>{
  const {run,p}=fixture(['aug-155']);p.publicResources.revelation=0;const id=recoveredOwn(run,p,1,'155-r');
  run.combat.turn=3;applySeerRuntime(run,'CARD_VALIDATED',ctx(p,id,1,{rootActionId:'155-valid'}));assert.equal(p.publicResources.revelation,1);
  p.publicResources.revelation=0;const id2=recoveredOwn(run,p,2,'155-r2');run.combat.turn=6;applySeerRuntime(run,'CARD_VALIDATED',ctx(p,id2,2,{rootActionId:'155-late'}));assert.equal(p.publicResources.revelation,0);
});

test('aug-156 recovered own valid card buffs only next-turn first valid attack +1',()=>{
  const {run,p}=fixture(['aug-156']);const id=recoveredOwn(run,p,1,'156-r');
  applySeerRuntime(run,'CARD_VALIDATED',ctx(p,id,1,{rootActionId:'156-use'}));
  let d=ctx(p,remaining(run,p,2),2,{rootActionId:'156-same'});applySeerRuntime(run,'BEFORE_DAMAGE',d);assert.equal(d.damage.amount,2);
  run.combat.turn+=1;d=ctx(p,remaining(run,p,2),2,{rootActionId:'156-next'});applySeerRuntime(run,'BEFORE_DAMAGE',d);assert.equal(d.damage.amount,3);
  const d2=ctx(p,remaining(run,p,3),3,{rootActionId:'156-next-2'});applySeerRuntime(run,'BEFORE_DAMAGE',d2);assert.equal(d2.damage.amount,3);
});

test('aug-157 second valid use of same recovered printed number grants +2, first does not',()=>{
  const {run,p}=fixture(['aug-157']);const id=recoveredOwn(run,p,2,'157-r1');
  let c=ctx(p,id,2,{rootActionId:'157-u1'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus||0,0);
  respent(run,p,id);recoverSeerPhysicalCard(run,p,p,id,{rootActionId:'157-r2'});c=ctx(p,id,2,{rootActionId:'157-u2'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus,2);
});

test('aug-158 direct own spent-card selection recovers chosen physical ID; no spent target yields no recovery',()=>{
  const {run,p}=fixture(['aug-158']);const a=moveToSpent(run,p,1),b=moveToSpent(run,p,2);p.publicResources.revelation=1;
  const e=activateImmediateCharacterSkill(run,p,{recover_card_id:a});assert.equal(e.recoveredCardId,a);assert.ok(priv(run,p).spentCardIds.includes(b));
  const n=fixture(['aug-158']);n.p.publicResources.revelation=1;const ne=activateImmediateCharacterSkill(n.run,n.p,{recover_card_id:'missing'});assert.equal(ne.recoveredCount,0);
});

test('aug-159 recovered own valid card gets +4 only when turn began with Revelation',()=>{
  const {run,p}=fixture(['aug-159']);const id=recoveredOwn(run,p,1,'159-r'),s=scopedSeerState(run,p);s.turnStartRevelation=1;
  let c=ctx(p,id,1,{rootActionId:'159-yes'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus,4);
  const n=fixture(['aug-159']);const nid=recoveredOwn(n.run,n.p,1,'159-r-no');scopedSeerState(n.run,n.p).turnStartRevelation=0;c=ctx(n.p,nid,1,{rootActionId:'159-no'});applySeerRuntime(n.run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus||0,0);
});

test('aug-160 activation/recovery strengthen paths share one +3 once-per-turn claim',()=>{
  const {run,p}=fixture(['aug-160']);const id=recoveredOwn(run,p,1,'160-r'),s=scopedSeerState(run,p);s.aug160ActivationTurn=run.combat.turn;
  const c=ctx(p,id,1,{rootActionId:'160-use'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus,3);
  const c2=ctx(p,remaining(run,p,2),2,{rootActionId:'160-second'});applySeerRuntime(run,'CARD_VALIDATED',c2);assert.equal(c2.resolved.seerRuntimeBonus||0,0);
});

test('aug-161 recovers same eligible ally BASE physical ID and rejects selected/submitted/temporary/special/no-target',()=>{
  const {run,p}=fixture(['aug-161']);const ally=run.players[1],id=moveToSpent(run,ally,2);p.publicResources.revelation=1;
  const e=activateImmediateCharacterSkill(run,p,{target_player_id:'p1'});assert.equal(e.recoveredCardId,id);assert.ok(priv(run,ally).remainingCardIds.includes(id));
  for(const mode of ['selected','submitted','temporary','special']){
    const x=fixture(['aug-161']),a=x.run.players[1],cid=moveToSpent(x.run,a,2);x.p.publicResources.revelation=1;
    if(mode==='selected')priv(x.run,a).selectedCardId=cid;
    if(mode==='submitted')x.run.combat.turnSubmissions.p1={playerId:'p1',cardInstanceId:cid};
    if(mode==='temporary')card(x.run,a,2).tags=['TEMPORARY'];
    if(mode==='special')card(x.run,a,2).tags=['SPECIAL'];
    assert.throws(()=>activateImmediateCharacterSkill(x.run,x.p,{target_player_id:'p1'}),/복구|대상|카드/);
  }
  const n=fixture(['aug-161']);n.p.publicResources.revelation=1;assert.throws(()=>activateImmediateCharacterSkill(n.run,n.p,{target_player_id:'p1'}),/복구|대상|카드/);
});

test('aug-162 ally recovery selector exposes two eligible candidates and selected physical ID wins',()=>{
  const {run,p}=fixture(['aug-161','aug-162']);const ally=run.players[1],a=moveToSpent(run,ally,1),b=moveToSpent(run,ally,2);p.publicResources.revelation=1;
  const e=activateImmediateCharacterSkill(run,p,{target_player_id:'p1',ally_recover_card_id:a});assert.equal(e.recoveredCardId,a);
  assert.deepEqual(new Set(priv(run,p).seerRecoveryCandidates.candidateIds),new Set([a,b]));
});

test('aug-163 ally recovery chains exactly one eligible own BASE recovery per cycle',()=>{
  const {run,p}=fixture(['aug-161','aug-163']);const own=moveToSpent(run,p,3),ally=run.players[1];moveToSpent(run,ally,1);p.publicResources.revelation=1;
  activateImmediateCharacterSkill(run,p,{target_player_id:'p1'});assert.ok(priv(run,p).remainingCardIds.includes(own));
  const n=fixture(['aug-161','aug-163']);moveToSpent(n.run,n.run.players[1],1);n.p.publicResources.revelation=1;activateImmediateCharacterSkill(n.run,n.p,{target_player_id:'p1'});assert.equal(priv(n.run,n.p).spentCardIds.length,0);
});

test('aug-164 recovered ally card next valid use gains +2 and invalid use gains none',()=>{
  const {run,p}=fixture(['aug-164']);const ally=run.players[1],id=recoveredAlly(run,p,ally,2,{root:'164-r'});
  let c=ctx(ally,id,2,{rootActionId:'164-valid'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus,2);
  const n=fixture(['aug-164']),na=n.run.players[1],nid=recoveredAlly(n.run,n.p,na,2,{root:'164-r-no'});c=ctx(na,nid,2,{valid:false,rootActionId:'164-invalid'});applySeerRuntime(n.run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus||0,0);
});

test('aug-165 recovered ally valid card refunds one Revelation once/combat',()=>{
  const {run,p}=fixture(['aug-165']);p.publicResources.revelation=0;const ally=run.players[1],id=recoveredAlly(run,p,ally,2,{root:'165-r'});
  applySeerRuntime(run,'CARD_VALIDATED',ctx(ally,id,2,{rootActionId:'165-u1'}));assert.equal(p.publicResources.revelation,1);
  p.publicResources.revelation=0;const id2=recoveredAlly(run,p,ally,3,{root:'165-r2'});applySeerRuntime(run,'CARD_VALIDATED',ctx(ally,id2,3,{rootActionId:'165-u2'}));assert.equal(p.publicResources.revelation,0);
});

test('aug-166 recovered ally number shift applies once per cycle before collision',()=>{
  const {run,p}=fixture(['aug-166']);const ally=run.players[1],id=recoveredAlly(run,p,ally,2,{root:'166-r1',skillData:{ally_number_delta:1}});
  let c=ctx(ally,id,2,{rootActionId:'166-u1'});applySeerRuntime(run,'PRE_COLLISION_SELF_MODIFY',c);assert.equal(c.resolved.finalNumber,3);
  const id2=recoveredAlly(run,p,ally,3,{root:'166-r2',skillData:{ally_number_delta:1}});c=ctx(ally,id2,3,{rootActionId:'166-u2'});applySeerRuntime(run,'PRE_COLLISION_SELF_MODIFY',c);assert.equal(c.resolved.finalNumber,3);
});

test('aug-167 successful ally recovery increments sharedForesight once/turn and self recovery does not',()=>{
  const {run,p}=fixture(['aug-167']);const ally=run.players[1];recoveredAlly(run,p,ally,1,{root:'167-a'});assert.equal(scopedSeerState(run,p).sharedForesight,1);
  recoveredAlly(run,p,ally,2,{root:'167-b'});assert.equal(scopedSeerState(run,p).sharedForesight,1);
  const n=fixture(['aug-167']);recoveredOwn(n.run,n.p,1,'167-self');assert.equal(scopedSeerState(n.run,n.p).sharedForesight,0);
});

test('aug-168 one Revelation recovers one card from two different allies once/combat',()=>{
  const {run,p}=fixture(['aug-161','aug-168']);moveToSpent(run,run.players[1],1);moveToSpent(run,run.players[2],2);p.publicResources.revelation=1;
  const e=activateImmediateCharacterSkill(run,p,{target_player_ids:['p1','p2']});assert.equal(e.recoveredCount,2);assert.deepEqual(new Set(e.recoveredPlayerIds),new Set(['p1','p2']));
  p.publicResources.revelation=1;moveToSpent(run,run.players[1],2);moveToSpent(run,run.players[2],3);
  const e2=activateImmediateCharacterSkill(run,p,{target_player_ids:['p1','p2']});assert.equal(e2.recoveredCount,1);
});

test('aug-169 chosen ally recovery card gets first-valid +1 and retry does not duplicate',()=>{
  const {run,p}=fixture(['aug-161','aug-169']);const ally=run.players[1],a=moveToSpent(run,ally,1),b=moveToSpent(run,ally,2);p.publicResources.revelation=1;
  const e=activateImmediateCharacterSkill(run,p,{target_player_id:'p1',ally_recover_card_id:b});assert.equal(e.recoveredCardId,b);assert.ok(priv(run,p).seerRecoveryCandidates.candidateIds.includes(a));
  let c=ctx(ally,b,2,{rootActionId:'169-use'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus,1);
  c=ctx(ally,b,2,{rootActionId:'169-use'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus||0,0);
});

test('aug-170 recovered ally valid card gives ally +2 and owner next valid +2 once per Revelation',()=>{
  const {run,p}=fixture(['aug-170']);const ally=run.players[1],id=recoveredAlly(run,p,ally,2,{root:'170-r'});
  let c=ctx(ally,id,2,{rootActionId:'170-ally'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus,2);
  const owner=ctx(p,remaining(run,p,1),1,{rootActionId:'170-owner'});applySeerRuntime(run,'BEFORE_DAMAGE',owner);assert.equal(owner.damage.amount,3);
  const owner2=ctx(p,remaining(run,p,2),2,{rootActionId:'170-owner2'});applySeerRuntime(run,'BEFORE_DAMAGE',owner2);assert.equal(owner2.damage.amount,2);
});

test('aug-171 schedules next-turn prediction with origin/expiry and resolves once; combat end clears it',()=>{
  const {run,p}=fixture(['aug-171']);p.publicResources.revelation=1;const e=activateImmediateCharacterSkill(run,p,{prediction:{type:'NO_COLLISION'}});
  const s=scopedSeerState(run,p);assert.equal(e.predictionId,s.prediction.id);assert.equal(s.prediction.originCombatId,run.combat.id);assert.equal(s.prediction.originRoomId,run.currentRoomNodeId);assert.equal(s.prediction.expiryTurn,2);
  run.combat.turn=2;const c=ctx(p,remaining(run,p,1),1,{cards:[{playerId:'p0',valid:true,finalNumber:1},{playerId:'p1',valid:true,finalNumber:2}],rootActionId:'171-resolve'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(s.prediction.status,'CONSUMED');assert.equal(s.foresight,1);
  applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(s.foresight,1);
  applySeerRuntime(run,'COMBAT_END',{player:p});assert.equal(run.augmentFramework.cardState['p0:seer'],undefined);
});

test('aug-172 correct collision prediction creates one owner next-valid +1 buff; failed prediction creates none',()=>{
  const {run,p}=fixture(['aug-171','aug-172']);run.combat.turn=2;arm(run,p,{type:'COLLISION'});
  const c=ctx(p,remaining(run,p,2),2,{cards:[{playerId:'p0',valid:true,finalNumber:2},{playerId:'p1',valid:false,finalNumber:1,invalidReason:'COLLISION'}],rootActionId:'172-hit'});applySeerRuntime(run,'CARD_VALIDATED',c);
  const d=ctx(p,remaining(run,p,3),3,{rootActionId:'172-dmg'});applySeerRuntime(run,'BEFORE_DAMAGE',d);assert.equal(d.damage.amount,5);assert.ok(d.resolved.seerModifierIds.includes('aug-172'));assert.ok(d.resolved.seerModifierIds.includes('aug-171'));
  const n=fixture(['aug-171','aug-172']);n.run.combat.turn=2;arm(n.run,n.p,{type:'COLLISION'});const nc=ctx(n.p,remaining(n.run,n.p,2),2,{cards:[{playerId:'p0',valid:true,finalNumber:2},{playerId:'p1',valid:true,finalNumber:1}],rootActionId:'172-miss'});applySeerRuntime(n.run,'CARD_VALIDATED',nc);assert.equal((n.run.augmentFramework?.seer?.buffs||[]).length,0);
});

test('aug-173 no-collision prediction with at least two valid players adds +1; insufficient valid count adds none',()=>{
  const {run,p}=fixture(['aug-171','aug-173']);run.combat.turn=2;arm(run,p,{type:'NO_COLLISION'});
  let c=ctx(p,remaining(run,p,2),2,{cards:[{playerId:'p0',valid:true,finalNumber:2},{playerId:'p1',valid:true,finalNumber:1}],rootActionId:'173-hit'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus,1);
  const n=fixture(['aug-171','aug-173']);n.run.combat.turn=2;arm(n.run,n.p,{type:'NO_COLLISION'});c=ctx(n.p,remaining(n.run,n.p,2),2,{cards:[{playerId:'p0',valid:true,finalNumber:2}],rootActionId:'173-no'});applySeerRuntime(n.run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus||0,0);
});

test('aug-174 declared number matching Seer final valid number adds +1; mismatch adds none',()=>{
  const {run,p}=fixture(['aug-171','aug-174']);run.combat.turn=2;arm(run,p,{type:'NUMBER_VALID',number:3});
  let c=ctx(p,remaining(run,p,3),3,{cards:[{playerId:'p0',valid:true,finalNumber:3}],rootActionId:'174-hit'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus,1);
  const n=fixture(['aug-171','aug-174']);n.run.combat.turn=2;arm(n.run,n.p,{type:'NUMBER_VALID',number:3});c=ctx(n.p,remaining(n.run,n.p,2),2,{cards:[{playerId:'p0',valid:true,finalNumber:2}],rootActionId:'174-miss'});applySeerRuntime(n.run,'CARD_VALIDATED',c);assert.equal(c.resolved.seerRuntimeBonus||0,0);
});

test('aug-175 consecutive successful predictions build foresightStreak and failure resets it',()=>{
  const {run,p}=fixture(['aug-171','aug-175']);run.combat.turn=2;arm(run,p,{type:'NO_COLLISION'});
  let c=ctx(p,remaining(run,p,1),1,{cards:[{playerId:'p0',valid:true,finalNumber:1}],rootActionId:'175-1'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(scopedSeerState(run,p).foresightStreak,1);assert.equal(c.resolved.seerRuntimeBonus,1);
  run.combat.turn=3;arm(run,p,{type:'COLLISION'});c=ctx(p,remaining(run,p,2),2,{cards:[{playerId:'p0',valid:true,finalNumber:2}],rootActionId:'175-fail'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(scopedSeerState(run,p).foresightStreak,0);
});

test('aug-176 exact living-player number prediction grants Revelation 3 once/combat and rejects invalid target declaration',()=>{
  const {run,p}=fixture(['aug-171','aug-176']);run.combat.turn=2;p.publicResources.revelation=0;arm(run,p,{type:'EXACT_PLAYER_NUMBER',number:2,targetPlayerId:'p1'});
  let c=ctx(p,remaining(run,p,1),1,{cards:[{playerId:'p0',valid:true,finalNumber:1},{playerId:'p1',valid:true,finalNumber:2}],rootActionId:'176-hit'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(p.publicResources.revelation,3);
  p.publicResources.revelation=0;run.combat.turn=3;arm(run,p,{type:'EXACT_PLAYER_NUMBER',number:3,targetPlayerId:'p1'});c=ctx(p,remaining(run,p,1),1,{cards:[{playerId:'p1',valid:true,finalNumber:3}],rootActionId:'176-second'});applySeerRuntime(run,'CARD_VALIDATED',c);assert.equal(p.publicResources.revelation,0);
  const n=fixture(['aug-171','aug-176']);n.p.publicResources.revelation=1;assert.throws(()=>activateImmediateCharacterSkill(n.run,n.p,{prediction:{type:'EXACT_PLAYER_NUMBER',number:2,target_player_id:'missing'}}),/예언|prediction/);
});

test('aug-177 only explicit prediction inspection exposes READY selected number to owner and not target/other; no READY gives none',()=>{
  const {run,p}=fixture(['aug-171','aug-177']);p.publicResources.revelation=1;submitCard(run,'p1',remaining(run,run.players[1],4));
  activateImmediateCharacterSkill(run,p,{prediction:{type:'COLLISION'}});
  assert.equal(projectRun(run,'p0').privateCombat.revelationPeek.selectedNumber,4);
  assert.equal(projectRun(run,'p1').privateCombat?.revelationPeek,undefined);assert.equal(projectRun(run,'p2').privateCombat?.revelationPeek,undefined);
  const n=fixture(['aug-171','aug-177']);n.p.publicResources.revelation=1;activateImmediateCharacterSkill(n.run,n.p,{prediction:{type:'COLLISION'}});assert.equal(projectRun(n.run,'p0').privateCombat?.revelationPeek,undefined);
});

test('aug-178 high prediction success sets foresight 3 and grants each living player next-valid +1 once/combat',()=>{
  const {run,p}=fixture(['aug-171','aug-178']);run.combat.turn=2;arm(run,p,{type:'EXACT_PLAYER_NUMBER',number:2,targetPlayerId:'p1'});
  const c=ctx(p,remaining(run,p,1),1,{cards:[{playerId:'p0',valid:true,finalNumber:1},{playerId:'p1',valid:true,finalNumber:2}],rootActionId:'178-hit'});applySeerRuntime(run,'CARD_VALIDATED',c);
  assert.equal(scopedSeerState(run,p).foresight,3);const buffs=run.augmentFramework.seer.buffs.filter(x=>x.sourceAugmentId==='aug-178');assert.equal(buffs.length,4);assert.ok(buffs.every(x=>x.amount===1&&x.uses===1));
});

test('aug-179 third consecutive prediction success grants every living player one +2 next-valid buff',()=>{
  const {run,p}=fixture(['aug-171','aug-175','aug-179']);run.combat.turn=2;const s=scopedSeerState(run,p);s.foresightStreak=2;arm(run,p,{type:'NO_COLLISION'});
  const c=ctx(p,remaining(run,p,1),1,{cards:[{playerId:'p0',valid:true,finalNumber:1},{playerId:'p1',valid:true,finalNumber:2}],rootActionId:'179-hit'});applySeerRuntime(run,'CARD_VALIDATED',c);
  assert.equal(s.foresightStreak,3);const buffs=run.augmentFramework.seer.buffs.filter(x=>x.sourceAugmentId==='aug-179');assert.equal(buffs.length,4);assert.ok(buffs.every(x=>x.amount===2));
  const n=fixture(['aug-171','aug-175','aug-179']);n.run.combat.turn=2;arm(n.run,n.p,{type:'NO_COLLISION'});applySeerRuntime(n.run,'CARD_VALIDATED',ctx(n.p,remaining(n.run,n.p,1),1,{cards:[{playerId:'p0',valid:true,finalNumber:1}],rootActionId:'179-no'}));assert.equal((n.run.augmentFramework?.seer?.buffs||[]).filter(x=>x.sourceAugmentId==='aug-179').length,0);
});

test('aug-180 third distinct prediction type grants all players EXP +2 and owner next-valid +4 once/combat',()=>{
  const {run,p}=fixture(['aug-171','aug-180']);run.combat.turn=2;const s=scopedSeerState(run,p);s.predictionSuccessTypes=['COLLISION','NO_COLLISION'];arm(run,p,{type:'NUMBER_VALID',number:1});
  const before=run.players.map(x=>x.growthExp);const c=ctx(p,remaining(run,p,1),1,{cards:[{playerId:'p0',valid:true,finalNumber:1}],rootActionId:'180-hit'});applySeerRuntime(run,'CARD_VALIDATED',c);
  assert.deepEqual(run.players.map((x,i)=>x.growthExp-before[i]),[2,2,2,2]);const d=ctx(p,remaining(run,p,2),2,{rootActionId:'180-dmg'});applySeerRuntime(run,'BEFORE_DAMAGE',d);assert.equal(d.damage.amount,7);assert.ok(d.resolved.seerModifierIds.includes('aug-180'));assert.ok(d.resolved.seerModifierIds.includes('aug-171'));
  const n=fixture(['aug-171','aug-180']);n.run.combat.turn=2;scopedSeerState(n.run,n.p).predictionSuccessTypes=['COLLISION'];arm(n.run,n.p,{type:'NUMBER_VALID',number:1});const nb=n.run.players.map(x=>x.growthExp);applySeerRuntime(n.run,'CARD_VALIDATED',ctx(n.p,remaining(n.run,n.p,1),1,{cards:[{playerId:'p0',valid:true,finalNumber:1}],rootActionId:'180-no'}));assert.deepEqual(n.run.players.map((x,i)=>x.growthExp-nb[i]),[0,0,0,0]);
});

test('005C-A telemetry is fire-based and carries augmentId/triggerCount/successCount for actual effects',()=>{
  const {run,p}=fixture(['aug-151']);const id=recoveredOwn(run,p,1,'telemetry-r');applySeerRuntime(run,'CARD_VALIDATED',ctx(p,id,1,{rootActionId:'telemetry-u'}));
  const rows=telemetry(run,'aug-151');assert.ok(rows.length>0);assert.ok(rows.every(x=>x.augmentId==='aug-151'&&x.triggerCount===1&&[0,1].includes(x.successCount)));
});

test('005C-A COMBAT_END removes prediction, private inspection, provenance, buffs and Seer once ledger without deleting ownership',()=>{
  const {run,p}=fixture(['aug-151','aug-171','aug-177']);const id=recoveredOwn(run,p,1,'cleanup-r');priv(run,p).revelationPeek={turn:1,targetPlayerId:'p1',selectedNumber:4};
  scopedSeerState(run,p).prediction={id:'cleanup-pred',status:'ARMED',targetTurn:2,originCombatId:run.combat.id,originRoomId:run.currentRoomNodeId};run.augmentFramework.seer.buffs.push({sourceAugmentId:'aug-171',targetId:'p0',uses:1,combatId:run.combat.id});
  applySeerRuntime(run,'COMBAT_END',{player:p});assert.equal(run.augmentFramework.cardState['p0:seer'],undefined);assert.equal(priv(run,p).revelationPeek,undefined);assert.equal(run.augmentFramework.seer.recoveredCards[id],undefined);assert.equal(run.augmentFramework.seer.buffs.length,0);assert.ok(p.augments.includes('aug-151'));
});
