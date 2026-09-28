import test from 'node:test';
import assert from 'node:assert/strict';
import {trackPlayerNumber,changeMonsterStack,checkPartyDamage,advanceMonsterPhase,tickMonsterCountdown} from '../supabase/functions/game-api/pve/monster-primitives.js';
import {F1_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';

test('CONTENT-001 registered F1 monsters carry a playable pattern and explicit tier',()=>{
  const ids=new Set();
  for(const def of Object.values(F1_MONSTER_DEFINITIONS)){
    assert.equal(ids.has(def.id),false);ids.add(def.id);
    assert.equal(def.floor,1);
    assert.ok(['NORMAL','ELITE','BOSS'].includes(def.tier));
    assert.ok(def.pattern?.length>0);
    assert.ok(def.pattern.every(intent=>intent.type&&intent.telegraphText));
  }
});

test('CONTENT-001 repeated-number and stack primitives are deterministic and per-player',()=>{
  const state={};
  assert.equal(trackPlayerNumber(state,'p0',3).repeated,false);
  assert.equal(trackPlayerNumber(state,'p1',3).repeated,false);
  assert.equal(trackPlayerNumber(state,'p0',3).repeated,true);
  assert.deepEqual(changeMonsterStack(state,'p0',1,{maximum:2}),{key:'p0',before:0,after:1});
  assert.equal(changeMonsterStack(state,'p0',5,{maximum:2}).after,2);
  assert.equal(changeMonsterStack(state,'p0',-5,{maximum:2}).after,0);
});

test('CONTENT-001 damage minimum/maximum, phase and countdown primitives have no RNG or hidden balance defaults',()=>{
  assert.equal(checkPartyDamage(9,{minimum:10}).passed,false);
  assert.equal(checkPartyDamage(10,{minimum:10}).passed,true);
  assert.equal(checkPartyDamage(11,{maximum:10}).passed,false);
  assert.equal(checkPartyDamage(10,{maximum:10}).passed,true);
  const state={phase:'MIN',countdown:2};
  assert.equal(advanceMonsterPhase(state,['MIN','MAX']),'MAX');
  assert.equal(advanceMonsterPhase(state,['MIN','MAX']),'MIN');
  assert.deepEqual(tickMonsterCountdown(state),{before:2,after:1,ready:false});
  assert.deepEqual(tickMonsterCountdown(state),{before:1,after:0,ready:true});
});
