import test from 'node:test';
import {chooseCoverageNode} from './helpers/pve-route.mjs';
import assert from 'node:assert/strict';
import {buildInitialPveRun,handlePveAction} from '../supabase/functions/game-api/pve/api.js';
import {connectedNodeIds} from '../supabase/functions/game-api/pve/map.js';
const json=(body,status=200)=>({body,status});
const aid=n=>'b0000000-0000-4000-8000-'+String(n).padStart(12,'0');
function adminFor(initial){
 let state=structuredClone(initial),version=0,paid=0,committed=false,settles=0;
 return {
  get state(){return structuredClone(state);},get version(){return version;},get paid(){return paid;},get settles(){return settles;},
  from(){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:{id:'p0'},error:null};}};},
  async rpc(name,args){
   if(name==='pve_read')return {data:{version,state:structuredClone(state),action_result:null},error:null};
   if(name==='pve_try_commit'){
    if(args.p_expected!==version)return {data:{conflict:true,version,state:structuredClone(state)},error:null};
    version++;state=structuredClone(args.p_state);state.version=version;
    // Controlled wiring fixture; natural survival belongs to the balance suite.
    if(state.phase==='COMBAT'){state.combat.monster.hp=1;for(const p of state.players){p.hp=p.maxHp;p.status='ACTIVE';}state.flame=state.maxFlame;state.combat.pendingDownPlayerIds=[];}
    return {data:{version,state:structuredClone(state)},error:null};
   }
   if(name==='pve_settle_rewards'){settles++;if(!committed){paid=state.phase==='RUN_CLEAR'?Math.max(0,state.players[0].runGold):0;committed=true;}return {data:{settled:true,paid_gold:paid,rp_delta:0},error:null};}
   throw new Error('unexpected RPC '+name);
  }
 };
}
function initial(){
 const members=Array.from({length:4},(_,i)=>({id:'p'+i,user_id:i===0?'u0':undefined,member_type:i===0?'human':'ai',character_id:'adventurer',seat_index:i,display_name:'Player '+i}));
 const r=buildInitialPveRun({room:{id:'20000000-0000-4000-8000-000000000001'},members},{seed:'f3-full-expedition',depthCount:8});
 r.players[0].score=7;r.players[0].engravings['2']=1;r.players[0].runGold=5;
 r.players[0].relics.push('f1_guard_charm');r.players[0].augments.push('aug-001');r.players[0].persistentCharacterState.augmentTiers=[1];return r;
}
async function call(admin,action,n,extra={}){
 const body={action:'pve.'+action,run_id:admin.state.id,...(action==='getState'?{}:{action_id:aid(n),expected_version:admin.version}),...extra};
 const result=await handlePveAction({admin,user:{id:'u0'},body,json});
 assert.ok(result&&result.status<400,action+': '+JSON.stringify(result));return result.body;
}
function legal(r,room=false){
 const priv=room?r.privateRoomState:r.privateCombat;
 const pool=(priv?.remainingCardIds||[]).map(id=>r.players[0].cardPool.find(c=>c.id===id)).filter(Boolean);
 pool.sort((a,b)=>b.baseNumber-a.baseNumber||a.id.localeCompare(b.id));return pool[0]?.id;
}
test('full generated Floor 1→2→3 route reaches RUN_CLEAR and settles Gold exactly once',async()=>{
 const admin=adminFor(initial()),id=admin.state.id;let n=1,r=(await call(admin,'getState',0)).run;
 const floors=[],f3Types=[],species=new Set();let sawPrivate=false;
 for(let guard=0;guard<700&&!['RUN_CLEAR','RUN_FAILED'].includes(r.phase);guard++){
  if(r.phase==='MAP_VOTE'){
   if(!floors.includes(r.floor))floors.push(r.floor);
   if(r.floor>1){assert.equal(r.combat,undefined);assert.equal(r.players[0].relics.includes('f1_guard_charm'),true);assert.equal(r.players[0].augments.includes('aug-001'),true);}
   r=(await call(admin,'voteNextRoom',n++,{node_id:chooseCoverageNode(r)})).run;continue;
  }
  if(r.floor===3&&r.currentRoomNodeId&&f3Types.length<r.depth)f3Types.push(r.map.nodes.find(x=>x.id===r.currentRoomNodeId).type);
  if(r.phase==='COMBAT'){
   if(r.floor===3){species.add(r.combat.monster.id);const back=(await call(admin,'getState',n++)).run;assert.equal(back.combat.monster.behaviorState,undefined);assert.equal(back.combat.monster.mechanic,undefined);assert.ok(back.privateCombat?.remainingCardIds);assert.equal(back.combat.privateByPlayer,undefined);assert.ok(back.players[1].cardPool.every(c=>!Object.hasOwn(c,'id')));sawPrivate=true;}
   r=(await call(admin,'submitCard',n++,{card_instance_id:legal(r)})).run;continue;
  }
  if(r.phase==='EVENT'){r=(await call(admin,'submitEventCard',n++,{card_instance_id:legal(r,true)})).run;continue;}
  if(r.phase==='REST'){r=(await call(admin,'restChoice',n++,{choice:'FULL_HEAL'})).run;continue;}
  if(r.phase==='SHOP'){r=(await call(admin,'shopReady',n++)).run;continue;}
  if(r.phase==='REWARD_ROOM'){r=r.roomState.pickOrder?.length?(await call(admin,'rewardChooseRelic',n++,{relic_id:r.roomState.relicIds.find(id=>!r.players[0].relics.includes(id))})).run:(await call(admin,'rewardSubmitCard',n++,{card_instance_id:legal(r,true)})).run;continue;}
  if(r.phase==='ROOM_RESULT'){r=(await call(admin,'roomReady',n++)).run;continue;}
  if(r.phase==='AUGMENT_CHOICE'){r=(await call(admin,'chooseAugment',n++,{augment_id:r.privateAugmentOffer.augmentIds[0]})).run;continue;}
  if(r.phase==='FLOOR_CLEAR'){r=(await call(admin,'continueFloor',n++)).run;continue;}
  assert.fail('unhandled phase '+r.phase);
 }
 assert.equal(r.phase,'RUN_CLEAR');assert.deepEqual(floors,[1,2,3]);assert.equal(r.id,id);
 assert.equal(f3Types.length,12);assert.equal(f3Types[0],'NORMAL_COMBAT');assert.deepEqual(f3Types.slice(-2),['REST','BOSS']);
 for(const type of ['EVENT','SHOP','ELITE_COMBAT','REWARD_ROOM'])assert.ok(f3Types.includes(type));
 assert.equal(species.size,f3Types.filter(type=>['NORMAL_COMBAT','ELITE_COMBAT','BOSS'].includes(type)).length);assert.equal(sawPrivate,true);assert.equal(r.combat,undefined);assert.equal(r.finalSummary.clearedFloors,3);
 assert.ok(r.players[0].runGold>=5);assert.ok(r.players[0].score>=7);assert.equal(r.players[0].engravings['2'],1);assert.equal(r.players[0].relics.includes('f1_guard_charm'),true);assert.equal(r.players[0].augments.includes('aug-001'),true);assert.ok(r.players[0].cardPool.length>0);assert.ok(r.players[0].hp>0);
 assert.equal(admin.paid,admin.state.players[0].runGold);const once=admin.paid;
 const back=(await call(admin,'getState',n++,{runGold:99999,rp_delta:99999})).run;
 assert.equal(back.phase,'RUN_CLEAR');assert.equal(admin.paid,once);assert.ok(admin.settles>=2);assert.equal(back.id,id);
});
test('failed and abandoned runs retain zero Gold payout and zero RP',async()=>{
 for(const phase of ['RUN_FAILED','ABANDONED']){
  const r=initial();r.phase=phase;r.players[0].runGold=100;
  const admin=adminFor(r),response=await call(admin,'getState',0);
  assert.equal(response.run.phase,phase);assert.equal(admin.paid,0);assert.equal(response.settlement.rp_delta,0);
 }
});
