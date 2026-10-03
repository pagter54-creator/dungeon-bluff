import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {
  applyImpPreCollisionSteal,applyImpCardValidated,applyImpBeforeDamage,prepareImpSubmission,
  initializeImpCombat,onImpTurnEnd,scopedImpState,stolenNumberCap,cleanupImpCombat,impTelemetry
} from '../supabase/functions/game-api/pve/imp-runtime.js';

function fixture(augments=[]){
  const ids=['imp','adventurer','warrior','mage'];
  const players=ids.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  players[0].augments=[...augments];
  const run={id:'imp-test',seed:'imp-seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});
  run.combat.id='imp-combat';run.combat.phase='PRE_COLLISION_STEAL';run.combat.turn=1;initializeImpCombat(run,players[0]);
  return {run,p:players[0],players};
}
function cards(run,nums){
  return run.players.map((p,i)=>({playerId:p.playerId,cardInstanceId:p.cardPool[0].id,baseNumber:nums[i],workingNumber:nums[i],finalNumber:nums[i],valid:true}));
}
function actor(cs){return cs[0];}
function steal(run,nums){const cs=cards(run,nums),events=[];applyImpPreCollisionSteal(run,cs,events);return {cs,events,a:actor(cs)};}
function damage(run,p,resolved,base=resolved.finalNumber){const d={amount:base};applyImpBeforeDamage(run,{player:p,resolved,damage:d});return d.amount;}
function validate(run,p,resolved){return applyImpCardValidated(run,{player:p,resolved,cards:[resolved],events:[]});}

test('aug-181 two distinct actual-positive victims grant +2; one victim or zero victim does not',()=>{
  let x=fixture(['aug-181']),r=steal(x.run,[2,2,2,4]);assert.equal(r.a.stealTargetCount,2);assert.equal(damage(x.run,x.p,r.a),r.a.finalNumber+2);
  x=fixture(['aug-181']);r=steal(x.run,[1,1,0,4]);assert.equal(r.a.stealTargetCount,1);assert.equal(damage(x.run,x.p,r.a),r.a.finalNumber);
});
test('aug-182 distinct victim threshold adds exactly +2',()=>{
  let x=fixture(['aug-182']),r=steal(x.run,[2,2,2,4]);assert.equal(damage(x.run,x.p,r.a),r.a.finalNumber+2);
  x=fixture(['aug-182']);r=steal(x.run,[2,2,3,4]);assert.equal(damage(x.run,x.p,r.a),r.a.finalNumber);
});
test('aug-183 valid steal attack creates next-turn first-valid +1 only',()=>{
  const x=fixture(['aug-183']);let r=steal(x.run,[2,2,3,4]);validate(x.run,x.p,r.a);x.run.combat.turn=2;
  let rc={playerId:'p0',finalNumber:3,valid:true,stolenNumberSpent:0};assert.equal(validate(x.run,x.p,rc),1);assert.equal(validate(x.run,x.p,{...rc}),0);
});
test('aug-184 stealing from printed/working 1 or 2 victim adds +1, higher victim does not',()=>{
  let x=fixture(['aug-184']),r=steal(x.run,[1,1,3,4]);assert.equal(damage(x.run,x.p,r.a),r.a.finalNumber+1);
  x=fixture(['aug-184']);r=steal(x.run,[3,3,2,4]);assert.equal(damage(x.run,x.p,r.a),r.a.finalNumber);
});
test('aug-185 total actual stolen >=2 adds +2',()=>{
  let x=fixture(['aug-185']),r=steal(x.run,[2,2,2,4]);assert.equal(r.a.stealTotal,2);assert.equal(damage(x.run,x.p,r.a),r.a.finalNumber+2);
  x=fixture(['aug-185']);r=steal(x.run,[2,2,3,4]);assert.equal(damage(x.run,x.p,r.a),r.a.finalNumber);
});
test('aug-186 post-steal FINAL_NUMBER >=5 adds +2',()=>{
  let x=fixture(['aug-186']),r=steal(x.run,[4,4,2,3]);assert.equal(r.a.finalNumber,5);assert.equal(damage(x.run,x.p,r.a),7);
  x=fixture(['aug-186']);r=steal(x.run,[3,4,2,1]);assert.equal(damage(x.run,x.p,r.a),3);
});
test('aug-187 valid steal attack schedules next-cycle first-valid +2',()=>{
  const x=fixture(['aug-187']);let r=steal(x.run,[2,2,3,4]);validate(x.run,x.p,r.a);
  x.run.combat.privateByPlayer.p0.cycleIndex=2;const rc={playerId:'p0',finalNumber:2,valid:true,stolenNumberSpent:0};assert.equal(validate(x.run,x.p,rc),2);assert.equal(validate(x.run,x.p,{...rc}),0);
});
test('aug-188 complete multi-victim sweep grants each living player one +3 next-valid buff',()=>{
  let x=fixture(['aug-188']),r=steal(x.run,[2,2,2,4]);assert.equal(validate(x.run,x.players[1],{playerId:'p1',finalNumber:1,valid:true}),3);
  x=fixture(['aug-188']);r=steal(x.run,[2,2,3,4]);assert.equal(validate(x.run,x.players[1],{playerId:'p1',finalNumber:1,valid:true}),0);
});
test('aug-189 successful steal stacks greed to cap and adds stack damage',()=>{
  const x=fixture(['aug-189']);let r=steal(x.run,[2,2,3,4]);assert.equal(scopedImpState(x.run,x.p).greed,1);assert.equal(damage(x.run,x.p,r.a),r.a.finalNumber+1);
  const n=fixture(['aug-189']);r=steal(n.run,[2,3,4,5]);assert.equal(scopedImpState(n.run,n.p).greed,0);
});
test('aug-190 total stolen >=2 adds floor(final/2) capped at 3',()=>{
  let x=fixture(['aug-190']),r=steal(x.run,[4,4,4,1]);assert.equal(r.a.finalNumber,6);assert.equal(damage(x.run,x.p,r.a),9);
  x=fixture(['aug-190']);r=steal(x.run,[4,4,3,1]);assert.equal(damage(x.run,x.p,r.a),r.a.finalNumber);
});
test('aug-191 stores actual stolen amount instead of adding it to owner number',()=>{
  let x=fixture(['aug-191']),r=steal(x.run,[2,2,3,4]);assert.equal(r.a.finalNumber,2);assert.equal(x.p.publicResources.stolenNumber,1);
  x=fixture(['aug-191']);r=steal(x.run,[2,3,4,5]);assert.equal(x.p.publicResources.stolenNumber||0,0);
});
test('aug-192 changes stolen-number cap 3 to 5',()=>{
  const x=fixture(['aug-191','aug-192']);assert.equal(stolenNumberCap(x.p),5);x.p.publicResources.stolenNumber=9;prepareImpSubmission(x.run,x.p,{impSpend:0});assert.equal(x.p.publicResources.stolenNumber,5);
  const n=fixture(['aug-191']);assert.equal(stolenNumberCap(n.p),3);
});
test('aug-193 allows spending all stored numbers in unit steps instead of base cap 2',()=>{
  const x=fixture(['aug-191','aug-193']);x.p.publicResources.stolenNumber=3;assert.equal(prepareImpSubmission(x.run,x.p,{impSpend:3}).spent,3);assert.equal(x.p.publicResources.stolenNumber,0);
  const n=fixture(['aug-191']);n.p.publicResources.stolenNumber=3;assert.throws(()=>prepareImpSubmission(n.run,n.p,{impSpend:3}),/INVALID_STOLEN/);
});
test('aug-194 stored >=3 at turn end gives next-turn stored-spend attack +2',()=>{
  const x=fixture(['aug-191','aug-194']);x.p.publicResources.stolenNumber=3;onImpTurnEnd(x.run,x.p);x.run.combat.turn=2;prepareImpSubmission(x.run,x.p,{impSpend:1});
  const rc={playerId:'p0',finalNumber:3,valid:true,stolenNumberSpent:1};assert.equal(validate(x.run,x.p,rc),2);
  const n=fixture(['aug-191','aug-194']);n.p.publicResources.stolenNumber=2;onImpTurnEnd(n.run,n.p);n.run.combat.turn=2;assert.equal(validate(n.run,n.p,{playerId:'p0',finalNumber:3,valid:true,stolenNumberSpent:1}),0);
});
test('aug-195 spends 2 for ATTACK next-valid +2 and rejects insufficient resource',()=>{
  const x=fixture(['aug-191','aug-195']);x.p.publicResources.stolenNumber=2;prepareImpSubmission(x.run,x.p,{impTradeMode:'ATTACK'});assert.equal(x.p.publicResources.stolenNumber,0);
  assert.equal(validate(x.run,x.p,{playerId:'p0',finalNumber:2,valid:true}),2);
  const n=fixture(['aug-191','aug-195']);n.p.publicResources.stolenNumber=1;assert.throws(()=>prepareImpSubmission(n.run,n.p,{impTradeMode:'ATTACK'}),/INSUFFICIENT/);
});
test('aug-196 spending >=2 on valid attack refunds one stored number once/turn',()=>{
  const x=fixture(['aug-191','aug-196']);x.p.publicResources.stolenNumber=0;validate(x.run,x.p,{playerId:'p0',finalNumber:3,valid:true,stolenNumberSpent:2});assert.equal(x.p.publicResources.stolenNumber,1);
  validate(x.run,x.p,{playerId:'p0',finalNumber:3,valid:true,stolenNumberSpent:2});assert.equal(x.p.publicResources.stolenNumber,1);
});
test('aug-197 spending >=3 in one action adds +2 damage',()=>{
  let x=fixture(['aug-197']),rc={playerId:'p0',finalNumber:3,valid:true,stolenNumberSpent:3};assert.equal(damage(x.run,x.p,rc),5);
  x=fixture(['aug-197']);rc={playerId:'p0',finalNumber:3,valid:true,stolenNumberSpent:2};assert.equal(damage(x.run,x.p,rc),3);
});
test('aug-198 gives cap 7 and at least one stored number at combat start',()=>{
  let x=fixture(['aug-198']);initializeImpCombat(x.run,x.p);assert.equal(stolenNumberCap(x.p),7);assert.equal(x.p.publicResources.stolenNumber,1);
  x=fixture([]);initializeImpCombat(x.run,x.p);assert.equal(stolenNumberCap(x.p),3);assert.equal(x.p.publicResources.stolenNumber,undefined);
});
test('aug-199 spending >=4 on valid combat attack adds +4',()=>{
  let x=fixture(['aug-199']),rc={playerId:'p0',finalNumber:2,valid:true,stolenNumberSpent:4};assert.equal(damage(x.run,x.p,rc),6);
  x=fixture(['aug-199']);rc={playerId:'p0',finalNumber:2,valid:true,stolenNumberSpent:3};assert.equal(damage(x.run,x.p,rc),2);
});
test('aug-200 valid stored-number attack refunds floor(spend/2) capped at 2',()=>{
  const x=fixture(['aug-191','aug-200']);x.p.publicResources.stolenNumber=0;validate(x.run,x.p,{playerId:'p0',finalNumber:3,valid:true,stolenNumberSpent:5});assert.equal(x.p.publicResources.stolenNumber,2);
  const n=fixture(['aug-191','aug-200']);validate(n.run,n.p,{playerId:'p0',finalNumber:3,valid:true,stolenNumberSpent:0});assert.equal(n.p.publicResources.stolenNumber||0,0);
});
test('aug-201 applies next-turn Mischief +2 and consumes it once',()=>{
  const x=fixture(['aug-201']);steal(x.run,[2,2,3,4]);x.run.combat.turn=2;const target=x.players[1];
  assert.equal(validate(x.run,target,{playerId:'p1',finalNumber:3,valid:true}),2);assert.equal(validate(x.run,target,{playerId:'p1',finalNumber:3,valid:true}),0);
  const n=fixture(['aug-201']);n.run.combat.turn=2;assert.equal(validate(n.run,n.players[1],{playerId:'p1',finalNumber:3,valid:true}),0);
});
test('aug-202 increases normal Mischief next-valid bonus by +1',()=>{
  let x=fixture(['aug-201','aug-202']);steal(x.run,[2,2,3,4]);x.run.combat.turn=2;assert.equal(validate(x.run,x.players[1],{playerId:'p1',finalNumber:3,valid:true}),3);
  x=fixture(['aug-201']);steal(x.run,[2,2,3,4]);x.run.combat.turn=2;assert.equal(validate(x.run,x.players[1],{playerId:'p1',finalNumber:3,valid:true}),2);
});
test('aug-203 prevents one repeat-steal explosion per combat and removes Mischief',()=>{
  const x=fixture(['aug-201','aug-203']);x.players[1].hp=1;steal(x.run,[2,2,3,4]);x.run.combat.turn=2;steal(x.run,[2,2,3,4]);assert.equal(x.players[1].hp,1);assert.equal(x.run.combat.pendingDownPlayerIds.includes('p1'),false);
  const n=fixture(['aug-201']);n.players[1].hp=1;steal(n.run,[2,2,3,4]);n.run.combat.turn=2;steal(n.run,[2,2,3,4]);assert.equal(n.players[1].hp,0);assert.ok(n.run.combat.pendingDownPlayerIds.includes('p1'));
});
test('aug-204 marking two distinct allies same turn gives owner next valid +1',()=>{
  let x=fixture(['aug-201','aug-204']);steal(x.run,[2,2,2,4]);assert.equal(validate(x.run,x.p,{playerId:'p0',finalNumber:4,valid:true}),1);
  x=fixture(['aug-201','aug-204']);steal(x.run,[2,2,3,4]);assert.equal(validate(x.run,x.p,{playerId:'p0',finalNumber:3,valid:true}),0);
});
test('aug-205 Mischief-marked ally valid FINAL_NUMBER>=4 gets +2 in addition to mark',()=>{
  let x=fixture(['aug-201','aug-205']);steal(x.run,[2,2,3,4]);x.run.combat.turn=2;assert.equal(validate(x.run,x.players[1],{playerId:'p1',finalNumber:4,valid:true}),4);
  x=fixture(['aug-201','aug-205']);steal(x.run,[2,2,3,4]);x.run.combat.turn=2;assert.equal(validate(x.run,x.players[1],{playerId:'p1',finalNumber:3,valid:true}),2);
});
test('aug-206 Mischief repeat explosion grants owner next-valid +1',()=>{
  const x=fixture(['aug-201','aug-206']);steal(x.run,[2,2,3,4]);x.run.combat.turn=2;steal(x.run,[2,2,3,4]);assert.equal(validate(x.run,x.p,{playerId:'p0',finalNumber:3,valid:true}),1);
  const n=fixture(['aug-201','aug-206']);assert.equal(validate(n.run,n.p,{playerId:'p0',finalNumber:3,valid:true}),0);
});
test('aug-207 normal Mischief success spreads one weak +1 mark once/cycle',()=>{
  const x=fixture(['aug-201','aug-207']);steal(x.run,[2,2,3,4]);x.run.combat.turn=2;validate(x.run,x.players[1],{playerId:'p1',finalNumber:3,valid:true});
  const marks=Object.values(x.run.augmentFramework.imp.mischief);assert.equal(marks.length,1);assert.equal(marks[0].bonusDamage,1);
  const n=fixture(['aug-201']);steal(n.run,[2,2,3,4]);n.run.combat.turn=2;validate(n.run,n.players[1],{playerId:'p1',finalNumber:3,valid:true});assert.equal(Object.keys(n.run.augmentFramework.imp.mischief).length,0);
});
test('aug-208 two Mischief-marked valid players same turn grant party next-valid +2',()=>{
  const x=fixture(['aug-201','aug-208']);steal(x.run,[2,2,2,4]);x.run.combat.turn=2;validate(x.run,x.players[1],{playerId:'p1',finalNumber:3,valid:true});validate(x.run,x.players[2],{playerId:'p2',finalNumber:4,valid:true});
  assert.equal(validate(x.run,x.players[3],{playerId:'p3',finalNumber:5,valid:true}),2);
  const n=fixture(['aug-201','aug-208']);steal(n.run,[2,2,3,4]);n.run.combat.turn=2;validate(n.run,n.players[1],{playerId:'p1',finalNumber:3,valid:true});assert.equal(validate(n.run,n.players[3],{playerId:'p3',finalNumber:5,valid:true}),0);
});
test('aug-209 Mischief success is +5 and repeat explosion is 2 damage',()=>{
  let x=fixture(['aug-201','aug-209']);steal(x.run,[2,2,3,4]);x.run.combat.turn=2;assert.equal(validate(x.run,x.players[1],{playerId:'p1',finalNumber:3,valid:true}),5);
  x=fixture(['aug-201','aug-209']);x.players[1].hp=3;steal(x.run,[2,2,3,4]);x.run.combat.turn=2;steal(x.run,[2,2,3,4]);assert.equal(x.players[1].hp,1);
});
test('aug-210 successful Mischief builds excitement cap and strengthens later Imp attack',()=>{
  const x=fixture(['aug-201','aug-210']);steal(x.run,[2,2,3,4]);x.run.combat.turn=2;validate(x.run,x.players[1],{playerId:'p1',finalNumber:3,valid:true});assert.equal(scopedImpState(x.run,x.p).excitement,1);
  const rc={playerId:'p0',finalNumber:3,valid:true};assert.equal(validate(x.run,x.p,rc),1);
  const n=fixture(['aug-201','aug-210']);assert.equal(scopedImpState(n.run,n.p).excitement,0);
});
test('Imp telemetry is fire-based and cleanup removes combat Mischief/scoped state without deleting ownership',()=>{
  const x=fixture(['aug-201']);steal(x.run,[2,2,3,4]);assert.ok(impTelemetry(x.run,'aug-201').length>0);cleanupImpCombat(x.run,x.p);assert.equal(x.run.augmentFramework.imp.state.p0,undefined);assert.equal(Object.keys(x.run.augmentFramework.imp.mischief).length,0);assert.ok(x.p.augments.includes('aug-201'));
});
