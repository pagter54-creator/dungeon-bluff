import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';

function run(){
  const classes=['mage','vampire','imp','warrior'];
  const players=classes.map((character_id,i)=>newPlayerRunState({id:'p'+i,member_type:'human',character_id,seat_index:i}));
  const state={id:'class-pipeline',seed:'class-pipeline',rngCounter:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,players,combat:newCombatState(players,500)};
  beginTurn(state);
  players[0].publicResources.mana=2;
  players[1].publicResources.thrallPlayerId='p0';
  return state;
}
function pick(run,pid,n){return run.players.find(p=>p.playerId===pid).cardPool.find(c=>c.baseNumber===n).id;}
function resolve(run){
  submitCard(run,'p0',pick(run,'p0',2),true,{manaSpend:2});
  submitCard(run,'p1',pick(run,'p1',4),true);
  submitCard(run,'p2',pick(run,'p2',3));
  submitCard(run,'p3',pick(run,'p3',4),true);
  return resolveBasicTurn(run);
}
test('C04 Mage → Vampire → Imp → Knight uses final numbers for collision',()=>{
  const a=run(),b=run(),result=resolve(a),repeat=resolve(b);
  assert.deepEqual(result.cards.map(c=>[c.playerId,c.baseNumber,c.finalNumber,c.valid]),[
    ['p0',2,4,false],['p1',4,2,true],['p2',3,4,false],['p3',4,4,true]
  ]);
  assert.deepEqual(result.cards.map(c=>[c.finalNumber,c.valid]),repeat.cards.map(c=>[c.finalNumber,c.valid]));
  assert.deepEqual(result.mutationEvents.map(e=>e.phase),['SELF_MODIFY','PRE_COLLISION_SWAP','PRE_COLLISION_STEAL','PRE_COLLISION_STEAL']);
  assert.deepEqual(result.cards[3].collisionGroup,['p0','p2','p3']);
  assert.equal(result.cards[3].collisionImmune,true);
  assert.equal(a.players[3].publicResources.toughnessCharges,0);
  assert.equal(a.players[0].publicResources.mana,0);
});
