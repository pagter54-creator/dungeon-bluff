import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {generateFloorMap} from '../supabase/functions/game-api/pve/map.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {publishMonsterIntent,executeMonsterIntent} from '../supabase/functions/game-api/pve/monster.js';
import {enterEventRoom,chooseEventOption} from '../supabase/functions/game-api/pve/events.js';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';
import {
  F1_MONSTER_DEFINITIONS,F1_EVENT_DEFINITIONS,F1_RELIC_DEFINITIONS,
  selectF1Monster,markF1MonsterUsed
} from '../supabase/functions/game-api/pve/content-f1.js';

function members(ids=['warrior','warrior','warrior','warrior'],ai=[]){
  return ids.map((character_id,i)=>({id:`p${i}`,user_id:ai.includes(i)?null:`u${i}`,member_type:ai.includes(i)?'ai':'human',character_id,seat_index:i}));
}
function runBase(ids,opts={}){
  const players=members(ids,opts.ai||[]).map(newPlayerRunState);
  const run={id:'f1-run',roomId:'room',seed:opts.seed||'f1-seed',rngCounter:0,version:0,phase:'MAP_VOTE',floor:1,depth:0,flame:opts.flame??3,maxFlame:5,map:null,currentRoomNodeId:null,players,usedMonsterIds:[],chosenBossIds:{1:'f1_fallen_lord'},contentVersion:'F1_VERTICAL_SLICE_V1',createdAt:'x',updatedAt:'x'};
  installRelicCatalog(run,F1_RELIC_DEFINITIONS);return run;
}
function combatRun(monsterDef,ids=['warrior','warrior','warrior','warrior']){
  const run=runBase(ids);run.phase='COMBAT';run.depth=1;run.currentRoomNodeId='combat';
  const roomType=monsterDef.tier==='BOSS'?'BOSS':monsterDef.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT';
  run.combat=newCombatState(run.players,monsterDef.baseHp,roomType,monsterDef);beginTurn(run);return run;
}
function cardId(run,pid,n){
  const p=run.players.find(x=>x.playerId===pid),priv=run.combat.privateByPlayer[pid];
  return p.cardPool.find(c=>c.baseNumber===n&&priv.remainingCardIds.includes(c.id))?.id;
}
function submitUnique(run,values=[2,3,4,5]){
  values.forEach((n,i)=>submitCard(run,`p${i}`,cardId(run,`p${i}`,n)));
  return resolveBasicTurn(run);
}

test('PVE-013 F1 content ships exactly the four named monsters with locked F1 HP tiers',()=>{
  const defs=Object.values(F1_MONSTER_DEFINITIONS);
  assert.equal(defs.length,4);
  assert.deepEqual(defs.map(x=>x.name).sort(),['메아리 박쥐','몰락한 성주','비겁한 사냥꾼','철갑 멧돼지'].sort());
  assert.equal(F1_MONSTER_DEFINITIONS.f1_armored_boar.baseHp,90);
  assert.equal(F1_MONSTER_DEFINITIONS.f1_coward_hunter.baseHp,90);
  assert.equal(F1_MONSTER_DEFINITIONS.f1_echo_bat.baseHp,160);
  assert.equal(F1_MONSTER_DEFINITIONS.f1_fallen_lord.baseHp,240);
  assert.equal(F1_MONSTER_DEFINITIONS.f1_echo_bat.tier,'ELITE');
  assert.equal(F1_MONSTER_DEFINITIONS.f1_fallen_lord.tier,'BOSS');
});

test('PVE-013 F1 map is reproducible, ends in the disclosed Fallen Lord boss, and exposes every vertical-slice room family',()=>{
  const a=runBase(undefined,{seed:'same'}),b=runBase(undefined,{seed:'same'});
  a.map=generateFloorMap(a,8);b.map=generateFloorMap(b,8);
  assert.deepEqual(a.map,b.map);
  assert.equal(a.map.depthCount,8);assert.equal(a.map.bossId,'f1_fallen_lord');assert.equal(a.map.bossName,'몰락한 성주');
  const boss=a.map.nodes.filter(n=>n.depth===8);assert.deepEqual(boss.map(x=>x.type),['BOSS']);
  const types=new Set(a.map.nodes.map(n=>n.type));
  for(const type of ['NORMAL_COMBAT','ELITE_COMBAT','EVENT','REST','SHOP','REWARD_ROOM','BOSS'])assert.ok(types.has(type),type);
});

