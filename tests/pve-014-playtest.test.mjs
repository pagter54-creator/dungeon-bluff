import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePveAction} from '../supabase/functions/game-api/pve/api.js';
import {connectedNodeIds} from '../supabase/functions/game-api/pve/map.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {F1_MONSTER_DEFINITIONS,F1_RELIC_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';

const ROOM_ID='22222222-2222-4222-8222-222222222222';
const json=(body,status=200)=>({body,status});
const actionId=n=>`90000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

function bundle(){
  return {
    room:{id:ROOM_ID,host_user_id:'u0'},
    members:[
      {id:'p0',user_id:'u0',member_type:'human',character_id:'warrior',seat_index:0},
      {id:'p1',user_id:null,member_type:'ai',character_id:'adventurer',seat_index:1},
      {id:'p2',user_id:null,member_type:'ai',character_id:'mage',seat_index:2},
      {id:'p3',user_id:null,member_type:'ai',character_id:'twins',seat_index:3},
    ],
    session:null
  };
}
function memoryAdmin(){
  let state=null,version=0;const actions=new Map(),telemetry=[];
  return {
    get state(){return structuredClone(state);},get version(){return version;},telemetry,
    async rpc(name,args){
      if(name==='game_read')return {data:bundle(),error:null};
      if(name==='pve_create_run'){
        const incoming=structuredClone(args.p_state),pending=incoming._telemetryPending||[];delete incoming._telemetryPending;
        state=incoming;version=0;state.version=0;
        for(const event of pending)telemetry.push({version:0,...structuredClone(event)});
        return {data:{version:0,state:structuredClone(state)},error:null};
      }
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
async function call(admin,body){
  const res=await handlePveAction({admin,user:{id:'u0'},body,json});
  assert.ok(res,body.action);assert.notEqual(res.status,409,`${body.action} conflicted`);
  assert.ok(res.status<400,`${body.action}: ${JSON.stringify(res.body)}`);
  return res.body.run;
}
function ownCard(run){
  const remaining=run.privateCombat?.remainingCardIds||[];
  const cards=run.players.find(p=>p.playerId==='p0').cardPool||[];
  const legal=remaining.map(id=>cards.find(c=>c.id===id)).filter(Boolean);
  legal.sort((a,b)=>b.baseNumber-a.baseNumber);
  return legal[0]?.id;
}
function rewardCard(run){
  const remaining=run.privateRoomState?.remainingCardIds||[];
  const cards=run.players.find(p=>p.playerId==='p0').cardPool||[];
  return remaining.map(id=>cards.find(c=>c.id===id)).filter(Boolean).sort((a,b)=>b.baseNumber-a.baseNumber)[0]?.id;
}
function chooseRouteNode(run){
  const ids=connectedNodeIds(run.map),nodes=ids.map(id=>run.map.nodes.find(n=>n.id===id));
  const desired={
    1:'NORMAL_COMBAT',
    2:'REST',
    3:'NORMAL_COMBAT',
    4:'ELITE_COMBAT',
    5:'REWARD_ROOM',
    6:'NORMAL_COMBAT',
    7:'SHOP',
    8:'BOSS'
  }[nodes[0]?.depth];
  return nodes.find(n=>n.type===desired)?.id||nodes[0]?.id;
}

test('PVE-014 AI combat submissions are deterministic, legal, private, and allow a human+AI turn to resolve',()=>{
  const make=()=>{
    const members=bundle().members.map(newPlayerRunState),run={id:'r',seed:'ai-combat',rngCounter:0,phase:'COMBAT',floor:1,depth:1,flame:3,maxFlame:5,players:members,map:{nodes:[],edges:{}}};
    installRelicCatalog(run,F1_RELIC_DEFINITIONS);
    run.combat=newCombatState(run.players,90,'NORMAL_COMBAT',F1_MONSTER_DEFINITIONS.f1_coward_hunter);
    beginTurn(run);return run;
  };
  const a=make(),b=make();
  for(const pid of ['p1','p2','p3']){
    assert.equal(a.combat.turnSubmissions[pid].autoSubmitted,true);
    assert.equal(a.combat.turnSubmissions[pid].cardInstanceId,b.combat.turnSubmissions[pid].cardInstanceId);
    assert.ok(a.combat.privateByPlayer[pid].remainingCardIds.includes(a.combat.turnSubmissions[pid].cardInstanceId));
  }
  assert.equal(a.combat.turnSubmissions.p0,undefined);
  const id=a.combat.privateByPlayer.p0.remainingCardIds[0];submitCard(a,'p0',id);
  const result=resolveBasicTurn(a);assert.ok(result);assert.equal(result.cards.length,4);
});

test('PVE-014 fully automatic turn resolves when the only human is stunned instead of deadlocking',()=>{
  const players=bundle().members.map(newPlayerRunState),run={id:'r2',seed:'auto-turn',rngCounter:0,phase:'COMBAT',floor:1,depth:1,flame:3,maxFlame:5,players,map:{nodes:[],edges:{}}};
  installRelicCatalog(run,F1_RELIC_DEFINITIONS);
  run.combat=newCombatState(run.players,90,'NORMAL_COMBAT',F1_MONSTER_DEFINITIONS.f1_coward_hunter);
  run.players[0].status='STUNNED_NEXT_TURN';beginTurn(run);
  assert.ok(run.combat.turn>=2||run.phase!=='COMBAT');
  if(run.phase==='COMBAT')assert.equal(run.players[0].status,'ACTIVE');
});

test('PVE-014 internal API playtest: one human + three AI can enter F1 and reach FLOOR_CLEAR through the real room actions',async()=>{
  const admin=memoryAdmin();let seq=1;
  let run=await call(admin,{action:'pve.createRun',room_id:ROOM_ID,seed:'pve-014-internal-playtest',depth_count:8});
  assert.equal(run.floor,1);assert.equal(run.phase,'MAP_VOTE');assert.equal(run.contentVersion,'F1_VERTICAL_SLICE_V1');
  assert.equal(run.map.bossName,'몰락한 성주');

  const visited=[],combatTurns={},version=()=>admin.version;
  let boughtCard=false,rewardResolved=false;
  for(let guard=0;guard<500&&run.phase!=='FLOOR_CLEAR'&&run.phase!=='RUN_FAILED';guard++){
    if(run.phase==='MAP_VOTE'){
      const nodeId=chooseRouteNode(run),node=run.map.nodes.find(n=>n.id===nodeId);visited.push(node.type);
      run=await call(admin,{action:'pve.voteNextRoom',run_id:run.id,action_id:actionId(seq++),expected_version:version(),node_id:nodeId});
      continue;
    }
    if(run.phase==='COMBAT'){
      const id=ownCard(run);
      if(!id){
        // A fully automatic stunned/downed stretch may already have advanced; refresh the projected state.
        run=await call(admin,{action:'pve.getState',run_id:run.id});
        continue;
      }
      const beforeTurn=run.combat.turn;
      run=await call(admin,{action:'pve.submitCard',run_id:run.id,action_id:actionId(seq++),expected_version:version(),card_instance_id:id,skill_intent:false});
      combatTurns[run.currentRoomNodeId]=Math.max(combatTurns[run.currentRoomNodeId]||0,beforeTurn);
      continue;
    }
    if(run.phase==='EVENT'){
      run=await call(admin,{action:'pve.chooseEventOption',run_id:run.id,action_id:actionId(seq++),expected_version:version(),option_id:run.roomState.options[0].id});
      continue;
    }
    if(run.phase==='REST'){
      run=await call(admin,{action:'pve.restChoice',run_id:run.id,action_id:actionId(seq++),expected_version:version(),choice:'FULL_HEAL'});
      continue;
    }
    if(run.phase==='REWARD_ROOM'){
      if(run.roomState.pickOrder?.[0]==='p0'){
        run=await call(admin,{action:'pve.rewardChooseRelic',run_id:run.id,action_id:actionId(seq++),expected_version:version(),relic_id:run.roomState.relicIds[0]});
        rewardResolved=true;continue;
      }
      const id=rewardCard(run);
      if(id){
        run=await call(admin,{action:'pve.rewardSubmitCard',run_id:run.id,action_id:actionId(seq++),expected_version:version(),card_instance_id:id,skill_intent:false});
        if(run.phase==='ROOM_RESULT')rewardResolved=true;
        continue;
      }
      run=await call(admin,{action:'pve.getState',run_id:run.id});continue;
    }
    if(run.phase==='SHOP'){
      if(!boughtCard&&run.roomState.cardStock.some(x=>!x.sold)){
        const item=run.roomState.cardStock.find(x=>!x.sold),player=run.players.find(p=>p.playerId==='p0');
        if(player.runGold>=item.price){
          run=await call(admin,{action:'pve.shopReserveCard',run_id:run.id,action_id:actionId(seq++),expected_version:version(),product_id:item.id});
          const replace=run.players.find(p=>p.playerId==='p0').cardPool[0].id;
          run=await call(admin,{action:'pve.shopConfirmCard',run_id:run.id,action_id:actionId(seq++),expected_version:version(),product_id:item.id,replace_card_id:replace});
          boughtCard=true;continue;
        }
      }
      run=await call(admin,{action:'pve.shopReady',run_id:run.id,action_id:actionId(seq++),expected_version:version()});
      continue;
    }
    if(run.phase==='ROOM_RESULT'){
      run=await call(admin,{action:'pve.roomReady',run_id:run.id,action_id:actionId(seq++),expected_version:version()});
      continue;
    }
    if(run.phase==='AUGMENT_CHOICE'){
      assert.ok(run.privateAugmentOffer?.augmentIds?.length);
      run=await call(admin,{action:'pve.chooseAugment',run_id:run.id,action_id:actionId(seq++),expected_version:version(),augment_id:run.privateAugmentOffer.augmentIds[0]});
      continue;
    }
    assert.fail(`unhandled playtest phase ${run.phase}`);
  }

  assert.notEqual(run.phase,'RUN_FAILED',JSON.stringify({visited,combatTurns,flame:run.flame,players:run.players.map(p=>({id:p.playerId,hp:p.hp,status:p.status,gold:p.runGold}))}));
  assert.equal(run.phase,'FLOOR_CLEAR',JSON.stringify({visited,combatTurns}));
  assert.deepEqual(visited,['NORMAL_COMBAT','REST','NORMAL_COMBAT','ELITE_COMBAT','REWARD_ROOM','NORMAL_COMBAT','SHOP','BOSS']);
  assert.equal(run.floorClear.bossName,'몰락한 성주');
  assert.equal(rewardResolved,true);
  assert.equal(boughtCard,true);
  assert.ok(run.players.find(p=>p.playerId==='p0').cardPool.some(c=>c.source==='SHOP'));
  assert.ok(run.players.some(p=>p.relics.length>0));
  assert.ok(admin.telemetry.some(x=>x.logType==='COMBAT'&&x.payload.monster_id==='f1_fallen_lord'));
  assert.ok(admin.telemetry.filter(x=>x.logType==='COMBAT').length>=5);
});
