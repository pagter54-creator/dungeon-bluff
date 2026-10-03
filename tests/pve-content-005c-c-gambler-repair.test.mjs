import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
import {GAMBLER_CONTRACTS,GAMBLER_CONTRACT_IDS} from '../supabase/functions/game-api/pve/gambler-contracts.js';
import {
  freshGamblerState,normalizeGamblerState,drawGamblerHand,settleGamblerHand,
  prepareGamblerAllIn,finalizeGamblerAllIn,gamblerSetDamage,applyGamblerValidated
} from '../supabase/functions/game-api/pve/gambler.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';

const member=(id,character_id,seat_index)=>({id,user_id:'u'+seat_index,member_type:'human',character_id,seat_index});
function fixture(augments=[]){
  const players=[
    member('p0','gambler',0),member('p1','adventurer',1),member('p2','warrior',2),member('p3','mage',3)
  ].map(newPlayerRunState);
  players[0].augments=[...augments];
  const run={id:'gambler-repair',seed:'gambler-repair-seed',rngCounter:0,phase:'COMBAT',floor:1,depth:1,currentRoomNodeId:'node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT');
  run.combat.id='gambler-repair-combat';run.combat.turn=1;
  const state=freshGamblerState(players[0]);run.combat.privateByPlayer.p0=state;
  return {run,p:players[0],state,players};
}
function setHand(x,values){
  const ids=[];
  for(const value of values){
    const card=x.p.cardPool.find(c=>c.baseNumber===value&&!ids.includes(c.id));
    assert.ok(card,'missing card '+value);ids.push(card.id);
  }
  const hand=new Set(ids);
  x.state.remainingCardIds=[...ids];
  x.state.drawPileIds=x.p.cardPool.filter(c=>!hand.has(c.id)).map(c=>c.id);
  x.state.discardPileIds=[];x.state.vanishedCardIds=[];x.state.deckInitialized=true;
  normalizeGamblerState(x.run,x.p,x.state);
  return ids;
}
function resolvedFor(id,value,valid=true){return {playerId:'p0',cardInstanceId:id,baseNumber:value,workingNumber:value,finalNumber:value,valid};}

test('005C-C registry has all 30 Gambler contracts executable',()=>{
  assert.equal(GAMBLER_CONTRACT_IDS.length,30);
  for(const id of GAMBLER_CONTRACT_IDS){
    assert.ok(GAMBLER_CONTRACTS[id],id);
    assert.equal(EXECUTABLE_AUGMENT_RUNTIME[id]?.executable,true,id);
    assert.ok(EXECUTABLE_AUGMENT_RUNTIME[id]?.specialHandlers?.includes('GAMBLER_V02'),id);
  }
});

test('005C-C deterministic initial draw is stable for identical seed/state',()=>{
  const a=fixture(),b=fixture();
  assert.deepEqual(drawGamblerHand(a.run,a.p,a.state),drawGamblerHand(b.run,b.p,b.state));
  assert.deepEqual(a.state.drawPileIds,b.state.drawPileIds);
  assert.deepEqual(a.state.remainingCardIds,b.state.remainingCardIds);
});

test('005C-C reshuffle resets shuffle-scoped counting state and excludes VANISHED',()=>{
  const x=fixture(['aug-214','aug-221','aug-227']);
  const vanished=x.p.cardPool.find(c=>c.baseNumber===6).id;
  x.state.drawPileIds=[];x.state.remainingCardIds=[];x.state.vanishedCardIds=[vanished];
  x.state.discardPileIds=x.p.cardPool.filter(c=>c.id!==vanished).map(c=>c.id);
  x.state.deckInitialized=true;x.state.aug214Run=[1,2];x.state.aug214TriggeredShuffle=true;
  x.state.countedOrdinary=[1,2,3];x.state.cardCounter=3;x.state.cardCounterArmed=true;
  x.state.shuffleOrdinarySeen=[1,2,3,4,5];x.state.fiveMemoryArmed=true;
  drawGamblerHand(x.run,x.p,x.state);
  assert.equal(x.state.vanishedCardIds.includes(vanished),true);
  assert.equal(x.state.drawPileIds.includes(vanished),false);
  assert.equal(x.state.remainingCardIds.includes(vanished),false);
  assert.deepEqual(x.state.aug214Run,[]);assert.equal(x.state.aug214TriggeredShuffle,false);
  assert.deepEqual(x.state.countedOrdinary,[]);assert.equal(x.state.cardCounter,0);assert.equal(x.state.cardCounterArmed,false);
  assert.deepEqual(x.state.shuffleOrdinarySeen,[]);assert.equal(x.state.fiveMemoryArmed,false);
});

