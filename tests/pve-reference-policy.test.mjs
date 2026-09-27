import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENCE_NEGOTIATION_MAX_YIELDS,
  buildReferenceIntent,
  negotiateReferenceIntents,
  summarizeReferenceTurns
} from '../scripts/pve-reference-policy.mjs';

function makeView({
  playerId='p0',seat=0,characterId='adventurer',numbers=[1,2,3,4,5],
  resources={},status='ACTIVE',foreignPlayers=[]
}={}){
  const cards=numbers.map((baseNumber,i)=>({id:`${playerId}-c${i}`,baseNumber}));
  const combat={turn:1};
  Object.defineProperty(combat,'privateByPlayer',{get(){throw new Error('foreign authoritative private state accessed');}});
  return {
    seed:'unit-reference',
    currentRoomNodeId:'unit-room',
    combat,
    players:[
      {playerId,seat,characterId,status,publicResources:{...resources},cardPool:cards},
      ...foreignPlayers.map((p,i)=>({
        playerId:p.playerId||`foreign-${i}`,seat:p.seat??i+1,characterId:p.characterId||'adventurer',
        status:'ACTIVE',publicResources:{},cardPool:(p.numbers||[1,2,3]).map(baseNumber=>({baseNumber}))
      }))
    ],
    privateCombat:{playerId,remainingCardIds:cards.map(c=>c.id),spentCardIds:[]}
  };
}
function intent(opts,seed='negotiation-seed'){
  const view=makeView(opts);
  return buildReferenceIntent(view,opts.playerId,{seed,contextKey:'unit-turn'});
}

test('Reference intent reads only the owner PlayerView/private projection',()=>{
  const view=makeView({
    playerId:'p0',numbers:[2,4,5],
    foreignPlayers:[{playerId:'p1',numbers:[1,5]},{playerId:'p2',numbers:[3,4]}]
  });
  const x=buildReferenceIntent(view,'p0',{seed:'private-discipline',contextKey:'t1'});
  assert.deepEqual(x.availableNumbers,[2,4,5]);
  assert.equal(x.preferredNumbers[0],5);
  assert.equal(JSON.stringify(x).includes('p1-c'),false);
  assert.equal(Object.hasOwn(x,'cardInstanceId'),false);
});

test('Reference negotiation makes one limited concession when two bots prefer the same number and alternatives exist',()=>{
  const a=intent({playerId:'p0',seat:0,numbers:[4,5]});
  const b=intent({playerId:'p1',seat:1,numbers:[3,5]});
  const result=negotiateReferenceIntents([a,b],{seed:'basic-negotiation',contextKey:'t1'});
  const finals=result.decisions.map(x=>x.finalChoice);
  assert.equal(new Set(finals).size,2);
  assert.equal(result.decisions.filter(x=>x.negotiationChanged).length,1);
  assert.ok(result.decisions.every(x=>x.candidateTransitions<=REFERENCE_NEGOTIATION_MAX_YIELDS));
});

test('Reference negotiation preserves unavoidable collision when both bots have only the same number',()=>{
  const a=intent({playerId:'p0',seat:0,numbers:[5]});
  const b=intent({playerId:'p1',seat:1,numbers:[5]});
  const result=negotiateReferenceIntents([a,b],{seed:'unavoidable',contextKey:'t1'});
  assert.deepEqual(result.decisions.map(x=>x.finalChoice),[5,5]);
  assert.ok(result.decisions.every(x=>x.collisionExpectedAfterNegotiation));
});

test('Reference communication is fully deterministic for identical state and seed',()=>{
  const intents=[
    intent({playerId:'p0',seat:0,numbers:[3,4,5]},'same'),
    intent({playerId:'p1',seat:1,characterId:'warrior',numbers:[3,5],resources:{toughnessCharges:1}},'same'),
    intent({playerId:'p2',seat:2,characterId:'mage',numbers:[2,4],resources:{mana:6,manaMax:6}},'same'),
    intent({playerId:'p3',seat:3,characterId:'rogue',numbers:[1,3,5],resources:{sneakyStack:1}},'same')
  ];
  const a=negotiateReferenceIntents(intents,{seed:'deterministic',contextKey:'same-turn'});
  const b=negotiateReferenceIntents(intents,{seed:'deterministic',contextKey:'same-turn'});
  assert.deepEqual(a,b);
});

