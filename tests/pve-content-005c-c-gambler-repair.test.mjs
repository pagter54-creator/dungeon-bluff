import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
import {GAMBLER_CONTRACTS,GAMBLER_CONTRACT_IDS} from '../supabase/functions/game-api/pve/gambler-contracts.js';
import {
  freshGamblerState,normalizeGamblerState,drawGamblerHand,settleGamblerHand,setGamblerDrawPreference,
  prepareGamblerAllIn,finalizeGamblerAllIn,gamblerSetDamage,finalizeGamblerActualDamage,applyGamblerValidated,initializeGamblerCombat,prepareGamblerForcedAutoSubmission,consumeGamblerLuck
} from '../supabase/functions/game-api/pve/gambler.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {useRewardGamblerLuck} from '../supabase/functions/game-api/pve/rooms.js';

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
  assert.deepEqual(x.state.countedOrdinary,[]);assert.equal(x.state.cardCounter,0);assert.equal(Boolean(x.state.cardCounterArmed),false);
  assert.deepEqual(x.state.shuffleOrdinarySeen,[]);assert.equal(x.state.fiveMemoryArmed,false);
});

test('005C-C Card Counter and sequence bonuses arm now and pay on the next valid card',()=>{
  const x=fixture(['aug-221','aug-225']);
  let r=resolvedFor('a',1);assert.equal(applyGamblerValidated(x.run,x.p,x.state,r),0);
  r=resolvedFor('b',2);assert.equal(applyGamblerValidated(x.run,x.p,x.state,r),0);
  r=resolvedFor('c',3);assert.equal(applyGamblerValidated(x.run,x.p,x.state,r),0);
  assert.equal(x.state.cardCounterArmed,true);assert.equal(x.state.sequenceArmed,true);
  r=resolvedFor('d',4);assert.equal(applyGamblerValidated(x.run,x.p,x.state,r),5);
  assert.equal(Boolean(x.state.cardCounterArmed),false);assert.equal(x.state.sequenceArmed,false);
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
  assert.equal(first,8);assert.equal(second,8);
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


test('005C-C aug-228 owner choice guarantees LOW/HIGH first draw and rejects invalid choices',()=>{
  const x=fixture(['aug-228']);
  assert.deepEqual(drawGamblerHand(x.run,x.p,x.state),[]);
  assert.equal(x.state.drawChoicePending,'AUG_228');
  assert.throws(()=>setGamblerDrawPreference(x.run,x.p,x.state,'MIDDLE'),/GAMBLER_DRAW_RANGE_INVALID/);
  const drawn=setGamblerDrawPreference(x.run,x.p,x.state,'LOW');
  assert.equal(drawn.length,2);
  const values=x.state.remainingCardIds.map(id=>x.p.cardPool.find(c=>c.id===id).baseNumber);
  assert.ok(values.some(v=>[1,2,3].includes(v)));
  assert.equal(x.state.aug228UsedShuffle,true);
});

test('005C-C aug-230 owner can choose any three ordinary numbers and guarantee one',()=>{
  const x=fixture(['aug-230']);
  assert.deepEqual(drawGamblerHand(x.run,x.p,x.state),[]);
  assert.equal(x.state.drawChoicePending,'AUG_230');
  assert.throws(()=>setGamblerDrawPreference(x.run,x.p,x.state,[1,1,2]),/GAMBLER_DRAW_NUMBERS_INVALID/);
  const drawn=setGamblerDrawPreference(x.run,x.p,x.state,[1,4,5]);
  assert.equal(drawn.length,2);
  const values=x.state.remainingCardIds.map(id=>x.p.cardPool.find(c=>c.id===id).baseNumber);
  assert.ok(values.some(v=>[1,4,5].includes(v)));
  assert.equal(x.state.aug230UsedShuffle,true);
});

test('005C-C aug-211 Reward Luck is server-authoritative, once-only, and closes after confirmation',()=>{
  const x=fixture(['aug-211']);x.run.phase='REWARD_ROOM';x.state.luck=1;
  x.run.roomState={type:'REWARD_ROOM',attempt:1,pickOrder:['p0'],privateByPlayer:{p0:x.state},gamblerLuckWindows:{},relicIds:['r1'],picks:{}};
  assert.equal(useRewardGamblerLuck(x.run,'p0','ATTACK','luck-action'),true);
  assert.equal(x.state.luck,0);assert.equal(x.state.luckDamageArmed,true);
  assert.equal(useRewardGamblerLuck(x.run,'p0','ATTACK','luck-action'),false);
  x.state.luck=1;x.run.roomState.gamblerLuckWindows.p0.phase='CONFIRMED';
  assert.equal(useRewardGamblerLuck(x.run,'p0','SPECIAL','late'),false);
  const y=fixture(['aug-211']);y.run.phase='REWARD_ROOM';y.state.luck=1;y.run.roomState={type:'REWARD_ROOM',attempt:1,pickOrder:[],privateByPlayer:{p0:y.state},gamblerLuckWindows:{}};
  assert.equal(useRewardGamblerLuck(y.run,'p0','ATTACK','before-presentation'),false);
});

test('005C-C aug-235 Double Down enables exactly one second All-In and failed second hand becomes forced auto submit',()=>{
  const x=fixture(['aug-231','aug-235']);initializeGamblerCombat(x.run,x.p,x.state);
  let [a]=setHand(x,[2,5]);let r=resolvedFor(a,2,true);
  prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);finalizeGamblerAllIn(x.run,x.p,x.state,r);
  settleGamblerHand(x.run,x.p,x.state,a,2,{rootActionId:'dd-first'});
  assert.equal(x.state.doubleDownReady,true);assert.equal(x.state.remainingCardIds.length,2);
  a=x.state.remainingCardIds[0];const value=x.p.cardPool.find(c=>c.id===a).baseNumber;r=resolvedFor(a,value,true);
  prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);
  assert.equal(r.doubleDownSecond,true);
  assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,value),r.allInSum+2);
  r.valid=false;finalizeGamblerAllIn(x.run,x.p,x.state,r);
  settleGamblerHand(x.run,x.p,x.state,a,value,{rootActionId:'dd-second'});
  assert.equal(x.state.forcedAutoSubmitNext,true);assert.equal(x.state.remainingCardIds.length,0);
  const forced=prepareGamblerForcedAutoSubmission(x.run,x.p,x.state);
  assert.ok(forced);assert.equal(x.state.remainingCardIds.length,1);assert.equal(x.state.forcedAutoSubmitNext,false);
});

