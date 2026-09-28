import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState} from '../supabase/functions/game-api/pve/model.js';
import {enterEventRoom,submitEventCard} from '../supabase/functions/game-api/pve/events.js';
import {eventPrimitives,resolveEventDefinition} from '../supabase/functions/game-api/pve/event-resolution.js';
import {restoreCardCycle} from '../supabase/functions/game-api/pve/card-cycle.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';

function runFor(characters=['adventurer','adventurer','adventurer','adventurer'],seed='event-001'){
  const players=characters.map((character_id,i)=>newPlayerRunState({id:`p${i}`,user_id:`u${i}`,member_type:'human',character_id,seat_index:i}));
  const run={id:'event-run',roomId:'room',seed,rngCounter:0,phase:'ROOM_ENTER',floor:1,depth:2,flame:3,maxFlame:5,currentRoomNodeId:'event-node',players,relicCatalog:[]};
  enterEventRoom(run);return run;
}
function submitValues(run,values,skills={}){
  for(let i=0;i<values.length;i++){
    const player=run.players[i],state=run.roomState.privateByPlayer[player.playerId];
    const card=player.cardPool.find(card=>card.baseNumber===values[i]&&state.remainingCardIds.includes(card.id));
    assert.ok(card,`card ${values[i]} for ${player.playerId}`);
    submitEventCard(run,player.playerId,card.id,Boolean(skills[i]),skills[i]?.skillData||null);
  }
  assert.equal(run.phase,'ROOM_RESULT');
  return run.roomState.publicTurnResult;
}
const card=(id,n,valid=true,group=1)=>({playerId:id,seat:Number(id.slice(1)),finalNumber:n,valid,collisionGroupSize:group,...(!valid?{invalidReason:'COLLISION'}:{})});

test('EVENT E1-E7: shared primitives and data-driven effects resolve highest, sum, exact, collision and ranking',()=>{
  const cards=[card('p0',5),card('p1',2),card('p2',3,false,2),card('p3',3,false,2)];
  const p=eventPrimitives(cards,{exactNumber:3,threshold:7,min:6,max:9});
  assert.deepEqual(p.HIGHEST_VALID,['p0']);assert.deepEqual(p.LOWEST_VALID,['p1']);
  assert.deepEqual(p.UNIQUE_VALID,['p0','p1']);assert.deepEqual(p.COLLIDED,['p2','p3']);
  assert.deepEqual(p.EXACT_NUMBER,['p2','p3']);assert.equal(p.VALID_SUM,7);assert.equal(p.VALID_COUNT,2);
  assert.deepEqual(p.ORDER_BY_VALUE,['p0','p1']);assert.equal(p.ABOVE_THRESHOLD,true);
  assert.equal(p.BELOW_THRESHOLD,true);assert.equal(p.BETWEEN,true);
  assert.equal(p.NO_COLLISION,false);assert.equal(p.ALL_COLLIDE,false);
  const noCollision=eventPrimitives([card('p0',1),card('p1',2),card('p2',3),card('p3',4)]);
  assert.equal(noCollision.NO_COLLISION,true);
  const allCollide=eventPrimitives([card('p0',2,false,2),card('p1',2,false,2)]);
  assert.equal(allCollide.ALL_COLLIDE,true);
  const run=runFor();
  const ranked=resolveEventDefinition(run,{
    successCondition:{primitive:'VALID_SUM',gte:7},
    allCollide:{outcome:'RETRY',rules:[{target:'PARTY',effects:[{type:'SPEND_FLAME',amount:1}]}]},
    rules:[
      {when:'SUCCESS',target:'RANK_1',effects:[{type:'ADD_RUN_GOLD',amount:3}]},
      {when:'SUCCESS',target:'RANK_2',effects:[{type:'ADD_EXP',amount:2}]},
      {when:'SUCCESS',target:'COLLIDED',effects:[{type:'DAMAGE_HP',amount:1}]}
    ]
  },cards,run.roomState.privateByPlayer);
  assert.equal(ranked.outcome,'SUCCESS');assert.equal(run.players[0].runGold,3);
  assert.equal(run.players[1].growthExp,2);assert.equal(run.players[2].hp,2);
  const retry=resolveEventDefinition(run,{allCollide:{outcome:'RETRY',rules:[{target:'PARTY',effects:[{type:'SPEND_FLAME',amount:1}]}]}},[card('p0',2,false,2),card('p1',2,false,2)],run.roomState.privateByPlayer);
  assert.equal(retry.outcome,'RETRY');assert.equal(run.flame,2);
});

