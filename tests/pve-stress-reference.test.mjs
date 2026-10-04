import test from 'node:test';
import assert from 'node:assert/strict';
import {STRESS_REFERENCE_MONSTERS} from '../scripts/pve-stress-reference-monsters.mjs';
import {F1_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';

test('stress reference inputs are stable and separate from production Floor 1 content',()=>{
  assert.deepEqual(Object.values(STRESS_REFERENCE_MONSTERS).map(monster=>monster.baseHp),[75,120,180]);
  assert.deepEqual(['NORMAL','ELITE','BOSS'].map(tier=>Object.values(F1_MONSTER_DEFINITIONS).filter(monster=>monster.tier===tier).length),[7,3,2]);
  assert.equal(F1_MONSTER_DEFINITIONS.f1_armored_boar.baseHp,90);
  assert.equal(F1_MONSTER_DEFINITIONS.f1_echo_bat.baseHp,160);
  assert.equal(F1_MONSTER_DEFINITIONS.f1_fallen_lord.baseHp,240);
  for(const [id,reference] of Object.entries(STRESS_REFERENCE_MONSTERS)){
    assert.notEqual(reference,F1_MONSTER_DEFINITIONS[id]);
    assert.equal(reference.mechanic,undefined);
    assert.ok(F1_MONSTER_DEFINITIONS[id].mechanic);
  }
});

test('reference encounter uses the production combat, number, damage, and lifecycle pipeline',()=>{
  const def=STRESS_REFERENCE_MONSTERS.f1_armored_boar;
  const players=Array.from({length:4},(_,seat)=>newPlayerRunState({id:`p${seat}`,seat_index:seat,member_type:'human',character_id:'adventurer'}));
  const run={id:'reference-run',seed:'reference-pipeline',rngCounter:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'reference-node',players,map:{nodes:[],edges:{}}};
  run.combat=newCombatState(players,def.baseHp,'NORMAL_COMBAT',def);
  beginTurn(run);
  assert.equal(run.combat.monster.maxHp,75);
  assert.equal(run.combat.monster.intent.type,'DEFEND');
  for(let seat=0;seat<4;seat++){
    const player=players[seat],card=player.cardPool.find(item=>item.baseNumber===seat+1);
    submitCard(run,player.playerId,card.id);
  }
  const result=resolveBasicTurn(run);
  for(const phase of ['FINAL_NUMBER_REVEAL','COLLISION_RESOLVE','VALIDITY_DERIVE','DAMAGE_BUILD','DAMAGE_BATCH_APPLY','KILL_CHECK','MONSTER_ACTION','TURN_END'])assert.ok(result.phaseTrace.includes(phase),phase);
  assert.equal(result.cards.length,4);assert.equal(result.damagePackets.length,4);
  assert.ok(result.totalDamage>0);assert.equal(run.combat.monster.hp,75-result.totalDamage);
  const view=projectRun(run,'p0');assert.equal(view.combat.monster.pattern,undefined);
});
