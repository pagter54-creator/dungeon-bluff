import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {buildInitialPveRun} from '../supabase/functions/game-api/pve/api.js';
import {beginTurn} from '../supabase/functions/game-api/pve/combat.js';
import {restoreCardCycle,persistCardCycles} from '../supabase/functions/game-api/pve/card-cycle.js';
import {drawGamblerHand,settleGamblerHand} from '../supabase/functions/game-api/pve/gambler.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {PVE_CHARACTER_DEFS} from '../supabase/functions/game-api/pve/characters.js';

const member=(id,character_id,seat_index=0)=>({id,user_id:'u'+seat_index,member_type:'human',character_id,seat_index});
const make=()=>{
  const players=[member('p0','gambler',0),member('p1','adventurer',1),member('p2','warrior',2),member('p3','mage',3)].map(newPlayerRunState);
  const run={id:'gambler-run',seed:'gambler-seed',rngCounter:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'room',players,combat:newCombatState(players,500)};
  return run;
};
const zones=s=>[...s.remainingCardIds,...s.drawPileIds,...s.discardPileIds,...s.vanishedCardIds];

test('C08 Gambler is one of thirteen playable classes with eleven physical base cards',()=>{
  assert.equal(Object.keys(PVE_CHARACTER_DEFS).length,13);
  const run=buildInitialPveRun({room:{id:'room'},members:[member('p0','gambler',0),member('p1','warrior',1),member('p2','mage',2),member('p3','seer',3)]},{seed:'classes'});
  const p=run.players[0];
  assert.equal(p.characterId,'gambler');
  assert.deepEqual(p.cardPool.map(c=>c.baseNumber),[1,1,2,2,3,3,4,4,5,5,6]);
  assert.equal(new Set(p.cardPool.map(c=>c.id)).size,11);
});

test('C08 Gambler draw, discard, vanish, and unlock preserve physical card identities',()=>{
  const run=make(),p=run.players[0],s=restoreCardCycle(run,p);
  drawGamblerHand(run,p,s);
  assert.equal(s.remainingCardIds.length,2);
  for(const value of [1,2,3,4,5]){
    const selected=s.remainingCardIds[0];
    settleGamblerHand(run,p,s,selected,value);
    assert.equal(s.remainingCardIds.length,2);
    assert.equal(new Set(zones(s)).size,p.cardPool.length);
    assert.equal(zones(s).length,p.cardPool.length);
  }
  assert.equal(p.cardPool.filter(c=>c.baseNumber===6).length,2);
  assert.equal(p.cardPool.filter(c=>c.baseNumber===7).length,1);
  assert.equal(s.cycleIndex,0);
  const six=p.cardPool.find(c=>c.baseNumber===6&&s.remainingCardIds.includes(c.id));
  if(six){
    settleGamblerHand(run,p,s,six.id,6);
    assert.ok(s.vanishedCardIds.includes(six.id));
  }
  persistCardCycles(run,{p0:s,p1:restoreCardCycle(run,run.players[1]),p2:restoreCardCycle(run,run.players[2]),p3:restoreCardCycle(run,run.players[3])});
  assert.deepEqual(restoreCardCycle(run,p),s);
});

test('C08 Gambler hand is owner-only through reconnect projection and deterministic draw',()=>{
  const a=make(),b=make();
  beginTurn(a);beginTurn(b);
  const handA=a.combat.privateByPlayer.p0.remainingCardIds;
  assert.deepEqual(handA,b.combat.privateByPlayer.p0.remainingCardIds);
  assert.equal(handA.length,2);
  const owner=projectRun(a,'p0'),other=projectRun(a,'p1');
  assert.deepEqual(owner.privateCombat.remainingCardIds,handA);
  assert.equal(other.privateCombat.playerId,'p1');
  assert.equal(JSON.stringify(other).includes('"drawPileIds"'),false);
  assert.equal(JSON.stringify(other).includes('"discardPileIds"'),false);
  assert.equal(JSON.stringify(other).includes('"vanishedCardIds"'),false);
});