test('005C-C aug-236 borrows one future draw modifier once per turn and weakens that physical card later',()=>{
  const x=fixture(['aug-231','aug-236']);initializeGamblerCombat(x.run,x.p,x.state);
  const [a]=setHand(x,[2,5]),r=resolvedFor(a,2,true);
  prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);
  assert.equal(r.gamblerBorrowBonus,1);assert.ok(x.state.pendingAllIn.borrowedCardId);
  const borrowed=x.state.pendingAllIn.borrowedCardId;
  assert.ok(x.state.weakenedBorrowedIds.includes(borrowed));
  assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),r.allInSum+1);
  const card=x.p.cardPool.find(c=>c.id===borrowed),later=resolvedFor(borrowed,card.baseNumber,true);
  applyGamblerValidated(x.run,x.p,x.state,later);
  assert.equal(gamblerSetDamage(x.run,x.p,x.state,later,card.baseNumber),Math.max(0,card.baseNumber-1));
});

test('005C-C aug-237 removes one upcoming All-In draw-penalty turn once per combat at 8+ damage',()=>{
  const x=fixture(['aug-231','aug-237']);initializeGamblerCombat(x.run,x.p,x.state);
  const [a]=setHand(x,[2,6]),r=resolvedFor(a,2,true);
  prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);
  assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),8);
  assert.equal(finalizeGamblerActualDamage(x.run,x.p,x.state,r,8),true);
  assert.equal(x.state.aug237Used,true);assert.equal(x.state.pendingAllIn.aug237Reduced,true);
  finalizeGamblerAllIn(x.run,x.p,x.state,r);settleGamblerHand(x.run,x.p,x.state,a,2,{rootActionId:'winner-dividend'});
  assert.equal(x.state.remainingCardIds.length,2);
});

