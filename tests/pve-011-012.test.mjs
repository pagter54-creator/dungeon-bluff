import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {generateFloorMap} from '../supabase/functions/game-api/pve/map.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {handlePveAction} from '../supabase/functions/game-api/pve/api.js';
import {enterRestRoom,enterShopRoom} from '../supabase/functions/game-api/pve/rooms.js';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';
import {choose} from '../supabase/functions/game-api/pve/rng.js';
import {applyEffectDefinitions} from '../supabase/functions/game-api/pve/effects.js';
import {betaWarnings} from '../supabase/functions/game-api/pve/telemetry.js';

const RUN_ID='11111111-1111-4111-8111-111111111111';
const actionId=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const json=(body,status=200)=>({body,status});
function members(ids=['adventurer','adventurer','adventurer','adventurer']){
  return ids.map((character_id,i)=>({id:`p${i}`,user_id:`u${i}`,member_type:'human',character_id,seat_index:i}));
}
function baseRun(ids){
  const players=members(ids).map(newPlayerRunState);
  return {id:RUN_ID,roomId:'22222222-2222-4222-8222-222222222222',seed:'hardening-seed',rngCounter:0,version:0,phase:'MAP_VOTE',floor:1,depth:0,flame:3,maxFlame:5,map:null,currentRoomNodeId:null,players,usedMonsterIds:[],chosenBossIds:{},createdAt:'x',updatedAt:'x'};
}
function combatRun(hp=100){
  const run=baseRun();run.phase='COMBAT';run.depth=1;run.map={nodes:[],edges:{},votes:{}};run.combat=newCombatState(run.players,hp,'NORMAL_COMBAT');beginTurn(run);return run;
}
function cardId(run,pid,n){
  const p=run.players.find(x=>x.playerId===pid),priv=run.combat.privateByPlayer[pid];
  return p.cardPool.find(c=>c.baseNumber===n&&priv.remainingCardIds.includes(c.id))?.id;
}
function play(run,values){
  values.forEach((n,i)=>submitCard(run,`p${i}`,cardId(run,`p${i}`,n)));
  return resolveBasicTurn(run);
}
function fixtureRelics(){
  return [
    ...Array.from({length:4},(_,i)=>({id:`g${i+1}`,name:`G${i+1}`,pool:'GENERAL',betaPrice:4,effects:[]})),
    ...Array.from({length:2},(_,i)=>({id:`s${i+1}`,name:`S${i+1}`,pool:'SHOP_EXCLUSIVE',betaPrice:5,effects:[]}))
  ];
}
function memoryAdmin(initial){
  let state=structuredClone(initial),version=initial.version||0;
  const actions=new Map(),telemetry=[];
  return {
    get state(){return structuredClone(state);},get version(){return version;},actions,telemetry,
    async rpc(name,args){
      if(name==='pve_read'){
        const prior=args.p_action_id?actions.get(args.p_action_id):null;
        return {data:{version,state:structuredClone(state),action_result:prior?{committed_version:prior.version,state:structuredClone(prior.state)}:null},error:null};
      }
      if(name==='pve_try_commit'){
        const prior=actions.get(args.p_action_id);
        if(prior)return {data:{duplicate:true,version:prior.version,state:structuredClone(prior.state)},error:null};
        if(version!==args.p_expected)return {data:{conflict:true,version,state:structuredClone(state)},error:null};
        const incoming=structuredClone(args.p_state),pending=incoming._telemetryPending||[];delete incoming._telemetryPending;
        version+=1;incoming.version=version;state=incoming;actions.set(args.p_action_id,{version,state:structuredClone(state)});
        for(const event of pending)telemetry.push({actionId:args.p_action_id,version,...structuredClone(event)});
        return {data:{version,state:structuredClone(state)},error:null};
      }
      throw new Error(`unexpected rpc ${name}`);
    }
  };
}
async function api(admin,userId,body){return handlePveAction({admin,user:{id:userId},body,json});}

