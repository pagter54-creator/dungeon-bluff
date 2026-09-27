import test from 'node:test';
import assert from 'node:assert/strict';
import {AUGMENT_BY_ID} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {newPlayerRunState,newCombatState,PVE_STATUS_LABELS} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {grantRunGold} from '../supabase/functions/game-api/pve/characters.js';
import {F1_RELIC_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';

function makeRun(characterIds,augmentIdsByPlayer=[]){
  const players=characterIds.map((character_id,i)=>newPlayerRunState({
    id:`p${i}`,user_id:`u${i}`,member_type:'human',character_id,seat_index:i
  }));
  players.forEach((p,i)=>{
    p.augments=[...(augmentIdsByPlayer[i]||[])];
    const def=p.augments.map(id=>AUGMENT_BY_ID[id]).find(Boolean);
    if(def)p.augmentBuild=def.build;
  });
  const run={
    id:'t00-unit',roomId:'room',seed:'t00-unit-seed',rngCounter:0,version:0,
    phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'t00-unit-node',
    players,usedMonsterIds:[],chosenBossIds:{},map:{nodes:[],edges:{}}
  };
  installRelicCatalog(run,F1_RELIC_DEFINITIONS);
  const monster={id:'t00-dummy',name:'T00 Dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'fixture',payload:{}}]};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',monster);
  run.combat.id='t00-unit-combat';
  beginTurn(run);
  return run;
}
function cardId(run,pid,number){
  const p=run.players.find(x=>x.playerId===pid),priv=run.combat.privateByPlayer[pid];
  return p.cardPool.find(c=>c.baseNumber===number&&priv.remainingCardIds.includes(c.id))?.id;
}
function submitNums(run,nums,skills={}){
  nums.forEach((n,i)=>{
    const id=cardId(run,`p${i}`,n);assert.ok(id,`p${i} missing card ${n}`);
    submitCard(run,`p${i}`,id,Boolean(skills[`p${i}`]));
  });
  const result=resolveBasicTurn(run);assert.ok(result);return result;
}

test('T00 Adventurer base grants +1 EXP on valid monster attack and +1G on positive reward',()=>{
  const run=makeRun(['adventurer','warrior','mage','rogue']);
  const before=run.players[0].growthExp;
  submitNums(run,[5,2,3,1]);
  assert.equal(run.players[0].growthExp,before+1);
  const p=run.players[0],gold=p.runGold;
  assert.equal(grantRunGold(p,1),2);
  assert.equal(p.runGold,gold+2);
});

test('T00 Knight Indomitable raises Toughness cap to 3 and grants one direct-damage reduction after real collision penetration',()=>{
  const run=makeRun(['warrior','adventurer','adventurer','adventurer'],[['aug-031']]);
  const knight=run.players[0];
  assert.equal(knight.publicResources.toughnessCharges,1);
  assert.equal(knight.publicResources.toughnessChargesMax,3);
  run.combat.monster.intent={type:'DIRECT_DAMAGE',telegraphText:'fixture',payload:{targetPlayerId:'p0',amount:1}};
  const result=submitNums(run,[5,5,2,3],{p0:true});
  const own=result.cards.find(x=>x.playerId==='p0'),other=result.cards.find(x=>x.playerId==='p1');
  assert.equal(own.valid,true);assert.equal(own.collisionImmune,true);assert.equal(own.collisionGroupSize,2);
  assert.equal(other.valid,false);assert.equal(other.invalidReason,'COLLISION');
  assert.equal(knight.hp,3);
  assert.equal(knight.publicResources.unyielding,0);
  assert.equal(knight.publicResources.toughnessCharges,0);
});

test('T00 Grand Amplification raises Mana cap to 6 and 6 Mana changes the actual final number by +3 before collision',()=>{
  const run=makeRun(['mage','adventurer','adventurer','adventurer'],[['aug-091']]);
  const mage=run.players[0];
  assert.equal(mage.publicResources.manaMax,6);
  mage.publicResources.mana=6;
  const result=submitNums(run,[4,1,2,3],{p0:true});
  const card=result.cards.find(x=>x.playerId==='p0');
  assert.equal(card.baseNumber,4);assert.equal(card.finalNumber,7);
  assert.equal(card.skillUsed,'amplify');assert.equal(card.skillValue,3);assert.equal(card.resourceSpent,6);
  // The resolve immediately opens the next turn, so spending 6 is followed by the normal TURN_START +1.
  assert.equal(mage.publicResources.mana,1);
});

test('T00 Rogue base Sneaky Strike sets solo-lowest damage to 5 and tier-1 sneakiness strengthens the next solo-lowest hit',()=>{
  const run=makeRun(['rogue','adventurer','adventurer','adventurer'],[['aug-061']]);
  const rogue=run.players[0];
  let result=submitNums(run,[1,3,4,5]);
  let card=result.cards.find(x=>x.playerId==='p0');
  let packet=result.damagePackets.find(x=>x.sourcePlayerId==='p0'&&!x.followUp);
  assert.equal(card.soloLowest,true);assert.equal(packet.amount,5);assert.equal(rogue.publicResources.sneakyStack,1);

  result=submitNums(run,[1,2,3,4]);
  card=result.cards.find(x=>x.playerId==='p0');
  packet=result.damagePackets.find(x=>x.sourcePlayerId==='p0'&&!x.followUp);
  assert.equal(card.soloLowest,true);assert.equal(card.sneakyBonus,1);assert.equal(packet.amount,6);
  assert.equal(rogue.publicResources.sneakyStack,1);

  // Keep physical-card consumption honest: p3 still owns an unused 3 for the collision fixture.
  result=submitNums(run,[3,4,5,3]);
  card=result.cards.find(x=>x.playerId==='p0');
  assert.equal(card.valid,false);assert.equal(card.invalidReason,'COLLISION');
  assert.equal(rogue.publicResources.sneakyStack,0);
});

test('RULE-05 clears COMBAT-scoped resources at COMBAT_END while preserving run-persistent state',()=>{
  const run=makeRun(
    ['adventurer','warrior','mage','rogue'],
    [['aug-001'],['aug-031'],['aug-091'],['aug-061']]
  );
  run.players[0].runGold=7;
  run.players[0].engravings['5']=2;
  run.combat.monster.hp=1;
  submitNums(run,[5,4,3,1]);
  assert.equal(run.phase,'ROOM_RESULT');
  for(const p of run.players){
    for(const key of ['mana','manaMax','toughnessCharges','toughnessChargesMax','veteranStreak','unyielding','sneakyStack','armor']){
      assert.equal(Object.hasOwn(p.publicResources,key),false,`${p.playerId} leaked ${key}`);
    }
  }
  assert.equal(run.players[0].runGold,9);
  assert.equal(run.players[0].engravings['5'],2);
  assert.deepEqual(run.players[0].augments,['aug-001']);
});

test('RULE-04 exposes distinct canonical labels for stun and down',()=>{
  assert.equal(PVE_STATUS_LABELS.STUNNED_NEXT_TURN,'기절');
  assert.equal(PVE_STATUS_LABELS.DOWNED,'쓰러짐');
  assert.notEqual(PVE_STATUS_LABELS.STUNNED_NEXT_TURN,PVE_STATUS_LABELS.DOWNED);
});