test('005C-C aug-238 consumes two ordinary hand cards plus one owned special and applies SUM_OF_THREE_PLUS_4 with two-turn draw penalty',()=>{
  const x=fixture(['aug-231','aug-238']);initializeGamblerCombat(x.run,x.p,x.state);
  const [a]=setHand(x,[2,5]),special=x.p.cardPool.find(c=>c.baseNumber===6).id,r=resolvedFor(a,2,true);
  const pending=prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);
  assert.equal(pending.allAssets,true);assert.equal(pending.cardIds.length,3);assert.ok(pending.cardIds.includes(special));
  assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),17);
  finalizeGamblerAllIn(x.run,x.p,x.state,r);settleGamblerHand(x.run,x.p,x.state,a,2,{rootActionId:'all-assets'});
  assert.ok(x.state.vanishedCardIds.includes(special));assert.equal(x.state.remainingCardIds.length,1);assert.equal(x.state.drawPenaltyTurns,1);
  const next=x.state.remainingCardIds[0],value=x.p.cardPool.find(c=>c.id===next).baseNumber;
  settleGamblerHand(x.run,x.p,x.state,next,value,{rootActionId:'all-assets-recovery'});
  assert.equal(x.state.remainingCardIds.length,1);assert.equal(x.state.drawPenaltyTurns,0);
});


