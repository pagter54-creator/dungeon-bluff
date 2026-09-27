import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newPlayerRunState,newCombatState,COMBAT_PHASES} from '../supabase/functions/game-api/pve/model.js';
import {generateFloorMap,resolveVote} from '../supabase/functions/game-api/pve/map.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {submitCard,resolveBasicTurn,beginTurn} from '../supabase/functions/game-api/pve/combat.js';

function members(){
  return Array.from({length:4},(_,i)=>({id:`p${i}`,user_id:`u${i}`,member_type:'human',character_id:'adventurer',seat_index:i}));
}
function combatRun(){
  const players=members().map(newPlayerRunState);
  const run={id:'run',seed:'seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:3,maxFlame:5,players,map:{nodes:[],edges:{}},combat:newCombatState(players,100)};beginTurn(run);return run;
}
function cardId(run,pid,n){return run.players.find(p=>p.playerId===pid).cardPool.find(c=>c.baseNumber===n).id;}
function play(run,values,order=[0,1,2,3]){
  for(const i of order)submitCard(run,`p${i}`,cardId(run,`p${i}`,values[i]));
  return resolveBasicTurn(run);
}

test('PVE basic collision: 1,2,2,5 leaves only 1 and 5 valid',()=>{
  const run=combatRun();const result=play(run,[1,2,2,5]);
  assert.deepEqual(result.cards.map(c=>c.valid),[true,false,false,true]);
  assert.equal(result.totalDamage,6);assert.equal(run.combat.monster.hp,94);
});
test('PVE damage batch is independent of submission/seat processing order',()=>{
  const a=combatRun(), b=combatRun();
  const ra=play(a,[1,2,2,5],[0,1,2,3]), rb=play(b,[1,2,2,5],[3,2,1,0]);
  assert.equal(ra.totalDamage,rb.totalDamage);
  assert.deepEqual(ra.cards.map(c=>[c.playerId,c.valid]).sort(),rb.cards.map(c=>[c.playerId,c.valid]).sort());
});
test('PVE combat phase spine preserves required ordering',()=>{
  const run=combatRun();const r=play(run,[1,2,3,4]);
  const required=['SELECTION_LOCKED','PRE_COLLISION_SELF_MODIFY','PRE_COLLISION_SWAP','PRE_COLLISION_STEAL','FINAL_NUMBER_REVEAL','COLLISION_RESOLVE','POST_COLLISION_EFFECTS','VALIDITY_DERIVE','DAMAGE_BUILD','DAMAGE_BATCH_APPLY','POST_PLAYER_ATTACK','KILL_CHECK','MONSTER_ACTION','DOWN_RESOLVE','TURN_END'];
  assert.deepEqual(r.phaseTrace,required);
  for(const phase of required)assert.ok(COMBAT_PHASES.includes(phase));
});
test('viewer projection never includes another player private cycle state or selection',()=>{
  const run=combatRun();
  submitCard(run,'p1',cardId(run,'p1',3));
  const view=projectRun(run,'p0');
  const json=JSON.stringify(view);
  assert.ok(!json.includes('p1:base:3'));
  assert.equal(view.privateCombat.playerId,'p0');
  assert.ok(!Object.hasOwn(view.combat,'privateByPlayer'));
  assert.ok(!Object.hasOwn(view.combat,'turnSubmissions'));
  assert.deepEqual(view.combat.readyPlayerIds,['p1']);
});
test('same seed creates the same map and tie vote result',()=>{
  const make=()=>{const run={seed:'same-seed',rngCounter:0,floor:1,depth:0};run.map=generateFloorMap(run,8);return run;};
  const a=make(),b=make();assert.deepEqual(a.map,b.map);assert.equal(a.rngCounter,b.rngCounter);
  a.map.votes={p0:a.map.nodes[0].id,p1:a.map.nodes[1].id};
  b.map.votes={p0:b.map.nodes[0].id,p1:b.map.nodes[1].id};
  assert.equal(resolveVote(a,['p0','p1']),resolveVote(b,['p0','p1']));
});
test('PVE migration enforces action idempotency before expectedVersion conflict',()=>{
  const sql=fs.readFileSync(new URL('../supabase/migrations/202609270001_pve_core.sql',import.meta.url),'utf8');
  const prior=sql.indexOf('select committed_version into prior');
  const conflict=sql.indexOf('if r.version<>p_expected');
  assert.ok(prior>=0&&conflict>prior);
  assert.match(sql,/primary key\(run_id,action_id\)/);
  assert.match(sql,/duplicate.*true/s);
});
test('PVE migration does not grant raw run state to authenticated clients',()=>{
  const sql=fs.readFileSync(new URL('../supabase/migrations/202609270001_pve_core.sql',import.meta.url),'utf8');
  assert.match(sql,/revoke all on public\.pve_runs,public\.pve_actions from anon,authenticated/);
  assert.doesNotMatch(sql,/grant select on public\.pve_runs to authenticated/);
});
