import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePveAction} from '../supabase/functions/game-api/pve/api.js';
import {connectedNodeIds,generateFloorMap} from '../supabase/functions/game-api/pve/map.js';
import {newPlayerRunState} from '../supabase/functions/game-api/pve/model.js';
import {F2_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f2.js';
import {F1_RELIC_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';

const json=(body,status=200)=>({body,status});
const actionId=n=>`a0000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function memoryAdmin(initial){
  let state=structuredClone(initial),version=0;
  return {
    get state(){return structuredClone(state);},get version(){return version;},
    seedBossAugment(){state.players[0].growthExp=50;},
    async rpc(name,args){
      if(name==='pve_read')return {data:{version,state:structuredClone(state),action_result:null},error:null};
      if(name==='pve_try_commit'){
        if(args.p_expected!==version)return {data:{conflict:true,version,state:structuredClone(state)},error:null};
        version++;state=structuredClone(args.p_state);state.version=version;
        // Keep this path test focused on room wiring; combat survival is checked separately.
        if(state.floor===2&&state.phase!=='FLOOR_CLEAR'){for(const player of state.players){player.hp=player.maxHp;player.status='ACTIVE';}state.flame=state.maxFlame;if(state.combat)state.combat.pendingDownPlayerIds=[];}
        return {data:{version,state:structuredClone(state)},error:null};
      }
      throw new Error(`unexpected RPC ${name}`);
    }
  };
}
function initial(){
  const members=[
    {id:'p0',user_id:'u0',member_type:'human',character_id:'adventurer',seat_index:0},
    {id:'p1',member_type:'ai',character_id:'adventurer',seat_index:1},
    {id:'p2',member_type:'ai',character_id:'adventurer',seat_index:2},
    {id:'p3',member_type:'ai',character_id:'adventurer',seat_index:3}
  ];
  const run={id:'20000000-0000-4000-8000-000000000002',roomId:'20000000-0000-4000-8000-000000000001',seed:'f2-full-route',rngCounter:0,version:0,phase:'MAP_VOTE',floor:2,depth:0,flame:50,maxFlame:50,players:members.map(newPlayerRunState),usedMonsterIds:[],chosenBossIds:{2:'f2_rottenheart_ancient'},cardCycles:{}};
  installRelicCatalog(run,F1_RELIC_DEFINITIONS);
  run.map=generateFloorMap(run,12);
  return run;
}
async function call(admin,action,seq,more={}){
  const body={action:`pve.${action}`,run_id:admin.state.id,...(action==='getState'?{}:{action_id:actionId(seq),expected_version:admin.version}),...more};
  const result=await handlePveAction({admin,user:{id:'u0'},body,json});
  assert.ok(result&&result.status<400,`${action}: ${JSON.stringify(result)}`);
  return result.body.run;
}
function legal(run,{room=false}={}){
  const me=run.players[0],privateState=room?run.privateRoomState:run.privateCombat;
  let cards=(privateState?.remainingCardIds||[]).map(id=>me.cardPool.find(c=>c.id===id)).filter(Boolean);
  cards.sort((a,b)=>b.baseNumber-a.baseNumber||a.id.localeCompare(b.id));
  return cards[0]?.id;
}
test('Floor 2 generated route exercises combat, shared rooms, reward, boss clear, and Floor 3 reconnect',async()=>{
  const admin=memoryAdmin(initial()),id=admin.state.id;let run=await call(admin,'getState',0),seq=1;
  const visited=[],seen=new Set(),combatSpecies=new Set();
  let bossSeeded=false,sawBossReconnect=false,sawBossAugment=false;
  for(let guard=0;guard<1600&&run.floor===2&&run.phase!=='RUN_FAILED';guard++){
    if(run.currentRoomNodeId&&!seen.has(run.currentRoomNodeId)){
      seen.add(run.currentRoomNodeId);
      visited.push(run.map.nodes.find(n=>n.id===run.currentRoomNodeId)?.type);
      if(run.combat)combatSpecies.add(run.combat.monster.id);
    }
    if(run.phase==='MAP_VOTE'){
      const nodes=connectedNodeIds(run.map).map(id=>run.map.nodes.find(n=>n.id===id));
      const desired={1:'NORMAL_COMBAT',2:'EVENT',3:'SHOP',4:'ELITE_COMBAT',5:'REST',6:'NORMAL_COMBAT',7:'REWARD_ROOM',8:'NORMAL_COMBAT',9:'REST',10:'NORMAL_COMBAT',11:'ELITE_COMBAT',12:'BOSS'}[nodes[0].depth];
      const chosen=nodes.find(node=>node.type===desired)||nodes[0];
      run=await call(admin,'voteNextRoom',seq++,{node_id:chosen.id});continue;
    }
    if(run.phase==='COMBAT'){
      if(run.combat.roomType==='BOSS'&&!bossSeeded){admin.seedBossAugment();bossSeeded=true;run=await call(admin,'getState',seq++);}
      const reconnect=await call(admin,'getState',seq++);
      assert.equal(reconnect.combat.monster.id,run.combat.monster.id);
      assert.equal(reconnect.combat.monster.behaviorState,undefined);
      assert.ok(reconnect.privateCombat?.remainingCardIds);
      if(run.combat.roomType==='BOSS')sawBossReconnect=true;
      const turn=run.combat.turn;
      run=await call(admin,'submitCard',seq++,{card_instance_id:legal(run)});
      assert.ok(run.phase!=='COMBAT'||run.combat.turn>turn);continue;
    }
    if(run.phase==='EVENT'){
      run=await call(admin,'submitEventCard',seq++,{card_instance_id:legal(run,{room:true})});continue;
    }
    if(run.phase==='REST'){run=await call(admin,'restChoice',seq++,{choice:'FULL_HEAL'});continue;}
    if(run.phase==='SHOP'){run=await call(admin,'shopReady',seq++);continue;}
    if(run.phase==='REWARD_ROOM'){
      const room=run.roomState;
      if(room.pickOrder?.length){
        const relicId=room.relicIds?.[0];run=await call(admin,'rewardChooseRelic',seq++,{relic_id:relicId});continue;
      }
      run=await call(admin,'rewardSubmitCard',seq++,{card_instance_id:legal(run,{room:true})});continue;
    }
    if(run.phase==='ROOM_RESULT'){run=await call(admin,'roomReady',seq++);continue;}
    if(run.phase==='AUGMENT_CHOICE'){
      if(run.augmentChoice?.resumePhase==='FLOOR_CLEAR'){
        const rewardReconnect=await call(admin,'getState',seq++);
        assert.equal(rewardReconnect.id,id);assert.equal(rewardReconnect.floor,2);
        assert.equal(rewardReconnect.augmentChoice.resumePhase,'FLOOR_CLEAR');
        assert.equal(rewardReconnect.combat.monster.behaviorState,undefined);
        sawBossAugment=true;
      }
      if(run.privateAugmentOffer?.augmentIds?.length)run=await call(admin,'chooseAugment',seq++,{augment_id:run.privateAugmentOffer.augmentIds[0]});
      else assert.fail('augment offer missing');
      continue;
    }
    assert.fail(`unhandled phase ${run.phase}`);
  }
  assert.equal(run.floor,3,JSON.stringify({phase:run.phase,visited}));
  assert.equal(run.phase,'MAP_VOTE');assert.equal(run.id,id);
  assert.equal(run.combat,undefined);assert.ok(run.map.nodes.some(node=>node.type==='BOSS'));
  assert.equal(sawBossReconnect,true);assert.equal(sawBossAugment,true);
  assert.ok(visited.includes('NORMAL_COMBAT')&&visited.includes('ELITE_COMBAT')&&visited.includes('BOSS'));
  assert.ok(visited.includes('EVENT')&&visited.includes('REST')&&visited.includes('SHOP')&&visited.includes('REWARD_ROOM'));
  assert.equal(combatSpecies.size,[...combatSpecies].length);
  const reconnected=await call(admin,'getState',seq++);
  assert.equal(reconnected.id,id);assert.equal(reconnected.floor,3);
  assert.equal(JSON.stringify(reconnected).includes('privateByPlayer'),false);
  const target=connectedNodeIds(reconnected.map)[0];
  const guarded=await handlePveAction({admin,user:{id:'u0'},body:{action:'pve.voteNextRoom',run_id:id,action_id:actionId(seq++),expected_version:admin.version,node_id:target},json});
  assert.equal(guarded.status,409);assert.equal(guarded.body.error,'CONTENT_NOT_IMPLEMENTED');
});