test('PVE-011 submitCard may be changed during SELECTION_OPEN and the latest submission is authoritative',()=>{
  const run=combatRun(),first=cardId(run,'p0',1),second=cardId(run,'p0',5);
  submitCard(run,'p0',first);submitCard(run,'p0',second,true);
  assert.equal(run.combat.turnSubmissions.p0.cardInstanceId,second);
  assert.equal(run.combat.turnSubmissions.p0.skillIntent,true);
  assert.equal(run.combat.privateByPlayer.p0.selectedCardId,second);
  assert.equal(run.combat.phase,'SELECTION_OPEN');
});

test('PVE-011 reconnect getState restores the viewer private hand but never another player private cycle',async()=>{
  const run=combatRun();submitCard(run,'p0',cardId(run,'p0',3));
  const admin=memoryAdmin(run),res=await api(admin,'u0',{action:'pve.getState',run_id:RUN_ID});
  assert.equal(res.status,200);assert.equal(res.body.run.privateCombat.playerId,'p0');
  assert.equal(res.body.run.privateCombat.selectedCardId,cardId(run,'p0',3));
  const raw=JSON.stringify(res.body.run);
  assert.equal(raw.includes('p1:base:1'),false);
  assert.equal(raw.includes('privateByPlayer'),false);
});

test('PVE-011 duplicate actionId returns the exact first committed result even after later mutations',async()=>{
  const run=baseRun();run.currentRoomNodeId='rest';run.phase='ROOM_ENTER';enterRestRoom(run);run.players[0].hp=1;run.flame=3;
  const admin=memoryAdmin(run);
  const first=await api(admin,'u0',{action:'pve.restChoice',run_id:RUN_ID,action_id:actionId(1),expected_version:0,choice:'FULL_HEAL'});
  assert.equal(first.status,200);assert.equal(first.body.run.version,1);assert.equal(first.body.run.players[0].hp,3);
  const second=await api(admin,'u1',{action:'pve.restChoice',run_id:RUN_ID,action_id:actionId(2),expected_version:1,choice:'FLAME'});
  assert.equal(second.body.run.version,2);assert.equal(second.body.run.flame,4);
  const retry=await api(admin,'u0',{action:'pve.restChoice',run_id:RUN_ID,action_id:actionId(1),expected_version:0,choice:'ENGRAVE',number:6});
  assert.equal(retry.status,200);assert.equal(retry.body.idempotent,true);
  assert.equal(retry.body.run.version,1);assert.equal(retry.body.run.flame,3);
  assert.equal(retry.body.run.players[0].engravings['6'],undefined);
  assert.equal(admin.version,2);
});

test('PVE-011 stale expectedVersion returns 409 with the latest projected state',async()=>{
  const run=baseRun();run.currentRoomNodeId='rest';run.phase='ROOM_ENTER';enterRestRoom(run);
  const admin=memoryAdmin(run);
  await api(admin,'u0',{action:'pve.restChoice',run_id:RUN_ID,action_id:actionId(3),expected_version:0,choice:'FLAME'});
  const stale=await api(admin,'u1',{action:'pve.restChoice',run_id:RUN_ID,action_id:actionId(4),expected_version:0,choice:'FULL_HEAL'});
  assert.equal(stale.status,409);assert.equal(stale.body.error,'STATE_CONFLICT');assert.equal(stale.body.run.version,1);
  assert.equal(stale.body.run.flame,4);
});

test('PVE-011 concurrent shared relic purchase commits exactly one buyer and conflicts the loser',async()=>{
  const run=baseRun();run.currentRoomNodeId='shop';run.phase='ROOM_ENTER';installRelicCatalog(run,fixtureRelics());for(const p of run.players)p.runGold=20;enterShopRoom(run);
  const product=run.roomState.relicStock[0],admin=memoryAdmin(run);
  const [a,b]=await Promise.all([
    api(admin,'u0',{action:'pve.shopBuyRelic',run_id:RUN_ID,action_id:actionId(5),expected_version:0,product_id:product.id}),
    api(admin,'u1',{action:'pve.shopBuyRelic',run_id:RUN_ID,action_id:actionId(6),expected_version:0,product_id:product.id})
  ]);
  const statuses=[a.status,b.status].sort((x,y)=>x-y);assert.deepEqual(statuses,[200,409]);
  assert.equal([a,b].find(result=>result.status===409).body.run.version,admin.version);
  const buyers=admin.state.players.filter(p=>p.relics.includes(product.relicId));
  assert.equal(buyers.length,1);assert.equal(admin.state.roomState.relicStock.find(x=>x.id===product.id).sold,true);
  assert.equal(admin.version,1);
});

