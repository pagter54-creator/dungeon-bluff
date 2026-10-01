import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {applyKnight} from '../supabase/functions/game-api/pve/knight-runtime.js';
import {applyOwnedEffects} from '../supabase/functions/game-api/pve/effects.js';
import {onCycleStartCharacter,resolveGuardianWallCollisions} from '../supabase/functions/game-api/pve/characters.js';
import {applyMonsterDamage} from '../supabase/functions/game-api/pve/monster.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';

function fixture(augments=[]){
  const ids=['warrior','adventurer','adventurer','adventurer'];
  const players=ids.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  players[0].augments=[...augments];
  const run={id:'knight-005b-b',seed:'knight-seed',rngCounter:0,version:1,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});
  run.combat.id='knight-combat';run.combat.turn=1;
  return {run,p:players[0],priv:run.combat.privateByPlayer.p0};
}
const crush=(count=1,finalNumber=5)=>({playerId:'p0',cardInstanceId:'p0:base:4',finalNumber,valid:true,collisionImmune:true,crushedCardCount:count,crushedCardIds:Array.from({length:count},(_,i)=>'other:'+i),collisionEventId:'collision'});
const guardResolved=(targetId='p1')=>({playerId:'p0',cardInstanceId:'p0:base:2',finalNumber:3,valid:false,invalidReason:'COLLISION',guardianSacrifice:true,guardianRescueTargetId:targetId});

test('Knight registry is exactly aug-031..060 executable with 1/3/3/3 stage progression per archetype',()=>{
  const ids=Array.from({length:30},(_,i)=>'aug-'+String(i+31).padStart(3,'0'));
  assert.deepEqual(ids.filter(id=>AUGMENT_BY_ID[id]?.executable===true),ids);
  for(const build of ['불굴의 기사','수호벽','압살 기사']){
    const defs=ids.map(id=>AUGMENT_BY_ID[id]).filter(x=>x.build===build);
    assert.equal(defs.length,10);
    assert.deepEqual([1,2,3,4].map(t=>defs.filter(x=>x.tier===t).length),[1,3,3,3]);
  }
  assert.equal(augmentCandidates('warrior',1).filter(x=>x.executable).length,3);
});

