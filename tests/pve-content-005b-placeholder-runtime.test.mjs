import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState} from '../supabase/functions/game-api/pve/model.js';
import {applyContent005B} from '../supabase/functions/game-api/pve/content-005b-runtime.js';

function fixture(id,characterId='adventurer'){
  const p=newPlayerRunState({id:'p0',user_id:'u0',character_id:characterId,member_type:'human',seat_index:0});
  p.augments=[id];
  const run={id:'runtime-11',version:0,seed:'runtime-11',rngCounter:0,phase:'COMBAT',floor:1,players:[p],combat:{id:'combat-11',turn:1,privateByPlayer:{p0:{cycleIndex:1}},turnSubmissions:{}}};
  return {run,p,fire:(trigger,resolved={},damage=null)=>applyContent005B(run,trigger,{player:p,resolved,damage})};
}
test('aug-004 first collision grants one EXP at the next valid attack after reconnect',()=>{
  const {run,p,fire}=fixture('aug-004');
  fire('POST_COLLISION',{valid:false,invalidReason:'COLLISION'});
  const restored=structuredClone(run),owner=restored.players[0];
  applyContent005B(restored,'CARD_VALIDATED',{player:owner,resolved:{valid:true}});
  applyContent005B(restored,'CARD_VALIDATED',{player:owner,resolved:{valid:true}});
  assert.equal(owner.growthExp,1);
});
test('aug-015 changes only the equipment category activated after a number difference of two',()=>{
  const {run,p,fire}=fixture('aug-015');
  fire('CARD_VALIDATED',{valid:true,finalNumber:1});
  const weapon={valid:true,finalNumber:5},damage={amount:5};
  fire('CARD_VALIDATED',weapon);fire('BEFORE_DAMAGE',weapon,damage);
  assert.equal(damage.amount,7);
  assert.equal(run.augmentFramework.statuses.length,0);
});
test('aug-016 rewards the third distinct category once in the same physical cycle',()=>{
  const {run,fire}=fixture('aug-016');
  fire('CARD_VALIDATED',{valid:true,finalNumber:1});
  fire('CARD_VALIDATED',{valid:true,finalNumber:3});
  const third={valid:true,finalNumber:5},damage={amount:5};
  fire('CARD_VALIDATED',third);fire('BEFORE_DAMAGE',third,damage);
  assert.equal(damage.amount,7);
  const fourth={valid:true,finalNumber:4},next={amount:4};
  fire('CARD_VALIDATED',fourth);fire('BEFORE_DAMAGE',fourth,next);
  assert.equal(next.amount,4);
});
test('aug-062 adds one only to final-number-one solo lowest success',()=>{
  const {fire}=fixture('aug-062','rogue'),damage={amount:5};
  fire('BEFORE_DAMAGE',{valid:true,soloLowest:true,finalNumber:1},damage);
  assert.equal(damage.amount,6);
  const failed={amount:5};fire('BEFORE_DAMAGE',{valid:true,soloLowest:false,finalNumber:1},failed);
  assert.equal(failed.amount,5);
});
for(const [id,expected] of [['aug-084',1],['aug-088',3]])test(id+' consecutive alternating jump respects FINAL_NUMBER',()=>{
  const {run,fire}=fixture(id,'rogue');
  fire('CARD_VALIDATED',{valid:true,finalNumber:1});
  run.combat.turn=2;fire('CARD_VALIDATED',{valid:true,finalNumber:4});
  run.combat.turn=3;const third={valid:true,finalNumber:1},damage={amount:5};
  fire('CARD_VALIDATED',third);fire('BEFORE_DAMAGE',third,damage);
  assert.equal(damage.amount,5+expected);
});
test('aug-095 uses mana after natural turn-start recovery',()=>{
  const {p,fire}=fixture('aug-095','mage');
  p.publicResources.mana=4;fire('TURN_START');
  const damage={amount:4};fire('BEFORE_DAMAGE',{valid:true,skillUsed:'amplify'},damage);
  assert.equal(damage.amount,6);
});
test('aug-122 requires a real pending Berserker HP cost',()=>{
  const {p,fire}=fixture('aug-122','berserker'),valid={valid:true};
  p.hp=2;const damage={amount:3};fire('BEFORE_DAMAGE',valid,damage);assert.equal(damage.amount,4);
  p.hp=1;const noCost={amount:3};fire('BEFORE_DAMAGE',valid,noCost);assert.equal(noCost.amount,3);
});
test('aug-125 pays +2 on the second consecutive actual HP-cost attack',()=>{
  const {run,p,fire}=fixture('aug-125','berserker');p.hp=2;
  const first={valid:true};fire('CARD_VALIDATED',first);const a={amount:3};fire('BEFORE_DAMAGE',first,a);assert.equal(a.amount,3);
  run.combat.turn=2;const second={valid:true};fire('CARD_VALIDATED',second);const b={amount:3};fire('BEFORE_DAMAGE',second,b);assert.equal(b.amount,5);
});
test('aug-133 adds damage only when Revenge is actually consumed',()=>{
  const {fire}=fixture('aug-133','berserker'),damage={amount:4};
  fire('BEFORE_DAMAGE',{valid:true,revengeConsumed:1},damage);assert.equal(damage.amount,5);
  const without={amount:4};fire('BEFORE_DAMAGE',{valid:true,revengeConsumed:0},without);assert.equal(without.amount,4);
});
test('aug-142 checks authoritative HP 1',()=>{
  const {p,fire}=fixture('aug-142','berserker'),damage={amount:3};
  p.hp=1;fire('BEFORE_DAMAGE',{valid:true},damage);assert.equal(damage.amount,4);
  p.hp=2;const healthy={amount:3};fire('BEFORE_DAMAGE',{valid:true},healthy);assert.equal(healthy.amount,3);
});