test('005C-C actual positive/negative effect matrix covers aug-211..240 30/30',()=>{
  const covered=new Set(),negative=new Set();
  const runCase=(id,positiveCase,negativeCase)=>{positiveCase();covered.add(id);negativeCase();negative.add(id);};

  runCase('aug-211',()=>{
    const x=fixture(['aug-211']),six=x.p.cardPool.find(c=>c.baseNumber===6);x.run.phase='REWARD_ROOM';applyGamblerValidated(x.run,x.p,x.state,resolvedFor(six.id,6,true));assert.equal(x.state.luck,1);
  },()=>{
    const x=fixture(['aug-211']),six=x.p.cardPool.find(c=>c.baseNumber===6);applyGamblerValidated(x.run,x.p,x.state,resolvedFor(six.id,6,true));assert.equal(x.state.luck,0);
  });
  runCase('aug-212',()=>{
    const x=fixture(['aug-212']),r=resolvedFor('six',6,true);const before=x.state.specialCharge;assert.equal(applyGamblerValidated(x.run,x.p,x.state,r),2);assert.equal(x.state.specialCharge,before+1);
  },()=>{const x=fixture(['aug-212']);assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('five',5,true)),0);});
  runCase('aug-213',()=>{const x=fixture(['aug-213']);assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('seven',7,true)),4);},
    ()=>{const x=fixture(['aug-213']);assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('six',6,true)),0);});
  runCase('aug-214',()=>{
    const x=fixture(['aug-214']);for(const v of [1,2,3])applyGamblerValidated(x.run,x.p,x.state,resolvedFor('c'+v,v,true));assert.equal(x.state.specialCharge,1);
  },()=>{
    const x=fixture(['aug-214']);for(const [i,v] of [1,2,1].entries())applyGamblerValidated(x.run,x.p,x.state,resolvedFor('d'+i,v,true));assert.equal(x.state.specialCharge,0);
  });
  runCase('aug-215',()=>{const x=fixture(['aug-215']);x.state.lastValidCardValue=6;assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('o',2,true)),2);},
    ()=>{const x=fixture(['aug-215']);x.state.lastValidCardValue=3;assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('o',2,true)),0);});
  runCase('aug-216',()=>{
    const x=fixture(['aug-216']);applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s1',6,true));assert.equal(x.state.specialCharge,1);applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s2',7,true));assert.equal(x.state.specialCharge,1);
  },()=>{const x=fixture(['aug-216']);applyGamblerValidated(x.run,x.p,x.state,resolvedFor('o',4,true));assert.equal(x.state.specialCharge,0);});
  runCase('aug-217',()=>{const x=fixture(['aug-217']);x.state.lastValidSpecial=6;assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s',7,true)),3);},
    ()=>{const x=fixture(['aug-217']);x.state.lastValidSpecial=6;assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s',6,true)),0);});
  runCase('aug-218',()=>{const x=fixture(['aug-218']);assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s',6,true)),3);},
    ()=>{const x=fixture(['aug-218']);assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s',7,true)),0);});
  runCase('aug-219',()=>{
    const x=fixture(['aug-219']);assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s1',7,true)),7);x.run.combat.turn=2;assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s2',7,true)),0);
  },()=>{const x=fixture(['aug-219']);assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s',6,true)),0);});
  runCase('aug-220',()=>{
    const x=fixture(['aug-220']);applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s6',6,true));for(const v of [1,2,3])applyGamblerValidated(x.run,x.p,x.state,resolvedFor('o'+v,v,true));x.run.combat.turn=2;applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s7',7,true));assert.equal(x.state.fortuneStack,1);x.run.combat.turn=3;assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('pay',4,true)),1);
  },()=>{const x=fixture(['aug-220']);assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('o',4,true)),0);assert.equal(x.state.fortuneStack||0,0);});
  runCase('aug-221',()=>{
    const x=fixture(['aug-221']);for(const v of [1,2,3])applyGamblerValidated(x.run,x.p,x.state,resolvedFor('n'+v,v,true));assert.equal(x.state.cardCounterArmed,true);x.run.combat.turn=2;assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('pay',4,true)),2);
  },()=>{const x=fixture(['aug-221']);for(const [i,v] of [1,1,2].entries())applyGamblerValidated(x.run,x.p,x.state,resolvedFor('n'+i,v,true));assert.equal(Boolean(x.state.cardCounterArmed),false);});
  runCase('aug-222',()=>{
    const x=fixture(['aug-222']),ones=x.p.cardPool.filter(c=>c.baseNumber===1);x.state.remainingCardIds=[ones[0].id];x.state.drawPileIds=[ones[1].id,...x.state.drawPileIds.filter(id=>!ones.some(c=>c.id===id))];assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor(ones[0].id,1,true)),1);
  },()=>{
    const x=fixture(['aug-222']),one=x.p.cardPool.find(c=>c.baseNumber===1);x.state.remainingCardIds=[one.id];x.state.drawPileIds=x.state.drawPileIds.filter(id=>x.p.cardPool.find(c=>c.id===id)?.baseNumber!==1);assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor(one.id,1,true)),0);
  });
  runCase('aug-223',()=>{const x=fixture(['aug-223']);x.state.discardMemoryNumber=2;assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('m',2,true)),1);},
    ()=>{const x=fixture(['aug-223']);x.state.discardMemoryNumber=2;assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('m',3,true)),0);});
  runCase('aug-224',()=>{const x=fixture(['aug-224']);x.state.currentPrediction=[2,3];assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('p',2,true)),1);},
    ()=>{const x=fixture(['aug-224']);x.state.currentPrediction=[2,3];assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('p',4,true)),0);});
  runCase('aug-225',()=>{
    const x=fixture(['aug-225']);for(const v of [1,2,3])applyGamblerValidated(x.run,x.p,x.state,resolvedFor('q'+v,v,true));assert.equal(x.state.sequenceArmed,true);x.run.combat.turn=2;assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('pay',5,true)),3);
  },()=>{const x=fixture(['aug-225']);for(const v of [1,3,5])applyGamblerValidated(x.run,x.p,x.state,resolvedFor('q'+v,v,true));assert.equal(x.state.sequenceArmed,false);});
  runCase('aug-226',()=>{
    const x=fixture(['aug-226']);let last=0;for(const [i,v] of [1,1,2,3,4].entries()){x.run.combat.turn=i+1;last=applyGamblerValidated(x.run,x.p,x.state,resolvedFor('h'+i,v,true));}assert.equal(last,2);
  },()=>{
    const x=fixture(['aug-226']);let last=0;for(const [i,v] of [1,2,3,4,5].entries()){x.run.combat.turn=i+1;last=applyGamblerValidated(x.run,x.p,x.state,resolvedFor('h'+i,v,true));}assert.equal(last,0);
  });
  runCase('aug-227',()=>{
    const x=fixture(['aug-227']);for(const v of [1,2,3,4,5])applyGamblerValidated(x.run,x.p,x.state,resolvedFor('f'+v,v,true));assert.equal(x.state.fiveMemoryArmed,true);x.run.combat.turn=2;assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s',6,true)),4);
  },()=>{
    const x=fixture(['aug-227']);for(const v of [1,2,3,4])applyGamblerValidated(x.run,x.p,x.state,resolvedFor('f'+v,v,true));assert.equal(applyGamblerValidated(x.run,x.p,x.state,resolvedFor('s',6,true)),0);
  });
  runCase('aug-228',()=>{
    const x=fixture(['aug-228']);drawGamblerHand(x.run,x.p,x.state);setGamblerDrawPreference(x.run,x.p,x.state,'LOW');const values=x.state.remainingCardIds.map(id=>x.p.cardPool.find(c=>c.id===id).baseNumber);assert.ok(values.some(v=>v<=3));
  },()=>{const x=fixture(['aug-228']);drawGamblerHand(x.run,x.p,x.state);assert.throws(()=>setGamblerDrawPreference(x.run,x.p,x.state,'BAD'));});
  runCase('aug-229',()=>{
    const x=fixture(['aug-221','aug-229']);let last=0;for(const v of [1,2,3])last=applyGamblerValidated(x.run,x.p,x.state,resolvedFor('k'+v,v,true));assert.equal(last,3);assert.equal(x.state.lastCountingCombo,'COUNTER3');
  },()=>{
    const x=fixture(['aug-221','aug-229']);x.state.lastCountingCombo='COUNTER3';let last=0;for(const v of [1,2,3])last=applyGamblerValidated(x.run,x.p,x.state,resolvedFor('k'+v,v,true));assert.equal(last,0);
  });
  runCase('aug-230',()=>{
    const x=fixture(['aug-230']);drawGamblerHand(x.run,x.p,x.state);setGamblerDrawPreference(x.run,x.p,x.state,[1,4,5]);const values=x.state.remainingCardIds.map(id=>x.p.cardPool.find(c=>c.id===id).baseNumber);assert.ok(values.some(v=>[1,4,5].includes(v)));
  },()=>{const x=fixture(['aug-230']);drawGamblerHand(x.run,x.p,x.state);assert.throws(()=>setGamblerDrawPreference(x.run,x.p,x.state,[1,1,5]));});
  runCase('aug-231',()=>{
    const x=fixture(['aug-231']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),7);assert.equal(r.allIn,true);
  },()=>{
    const x=fixture(['aug-231']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,false);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);finalizeGamblerAllIn(x.run,x.p,x.state,r);assert.equal(x.state.history.some(e=>e.type==='ALL_IN_DAMAGE'),false);
  });
  runCase('aug-232',()=>{
    const x=fixture(['aug-231','aug-232']),[a]=setHand(x,[3,5]),r=resolvedFor(a,3,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,3),10);
  },()=>{
    const x=fixture(['aug-231','aug-232']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),7);
  });
  runCase('aug-233',()=>{
    const x=fixture(['aug-231','aug-233']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,false);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);finalizeGamblerAllIn(x.run,x.p,x.state,r);settleGamblerHand(x.run,x.p,x.state,a,2,{rootActionId:'insurance'});assert.equal(x.state.remainingCardIds.length,2);assert.equal(x.state.insuranceUsed,true);
  },()=>{
    const x=fixture(['aug-231','aug-233']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);finalizeGamblerAllIn(x.run,x.p,x.state,r);settleGamblerHand(x.run,x.p,x.state,a,2,{rootActionId:'insurance-ok'});assert.equal(x.state.insuranceUsed||false,false);assert.equal(x.state.remainingCardIds.length,1);
  });
  runCase('aug-234',()=>{
    const x=fixture(['aug-231','aug-234']),[a]=setHand(x,[2,3]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),6);
  },()=>{
    const x=fixture(['aug-231','aug-234']),[a]=setHand(x,[2,4]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),6);
  });
  runCase('aug-235',()=>{
    const x=fixture(['aug-231','aug-235']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);finalizeGamblerAllIn(x.run,x.p,x.state,r);assert.equal(x.state.doubleDownReady,true);
  },()=>{
    const x=fixture(['aug-231','aug-235']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,false);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);finalizeGamblerAllIn(x.run,x.p,x.state,r);assert.equal(x.state.doubleDownReady,false);
  });
  runCase('aug-236',()=>{
    const x=fixture(['aug-231','aug-236']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);assert.equal(r.gamblerBorrowBonus,1);assert.equal(x.state.weakenedBorrowedIds.length,1);
  },()=>{
    const x=fixture(['aug-231','aug-236']),[a]=setHand(x,[2,5]);x.state.drawPileIds=[];const r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);assert.equal(r.gamblerBorrowBonus,0);assert.equal(x.state.weakenedBorrowedIds.length,0);
  });
  runCase('aug-237',()=>{
    const x=fixture(['aug-231','aug-237']),[a]=setHand(x,[2,6]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);const d=gamblerSetDamage(x.run,x.p,x.state,r,2);finalizeGamblerActualDamage(x.run,x.p,x.state,r,d);assert.equal(x.state.aug237Used,true);assert.equal(x.state.pendingAllIn.aug237Reduced,true);
  },()=>{
    const x=fixture(['aug-231','aug-237']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);const d=gamblerSetDamage(x.run,x.p,x.state,r,2);finalizeGamblerActualDamage(x.run,x.p,x.state,r,d);assert.equal(x.state.aug237Used,false);
  });
  runCase('aug-238',()=>{
    const x=fixture(['aug-231','aug-238']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);assert.equal(r.allAssets,true);assert.equal(r.allInValues.length,3);assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),17);
  },()=>{
    const x=fixture(['aug-231','aug-238']),special=x.p.cardPool.find(c=>c.baseNumber===6).id;setHand(x,[2,5]);x.state.drawPileIds=x.state.drawPileIds.filter(id=>id!==special);x.state.vanishedCardIds=[special];const a=x.state.remainingCardIds[0],r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);assert.equal(r.allAssets,false);assert.equal(r.allInValues.length,2);
  });
  runCase('aug-239',()=>{
    const x=fixture(['aug-231','aug-239']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);finalizeGamblerAllIn(x.run,x.p,x.state,r);assert.equal(x.state.allInWinStreak,1);assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),8);
  },()=>{
    const x=fixture(['aug-231','aug-239']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,false);x.state.allInWinStreak=2;prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);finalizeGamblerAllIn(x.run,x.p,x.state,r);assert.equal(x.state.allInWinStreak,0);
  });
  runCase('aug-240',()=>{
    const x=fixture(['aug-231','aug-240']),[a]=setHand(x,[2,5]),r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),15);assert.equal(x.state.houseUsed,true);
  },()=>{
    const x=fixture(['aug-231','aug-240']),[a]=setHand(x,[2,5]);x.state.houseUsed=true;const r=resolvedFor(a,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:a},r);assert.equal(gamblerSetDamage(x.run,x.p,x.state,r,2),7);
  });

  const expected=Array.from({length:30},(_,i)=>'aug-'+String(211+i).padStart(3,'0'));
  assert.deepEqual([...covered].sort(),expected);
  assert.deepEqual([...negative].sort(),expected);
});