test('aug-031 raises Toughness cap and Unyielding prevents the next direct damage',()=>{
  const {run,p}=fixture(['aug-031']);
  applyOwnedEffects(run,'COMBAT_START',{player:p});
  assert.equal(p.publicResources.toughnessChargesMax,3);
  applyOwnedEffects(run,'CARD_VALIDATED',{player:p,resolved:{valid:true,collisionImmune:true,collisionGroupSize:2}});
  p.hp=3;const ev=applyMonsterDamage(run,p,1,'DIRECT');
  assert.equal(ev.find(x=>x.type==='PLAYER_DAMAGED').actualDamage,0);
});
test('aug-032 grants one Toughness at combat start without exceeding effective cap',()=>{
  const {run,p}=fixture(['aug-031','aug-032']);p.publicResources.toughnessChargesMax=3;p.publicResources.toughnessCharges=1;
  applyKnight(run,'COMBAT_START',{player:p});assert.equal(p.publicResources.toughnessCharges,2);
});
test('aug-033 reduces the first direct hit on a Toughness-use turn',()=>{
  const {run,p,priv}=fixture(['aug-033']);const submission={skillIntent:true};
  applyKnight(run,'ON_SKILL_USE',{player:p,submission,privateState:priv});
  const ev=applyMonsterDamage(run,p,2,'DIRECT');assert.equal(ev.find(x=>x.type==='PLAYER_DAMAGED').actualDamage,1);
});
test('aug-034 refunds Toughness after a real crush once per cycle',()=>{
  const {run,p,priv}=fixture(['aug-034']);p.publicResources.toughnessCharges=0;
  applyKnight(run,'POST_COLLISION',{player:p,resolved:crush(),submission:{skillIntent:true},privateState:priv});
  assert.equal(p.publicResources.toughnessCharges,1);
});
test('aug-035 refunds Toughness when a legal use finds no collision',()=>{
  const {run,p,priv}=fixture(['aug-035']);p.publicResources.toughnessCharges=0;
  applyKnight(run,'POST_COLLISION',{player:p,resolved:{valid:true,collisionImmune:true},submission:{skillIntent:true},privateState:priv});
  assert.equal(p.publicResources.toughnessCharges,1);
});
test('aug-036 arms exactly one later valid attack for +1 damage',()=>{
  const {run,p,priv}=fixture(['aug-036']);applyKnight(run,'POST_COLLISION',{player:p,resolved:crush(),submission:{skillIntent:true},privateState:priv});
  run.combat.turn=2;const resolved={valid:true,finalNumber:3};applyKnight(run,'CARD_VALIDATED',{player:p,resolved,privateState:priv});
  const damage={amount:3};applyKnight(run,'BEFORE_DAMAGE',{player:p,resolved,damage});assert.equal(damage.amount,4);
});
test('aug-037 triggers only on the first actual 2+ to 1 HP transition',()=>{
  const {run,p}=fixture(['aug-037']);p.publicResources.toughnessCharges=0;
  applyKnight(run,'PLAYER_DAMAGED',{player:p,hpBefore:2,hpAfter:1,damage:{amount:1}});assert.equal(p.publicResources.toughnessCharges,1);
  p.publicResources.toughnessCharges=0;applyKnight(run,'PLAYER_DAMAGED',{player:p,hpBefore:2,hpAfter:1,damage:{amount:1}});assert.equal(p.publicResources.toughnessCharges,0);
});
test('aug-038 marks the first legal Toughness activation in a cycle as free',()=>{
  const {run,p,priv}=fixture(['aug-038']);p.publicResources.toughnessCharges=0;const submission={skillIntent:true};
  applyKnight(run,'ON_SKILL_USE',{player:p,submission,privateState:priv});assert.equal(submission.knightFreeToughness,true);assert.equal(priv.knightToughnessFreeUsedCycle,1);
});
test('aug-039 grants a one-shot direct-damage reduction after a crush',()=>{
  const {run,p,priv}=fixture(['aug-039']);applyKnight(run,'POST_COLLISION',{player:p,resolved:crush(),submission:{skillIntent:true},privateState:priv});
  const ev=applyMonsterDamage(run,p,1,'DIRECT');assert.equal(ev.find(x=>x.type==='PLAYER_DAMAGED').actualDamage,0);
});
test('aug-040 pays +1 after the next cycle base recharge',()=>{
  const {run,p,priv}=fixture(['aug-040']);p.publicResources.toughnessCharges=1;
  applyKnight(run,'CYCLE_END',{player:p,privateState:priv});p.publicResources.toughnessCharges=0;priv.cycleIndex=2;onCycleStartCharacter(p,priv);
  assert.equal(p.publicResources.toughnessCharges,2);
});
test('aug-041 rescues the earliest same-number ally deterministically',()=>{
  const {run,p}=fixture(['aug-041']);run.combat.turnSubmissions={p0:{skillIntent:true},p1:{skillIntent:false},p2:{skillIntent:false}};
  const cards=[{playerId:'p0',invalidReason:'COLLISION',valid:false},{playerId:'p1',invalidReason:'COLLISION',valid:false},{playerId:'p2',invalidReason:'COLLISION',valid:false}];
  resolveGuardianWallCollisions(run,cards,new Map([[3,cards]]),[]);
  assert.equal(cards[1].valid,true);assert.equal(p.publicResources.guardianTargetPlayerId,'p1');
});
test('aug-042 reduces the first damage actually redirected by Guardian Wall',()=>{
  const {run,p}=fixture(['aug-041','aug-042']);p.publicResources.guardianTargetPlayerId='p1';p.hp=3;
  const ev=applyMonsterDamage(run,run.players[1],2,'DIRECT');assert.equal(ev.find(x=>x.type==='PLAYER_DAMAGED').playerId,'p0');assert.equal(p.hp,2);
});
test('aug-043 marks the guarded ally and strengthens its next valid attack',()=>{
  const {run,p,priv}=fixture(['aug-041','aug-043']);applyKnight(run,'POST_COLLISION',{player:p,resolved:guardResolved(),submission:{skillIntent:true},privateState:priv});
  const target=run.players[1],resolved={valid:true},damage={amount:2};applyKnight(run,'BEFORE_DAMAGE',{player:target,resolved,damage});assert.equal(damage.amount,3);
});
test('aug-044 reserves one next-cycle Toughness after a successful guard',()=>{
  const {run,p,priv}=fixture(['aug-041','aug-044']);applyKnight(run,'POST_COLLISION',{player:p,resolved:guardResolved(),submission:{skillIntent:true},privateState:priv});
  p.publicResources.toughnessCharges=0;priv.cycleIndex=2;onCycleStartCharacter(p,priv);assert.equal(p.publicResources.toughnessCharges,2);
});
test('aug-045 recovers the exact sacrificed physical cardInstanceId',()=>{
  const {run,p,priv}=fixture(['aug-041','aug-045']);const id='p0:base:2';
  applyKnight(run,'POST_COLLISION',{player:p,resolved:{...guardResolved(),cardInstanceId:id},submission:{skillIntent:true},privateState:priv});
  priv.remainingCardIds=priv.remainingCardIds.filter(x=>x!==id);priv.spentCardIds.push(id);
  applyKnight(run,'TURN_END',{player:p,privateState:priv});assert.ok(priv.remainingCardIds.includes(id));assert.ok(!priv.spentCardIds.includes(id));
});
test('aug-046 honors an explicit legal guard target in Combat and otherwise remains deterministic',()=>{
  const {run}=fixture(['aug-041','aug-046']);run.combat.turnSubmissions={p0:{skillIntent:true,skillData:{targetPlayerId:'p2'}},p1:{},p2:{}};
  const cards=[{playerId:'p0',invalidReason:'COLLISION',valid:false},{playerId:'p1',invalidReason:'COLLISION',valid:false},{playerId:'p2',invalidReason:'COLLISION',valid:false}];
  resolveGuardianWallCollisions(run,cards,new Map([[3,cards]]),[]);assert.equal(cards[2].valid,true);
});
test('aug-047 arms a one-shot reduction when redirected damage leaves the Knight at HP 1',()=>{
  const {run,p}=fixture(['aug-041','aug-047']);p.publicResources.guardianTargetPlayerId='p1';p.hp=3;
  applyMonsterDamage(run,run.players[1],2,'DIRECT');assert.equal(p.hp,1);
  const ev=applyMonsterDamage(run,p,1,'DIRECT');assert.equal(ev.find(x=>x.type==='PLAYER_DAMAGED').actualDamage,0);
});
test('aug-048 lets one Guardian sacrifice rescue up to two allies in Combat',()=>{
  const {run}=fixture(['aug-041','aug-048']);run.combat.turnSubmissions={p0:{skillIntent:true},p1:{},p2:{},p3:{}};
  const cards=['p0','p1','p2','p3'].map(playerId=>({playerId,invalidReason:'COLLISION',valid:false}));
  const n=resolveGuardianWallCollisions(run,cards,new Map([[3,cards]]),[]);assert.equal(n,2);assert.deepEqual(cards.filter(x=>x.valid).map(x=>x.playerId),['p1','p2']);
});
test('aug-049 keeps exactly one follow-up redirect after the base redirect',()=>{
  const {run,p}=fixture(['aug-041','aug-049']);p.publicResources.guardianTargetPlayerId='p1';
  run.augmentFramework={once:{},statuses:[{statusId:'GUARDIAN_EXTRA_REDIRECT',sourceType:'AUGMENT',sourceId:'aug-049',ownerId:'p0',targetId:'p1',stacks:1,cap:1,payload:{ready:false},resetScope:'COMBAT',visibility:'PUBLIC'}],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};
  assert.equal(applyMonsterDamage(run,run.players[1],1,'DIRECT').find(x=>x.type==='PLAYER_DAMAGED').playerId,'p0');
  assert.equal(applyMonsterDamage(run,run.players[1],1,'DIRECT').find(x=>x.type==='PLAYER_DAMAGED').playerId,'p0');
  assert.equal(applyMonsterDamage(run,run.players[1],1,'DIRECT').find(x=>x.type==='PLAYER_DAMAGED').playerId,'p1');
});
test('aug-050 prevents lethal redirected damage before DOWN_RESOLVE and protects living allies',()=>{
  const {run,p}=fixture(['aug-041','aug-050']);p.publicResources.guardianTargetPlayerId='p1';p.hp=1;
  applyMonsterDamage(run,run.players[1],2,'DIRECT');assert.equal(p.hp,1);assert.ok(!run.combat.pendingDownPlayerIds.includes('p0'));
  const ev=applyMonsterDamage(run,run.players[2],1,'DIRECT');assert.equal(ev.find(x=>x.type==='PLAYER_DAMAGED').actualDamage,0);
});
test('aug-051 runtime contract remains executable and captures removed-card damage from actual collision results',()=>{
  const def=AUGMENT_BY_ID['aug-051'];assert.equal(def.executable,true);assert.equal(def.config.crushDamagePerCard,1);assert.equal(def.config.crushDamageCap,2);
});
test('aug-052 is registered as pre-mitigation penetration rather than incoming-damage reduction',()=>{
  const def=AUGMENT_BY_ID['aug-052'];assert.equal(def.executable,true);assert.match(def.tooltip,/방어 1을 무시/);
});
test('aug-053 adds +1 only to a FINAL_NUMBER 5 crush',()=>{
  const {run,p,priv}=fixture(['aug-053']);const resolved=crush(1,5);applyKnight(run,'POST_COLLISION',{player:p,resolved,submission:{skillIntent:true},privateState:priv});
  const damage={amount:5};applyKnight(run,'BEFORE_DAMAGE',{player:p,resolved,damage});assert.equal(damage.amount,6);
});
test('aug-054 refunds one Toughness after a successful crush',()=>{
  const {run,p,priv}=fixture(['aug-054']);p.publicResources.toughnessCharges=0;applyKnight(run,'POST_COLLISION',{player:p,resolved:crush(),submission:{skillIntent:true},privateState:priv});assert.equal(p.publicResources.toughnessCharges,1);
});
test('aug-055 adds +3 when one crush actually removes at least two opposing cards',()=>{
  const {run,p,priv}=fixture(['aug-055']);const resolved=crush(2);applyKnight(run,'POST_COLLISION',{player:p,resolved,submission:{skillIntent:true},privateState:priv});
  const damage={amount:5};applyKnight(run,'BEFORE_DAMAGE',{player:p,resolved,damage});assert.equal(damage.amount,8);
});
test('aug-056 arms one later valid attack after a crush',()=>{
  const {run,p,priv}=fixture(['aug-056']);applyKnight(run,'POST_COLLISION',{player:p,resolved:crush(),submission:{skillIntent:true},privateState:priv});
  run.combat.turn=2;const resolved={valid:true};applyKnight(run,'CARD_VALIDATED',{player:p,resolved,privateState:priv});const damage={amount:2};applyKnight(run,'BEFORE_DAMAGE',{player:p,resolved,damage});assert.equal(damage.amount,3);
});
test('aug-057 arms at max unused Toughness and consumes on the next crush',()=>{
  const {run,p,priv}=fixture(['aug-057']);p.publicResources.toughnessCharges=2;applyKnight(run,'TURN_END',{player:p,privateState:priv});
  p.publicResources.toughnessCharges=0;const resolved=crush();applyKnight(run,'POST_COLLISION',{player:p,resolved,submission:{skillIntent:true},privateState:priv});
  const damage={amount:5};applyKnight(run,'BEFORE_DAMAGE',{player:p,resolved,damage});assert.equal(p.publicResources.toughnessCharges,1);assert.equal(damage.amount,6);
});
test('aug-058 adds +2 per actually crushed card up to +4',()=>{
  const {run,p,priv}=fixture(['aug-058']);const resolved=crush(3);applyKnight(run,'POST_COLLISION',{player:p,resolved,submission:{skillIntent:true},privateState:priv});
  const damage={amount:5};applyKnight(run,'BEFORE_DAMAGE',{player:p,resolved,damage});assert.equal(damage.amount,9);
});
test('aug-059 removes one enemy defense unit on a two-card crush once per combat',()=>{
  const {run,p,priv}=fixture(['aug-059']);run.combat.monster.defense=2;applyKnight(run,'POST_COLLISION',{player:p,resolved:crush(2),submission:{skillIntent:true},privateState:priv});assert.equal(run.combat.monster.defense,1);
  applyKnight(run,'POST_COLLISION',{player:p,resolved:crush(2),submission:{skillIntent:true},privateState:priv});assert.equal(run.combat.monster.defense,1);
});
test('aug-060 gains Advance on crush, applies it immediately, then decays after a normal valid attack',()=>{
  const {run,p,priv}=fixture(['aug-060']);const first=crush();applyKnight(run,'POST_COLLISION',{player:p,resolved:first,submission:{skillIntent:true},privateState:priv});
  let damage={amount:5};applyKnight(run,'BEFORE_DAMAGE',{player:p,resolved:first,damage});assert.equal(damage.amount,6);
  run.combat.turn=2;const normal={valid:true,finalNumber:3};applyKnight(run,'CARD_VALIDATED',{player:p,resolved:normal,privateState:priv});damage={amount:3};applyKnight(run,'BEFORE_DAMAGE',{player:p,resolved:normal,damage});assert.equal(damage.amount,4);
  applyKnight(run,'AFTER_DAMAGE',{player:p,resolved:normal,damage});const again={valid:true,finalNumber:2};applyKnight(run,'CARD_VALIDATED',{player:p,resolved:again,privateState:priv});damage={amount:2};applyKnight(run,'BEFORE_DAMAGE',{player:p,resolved:again,damage});assert.equal(damage.amount,2);
});

test('combat-only Knight bonuses do not leak into Event while 038/044/045 remain room-capable',()=>{
  const {run,p,priv}=fixture(['aug-038','aug-053','aug-055']);run.phase='EVENT';const submission={skillIntent:true};applyKnight(run,'ON_SKILL_USE',{player:p,submission,privateState:priv});assert.equal(submission.knightFreeToughness,true);
  const resolved=crush(2,5),damage={amount:5};applyKnight(run,'POST_COLLISION',{player:p,resolved,submission,privateState:priv});applyKnight(run,'BEFORE_DAMAGE',{player:p,resolved,damage});assert.equal(damage.amount,5);
});
