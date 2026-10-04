import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {applyMonsterDamage} from '../supabase/functions/game-api/pve/monster.js';
import {resolveGuardianWallCollisions} from '../supabase/functions/game-api/pve/characters.js';
import {applyOwnedEffects} from '../supabase/functions/game-api/pve/effects.js';
import {enterEventRoom,submitEventCard} from '../supabase/functions/game-api/pve/events.js';

function runWithKnight(augments){
  const ids=['warrior','adventurer','adventurer','adventurer'];
  const players=ids.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  players[0].augments=[...augments];
  const run={id:'005b-high-risk',seed:'005b-seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});
  run.combat.id='005b-combat';
  beginTurn(run);
  return run;
}
function card(run,seat,n){
  const p=run.players[seat],privateState=run.combat.privateByPlayer[p.playerId];
  return p.cardPool.find(c=>c.baseNumber===n&&privateState.remainingCardIds.includes(c.id))?.id;
}
function turn(run,numbers,knightSkill=true){
  numbers.forEach((n,seat)=>{const id=card(run,seat,n);assert.ok(id);submitCard(run,'p'+seat,id,seat===0&&knightSkill);});
  return resolveBasicTurn(run);
}

test('aug-049 redirects one further direct hit after the base Guardian Wall redirect and survives reconnect',()=>{
  const run=runWithKnight(['aug-041','aug-049']);
  const result=turn(run,[3,3,1,2]);
  assert.equal(result.cards.find(c=>c.playerId==='p1').valid,true);
  assert.equal(result.cards.find(c=>c.playerId==='p0').guardianSacrifice,true);
  const mark=run.augmentFramework.statuses.find(s=>s.sourceId==='aug-049');
  assert.equal(mark?.targetId,'p1');
  assert.equal(mark?.payload.ready,false);
  const target=run.players[1],guard=run.players[0];
  const first=applyMonsterDamage(run,target,1,'DIRECT');
  assert.equal(first.find(e=>e.type==='PLAYER_DAMAGED').playerId,guard.playerId);
  assert.equal(mark.payload.ready,true);
  const restored=structuredClone(run);
  const second=applyMonsterDamage(restored,restored.players[1],1,'DIRECT');
  assert.equal(second.find(e=>e.type==='PLAYER_DAMAGED').playerId,guard.playerId);
  assert.equal(restored.augmentFramework.statuses.some(s=>s.sourceId==='aug-049'),false);
  const third=applyMonsterDamage(restored,restored.players[1],1,'DIRECT');
  assert.equal(third.find(e=>e.type==='PLAYER_DAMAGED').playerId,target.playerId);
});

test('aug-052 ignores exactly one armor before mitigation only on a true Toughness crush',()=>{
  const baseline=runWithKnight(['aug-051']);
  const pierced=runWithKnight(['aug-051','aug-052']);
  baseline.combat.monster.defense=2;
  pierced.combat.monster.defense=2;
  const ordinary=turn(baseline,[5,5,1,2]);
  const enhanced=turn(pierced,[5,5,1,2]);
  const ordinaryPacket=ordinary.damagePackets.find(p=>p.playerId==='p0');
  const enhancedPacket=enhanced.damagePackets.find(p=>p.playerId==='p0');
  assert.equal(enhancedPacket.amount,ordinaryPacket.amount+1);
  assert.equal(enhancedPacket.armorPenetration,1);
  assert.ok(enhancedPacket.modifierIds.includes('AUG_052_ARMOR_PENETRATION'));
  const noArmor=runWithKnight(['aug-051','aug-052']);
  const noArmorResult=turn(noArmor,[5,5,1,2]);
  assert.equal(noArmorResult.damagePackets.find(p=>p.playerId==='p0').armorPenetration,0);
});

for(const phase of ['EVENT','REWARD_ROOM'])test('aug-041 Guardian Wall rescues an ally in '+phase,()=>{
  const run=runWithKnight(['aug-041']);
  run.phase=phase;
  run.roomState={turnSubmissions:{p0:{skillIntent:true},p1:{skillIntent:false}},privateByPlayer:{}};
  run.combat=null;
  const cards=[
    {playerId:'p0',finalNumber:3,valid:false,invalidReason:'COLLISION'},
    {playerId:'p1',finalNumber:3,valid:false,invalidReason:'COLLISION'}
  ];
  const groups=new Map([[3,cards]]);
  assert.equal(resolveGuardianWallCollisions(run,cards,groups,[]),1);
  assert.equal(cards[1].valid,true);
  assert.equal(run.players[0].publicResources.guardianTargetPlayerId,undefined);
});

test('aug-061 increments to cap two, consumes the prior stack, and stays out of Reward ranking',()=>{
  const run=runWithKnight(['aug-061']);
  run.players[0].characterId='rogue';
  run.players[0].publicResources.sneakyStack=2;
  const result=turn(run,[2,3,4,5],false);
  const packet=result.damagePackets.find(p=>p.playerId==='p0');
  assert.equal(result.cards.find(c=>c.playerId==='p0').sneakyBonus,2);
  assert.equal(packet.amount,7);
  assert.equal(run.players[0].publicResources.sneakyStack,0);
  run.phase='REWARD_ROOM';
  const resolved={valid:true,soloLowest:true,sneakyBonus:2},damage={amount:5};
  applyOwnedEffects(run,'CARD_VALIDATED',{player:run.players[0],resolved});
  applyOwnedEffects(run,'BEFORE_DAMAGE',{player:run.players[0],resolved,damage});
  assert.equal(damage.amount,5);
});

test('aug-049 mark is removed when its Guardian goes down',()=>{
  const run=runWithKnight(['aug-041','aug-049']);
  turn(run,[3,3,1,2]);
  run.players[0].hp=1;
  const first=applyMonsterDamage(run,run.players[1],1,'DIRECT');
  assert.equal(first.find(e=>e.type==='PLAYER_DAMAGED').playerId,'p0');
  assert.equal(run.augmentFramework.statuses.some(s=>s.sourceId==='aug-049'),false);
  const second=applyMonsterDamage(run,run.players[1],1,'DIRECT');
  assert.equal(second.find(e=>e.type==='PLAYER_DAMAGED').playerId,'p1');
});

test('aug-041 rescue participates in a complete Event resolution',()=>{
  const ids=['warrior','adventurer','adventurer','adventurer'];
  const players=ids.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  players[0].augments=['aug-041'];
  const run={id:'005b-event',roomId:'room',seed:'005b-event',rngCounter:0,phase:'ROOM_ENTER',floor:1,depth:2,flame:3,maxFlame:5,currentRoomNodeId:'event-node',players,relicCatalog:[]};
  enterEventRoom(run);
  [3,3,1,2].forEach((number,seat)=>{
    const p=players[seat],state=run.roomState.privateByPlayer[p.playerId];
    const id=p.cardPool.find(c=>c.baseNumber===number&&state.remainingCardIds.includes(c.id))?.id;
    assert.ok(id);
    submitEventCard(run,p.playerId,id,seat===0);
  });
  const cards=run.roomState.publicTurnResult.cards;
  assert.equal(cards.find(c=>c.playerId==='p1').valid,true);
  assert.equal(cards.find(c=>c.playerId==='p0').valid,false);
});