test('005C-C physical 6 and unlocked 7 both move HAND to VANISHED and never re-enter reshuffle',()=>{
  const a=fixture(),six=a.p.cardPool.find(card=>card.baseNumber===6).id;
  const ordinary=a.p.cardPool.find(card=>card.baseNumber===1).id;
  a.state.remainingCardIds=[six,ordinary];a.state.drawPileIds=a.p.cardPool.filter(card=>![six,ordinary].includes(card.id)).map(card=>card.id);a.state.deckInitialized=true;
  settleGamblerHand(a.run,a.p,a.state,six,6,{rootActionId:'six-vanish'});
  assert.ok(a.state.vanishedCardIds.includes(six));assert.ok(!a.state.discardPileIds.includes(six));

  const b=fixture();b.state.sevenProgress=[1,2,3,4];
  const five=b.p.cardPool.find(card=>card.baseNumber===5).id,other=b.p.cardPool.find(card=>card.baseNumber===1).id;
  b.state.remainingCardIds=[five,other];b.state.drawPileIds=b.p.cardPool.filter(card=>![five,other].includes(card.id)).map(card=>card.id);b.state.deckInitialized=true;
  settleGamblerHand(b.run,b.p,b.state,five,5,{rootActionId:'unlock-seven'});
  const seven=b.p.cardPool.find(card=>card.baseNumber===7);assert.ok(seven);assert.ok(b.state.discardPileIds.includes(seven.id));
  const partner=b.state.remainingCardIds[0]||b.p.cardPool.find(card=>card.baseNumber===2).id;
  b.state.remainingCardIds=[seven.id,partner];b.state.drawPileIds=b.state.drawPileIds.filter(id=>id!==partner&&id!==seven.id);b.state.discardPileIds=b.state.discardPileIds.filter(id=>id!==seven.id&&id!==partner);
  settleGamblerHand(b.run,b.p,b.state,seven.id,7,{rootActionId:'seven-vanish'});
  assert.ok(b.state.vanishedCardIds.includes(seven.id));assert.ok(!b.state.discardPileIds.includes(seven.id));
  b.state.drawPileIds=[];drawGamblerHand(b.run,b.p,b.state);
  assert.ok(!b.state.drawPileIds.includes(seven.id));assert.ok(!b.state.remainingCardIds.includes(seven.id));
});

