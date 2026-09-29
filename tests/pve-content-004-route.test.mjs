import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInitialPveRun,handlePveAction} from '../supabase/functions/game-api/pve/api.js';
import {connectedNodeIds} from '../supabase/functions/game-api/pve/map.js';

const lobby=['adventurer','warrior','rogue','mage','berserker','seer','imp','gambler','gunner','fighter','vampire','demonsword','twins'];
const aid=n=>'c0000000-0000-4000-8000-'+String(n).padStart(12,'0');
const json=(body,status=200)=>({body,status});
function adminFor(initial){
  let state=structuredClone(initial),version=0;
  return {
    get state(){return structuredClone(state);},get version(){return version;},
    from(){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:{id:'p0'},error:null};}};},
    async rpc(name,args){
      if(name==='pve_read')return {data:{version,state:structuredClone(state),action_result:null},error:null};
      if(name==='pve_try_commit'){
        if(args.p_expected!==version)return {data:{conflict:true,version,state:structuredClone(state)},error:null};
        version++;state=structuredClone(args.p_state);state.version=version;
        if(state.phase==='COMBAT'){
          state.combat.monster.hp=1;
          for(const p of state.players){p.hp=p.maxHp;p.status='ACTIVE';}
          state.flame=state.maxFlame;state.combat.pendingDownPlayerIds=[];
        }
        return {data:{version,state:structuredClone(state)},error:null};
      }
      if(name==='pve_settle_rewards')return {data:{settled:true,paid_gold:state.phase==='RUN_CLEAR'?state.players[0].runGold:0,rp_delta:0},error:null};
      throw Error('unexpected RPC '+name);
    }
  };
}
async function call(admin,action,n,extra={}){
  const body={action:'pve.'+action,run_id:admin.state.id,...(action==='getState'?{}:{action_id:aid(n),expected_version:admin.version}),...extra};
  const response=await handlePveAction({admin,user:{id:'u0'},body,json});
  assert.ok(response&&response.status<400,action+': '+JSON.stringify(response));
  return response.body.run;
}
function legal(run,room=false){
  const state=room?run.privateRoomState:run.privateCombat,p=run.players[0];
  const cards=(state?.remainingCardIds||[]).map(id=>p.cardPool.find(c=>c.id===id)).filter(Boolean)
    .filter(c=>p.characterId!=='twins'||c.baseNumber%2===p.publicResources.parity);
  cards.sort((a,b)=>b.baseNumber-a.baseNumber||a.id.localeCompare(b.id));
  assert.ok(cards.length,'No legal card for '+p.characterId);
  return cards[0].id;
}
async function expedition(characters,seed){
  const members=characters.map((character_id,i)=>({id:'p'+i,user_id:i===0?'u0':undefined,member_type:i===0?'human':'ai',character_id,seat_index:i,display_name:'P'+i}));
  const initial=buildInitialPveRun({room:{id:'room'},members},{seed,depthCount:8}),admin=adminFor(initial);
  let n=1,run=await call(admin,'getState',0),floors=[];
  for(let guard=0;guard<900&&!['RUN_CLEAR','RUN_FAILED'].includes(run.phase);guard++){
    if(run.phase==='MAP_VOTE'){
      if(!floors.includes(run.floor))floors.push(run.floor);
      const node=connectedNodeIds(run.map)[0];
      run=await call(admin,'voteNextRoom',n++,{node_id:node});continue;
    }
    if(run.phase==='COMBAT'){run=await call(admin,'submitCard',n++,{card_instance_id:legal(run)});continue;}
    if(run.phase==='EVENT'){run=await call(admin,'submitEventCard',n++,{card_instance_id:legal(run,true)});continue;}
    if(run.phase==='REST'){run=await call(admin,'restChoice',n++,{choice:'FULL_HEAL'});continue;}
    if(run.phase==='SHOP'){run=await call(admin,'shopReady',n++);continue;}
    if(run.phase==='REWARD_ROOM'){
      run=run.roomState.pickOrder?.length?await call(admin,'rewardChooseRelic',n++,{relic_id:run.roomState.relicIds[0]}):await call(admin,'rewardSubmitCard',n++,{card_instance_id:legal(run,true)});
      continue;
    }
    if(run.phase==='ROOM_RESULT'){run=await call(admin,'roomReady',n++);continue;}
    if(run.phase==='AUGMENT_CHOICE'){run=await call(admin,'chooseAugment',n++,{augment_id:run.privateAugmentOffer.augmentIds[0]});continue;}
    if(run.phase==='FLOOR_CLEAR'){run=await call(admin,'continueFloor',n++);continue;}
    assert.fail('Unhandled phase '+run.phase+' for '+characters.join('/'));
  }
  assert.equal(run.phase,'RUN_CLEAR',characters.join('/')+' ended at '+run.phase);
  assert.deepEqual(floors,[1,2,3]);
  assert.equal(run.combat,undefined);
  assert.equal(run.finalSummary.clearedFloors,3);
  assert.equal(new Set(run.players[0].cardPool.map(c=>c.id)).size,run.players[0].cardPool.length);
}
for(const id of lobby)test('C04 full expedition wiring: '+id,()=>expedition([id,'adventurer','adventurer','adventurer'],'class-route-'+id));
for(const [name,party] of Object.entries({
  number_pipeline:['warrior','mage','imp','vampire'],
  card_lifecycle:['seer','gunner','gambler','twins'],
  damage_resource:['berserker','fighter','demonsword','adventurer']
}))test('C04 mixed party wiring: '+name,()=>expedition(party,'mixed-'+name));
