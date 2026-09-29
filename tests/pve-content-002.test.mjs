import test from 'node:test';
import assert from 'node:assert/strict';
import {F2_MONSTER_DEFINITIONS,selectF2Monster} from '../supabase/functions/game-api/pve/content-f2.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {publishMonsterIntent} from '../supabase/functions/game-api/pve/monster.js';
import {applyMonsterCardRules,recordMonsterDamageBatch,monsterPresentation} from '../supabase/functions/game-api/pve/monster-behavior.js';
import {resolveF2AfterDamage} from '../supabase/functions/game-api/pve/monster-behavior-f2.js';
import {advanceCompletedFloor} from '../supabase/functions/game-api/pve/floor-transition.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';

function make(id){
  const def=F2_MONSTER_DEFINITIONS[id];
  const players=Array.from({length:4},(_,seat)=>newPlayerRunState({id:`p${seat}`,user_id:`u${seat}`,seat_index:seat,member_type:'human',character_id:'adventurer'}));
  const run={id:'same-run',seed:'f2-replay',rngCounter:0,phase:'COMBAT',floor:2,depth:1,currentRoomNodeId:'f2-d1-n0',flame:4,maxFlame:5,players,cardCycles:{},map:{depthCount:12},chosenBossIds:{2:id}};
  run.combat=newCombatState(players,def.baseHp,def.tier==='BOSS'?'BOSS':def.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT',def);
  return run;
}
const cards=(numbers,valid=numbers.map(()=>true))=>numbers.map((n,i)=>({playerId:`p${i}`,finalNumber:n,valid:valid[i],...(valid[i]?{}:{invalidReason:'COLLISION'})}));
function turn(run,numbers,valid){
  const intent=publishMonsterIntent(run),events=[];
  applyMonsterCardRules(run,cards(numbers,valid),events);
  return {intent,events,state:run.combat.monster.behaviorState};
}
const damage=(run,player,amount)=>{if(!player||player.status==='DOWNED')return [];player.hp-=amount;return [{type:'PLAYER_DAMAGED',playerId:player.playerId,amount}];};

test('Floor 2 roster and runtime selection are complete and deterministic',()=>{
  const defs=Object.values(F2_MONSTER_DEFINITIONS);
  assert.deepEqual(['NORMAL','ELITE','BOSS'].map(tier=>defs.filter(def=>def.tier===tier).length),[7,3,2]);
  for(const def of defs){
    const a=make(def.id),b=make(def.id);
    assert.deepEqual(publishMonsterIntent(a),publishMonsterIntent(b),def.id);
    assert.ok(a.combat.monster.intent.telegraphText.includes(def.ruleSummary),def.id);
    assert.ok(monsterPresentation(a).ruleSummary,def.id);
    const projected=projectRun(a,'p0');
    assert.equal(projected.combat.monster.behaviorState,undefined,def.id);
    assert.ok(projected.combat.monster.presentation,def.id);
  }
  const run=make('f2_cursed_prophet');run.usedMonsterIds=[];
  const selected=[];
  for(let i=0;i<7;i++){const def=selectF2Monster(run,'NORMAL_COMBAT');selected.push(def.id);run.usedMonsterIds.push(def.id);}
  assert.equal(new Set(selected).size,7);
  assert.throws(()=>selectF2Monster(run,'NORMAL_COMBAT'));
});
test('F2-N01 prophecy warns one turn ahead and uses final numbers',()=>{
  const run=make('f2_cursed_prophet');publishMonsterIntent(run);
  const warning=run.combat.monster.behaviorState.nextDangerNumber;
  assert.equal(run.combat.monster.behaviorState.currentDangerNumber,null);
  run.combat.turn=2;publishMonsterIntent(run);
  assert.equal(run.combat.monster.behaviorState.currentDangerNumber,warning);
  const c=cards([warning,2,3,4]);applyMonsterCardRules(run,c,[]);
  assert.equal(run.combat.monster.behaviorState.curseByPlayer.p0,1);
});
test('F2-N02 low damage grows and adequate damage prevents growth',()=>{
  const run=make('f2_hungry_slime');publishMonsterIntent(run);
  recordMonsterDamageBatch(run,7);assert.equal(run.combat.monster.behaviorState.stacks.growth,1);
  recordMonsterDamageBatch(run,8);assert.equal(run.combat.monster.behaviorState.stacks.growth,1);
});
test('F2-N03 collision spore reaches a public threshold',()=>{
  const run=make('f2_spore_acolyte');publishMonsterIntent(run);
  applyMonsterCardRules(run,cards([1,1,2,3],[false,false,true,true]),[]);
  assert.equal(run.combat.monster.behaviorState.sporeByPlayer.p0,1);
  applyMonsterCardRules(run,cards([1,1,2,3],[false,false,true,true]),[]);
  assert.equal(run.combat.monster.behaviorState.sporeByPlayer.p0,0);
  assert.ok(run.combat.monster.behaviorState.pendingHits.includes('p0'));
});
test('F2-N04 valid target attack blocks leech',()=>{
  const run=make('f2_swamp_leech');publishMonsterIntent(run);
  const id=run.combat.monster.behaviorState.targetPlayerId;
  applyMonsterCardRules(run,cards([1,2,3,4]),[]);
  assert.equal(run.combat.monster.behaviorState.targetBlocked,true);
  assert.ok(id);
});
test('F2-N05 copy penalizes only the displayed prior number',()=>{
  const run=make('f2_mycelium_doppelganger');publishMonsterIntent(run);
  applyMonsterCardRules(run,cards([1,2,3,4]),[]);
  assert.equal(run.combat.monster.behaviorState.copiedNumber,1);
  const next=cards([1,2,3,4]);applyMonsterCardRules(run,next,[]);
  assert.equal(next[0].monsterDamagePenalty,2);assert.equal(next[1].monsterDamagePenalty,undefined);
});
test('F2-N06 flame mode and F2-N07 thorns are telegraphed',()=>{
  const flame=make('f2_wisp_lamplighter');publishMonsterIntent(flame);
  assert.equal(flame.combat.monster.behaviorState.flameMode,'LOW');
  applyMonsterCardRules(flame,cards([1,2,3,4]),[]);
  assert.deepEqual(flame.combat.monster.behaviorState.pendingHits,['p3']);
  const thorn=make('f2_thorn_dryad');publishMonsterIntent(thorn);
  applyMonsterCardRules(thorn,cards([1,2,3,4]),[]);
  assert.deepEqual(thorn.combat.monster.behaviorState.pendingHits,['p3']);
});
test('F2-E01 chaos is seeded, F2-E02 heads require distinct valid numbers, F2-E03 link checks next turn',()=>{
  const chaos=make('f2_chaos_goblin');const a=publishMonsterIntent(chaos);assert.ok(a.telegraphText.includes(chaos.combat.monster.behaviorState.chaosRule));
  const hydra=make('f2_rootjaw_hydra');publishMonsterIntent(hydra);
  applyMonsterCardRules(hydra,cards([1,2,3,4]),[]);assert.equal(hydra.combat.monster.behaviorState.heads,2);
  const witch=make('f2_thread_witch');publishMonsterIntent(witch);
  const pair=witch.combat.monster.behaviorState.linkedPlayerIds;
  applyMonsterCardRules(witch,cards([1,1,1,1]),[]);
  assert.equal(witch.combat.monster.behaviorState.pendingHits.length,0);
  witch.combat.turn=2;publishMonsterIntent(witch);
  applyMonsterCardRules(witch,cards([1,1,1,1]),[]);
  assert.deepEqual(witch.combat.monster.behaviorState.pendingHits.sort(),pair.sort());
});
test('F2-B01 corruption compares each player own last valid final number',()=>{
  const run=make('f2_rottenheart_ancient');publishMonsterIntent(run);
  applyMonsterCardRules(run,cards([1,2,3,4]),[]);
  applyMonsterCardRules(run,cards([1,5,3,4],[true,false,true,true]),[]);
  assert.equal(run.combat.monster.behaviorState.corruptionByPlayer.p0,1);
  assert.equal(run.combat.monster.behaviorState.lastNumberByPlayer.p1,2);
  applyMonsterCardRules(run,cards([1,2,5,6]),[]);
  assert.equal(run.combat.monster.behaviorState.corruptionByPlayer.p0,2);
  applyMonsterCardRules(run,cards([1,2,5,6]),[]);
  assert.equal(run.combat.monster.behaviorState.corruptionByPlayer.p0,0);
  assert.ok(run.combat.monster.behaviorState.pendingHits.includes('p0'));
});
for(const [phase,values,expected] of [['MIN',[9,10,11],[false,true,true]],['MAX',[6,7,8],[true,true,false]]])test(`F2-B02 ${phase} exact threshold boundaries`,()=>{
  for(let i=0;i<values.length;i++){
    const run=make('f2_moon_eating_witch');run.combat.turn=phase==='MIN'?1:2;publishMonsterIntent(run);
    recordMonsterDamageBatch(run,values[i]);
    assert.equal(run.combat.monster.behaviorState.thresholdPassed,expected[i]);
    const before=run.players.map(p=>p.hp);
    resolveF2AfterDamage(run,[],damage);
    assert.equal(run.players.reduce((s,p,j)=>s+before[j]-p.hp,0),expected[i]?0:1);
  }
});
test('Floor 2 boss clear advances same run to guarded Floor 3 map once',()=>{
  const run=make('f2_moon_eating_witch');const id=run.id;run.combat.monster.hp=1;
  beginTurn(run);
  for(let i=0;i<4;i++)submitCard(run,`p${i}`,run.players[i].cardPool.find(c=>c.baseNumber===i+1).id);
  resolveBasicTurn(run);
  assert.equal(run.floor,3);assert.equal(run.phase,'MAP_VOTE');assert.equal(run.id,id);
  assert.equal(run.combat,undefined);assert.equal(run.flame,5);
  assert.equal(advanceCompletedFloor(run),false);
});
\ntest('F2-B02 phase alternates and threshold penalty cannot repeat',()=>{\n  const run=make('f2_moon_eating_witch');publishMonsterIntent(run);recordMonsterDamageBatch(run,9);\n  resolveF2AfterDamage(run,[],damage);const hp=run.players.map(p=>p.hp);\n  resolveF2AfterDamage(run,[],damage);assert.deepEqual(run.players.map(p=>p.hp),hp);\n  run.combat.turn=2;publishMonsterIntent(run);assert.equal(run.combat.monster.behaviorState.phase,'MAX');\n});\ntest('F2-B01 death on corruption threshold skips damage',()=>{\n  const run=make('f2_rottenheart_ancient');publishMonsterIntent(run);\n  applyMonsterCardRules(run,cards([1,2,3,4]),[]);\n  applyMonsterCardRules(run,cards([1,2,3,4]),[]);\n  applyMonsterCardRules(run,cards([1,2,3,4]),[]);\n  applyMonsterCardRules(run,cards([1,2,3,4]),[]);\n  run.combat.monster.hp=0;const hp=run.players.map(p=>p.hp);\n  resolveF2AfterDamage(run,[],damage);assert.deepEqual(run.players.map(p=>p.hp),hp);\n});\n