test('EVENT E8-E11: Mage, Vampire, Imp and Warrior use final-number and collision pipeline',()=>{
  const mage=runFor(['mage','adventurer','adventurer','adventurer'],'mage');
  const m=submitValues(mage,[2,1,4,5],{0:{skillData:{manaSpend:2}}});
  assert.equal(m.cards[0].finalNumber,3);
  const vampire=runFor(['vampire','adventurer','adventurer','adventurer'],'vampire');
  vampire.players[0].publicResources.thrallPlayerId='p1';
  const v=submitValues(vampire,[2,5,3,4],{0:true});
  assert.equal(v.cards[0].finalNumber,5);assert.equal(v.cards[1].finalNumber,2);
  const imp=runFor(['imp','adventurer','adventurer','adventurer'],'imp');
  const i=submitValues(imp,[2,2,4,5]);
  assert.equal(i.cards[0].finalNumber,3);assert.equal(i.cards[1].finalNumber,1);
  const warrior=runFor(['warrior','adventurer','adventurer','adventurer'],'warrior');
  const w=submitValues(warrior,[2,2,3,4],{0:true});
  assert.equal(w.cards[0].valid,true);assert.equal(w.cards[1].valid,false);
});

test('EVENT E12: Rogue solo lowest gains score and gold only when valid and alone',()=>{
  const run=runFor(['rogue','adventurer','adventurer','adventurer'],'rogue');
  submitValues(run,[1,2,3,4]);
  assert.equal(run.players[0].score,5);assert.equal(run.players[0].runGold,2);
  const tied=runFor(['rogue','adventurer','adventurer','adventurer'],'rogue-tied');
  submitValues(tied,[1,1,3,4]);
  assert.equal(tied.players[0].score,0);assert.equal(tied.players[0].runGold,0);
});

test('EVENT E13: submitted physical card is spent, keeps its ID, and reconnect hides peer cycle state',()=>{
  const run=runFor();
  const id=run.players[0].cardPool[0].id;
  submitEventCard(run,'p0',id);
  const own=projectRun(run,'p0'),peer=projectRun(run,'p1');
  assert.ok(own.privateRoomState.remainingCardIds.includes(id));
  assert.equal(own.privateRoomState.selectedCardId,id);
  assert.equal(peer.privateRoomState.playerId,'p1');
  assert.equal(peer.roomState.privateByPlayer,undefined);
  assert.equal(peer.cardCycles,undefined);
  assert.equal(peer.roomState.turnSubmissions,undefined);
  for(let i=1;i<4;i++){
    const card=run.players[i].cardPool.find(card=>card.baseNumber===i+1);
    submitEventCard(run,`p${i}`,card.id);
  }
  const result=run.roomState.publicTurnResult;
  assert.ok(result.cards.length===4);
  assert.ok(run.cardCycles.p0.spentCardIds.includes(id));
  assert.ok(run.players[0].cardPool.some(card=>card.id===id));
  assert.ok(!restoreCardCycle(run,run.players[0]).remainingCardIds.includes(id));
});
test('EVENT E14: identical seed and submissions replay identical results without combat-only effects',()=>{
  const play=()=>{
    const run=runFor(['rogue','mage','adventurer','adventurer'],'replay');
    run.players[0].relics.push('combat-only');
    run.effectCatalog={'combat-only':{effects:[{id:'combat-only',trigger:'BEFORE_DAMAGE',operations:[{type:'ADD_RUN_GOLD',amount:99}]}]}};
    const result=submitValues(run,[1,2,3,4]);
    return {result,players:run.players.map(p=>({hp:p.hp,gold:p.runGold,score:p.score})),rngCounter:run.rngCounter};
  };
  assert.deepEqual(play(),play());
  assert.ok(play().players.every(p=>p.gold<99));
});