test('005C-C reconnect clone preserves exact zones history counters pending All-In and draw choice state',()=>{
  const x=fixture(['aug-231','aug-230']);drawGamblerHand(x.run,x.p,x.state);
  if(x.state.drawChoicePending==='AUG_230')setGamblerDrawPreference(x.run,x.p,x.state,[1,3,5]);
  const judgment=x.state.remainingCardIds[0],value=x.p.cardPool.find(card=>card.id===judgment).baseNumber,resolved=resolvedFor(judgment,value,true);
  prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:judgment},resolved);
  x.state.sixProgress=[1,2];x.state.sevenProgress=[1,2,3];x.state.cardCounter=2;
  const snap=structuredClone(x.run),before=x.run.combat.privateByPlayer.p0,after=snap.combat.privateByPlayer.p0;
  for(const key of ['drawPileIds','remainingCardIds','discardPileIds','vanishedCardIds','history','sixProgress','sevenProgress','pendingAllIn','telemetry'])assert.deepEqual(after[key],before[key],key);
  assert.equal(after.unlockSerial,before.unlockSerial);assert.equal(after.drawCount,before.drawCount);assert.equal(after.shuffleCount,before.shuffleCount);
});

test('005C-C Gambler telemetry is retry-safe for All-In attempt success damage and Luck spend',()=>{
  const x=fixture(['aug-231']);initializeGamblerCombat(x.run,x.p,x.state);
  const [judgment]=setHand(x,[2,5]),r=resolvedFor(judgment,2,true);
  prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:judgment},r);
  const retry=resolvedFor(judgment,2,true);prepareGamblerAllIn(x.run,x.p,x.state,{cardInstanceId:judgment},retry);
  assert.equal(x.state.telemetry.allInAttempt,1);
  const damage=gamblerSetDamage(x.run,x.p,x.state,r,2);assert.equal(gamblerSetDamage(x.run,x.p,x.state,retry,2),damage);
  assert.equal(x.state.telemetry.allInDamage,damage);
  finalizeGamblerAllIn(x.run,x.p,x.state,r);finalizeGamblerAllIn(x.run,x.p,x.state,retry);
  assert.equal(x.state.telemetry.allInSuccess,1);
  x.state.luck=1;
  assert.equal(consumeGamblerLuck(x.run,x.p,x.state,'luck-retry'),true);
  assert.equal(consumeGamblerLuck(x.run,x.p,x.state,'luck-retry'),false);
  assert.equal(x.state.telemetry.luckUsed,1);
});