test('PVE-013 normal monster selection uses both samples before reusing an exhausted pool',()=>{
  const run=runBase();run.currentRoomNodeId='n1';run.depth=1;
  const a=selectF1Monster(run,'NORMAL_COMBAT');markF1MonsterUsed(run,a);
  run.currentRoomNodeId='n2';run.depth=2;
  const b=selectF1Monster(run,'NORMAL_COMBAT');markF1MonsterUsed(run,b);
  assert.notEqual(a.id,b.id);
  run.currentRoomNodeId='n3';run.depth=3;
  const c=selectF1Monster(run,'NORMAL_COMBAT');
  assert.ok(['f1_armored_boar','f1_coward_hunter'].includes(c.id));
});

test('PVE-013 monster definitions drive public telegraphs and executable intents',()=>{
  const boar=combatRun(F1_MONSTER_DEFINITIONS.f1_armored_boar);
  assert.equal(boar.combat.monster.name,'철갑 멧돼지');
  assert.equal(boar.combat.monster.intent.type,'DEFEND');
  executeMonsterIntent(boar);assert.equal(boar.combat.monster.defense,1);

  const hunter=combatRun(F1_MONSTER_DEFINITIONS.f1_coward_hunter);
  hunter.combat.turn=2;const intent=publishMonsterIntent(hunter);
  assert.equal(intent.type,'DIRECT_DAMAGE');assert.ok(intent.payload.targetPlayerId);
  assert.equal(intent.payload.target,undefined);
});

test('PVE-013 provides two simple data-driven events and resolves four independent choices into ROOM_RESULT',()=>{
  const run=runBase();run.phase='ROOM_ENTER';run.currentRoomNodeId='event';
  enterEventRoom(run);
  assert.equal(F1_EVENT_DEFINITIONS.length,2);assert.equal(run.phase,'EVENT');assert.equal(run.roomState.options.length,2);
  run.players[0].hp=1;
  for(const p of run.players){
    const option=run.roomState.options[0];
    chooseEventOption(run,p.playerId,option.id);
  }
  assert.equal(run.phase,'ROOM_RESULT');
  assert.equal(Object.keys(run.roomState.choicesByPlayer).length,4);
  assert.ok(run.players[0].hp>=1);
});

test('PVE-013 mixed human/AI event automatically resolves AI choices with deterministic run RNG',()=>{
  const make=()=>{const run=runBase(undefined,{ai:[2,3],seed:'event-ai'});run.phase='ROOM_ENTER';run.currentRoomNodeId='event';enterEventRoom(run);return run;};
  const a=make(),b=make();
  assert.deepEqual(a.roomState.choicesByPlayer,b.roomState.choicesByPlayer);
  assert.ok(a.roomState.choicesByPlayer.p2);assert.ok(a.roomState.choicesByPlayer.p3);
  for(const pid of ['p0','p1'])chooseEventOption(a,pid,a.roomState.options[0].id);
  assert.equal(a.phase,'ROOM_RESULT');
});

test('PVE-013 installs the minimum eight sample relics with 6 general and 2 shop-exclusive definitions',()=>{
  assert.equal(F1_RELIC_DEFINITIONS.length,8);
  assert.equal(F1_RELIC_DEFINITIONS.filter(x=>x.pool==='GENERAL').length,6);
  assert.equal(F1_RELIC_DEFINITIONS.filter(x=>x.pool==='SHOP_EXCLUSIVE').length,2);
  const ids=new Set(F1_RELIC_DEFINITIONS.map(x=>x.id));assert.equal(ids.size,8);
  assert.ok(F1_RELIC_DEFINITIONS.every(x=>x.effects.length>=1));
});