test('Reference policy is bounded local negotiation rather than an exhaustive assignment solver',()=>{
  assert.equal(REFERENCE_NEGOTIATION_MAX_YIELDS,2);
  const intents=Array.from({length:4},(_,i)=>intent({playerId:`p${i}`,seat:i,numbers:[3,4,5]}));
  const result=negotiateReferenceIntents(intents,{seed:'bounded',contextKey:'t1'});
  assert.equal(result.order.length,4);
  assert.ok(result.decisions.every(x=>x.candidateTransitions<=2));
});

test('Reference class heuristics cover Adventurer, Rogue, Knight and Mage without privileged state',()=>{
  const adventurer=intent({playerId:'p0',seat:0,characterId:'adventurer',numbers:[2,4,5]});
  assert.equal(adventurer.preferredNumbers[0],5);

  const rogue=intent({playerId:'p3',seat:3,characterId:'rogue',numbers:[1,4,5],resources:{sneakyStack:1}});
  const rOthers=[
    intent({playerId:'p0',seat:0,numbers:[3,5]}),
    intent({playerId:'p1',seat:1,numbers:[2,5]}),
    intent({playerId:'p2',seat:2,numbers:[4,5]})
  ];
  const rogueResult=negotiateReferenceIntents([...rOthers,rogue],{seed:'rogue-low',contextKey:'t1'});
  const rogueDecision=rogueResult.decisions.find(x=>x.playerId==='p3');
  assert.equal(rogueDecision.finalChoice,1);
  assert.equal(rogueDecision.changeReason,'ROGUE_SOLO_LOWEST_ATTEMPT');

  const mage=intent({playerId:'p2',seat:2,characterId:'mage',numbers:[4],resources:{mana:6,manaMax:6}});
  const sameFour=intent({playerId:'p0',seat:0,numbers:[4]});
  const mageResult=negotiateReferenceIntents([sameFour,mage],{seed:'mage-adjust',contextKey:'t1'});
  const mageDecision=mageResult.decisions.find(x=>x.playerId==='p2');
  assert.equal(mageDecision.skillIntent,true);
  assert.equal(mageDecision.finalChoice,7);

  const knight=intent({playerId:'p1',seat:1,characterId:'warrior',numbers:[5],resources:{toughnessCharges:1}});
  const sameFive=intent({playerId:'p0',seat:0,numbers:[5]});
  const knightResult=negotiateReferenceIntents([sameFive,knight],{seed:'knight-toughness',contextKey:'t1'});
  const knightDecision=knightResult.decisions.find(x=>x.playerId==='p1');
  assert.equal(knightDecision.skillIntent,true);
  assert.equal(knightDecision.changeReason,'KNIGHT_TOUGHNESS_PENETRATION');
});

test('Reference telemetry summary exposes conflict resolution, yield and fairness primitives',()=>{
  const summary=summarizeReferenceTurns([{
    turn:1,
    records:[
      {playerId:'p0',characterId:'adventurer',availableNumbers:[4,5],negotiationChanged:false,yielded:false,collisionExpectedBeforeNegotiation:true,collisionExpectedAfterNegotiation:false,actualCollision:false,validAttack:true,damage:5},
      {playerId:'p1',characterId:'warrior',availableNumbers:[3,5],negotiationChanged:true,yielded:true,collisionExpectedBeforeNegotiation:true,collisionExpectedAfterNegotiation:false,actualCollision:false,validAttack:true,damage:3}
    ]
  }]);
  assert.equal(summary.totalIntentConflicts,2);
  assert.equal(summary.resolvedIntentConflicts,2);
  assert.equal(summary.unresolvedIntentConflicts,0);
  assert.equal(summary.negotiationChangeCount,1);
  assert.equal(summary.negotiationResolutionRate,1);
  assert.equal(summary.byPlayer.p1.yieldCount,1);
  assert.equal(summary.byCharacter.adventurer.validAttackRate,1);
});
