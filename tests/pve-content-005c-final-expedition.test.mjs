import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInitialPveRun,handlePveAction} from '../supabase/functions/game-api/pve/api.js';
import {connectedNodeIds} from '../supabase/functions/game-api/pve/map.js';

const json=(body,status=200)=>({body,status});
const actionId=n=>'f0000000-0000-4000-8000-'+String(n).padStart(12,'0');
function adminFor(initial){
  let state=structuredClone(initial),version=0;
  return {get state(){return structuredClone(state);},get version(){return version;},
    from(){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:{id:'p0'},error:null};}};},
    async rpc(name,args){
      if(name==='pve_read')return {data:{version,state:structuredClone(state),action_result:null},error:null};
      if(name==='pve_try_commit'){
        if(args.p_expected!==version)return {data:{conflict:true,version,state:structuredClone(state)},error:null};
        version++;state=structuredClone(args.p_state);state.version=version;
        if(state.phase==='COMBAT'){state.combat.monster.hp=1;for(const p of state.players){p.hp=p.maxHp;p.status='ACTIVE';}state.flame=state.maxFlame;state.combat.pendingDownPlayerIds=[];}
        return {data:{version,state:structuredClone(state)},error:null};
      }
      if(name==='pve_settle_rewards')return {data:{settled:true,paid_gold:state.phase==='RUN_CLEAR'?state.players[0].runGold:0,rp_delta:0},error:null};
      throw new Error('unexpected RPC '+name);
    }
  };
}
async function call(admin,action,n,extra={}){
  const body={action:'pve.'+action,run_id:admin.state.id,...(action==='getState'?{}:{action_id:actionId(n),expected_version:admin.version}),...extra};
  const result=await handlePveAction({admin,user:{id:'u0'},body,json});
  assert.ok(result&&result.status<400,action+': '+JSON.stringify(result));return result.body.run;
}
function legal(run,room=false){
  const privateState=room?run.privateRoomState:run.privateCombat;
  return (privateState.remainingCardIds||[]).map(id=>run.players[0].cardPool.find(card=>card.id===id)).filter(Boolean).sort((a,b)=>b.baseNumber-a.baseNumber||a.id.localeCompare(b.id))[0]?.id;
}
for(const [partyName,classes,equipped] of [
 ['FOUR_005C',['seer','imp','gambler','gunner'],[['aug-151','aug-153'],['aug-181','aug-183'],['aug-231','aug-232'],['aug-261','aug-266']]],
 ['MIXED_005B_005C',['seer','imp','mage','gunner'],[['aug-151','aug-153'],['aug-181','aug-183'],['aug-091','aug-092'],['aug-261','aug-266']]]
])test('005C FINAL '+partyName+' actual expedition crosses Floor1/2/3 with two reconnects to RUN_CLEAR',async()=>{
  const members=classes.map((character_id,i)=>({id:'p'+i,user_id:i===0?'u0':undefined,member_type:i===0?'human':'ai',character_id,seat_index:i,display_name:'005B '+i}));
  const initial=buildInitialPveRun({room:{id:'20000000-0000-4000-8000-000000000002'},members},{seed:'005c-final-full-expedition-route',depthCount:8});
  for(let i=0;i<initial.players.length;i++)initial.players[i].augments.push(...equipped[i]);
  const admin=adminFor(initial);let n=1000,run=await call(admin,'getState',0),floors=[],reconnects=[];
  for(let guard=0;guard<700&&!['RUN_CLEAR','RUN_FAILED'].includes(run.phase);guard++){
    if(run.phase==='MAP_VOTE'){
      if(run.floor===3&&!reconnects.includes('F3_MAP_ENTRY')){run=await call(admin,'getState',0);reconnects.push('F3_MAP_ENTRY');}
      if(!floors.includes(run.floor))floors.push(run.floor);
      const nodes=connectedNodeIds(run.map).map(id=>run.map.nodes.find(x=>x.id===id));
      const desired=run.floor===3?['NORMAL_COMBAT','EVENT','NORMAL_COMBAT','ELITE_COMBAT','REST','SHOP','NORMAL_COMBAT','REWARD_ROOM','ELITE_COMBAT','BOSS'][nodes[0].depth-1]:null;
      run=await call(admin,'voteNextRoom',n++,{node_id:(nodes.find(x=>x.type===desired)||nodes[0]).id});continue;
    }
    if(run.phase==='COMBAT'){
      if(run.floor===1&&!reconnects.includes('F1_COMBAT')){run=await call(admin,'getState',0);reconnects.push('F1_COMBAT');}
      run=await call(admin,'submitCard',n++,{card_instance_id:legal(run)});continue;
    }
    if(run.phase==='EVENT'){run=await call(admin,'submitEventCard',n++,{card_instance_id:legal(run,true)});continue;}
    if(run.phase==='REST'){run=await call(admin,'restChoice',n++,{choice:'FULL_HEAL'});continue;}
    if(run.phase==='SHOP'){run=await call(admin,'shopReady',n++);continue;}
    if(run.phase==='REWARD_ROOM'){run=run.roomState.pickOrder?.length?await call(admin,'rewardChooseRelic',n++,{relic_id:run.roomState.relicIds[0]}):await call(admin,'rewardSubmitCard',n++,{card_instance_id:legal(run,true)});continue;}
    if(run.phase==='ROOM_RESULT'){run=await call(admin,'roomReady',n++);continue;}
    if(run.phase==='AUGMENT_CHOICE'){run=await call(admin,'chooseAugment',n++,{augment_id:run.privateAugmentOffer.augmentIds[0]});continue;}
    if(run.phase==='FLOOR_CLEAR'){run=await call(admin,'continueFloor',n++);continue;}
    assert.fail('unhandled phase '+run.phase);
  }
  assert.equal(run.phase,'RUN_CLEAR');assert.deepEqual(floors,[1,2,3]);assert.deepEqual(reconnects,['F1_COMBAT','F3_MAP_ENTRY']);
  for(const [i,ids] of equipped.entries())for(const id of ids)assert.ok(admin.state.players[i].augments.includes(id),id);
});