test('PVE-011 getState waits for human votes even on an expired single-path map',async()=>{
  const run=baseRun();run.map={depthCount:1,nodes:[{id:'rest-1',depth:1,type:'REST'}],edges:{},currentNodeId:null,votes:{},voteRound:0,voteDeadline:new Date(0).toISOString()};
  const admin=memoryAdmin(run),oldNow=Date.now;Date.now=()=>10_000;
  try{
    const res=await api(admin,'u0',{action:'pve.getState',run_id:RUN_ID});
    assert.equal(res.status,200);assert.equal(res.body.run.phase,'MAP_VOTE');assert.equal(res.body.run.map.currentNodeId,null);assert.equal(res.body.run.version,0);
    assert.equal(admin.version,0);
  }finally{Date.now=oldNow;}
});

test('PVE-011 getState persists expired shop reservation cleanup',async()=>{
  const run=baseRun();run.currentRoomNodeId='shop';run.phase='ROOM_ENTER';installRelicCatalog(run,fixtureRelics());enterShopRoom(run);
  run.roomState.cardStock[0].reservedByPlayerId='p0';run.roomState.cardStock[0].reservedUntil=1;
  const admin=memoryAdmin(run),oldNow=Date.now;Date.now=()=>100;
  try{
    const res=await api(admin,'u1',{action:'pve.getState',run_id:RUN_ID});
    assert.equal(res.body.run.roomState.cardStock[0].reservedByPlayerId,null);assert.equal(admin.version,1);
  }finally{Date.now=oldNow;}
});

test('PVE-012 every deterministic RNG draw queues context, result and consumed counter',()=>{
  const run={id:RUN_ID,seed:'rng-log',rngCounter:0};
  choose(run,['a','b'],'first');choose(run,[10,20,30],'second');
  const logs=run._telemetryPending.filter(x=>x.logType==='RNG');
  assert.equal(logs.length,2);assert.deepEqual(logs.map(x=>x.payload.counter),[0,1]);
  assert.deepEqual(logs.map(x=>x.payload.context_key),['first','second']);
  assert.equal(logs[0].payload.length,2);assert.equal(logs[1].payload.length,3);
  assert.equal(run.rngCounter,2);
});

test('PVE-012 completed combat queues required balance fields and per-player arrays',()=>{
  const run=combatRun(1),result=play(run,[1,2,3,4]);assert.equal(run.phase,'ROOM_RESULT');
  const log=run._telemetryPending.find(x=>x.logType==='COMBAT')?.payload;assert.ok(log);
  assert.equal(log.run_id,RUN_ID);assert.equal(log.floor,1);assert.equal(log.room_type,'NORMAL_COMBAT');assert.equal(log.turn_count,1);
  assert.equal(log.party_damage_total,result.totalDamage);assert.equal(log.valid_attack_count.p0,1);assert.equal(log.collision_count.p0,0);
  assert.equal(log.exp_gained.p0,2);assert.ok(Object.hasOwn(log.damage_taken,'p0'));assert.ok(Object.hasOwn(log.healing_done,'p0'));
  assert.ok(Object.hasOwn(log.down_count,'p0'));assert.equal(log.flame_spent,0);
});

test('PVE-012 effect telemetry records successful/failed triggers and measurable balance deltas',()=>{
  const run=combatRun(),p=run.players[0];p.hp=2;
  const effect={id:'metric-fixture',trigger:'BEFORE_DAMAGE',priority:1,condition:{path:'player.hp',gte:2},operations:[
    {type:'MODIFY_DAMAGE',amount:2},{type:'HEAL',amount:1},{type:'ADD_EXP',amount:2},{type:'ADD_RUN_GOLD',amount:1}
  ]};
  const damage={amount:3};applyEffectDefinitions(run,p,[effect],'BEFORE_DAMAGE',{damage,events:[]});
  const log=run._telemetryPending.filter(x=>x.logType==='EFFECT').at(-1).payload;
  assert.equal(log.effect_id,'metric-fixture');assert.equal(log.trigger_count,1);assert.equal(log.successful_trigger_count,1);
  assert.equal(log.extra_damage,2);assert.equal(log.healing,1);assert.equal(log.exp_bonus,2);assert.equal(log.gold_bonus,1);
  p.hp=1;applyEffectDefinitions(run,p,[effect],'BEFORE_DAMAGE',{damage:{amount:3},events:[]});
  const failed=run._telemetryPending.filter(x=>x.logType==='EFFECT').at(-1).payload;
  assert.equal(failed.successful_trigger_count,0);
});