test('PVE-013 sample COMBAT_START relic is live in the shared effect engine',()=>{
  const run=runBase();run.players[0].relics.push('f1_guard_charm');
  run.phase='COMBAT';run.currentRoomNodeId='normal';
  const def=F1_MONSTER_DEFINITIONS.f1_coward_hunter;
  run.combat=newCombatState(run.players,def.baseHp,'NORMAL_COMBAT',def);beginTurn(run);
  assert.equal(run.players[0].publicResources.armor,1);
  beginTurn(run);assert.equal(run.players[0].publicResources.armor,1);
});

test('PVE-013 normal and elite victories grant locked completion gold only to non-DOWNED finishers',()=>{
  const normal=combatRun(F1_MONSTER_DEFINITIONS.f1_coward_hunter);normal.combat.monster.hp=1;
  normal.players[3].status='DOWNED';normal.players[3].hp=0;
  submitCard(normal,'p0',cardId(normal,'p0',2));submitCard(normal,'p1',cardId(normal,'p1',3));submitCard(normal,'p2',cardId(normal,'p2',4));
  resolveBasicTurn(normal);
  assert.deepEqual(normal.players.map(p=>p.runGold),[1,1,1,0]);assert.equal(normal.players[3].hp,1);assert.equal(normal.phase,'ROOM_RESULT');

  const elite=combatRun(F1_MONSTER_DEFINITIONS.f1_echo_bat);elite.combat.monster.hp=1;submitUnique(elite);
  assert.deepEqual(elite.players.map(p=>p.runGold),[2,2,2,2]);assert.equal(elite.phase,'ROOM_RESULT');
});

test('PVE-013 boss victory applies revive, half-missing-HP heal, flame +1, boss gold, and finishes floor 1',()=>{
  const run=combatRun(F1_MONSTER_DEFINITIONS.f1_fallen_lord);run.flame=2;run.combat.monster.hp=1;
  run.players[0].hp=1;run.players[1].hp=2;run.players[2].hp=3;run.players[3].status='DOWNED';run.players[3].hp=0;
  submitCard(run,'p0',cardId(run,'p0',2));submitCard(run,'p1',cardId(run,'p1',3));submitCard(run,'p2',cardId(run,'p2',4));
  const result=resolveBasicTurn(run);
  assert.equal(result.phaseTrace.at(-1),'COMBAT_END');
  assert.equal(run.phase,'FLOOR_CLEAR');assert.equal(run.floorClear.floor,1);assert.equal(run.floorClear.bossId,'f1_fallen_lord');
  assert.equal(run.flame,3);
  assert.deepEqual(run.players.map(p=>p.hp),[2,3,3,2]);
  assert.deepEqual(run.players.map(p=>p.runGold),[3,3,3,0]);
  assert.equal(run.players[3].status,'ACTIVE');
});

test('PVE-013 boss clear pauses for due augment choices and resumes specifically to FLOOR_CLEAR',()=>{
  const run=combatRun(F1_MONSTER_DEFINITIONS.f1_fallen_lord,['adventurer','warrior','mage','gunner']);
  run.combat.monster.hp=1;run.players[0].growthExp=49;
  const values=[1,2,3,2];
  values.forEach((n,i)=>submitCard(run,`p${i}`,cardId(run,`p${i}`,n)));
  resolveBasicTurn(run);
  assert.equal(run.players[0].growthExp,50);
  assert.equal(run.phase,'AUGMENT_CHOICE');
  assert.equal(run.augmentChoice.resumePhase,'FLOOR_CLEAR');
  assert.deepEqual(run.augmentChoice.pendingByPlayer.p0,[1]);
});

test('PVE-013 victory telemetry identifies actual F1 monster and room tier instead of the training monster',()=>{
  const run=combatRun(F1_MONSTER_DEFINITIONS.f1_echo_bat);run.combat.monster.hp=1;submitUnique(run);
  const log=run._telemetryPending.find(x=>x.logType==='COMBAT')?.payload;
  assert.equal(log.monster_id,'f1_echo_bat');assert.equal(log.room_type,'ELITE_COMBAT');assert.equal(log.outcome,'VICTORY');
});
