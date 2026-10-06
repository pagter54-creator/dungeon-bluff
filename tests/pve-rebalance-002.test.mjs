import test from 'node:test';
import assert from 'node:assert/strict';
import {F1_MONSTER_DEFINITIONS,selectF1Monster,markF1MonsterUsed} from '../supabase/functions/game-api/pve/content-f1.js';
import {F2_MONSTER_DEFINITIONS,selectF2Monster} from '../supabase/functions/game-api/pve/content-f2.js';
import {F3_MONSTER_DEFINITIONS,selectF3Monster} from '../supabase/functions/game-api/pve/content-f3.js';
import {selectMonsterWithFallback} from '../supabase/functions/game-api/pve/monster-selection.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
const defs={1:F1_MONSTER_DEFINITIONS,2:F2_MONSTER_DEFINITIONS,3:F3_MONSTER_DEFINITIONS};
const select={1:selectF1Monster,2:selectF2Monster,3:selectF3Monster};
const all=Object.values(defs).flatMap(Object.values);
const hp={1:{NORMAL:90,ELITE:160,BOSS:240},2:{NORMAL:120,ELITE:200,BOSS:290},3:{NORMAL:145,ELITE:230,BOSS:340}};
const state=(floor,used=[])=>({id:'pool',seed:'pool-replay',rngCounter:9,floor,depth:7,currentRoomNodeId:'pool-room',usedMonsterIds:[...used],chosenBossIds:{},flame:4,maxFlame:5,phase:'COMBAT',players:Array.from({length:4},(_,i)=>newPlayerRunState({id:'p'+i,seat_index:i,member_type:'human',character_id:'adventurer'}))});
for(const def of all)test('002 HP/runtime/UI '+def.id,()=>{
 assert.equal(def.baseHp,hp[def.floor][def.tier]);
 const run=state(def.floor);run.combat=newCombatState(run.players,def.baseHp,def.tier==='BOSS'?'BOSS':def.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT',def);
 const view=projectRun(run,'p0');assert.equal(view.combat.monster.hp,def.baseHp);assert.equal(view.combat.monster.maxHp,def.baseHp);
});
test('002 complete roster has 36 definitions',()=>assert.equal(all.length,36));
for(const floor of [2,3])for(const tier of ['NORMAL','ELITE'])test(`002 nearest previous floor ${floor} ${tier}`,()=>{
 const used=all.filter(m=>m.floor===floor&&m.tier===tier).map(m=>m.id),run=state(floor,used),clone=structuredClone(run);
 const room=tier==='NORMAL'?'NORMAL_COMBAT':'ELITE_COMBAT',a=select[floor](run,room),b=select[floor](clone,room);
 assert.equal(a.floor,floor-1);assert.equal(a.tier,tier);assert.equal(a.id,b.id);assert.equal(run.rngCounter,10);
 assert.equal(run.monsterSelection.monsterSelectionSource,'PREVIOUS_FLOOR_UNSEEN');
 markF1MonsterUsed(run,a);markF1MonsterUsed(run,a);assert.equal(run.usedMonsterIds.filter(id=>id===a.id).length,1);
});
for(const tier of ['NORMAL','ELITE'])test('002 F3 skips exhausted F2 '+tier,()=>{
 const run=state(3,all.filter(m=>m.floor>=2&&m.tier===tier).map(m=>m.id));
 const selected=select[3](run,tier==='NORMAL'?'NORMAL_COMBAT':'ELITE_COMBAT');assert.equal(selected.floor,1);assert.equal(selected.tier,tier);
});
for(const floor of [1,2,3])for(const tier of ['NORMAL','ELITE'])test(`002 global exhaustion repeat ${floor} ${tier} resolves normally`,()=>{
 const ids=all.filter(m=>m.tier===tier).map(m=>m.id),run=state(floor,ids),clone=structuredClone(run);
 const room=tier==='NORMAL'?'NORMAL_COMBAT':'ELITE_COMBAT',monster=select[floor](run,room),again=select[floor](clone,room);
 assert.equal(monster.tier,tier);assert.equal(monster.id,again.id);assert.equal(run.monsterSelection.monsterSelectionSource,'GLOBAL_REPEAT');
 markF1MonsterUsed(run,monster);assert.deepEqual(run.usedMonsterIds,ids);
 run.combat=newCombatState(run.players,monster.baseHp,room,monster);beginTurn(run);
 for(const p of run.players)submitCard(run,p.playerId,p.cardPool[p.seat%p.cardPool.length].id,false);
 assert.ok(resolveBasicTurn(run));assert.ok(run.combat.turn>=2||run.phase!=='COMBAT');
});
for(const tier of ['NORMAL','ELITE'])test('002 F1 exhausted uses global same tier '+tier,()=>{
 const run=state(1,all.filter(m=>m.floor===1&&m.tier===tier).map(m=>m.id));const m=selectF1Monster(run,tier==='NORMAL'?'NORMAL_COMBAT':'ELITE_COMBAT');
 assert.equal(m.tier,tier);assert.equal(run.monsterSelection.monsterSelectionSource,'GLOBAL_REPEAT');
});
for(const floor of [1,2,3])test('002 chosen boss preserved and invalid boss deterministic '+floor,()=>{
 const bosses=all.filter(m=>m.floor===floor&&m.tier==='BOSS');
 for(const boss of bosses){const run=state(floor);run.chosenBossIds[floor]=boss.id;assert.equal(select[floor](run,'BOSS').id,boss.id);assert.equal(run.rngCounter,9);}
 for(const invalid of ['missing',all.find(m=>m.floor===floor&&m.tier==='NORMAL').id,all.find(m=>m.floor!==floor&&m.tier==='BOSS').id]){
  const run=state(floor);run.chosenBossIds[floor]=invalid;const clone=structuredClone(run),m=select[floor](run,'BOSS');assert.equal(m.floor,floor);assert.equal(m.tier,'BOSS');assert.equal(m.id,select[floor](clone,'BOSS').id);assert.equal(run.rngCounter,10);
 }
});
test('002 current-floor priority remains ahead of older pools',()=>{
 const run=state(3),m=selectF3Monster(run,'NORMAL_COMBAT');assert.equal(m.floor,3);assert.equal(run.monsterSelection.monsterSelectionSource,'CURRENT_FLOOR_UNSEEN');
});
test('002 invalid room and tier fail without RNG draws',()=>{
 const run=state(2);assert.throws(()=>selectF2Monster(run,'REST'));assert.throws(()=>selectMonsterWithFallback({run,floor:2,tier:'INVALID',rngKey:'invalid'}));assert.equal(run.rngCounter,9);
});