test('PVE-012 viewer projection never exposes pending server telemetry',()=>{
  const run=combatRun();choose(run,[1,2,3],'secret-rng-context');
  const view=projectRun(run,'p0'),raw=JSON.stringify(view);
  assert.equal(Object.hasOwn(view,'_telemetryPending'),false);assert.equal(raw.includes('secret-rng-context'),false);
});

test('PVE-012 beta warning helper flags the locked F1 normal-combat turn-count boundary',()=>{
  assert.deepEqual(betaWarnings({floor:1,room_type:'NORMAL_COMBAT',turn_count:4}),['F1_NORMAL_TURN_COUNT']);
  assert.deepEqual(betaWarnings({floor:1,room_type:'NORMAL_COMBAT',turn_count:9}),['F1_NORMAL_TURN_COUNT']);
  assert.deepEqual(betaWarnings({floor:1,room_type:'NORMAL_COMBAT',turn_count:6}),[]);
});

test('PVE-011~012 migration stores exact idempotent result snapshots and flushes telemetry in the same locked commit',()=>{
  const sql=fs.readFileSync(new URL('../supabase/migrations/202609270002_pve_hardening_telemetry.sql',import.meta.url),'utf8');
  assert.match(sql,/add column if not exists result_state jsonb/);
  assert.match(sql,/create table if not exists public\.pve_telemetry/);
  assert.match(sql,/from public\.pve_runs where id=p_run for update/);
  assert.match(sql,/if found then[\s\S]*prior\.result_state/);
  assert.match(sql,/if r\.version<>p_expected/);
  assert.match(sql,/jsonb_array_elements\(coalesce\(p_state->'_telemetryPending'/);
  assert.match(sql,/insert into public\.pve_telemetry/);
  assert.match(sql,/revoke all on public\.pve_telemetry from anon,authenticated/);
});

test('map movement waits past a majority until every human votes, then resolves immediately',async()=>{
  const run=baseRun();run.map={depthCount:1,nodes:[{id:'a',depth:1,type:'REST'},{id:'b',depth:1,type:'REST'}],edges:{},currentNodeId:null,votes:{},voteRound:0,voteDeadline:new Date(0).toISOString()};
  const admin=memoryAdmin(run);
  for(let i=0;i<3;i++){
    const result=await api(admin,`u${i}`,{action:'pve.voteNextRoom',run_id:RUN_ID,expected_version:admin.version,action_id:actionId(500+i),node_id:'a'});
    assert.equal(result.status,200);assert.equal(result.body.run.phase,'MAP_VOTE');
    assert.equal(result.body.run.map.votes[`p${i}`],'a');
  }
  const final=await api(admin,'u3',{action:'pve.voteNextRoom',run_id:RUN_ID,expected_version:admin.version,action_id:actionId(503),node_id:'b'});
  assert.equal(final.status,200);assert.equal(final.body.run.phase,'REST');assert.equal(final.body.run.currentRoomNodeId,'a');
});

test('single-path map still needs every human vote and excludes AI',async()=>{
  const run=baseRun();run.players[2].memberType='ai';run.players[3].memberType='ai';
  run.map={depthCount:1,nodes:[{id:'a',depth:1,type:'REST'}],edges:{},currentNodeId:null,votes:{},voteRound:0};
  const admin=memoryAdmin(run);
  const first=await api(admin,'u0',{action:'pve.voteNextRoom',run_id:RUN_ID,expected_version:0,action_id:actionId(600),node_id:'a'});
  assert.equal(first.body.run.phase,'MAP_VOTE');
  const final=await api(admin,'u1',{action:'pve.voteNextRoom',run_id:RUN_ID,expected_version:1,action_id:actionId(601),node_id:'a'});
  assert.equal(final.body.run.phase,'REST');
});
