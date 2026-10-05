import test from 'node:test';
import assert from 'node:assert/strict';
import {F1_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {publishMonsterIntent,executeMonsterIntent} from '../supabase/functions/game-api/pve/monster.js';
import {applyMonsterCardRules,recordMonsterDamageBatch,prepareMonsterAction,monsterPresentation} from '../supabase/functions/game-api/pve/monster-behavior.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {advanceCompletedFloor} from '../supabase/functions/game-api/pve/floor-transition.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';

function make(id){
  const def=F1_MONSTER_DEFINITIONS[id];
  const players=Array.from({length:4},(_,seat)=>newPlayerRunState({id:`p${seat}`,user_id:`u${seat}`,seat_index:seat,member_type:'human',character_id:'adventurer'}));
  const run={id:'same-run',seed:'monster-replay',rngCounter:0,phase:'COMBAT',floor:1,depth:1,currentRoomNodeId:'f1-d1-n0',flame:4,maxFlame:5,players,cardCycles:{},map:{depthCount:8}};
  run.combat=newCombatState(players,def.baseHp,def.tier==='BOSS'?'BOSS':def.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT',def);
  return run;
}
function cards(numbers,valid=numbers.map(()=>true)){
  return numbers.map((n,i)=>({playerId:`p${i}`,finalNumber:n,valid:valid[i],...(valid[i]?{}:{invalidReason:'COLLISION'})}));
}
function turn(run,numbers,valid){
  const intent=publishMonsterIntent(run);
  applyMonsterCardRules(run,cards(numbers,valid));
  return {intent,action:prepareMonsterAction(run,intent)};
}

test('CONTENT-001B full registry is executable, telegraphed, projected, and deterministic',()=>{
  const defs=Object.values(F1_MONSTER_DEFINITIONS);
  assert.deepEqual(['NORMAL','ELITE','BOSS'].map(tier=>defs.filter(def=>def.tier===tier).length),[7,3,2]);
  for(const def of defs){
    assert.ok(def.mechanic?.type&&def.ruleSummary&&def.pattern?.length,def.id);
    const a=make(def.id),b=make(def.id);
    const ai=publishMonsterIntent(a),bi=publishMonsterIntent(b);
    assert.deepEqual(ai,bi,def.id);
    assert.ok(ai.telegraphText.includes(def.ruleSummary),def.id);
    assert.ok(monsterPresentation(a).ruleSummary,def.id);
    const projected=projectRun(a,'p0');
    assert.equal(projected.combat.monster.mechanic,undefined,def.id);
    assert.equal(projected.combat.monster.behaviorState,undefined,def.id);
    assert.ok(projected.combat.monster.presentation,def.id);
    a.combat.monster.hp=0;a.phase='ROOM_RESULT';delete a.combat;
    assert.equal(a.combat,undefined,def.id);
  }
});

const cases=[
  ['F1-N01 iron boar','f1_armored_boar',(run)=>{
    assert.equal(run.combat.monster.behaviorState.armor,2);
    const c=cards([1,2,3,4]);applyMonsterCardRules(run,c);
    assert.deepEqual(c.map(x=>x.monsterDamagePenalty||0),[1,1,0,0]);assert.equal(run.combat.monster.behaviorState.armor,0);
    const bad=make('f1_armored_boar');applyMonsterCardRules(bad,cards([1,1,2,2],[false,false,false,false]));assert.equal(bad.combat.monster.behaviorState.armor,2);
  }],
  ['F1-N02 coward hunter','f1_coward_hunter',(run)=>{
    run.combat.turn=3;const success=turn(run,[1,2,3,4]);assert.ok(success.intent.payload.targetPlayerId);assert.equal(success.action.type,'CHARGE');
    const bad=make('f1_coward_hunter');bad.combat.turn=3;assert.equal(turn(bad,[1,1,2,2],[false,false,false,false]).action.type,'DIRECT_DAMAGE');
  }],
  ['F1-N03 rusty ballista','f1_rusty_ballista',(run)=>{
    run.combat.turn=4;const success=turn(run,[1,2,3,4]);assert.equal(success.action.type,'CHARGE');
    const bad=make('f1_rusty_ballista');bad.combat.turn=4;assert.equal(turn(bad,[1,1,2,2],[false,false,false,false]).action.type,'AOE_DAMAGE');
  }],
  ['F1-N04 gate guard dog','f1_gate_guard_dog',(run)=>{
    turn(run,[1,4,4,2],[true,true,true,true]);assert.equal(run.combat.monster.behaviorState.lastHighestPlayerId,'p1');
    run.combat.turn=2;assert.equal(publishMonsterIntent(run).payload.targetPlayerId,'p1');
    const bad=make('f1_gate_guard_dog');turn(bad,[1,1,2,2],[false,false,false,false]);assert.equal(bad.combat.monster.behaviorState.lastHighestPlayerId,null);
  }],
  ['F1-N05 sewer rat swarm','f1_sewer_rat_swarm',(run)=>{
    turn(run,[1,1,2,2],[false,false,false,false]);assert.equal(run.combat.monster.behaviorState.stacks.swarm,2);
    run.combat.turn=3;const attack=turn(run,[1,1,2,2],[false,false,false,false]);assert.equal(attack.action.type,'AOE_DAMAGE');
    const bad=make('f1_sewer_rat_swarm');bad.combat.monster.behaviorState.stacks.swarm=2;turn(bad,[1,2,3,4]);assert.equal(bad.combat.monster.behaviorState.stacks.swarm,1);
  }],
  ['F1-N06 graveyard sentinel','f1_graveyard_sentinel',(run)=>{
    turn(run,[1,2,3,4]);assert.equal(run.combat.monster.behaviorState.guardPending,false);
    applyMonsterCardRules(run,cards([1,1,2,2],[false,false,true,true]));executeMonsterIntent(run);assert.equal(run.combat.monster.defense,1);
  }],
  ['F1-N07 chain jailer','f1_chain_jailer',(run)=>{
    turn(run,[1,2,3,4]);assert.equal(run.combat.monster.behaviorState.forbiddenNumber,1);
    const c=cards([1,2,3,4]);applyMonsterCardRules(run,c);assert.equal(c[0].monsterDamagePenalty,1);
    assert.equal(run.players[0].publicResources.chain,1);assert.equal(c[1].monsterDamagePenalty,undefined);
    executeMonsterIntent(run);assert.equal(run.players[0].publicResources.chain,undefined);
  }],
  ['F1-E01 echo bat','f1_echo_bat',(run)=>{
    turn(run,[1,2,3,4]);run.combat.turn=2;turn(run,[1,2,5,6]);assert.equal(run.combat.monster.behaviorState.stacks.echo,2);
    run.combat.turn=7;const a=turn(run,[1,2,3,4]);assert.equal(a.action.payload.amount,2);
    const bad=make('f1_echo_bat');turn(bad,[1,2,3,4]);bad.combat.turn=2;turn(bad,[4,5,6,7]);assert.equal(bad.combat.monster.behaviorState.stacks.echo,1);
  }],
  ['F1-E02 siege captain','f1_siege_captain',(run)=>{
    run.combat.turn=2;assert.equal(turn(run,[1,2,3,4]).action.type,'CHARGE');
    const bad=make('f1_siege_captain');bad.combat.turn=3;assert.equal(turn(bad,[1,1,2,2],[false,false,false,false]).action.type,'AOE_DAMAGE');
  }],
  ['F1-E03 iron bell keeper','f1_iron_bell_keeper',(run)=>{
    publishMonsterIntent(run);const c=cards([1,2,3,4]);applyMonsterCardRules(run,c);
    assert.deepEqual(c.map(x=>x.monsterDamagePenalty||0),[0,1,0,1]);executeMonsterIntent(run);
    assert.equal(run.combat.monster.behaviorState.phase,'EVEN');
  }],
  ['F1-B01 fallen lord','f1_fallen_lord',(run)=>{
    turn(run,[1,2,3,4]);assert.equal(run.combat.monster.behaviorState.meter,0);
    applyMonsterCardRules(run,cards([1,1,2,2],[false,false,false,false]));assert.equal(run.combat.monster.behaviorState.meter,1);
    for(let i=0;i<5;i++)applyMonsterCardRules(run,cards([1,1,2,2],[false,false,false,false]));
    assert.equal(run.combat.monster.behaviorState.meter,3);
    for(let i=0;i<5;i++)applyMonsterCardRules(run,cards([1,2,3,4]));
    assert.equal(run.combat.monster.behaviorState.meter,0);
  }],
  ['F1-B02 gatebreaker colossus','f1_gatebreaker_colossus',(run)=>{
    publishMonsterIntent(run);recordMonsterDamageBatch(run,10);recordMonsterDamageBatch(run,10);recordMonsterDamageBatch(run,10);
    assert.equal(run.combat.monster.behaviorState.pendingFailure,false);
    const over=make('f1_gatebreaker_colossus');recordMonsterDamageBatch(over,31);recordMonsterDamageBatch(over,0);recordMonsterDamageBatch(over,0);assert.equal(over.combat.monster.behaviorState.pendingFailure,false);
    const bad=make('f1_gatebreaker_colossus');publishMonsterIntent(bad);recordMonsterDamageBatch(bad,10);recordMonsterDamageBatch(bad,10);recordMonsterDamageBatch(bad,9);
    assert.equal(bad.combat.monster.behaviorState.pendingFailure,true);
    assert.equal(prepareMonsterAction(bad,bad.combat.monster.intent).type,'AOE_DAMAGE');
    const cycle=bad.combat.monster.behaviorState.cycle;executeMonsterIntent(bad);assert.equal(bad.combat.monster.behaviorState.cycle,cycle+1);
    assert.equal(bad.combat.monster.behaviorState.pendingFailure,false);
  }]
];

for(const [label,id,verify] of cases)test(label,()=>{const run=make(id);verify(run);assert.ok(monsterPresentation(run)?.ruleSummary);});

for(const bossId of ['f1_fallen_lord','f1_gatebreaker_colossus'])test(`${bossId} death during its mechanic window pays once and skips the enemy action`,()=>{
  const run=make(bossId);run.combat.monster.hp=1;run.combat.turn=3;
  beginTurn(run);
  for(let i=0;i<4;i++){
    const player=run.players[i],card=player.cardPool.find(item=>item.baseNumber===i+1);
    submitCard(run,player.playerId,card.id);
  }
  const result=resolveBasicTurn(run);
  assert.equal(result.events.filter(event=>event.type==='PLAYER_DAMAGED').length,0);
  assert.equal(run.floor,2);assert.equal(run.phase,'MAP_VOTE');assert.equal(run.flame,5);
  assert.equal(run.players.every(player=>player.runGold>=3),true);
  assert.equal(advanceCompletedFloor(run),false);assert.equal(run.flame,5);
});

test('CONTENT-001B Floor 1 to Floor 2 keeps persistent state and prevents unimplemented voting',()=>{
  const run=make('f1_fallen_lord');run.phase='FLOOR_CLEAR';run.floorClear={floor:1,bossId:'f1_fallen_lord'};
  const player=run.players[0];player.hp=2;player.runGold=7;player.growthExp=51;player.score=9;player.engravings={'4':1};player.relics=['f1_worn_whetstone'];player.augments=['aug-001'];player.publicResources={mana:3,devour:2};
  const id=run.id;assert.equal(advanceCompletedFloor(run),true);assert.equal(run.id,id);assert.equal(run.floor,2);assert.equal(run.phase,'MAP_VOTE');assert.equal(run.map.depthCount,11);assert.equal(run.combat,undefined);
  assert.deepEqual([player.hp,player.runGold,player.growthExp,player.score],[2,7,51,9]);assert.equal(player.engravings['4'],1);assert.deepEqual(player.relics,['f1_worn_whetstone']);assert.deepEqual(player.augments,['aug-001']);
  assert.equal(player.publicResources.mana,undefined);assert.equal(player.publicResources.devour,2);
  assert.equal(advanceCompletedFloor(run),false);assert.equal(structuredClone(run).floor,2);
});