test('005C-C Card Counter and sequence bonuses arm now and pay on the next valid card',()=>{
  const x=fixture(['aug-221','aug-225']);
  let r=resolvedFor('a',1);assert.equal(applyGamblerValidated(x.run,x.p,x.state,r),0);
  r=resolvedFor('b',2);assert.equal(applyGamblerValidated(x.run,x.p,x.state,r),0);
  r=resolvedFor('c',3);assert.equal(applyGamblerValidated(x.run,x.p,x.state,r),0);
  assert.equal(x.state.cardCounterArmed,true);assert.equal(x.state.sequenceArmed,true);
  r=resolvedFor('d',4);assert.equal(applyGamblerValidated(x.run,x.p,x.state,r),5);
  assert.equal(x.state.cardCounterArmed,false);assert.equal(x.state.sequenceArmed,false);
});

test('005C-C All-In only judges selected card, consumes both physical cards, and vanishes used 6',()=>{
  const x=fixture(['aug-231']);
  const [ordinary,special]=setHand(x,[2,6]);
  const r=resolvedFor(ordinary,2,true);
  const pending=prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:ordinary},r);
  assert.deepEqual(new Set(pending.cardIds),new Set([ordinary,special]));
  assert.equal(r.cardInstanceId,ordinary);assert.equal(r.allInSum,8);
  finalizeGamblerAllIn(x.run,x.p,x.state,r);
  assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),8);
  settleGamblerHand(x.run,x.p,x.state,ordinary,2,{rootActionId:r.allInRootActionId});
  assert.ok(x.state.vanishedCardIds.includes(special));
  assert.equal(x.state.discardPileIds.includes(special),false);
  assert.equal(x.state.discardPileIds.includes(ordinary),true);
});

test('005C-C All-In finalize and SET_DAMAGE are idempotent under same root retry',()=>{
  const x=fixture(['aug-231','aug-239']);
  const [a]=setHand(x,[2,5]);const r=resolvedFor(a,2,true);
  prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);
  finalizeGamblerAllIn(x.run,x.p,x.state,r);finalizeGamblerAllIn(x.run,x.p,x.state,r);
  assert.equal(x.state.allInWinStreak,1);
  const first=gamblerSetDamage(x.run,x.p,x.state,r,2);
  const second=gamblerSetDamage(x.run,x.p,x.state,r,2);
  assert.equal(first,7);assert.equal(second,7);
  assert.equal(x.state.history.filter(e=>e.type==='ALL_IN_RESULT').length,1);
  assert.equal(x.state.history.filter(e=>e.type==='ALL_IN_DAMAGE').length,1);
});

test('005C-C owner projection keeps exact counter/history state private from ally',()=>{
  const x=fixture(['aug-221']);
  drawGamblerHand(x.run,x.p,x.state);
  x.state.sixProgress=[1,2];x.state.sevenProgress=[1,2,3];x.state.cardCounter=2;
  x.state.history.push({type:'SECRET',cardInstanceId:x.state.drawPileIds[0]});
  const owner=projectRun(x.run,'p0'),ally=projectRun(x.run,'p1');
  assert.deepEqual(owner.players[0].gamblerDeck.owner.sixProgress,[1,2]);
  assert.equal(owner.players[0].gamblerDeck.owner.cardCounter,2);
  assert.equal(ally.players[0].gamblerDeck.owner,undefined);
  const serialized=JSON.stringify(ally);
  assert.equal(serialized.includes('"sixProgress"'),false);
  assert.equal(serialized.includes('"sevenProgress"'),false);
  assert.equal(serialized.includes('"history"'),false);
  assert.equal(serialized.includes(x.state.drawPileIds[0]),false);
  assert.equal(ally.players[0].gamblerDeck.drawComposition.reduce((a,b)=>a+b,0),x.state.drawPileIds.length);
});
