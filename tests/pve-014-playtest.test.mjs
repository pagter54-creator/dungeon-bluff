import test from 'node:test';
import {chooseCoverageNode} from './helpers/pve-route.mjs';
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
      {id:'p1',user_id:null,member_type:'ai',character_id:'gunner',seat_index:1},
      {id:'p2',user_id:null,member_type:'ai',character_id:'mage',seat_index:2},
      {id:'p3',user_id:null,member_type:'ai',character_id:'twins',seat_index:3},
    ],
    session:null
  };
}
function humanBundle(){
  return {
    room:{id:ROOM_ID,host_user_id:'u0'},
    members:[
      {id:'p0',user_id:'u0',member_type:'human',character_id:'warrior',seat_index:0},
      {id:'p1',user_id:'u1',member_type:'human',character_id:'twins',seat_index:1},
      {id:'p2',user_id:'u2',member_type:'human',character_id:'gunner',seat_index:2},
      {id:'p3',user_id:'u3',member_type:'human',character_id:'mage',seat_index:3},
    ],
    session:null
  };
}
function memoryAdmin(roomBundle=bundle()){
  let state=null,version=0;const actions=new Map(),telemetry=[];
  return {
    get state(){return structuredClone(state);},get version(){return version;},telemetry,
    seedDueAugment(playerId){state.players.find(player=>player.playerId===playerId).growthExp=50;},
    async rpc(name,args){
      if(name==='game_read')return {data:roomBundle,error:null};
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
async function call(admin,body,userId='u0'){
  const res=await handlePveAction({admin,user:{id:userId},body,json});
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
function chooseRouteNode(run){return chooseCoverageNode(run);}

test('PVE-014 AI combat submissions are deterministic, legal, private, and allow a human+AI turn to resolve',()=>{
  const make=()=>{
    const members=bundle().members.map(newPlayerRunState),run={id:'r',seed:'ai-combat',rngCounter:0,phase:'COMBAT',floor:1,depth:1,flame:3,maxFlame:5,players:members,map:{nodes:[],edges:{}}};
    installRelicCatalog(run,F1_RELIC_DEFINITIONS);
    run.combat=newCombatState(run.players,90,'NORMAL_COMBAT',F1_MONSTER_DEFINITIONS.f1_coward_hunter);
    // DESIGN-D parity replay requires the same authoritative combat identity.
    run.combat.id='pve-014-fixed-authoritative-combat';
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

test('PVE-014 internal API playtest: four humans can traverse every F1 room family and reach Floor 2',async()=>{
  const admin=memoryAdmin(humanBundle()),users=['u0','u1','u2','u3'];let seq=1;
  let run=await call(admin,{action:'pve.createRun',room_id:ROOM_ID,seed:'pve-014-four-human-playtest',depth_count:8},'u0');
  assert.equal(run.floor,1);assert.equal(run.phase,'MAP_VOTE');assert.equal(run.contentVersion,'F1_CONTENT_001B');assert.equal(run.flame,4);assert.equal(run.maxFlame,5);
  const selectedBossId=run.map.bossId;

  const visited=[],combatTurns={},version=()=>admin.version;
  let rewardResolved=false,lastVisitedNodeId=null,sawBossAugment=false,seededBossAugment=false;
  for(let guard=0;guard<800&&run.floor===1&&run.phase!=='RUN_FAILED';guard++){
    if(run.currentRoomNodeId&&run.currentRoomNodeId!==lastVisitedNodeId){
      visited.push(run.map.nodes.find(n=>n.id===run.currentRoomNodeId)?.type);
      lastVisitedNodeId=run.currentRoomNodeId;
    }
    if(run.phase==='MAP_VOTE'){
      const nodeId=chooseRouteNode(run);
      for(const userId of users){
        run=await call(admin,{action:'pve.voteNextRoom',run_id:run.id,action_id:actionId(seq++),expected_version:version(),node_id:nodeId},userId);
        if(run.phase!=='MAP_VOTE')break;
      }
      continue;
    }
    if(run.phase==='COMBAT'){
      if(run.combat.roomType==='BOSS'&&!seededBossAugment){admin.seedDueAugment('p0');seededBossAugment=true;run=await call(admin,{action:'pve.getState',run_id:run.id},'u0');}
      const turn=run.combat.turn,used=new Set();
      for(const userId of users){
        let view=await call(admin,{action:'pve.getState',run_id:run.id},userId);
        if(view.phase!=='COMBAT'||view.combat.turn!==turn){run=view;break;}
        const me=view.players.find(p=>p.userId===userId);
        if(me.status==='DOWNED'||view.combat.readyPlayerIds?.includes(me.playerId)){run=view;continue;}
        let cards=(view.privateCombat?.remainingCardIds||[]).map(id=>me.cardPool.find(c=>c.id===id)).filter(Boolean);
        if(me.characterId==='twins')cards=cards.filter(card=>card.baseNumber%2===(me.publicResources.parity||0));
        cards.sort((a,b)=>b.baseNumber-a.baseNumber);
        let chosen=null,useSkill=false,finalNumber=null;
        if(me.characterId==='mage'&&(me.publicResources.mana||0)>=2){
          const bonus=(me.publicResources.mana||0)>=4?2:1;
          chosen=cards.find(card=>!used.has(card.baseNumber+bonus));
          if(chosen){useSkill=true;finalNumber=chosen.baseNumber+bonus;}
        }
        if(!chosen){
          chosen=cards.find(card=>!used.has(card.baseNumber))||cards[0];
          finalNumber=chosen?.baseNumber;
          if(me.characterId==='warrior'&&(me.publicResources.toughnessCharges||0)>0&&chosen?.baseNumber>=5)useSkill=true;
          if(me.characterId==='gunner'&&me.publicResources.fullBurstReady)useSkill=true;
        }
        assert.ok(chosen,`no legal combat card for ${userId}`);
        used.add(finalNumber);
        run=await call(admin,{action:'pve.submitCard',run_id:run.id,action_id:actionId(seq++),expected_version:version(),card_instance_id:chosen.id,skill_intent:useSkill},userId);
        combatTurns[run.currentRoomNodeId]=Math.max(combatTurns[run.currentRoomNodeId]||0,turn);
        if(run.phase!=='COMBAT'||run.combat.turn!==turn)break;
      }
      continue;
    }
    if(run.phase==='EVENT'){
      for(const userId of users){
        const view=await call(admin,{action:'pve.getState',run_id:run.id},userId);run=view;
        if(run.phase!=='EVENT')break;
        const me=run.players.find(p=>p.userId===userId);
        if(run.roomState.choicesByPlayer?.[me.playerId])continue;
        const cardId=run.privateRoomState.remainingCardIds.find(id=>{const card=me.cardPool.find(c=>c.id===id);return card&&(me.characterId!=='twins'||card.baseNumber%2===(me.publicResources.parity||0));});
        assert.ok(cardId,'event card is available');
        run=await call(admin,{action:'pve.submitEventCard',run_id:run.id,action_id:actionId(seq++),expected_version:version(),card_instance_id:cardId},userId);
      }
      continue;
    }
    if(run.phase==='REST'){
      for(const userId of users){
        const view=await call(admin,{action:'pve.getState',run_id:run.id},userId);run=view;
        if(run.phase!=='REST')break;
        const me=run.players.find(p=>p.userId===userId);
        if(run.roomState.choicesByPlayer?.[me.playerId])continue;
        run=await call(admin,{action:'pve.restChoice',run_id:run.id,action_id:actionId(seq++),expected_version:version(),choice:'FULL_HEAL'},userId);
      }
      continue;
    }
    if(run.phase==='SHOP'){
      for(const userId of users){
        const view=await call(admin,{action:'pve.getState',run_id:run.id},userId);run=view;
        if(run.phase!=='SHOP')break;
        const me=run.players.find(p=>p.userId===userId);
        if(run.roomState.readyPlayerIds?.includes(me.playerId))continue;
        run=await call(admin,{action:'pve.shopReady',run_id:run.id,action_id:actionId(seq++),expected_version:version()},userId);
      }
      continue;
    }
    if(run.phase==='REWARD_ROOM'){
      if(run.roomState.pickOrder?.length){
        const pid=run.roomState.pickOrder[0],picker=run.players.find(p=>p.playerId===pid),relicId=run.roomState.relicIds.find(id=>!picker.relics.includes(id));
        run=await call(admin,{action:'pve.rewardChooseRelic',run_id:run.id,action_id:actionId(seq++),expected_version:version(),relic_id:relicId},picker.userId);
        if(run.phase==='ROOM_RESULT')rewardResolved=true;
        continue;
      }
      const attempt=run.roomState.attempt,used=new Set();
      for(const userId of users){
        let view=await call(admin,{action:'pve.getState',run_id:run.id},userId);run=view;
        if(run.phase!=='REWARD_ROOM'||run.roomState.attempt!==attempt)break;
        const me=run.players.find(p=>p.userId===userId);
        if(run.roomState.readyPlayerIds?.includes(me.playerId))continue;
        let cards=(run.privateRoomState?.remainingCardIds||[]).map(id=>me.cardPool.find(c=>c.id===id)).filter(Boolean);
        if(me.characterId==='twins')cards=cards.filter(card=>card.baseNumber%2===(me.publicResources.parity||0));
        cards.sort((a,b)=>b.baseNumber-a.baseNumber);
        const chosen=cards.find(card=>!used.has(card.baseNumber))||cards[0];
        assert.ok(chosen,`no legal reward card for ${userId}`);used.add(chosen.baseNumber);
        run=await call(admin,{action:'pve.rewardSubmitCard',run_id:run.id,action_id:actionId(seq++),expected_version:version(),card_instance_id:chosen.id,skill_intent:false},userId);
        if(run.phase==='ROOM_RESULT'){rewardResolved=true;break;}
      }
      continue;
    }
    if(run.phase==='ROOM_RESULT'){
      for(const userId of users){
        run=await call(admin,{action:'pve.roomReady',run_id:run.id,action_id:actionId(seq++),expected_version:version()},userId);
        if(run.phase!=='ROOM_RESULT')break;
      }
      continue;
    }
    if(run.phase==='AUGMENT_CHOICE'){
      if(run.augmentChoice?.resumePhase==='FLOOR_CLEAR')sawBossAugment=true;
      let changed=false;
      for(const userId of users){
        const view=await call(admin,{action:'pve.getState',run_id:run.id},userId);run=view;
        if(run.phase!=='AUGMENT_CHOICE')break;
        if(run.privateAugmentOffer?.augmentIds?.length){
          run=await call(admin,{action:'pve.chooseAugment',run_id:run.id,action_id:actionId(seq++),expected_version:version(),augment_id:run.privateAugmentOffer.augmentIds[0]},userId);
          changed=true;break;
        }
      }
      if(!changed&&run.phase==='AUGMENT_CHOICE')assert.fail('augment phase has no human offer');
      continue;
    }
    assert.fail(`unhandled playtest phase ${run.phase}`);
  }

  assert.notEqual(run.phase,'RUN_FAILED',JSON.stringify({visited,combatTurns,flame:run.flame,players:run.players.map(p=>({id:p.playerId,hp:p.hp,status:p.status,gold:p.runGold}))}));
  assert.equal(run.phase,'MAP_VOTE',JSON.stringify({visited,combatTurns}));assert.equal(run.floor,2);
  assert.equal(visited.length,10);assert.equal(visited[0],'NORMAL_COMBAT');assert.deepEqual(visited.slice(-2),['REST','BOSS']);
  for(const type of ['EVENT','SHOP','ELITE_COMBAT','REWARD_ROOM'])assert.ok(visited.includes(type));
  assert.equal(run.floorClear.bossId,selectedBossId);
  assert.equal(sawBossAugment,true,'boss reward must exercise the augment-choice API before transition');
  assert.equal(rewardResolved,true);
  assert.ok(run.players.some(p=>p.relics.length>0));
  assert.ok(admin.telemetry.some(x=>x.logType==='COMBAT'&&x.payload.monster_id===selectedBossId));
  const combatLogs=admin.telemetry.filter(x=>x.logType==='COMBAT').map(x=>x.payload);
  assert.ok(combatLogs.length>=4);
  const committed=admin.state,committedVersion=admin.version;
  assert.equal(committed.id,run.id);assert.equal(committed.floor,2);assert.equal(committed.phase,'MAP_VOTE');
  assert.equal(committed.combat,undefined);assert.ok(committed.map.nodes.some(node=>node.type==='BOSS'));
  assert.equal(committed.map.depthCount,11);assert.equal(committed.currentRoomNodeId,null);
  for(const userId of users){
    const reconnect=await call(admin,{action:'pve.getState',run_id:run.id},userId);
    const own=reconnect.players.find(player=>player.userId===userId),saved=committed.players.find(player=>player.userId===userId);
    assert.equal(reconnect.id,run.id);assert.equal(reconnect.floor,2);assert.equal(reconnect.phase,'MAP_VOTE');
    for(const field of ['hp','runGold','growthExp','score'])assert.equal(own[field],saved[field],field);
    for(const field of ['cardPool','engravings','relics','augments'])assert.deepEqual(own[field],saved[field],field);
    assert.deepEqual(reconnect.privateCombat,committed.cardCycles[own.playerId]);
    assert.equal(reconnect.cardCycles,undefined);assert.equal(reconnect.combat,undefined);
    assert.equal(JSON.stringify(reconnect).includes('privateByPlayer'),false);
    assert.equal(JSON.stringify(reconnect).includes('behaviorState'),false);
  }
  const selected=connectedNodeIds(run.map)[0];
  const accepted=await handlePveAction({admin,user:{id:'u0'},body:{action:'pve.voteNextRoom',run_id:run.id,action_id:actionId(seq++),expected_version:admin.version,node_id:selected},json});
  assert.equal(accepted.status,200);
  assert.equal(admin.state.map.votes[committed.players[0].playerId],selected);
  assert.equal(admin.version,committedVersion+1);
  console.log('[PVE-014 F1 playtest]',JSON.stringify({
    route:visited,
    combats:combatLogs.map(x=>({room:x.room_type,monster:x.monster_id,turns:x.turn_count,damage:x.party_damage_total,flameSpent:x.flame_spent})),
    finalFlame:run.flame,
    finalPlayers:run.players.map(p=>({id:p.playerId,hp:p.hp,gold:p.runGold,relics:p.relics.length}))
  }));
});
