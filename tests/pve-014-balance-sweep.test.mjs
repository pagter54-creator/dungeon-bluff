import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePveAction} from '../supabase/functions/game-api/pve/api.js';
import {connectedNodeIds} from '../supabase/functions/game-api/pve/map.js';

const ROOM_ID='33333333-3333-4333-8333-333333333333';
const json=(body,status=200)=>({body,status});
const aid=n=>`91000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const TARGET={NORMAL_COMBAT:6,ELITE_COMBAT:10,BOSS:14};

function makeBundle(characters,{mixed=false}={}){
  return {
    room:{id:ROOM_ID,host_user_id:'u0'},
    members:characters.map((character_id,i)=>({
      id:`p${i}`,user_id:mixed&&i>0?null:`u${i}`,
      member_type:mixed&&i>0?'ai':'human',character_id,seat_index:i
    })),
    session:null
  };
}
function memoryAdmin(roomBundle){
  let state=null,version=0;const actions=new Map(),telemetry=[];
  return {
    get version(){return version;},get state(){return structuredClone(state);},telemetry,
    async rpc(name,args){
      if(name==='game_read')return {data:roomBundle,error:null};
      if(name==='pve_create_run'){
        const incoming=structuredClone(args.p_state),pending=incoming._telemetryPending||[];delete incoming._telemetryPending;
        state=incoming;version=0;state.version=0;
        for(const e of pending)telemetry.push({version:0,...structuredClone(e)});
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
        for(const e of pending)telemetry.push({actionId:args.p_action_id,version,...structuredClone(e)});
        return {data:{version,state:structuredClone(state)},error:null};
      }
      throw new Error(`unexpected rpc ${name}`);
    }
  };
}
async function call(admin,userId,body){
  const res=await handlePveAction({admin,user:{id:userId},body,json});
  assert.ok(res,body.action);
  assert.notEqual(res.status,409,`${body.action} conflict`);
  assert.ok(res.status<400,`${body.action}: ${JSON.stringify(res.body)}`);
  return res.body.run;
}
function routeNode(run){
  const nodes=connectedNodeIds(run.map).map(id=>run.map.nodes.find(n=>n.id===id));
  const desired={1:'NORMAL_COMBAT',2:'EVENT',3:'SHOP',4:'ELITE_COMBAT',5:'REST',6:'NORMAL_COMBAT',7:'REWARD_ROOM',8:'BOSS'}[nodes[0]?.depth];
  return nodes.find(n=>n.type===desired)?.id||nodes[0]?.id;
}
function legalCards(view,me,room=false){
  const ids=room?(view.privateRoomState?.remainingCardIds||[]):(view.privateCombat?.remainingCardIds||[]);
  let cards=ids.map(id=>me.cardPool.find(c=>c.id===id)).filter(Boolean);
  if(me.characterId==='twins')cards=cards.filter(c=>c.baseNumber%2===(me.publicResources.parity||0));
  return cards.sort((a,b)=>b.baseNumber-a.baseNumber);
}
function plannedCard(view,me,used,room=false){
  const cards=legalCards(view,me,room);if(!cards.length)return null;
  if(room){
    const chosen=cards.find(c=>!used.has(c.baseNumber))||cards[0];
    return {card:chosen,skill:false,final:chosen.baseNumber};
  }
  if(me.characterId==='mage'&&(me.publicResources.mana||0)>=2){
    const bonus=(me.publicResources.mana||0)>=4?2:1;
    const chosen=cards.find(c=>!used.has(c.baseNumber+bonus));
    if(chosen)return {card:chosen,skill:true,final:chosen.baseNumber+bonus};
  }
  const chosen=cards.find(c=>!used.has(c.baseNumber))||cards[0];
  let skill=false;
  if(me.characterId==='warrior'&&(me.publicResources.toughnessCharges||0)>0&&chosen.baseNumber>=5)skill=true;
  if(me.characterId==='gunner'&&me.publicResources.fullBurstReady)skill=true;
  return {card:chosen,skill,final:chosen.baseNumber};
}
async function playFloor({seed,characters,mixed=false}){
  const admin=memoryAdmin(makeBundle(characters,{mixed})),humanUsers=mixed?['u0']:characters.map((_,i)=>`u${i}`);
  let seq=1,guard=0,run=await call(admin,'u0',{action:'pve.createRun',room_id:ROOM_ID,seed,depth_count:8});
  const visited=[];
  let lastVisitedNodeId=null;
  while(guard++<1200&&!['FLOOR_CLEAR','RUN_FAILED'].includes(run.phase)){
    if(run.currentRoomNodeId&&run.currentRoomNodeId!==lastVisitedNodeId){
      visited.push(run.map.nodes.find(n=>n.id===run.currentRoomNodeId)?.type);
      lastVisitedNodeId=run.currentRoomNodeId;
    }
    if(run.phase==='MAP_VOTE'){
      const nodeId=routeNode(run);
      for(const userId of humanUsers){
        run=await call(admin,userId,{action:'pve.voteNextRoom',run_id:run.id,action_id:aid(seq++),expected_version:admin.version,node_id:nodeId});
        if(run.phase!=='MAP_VOTE')break;
      }
      continue;
    }
    if(run.phase==='COMBAT'){
      const turn=run.combat.turn,used=new Set();
      for(const userId of humanUsers){
        const view=await call(admin,userId,{action:'pve.getState',run_id:run.id});run=view;
        if(run.phase!=='COMBAT'||run.combat.turn!==turn)break;
        const me=run.players.find(p=>p.userId===userId);
        if(!me||me.status==='DOWNED'||run.combat.readyPlayerIds?.includes(me.playerId))continue;
        const plan=plannedCard(run,me,used,false);if(!plan)continue;
        used.add(plan.final);
        run=await call(admin,userId,{action:'pve.submitCard',run_id:run.id,action_id:aid(seq++),expected_version:admin.version,card_instance_id:plan.card.id,skill_intent:plan.skill});
        if(run.phase!=='COMBAT'||run.combat.turn!==turn)break;
      }
      continue;
    }
    if(run.phase==='EVENT'){
      for(const userId of humanUsers){
        const view=await call(admin,userId,{action:'pve.getState',run_id:run.id});run=view;
        if(run.phase!=='EVENT')break;
        const me=run.players.find(p=>p.userId===userId);
        if(run.roomState.choicesByPlayer?.[me.playerId])continue;
        run=await call(admin,userId,{action:'pve.chooseEventOption',run_id:run.id,action_id:aid(seq++),expected_version:admin.version,option_id:run.roomState.options[0].id});
      }
      continue;
    }
    if(run.phase==='REST'){
      for(const userId of humanUsers){
        const view=await call(admin,userId,{action:'pve.getState',run_id:run.id});run=view;
        if(run.phase!=='REST')break;
        const me=run.players.find(p=>p.userId===userId);
        if(run.roomState.choicesByPlayer?.[me.playerId])continue;
        run=await call(admin,userId,{action:'pve.restChoice',run_id:run.id,action_id:aid(seq++),expected_version:admin.version,choice:'FULL_HEAL'});
      }
      continue;
    }
    if(run.phase==='SHOP'){
      for(const userId of humanUsers){
        const view=await call(admin,userId,{action:'pve.getState',run_id:run.id});run=view;
        if(run.phase!=='SHOP')break;
        const me=run.players.find(p=>p.userId===userId);
        if(run.roomState.readyPlayerIds?.includes(me.playerId))continue;
        run=await call(admin,userId,{action:'pve.shopReady',run_id:run.id,action_id:aid(seq++),expected_version:admin.version});
      }
      continue;
    }
    if(run.phase==='REWARD_ROOM'){
      if(run.roomState.pickOrder?.length){
        const pid=run.roomState.pickOrder[0],picker=run.players.find(p=>p.playerId===pid);
        if(picker?.memberType==='human'){
          const relicId=run.roomState.relicIds.find(id=>!picker.relics.includes(id))||run.roomState.relicIds[0];
          run=await call(admin,picker.userId,{action:'pve.rewardChooseRelic',run_id:run.id,action_id:aid(seq++),expected_version:admin.version,relic_id:relicId});
          continue;
        }
      }
      const attempt=run.roomState.attempt,used=new Set();
      for(const userId of humanUsers){
        const view=await call(admin,userId,{action:'pve.getState',run_id:run.id});run=view;
        if(run.phase!=='REWARD_ROOM'||run.roomState.attempt!==attempt)break;
        const me=run.players.find(p=>p.userId===userId);
        if(run.roomState.readyPlayerIds?.includes(me.playerId))continue;
        const plan=plannedCard(run,me,used,true);if(!plan)continue;
        used.add(plan.final);
        run=await call(admin,userId,{action:'pve.rewardSubmitCard',run_id:run.id,action_id:aid(seq++),expected_version:admin.version,card_instance_id:plan.card.id,skill_intent:false});
        if(run.phase!=='REWARD_ROOM'||run.roomState.attempt!==attempt)break;
      }
      continue;
    }
    if(run.phase==='ROOM_RESULT'){
      for(const userId of humanUsers){
        const view=await call(admin,userId,{action:'pve.getState',run_id:run.id});run=view;
        if(run.phase!=='ROOM_RESULT')break;
        const me=run.players.find(p=>p.userId===userId);
        if(run.roomResult?.readyPlayerIds?.includes(me.playerId))continue;
        run=await call(admin,userId,{action:'pve.roomReady',run_id:run.id,action_id:aid(seq++),expected_version:admin.version});
      }
      continue;
    }
    if(run.phase==='AUGMENT_CHOICE'){
      let picked=false;
      for(const userId of humanUsers){
        const view=await call(admin,userId,{action:'pve.getState',run_id:run.id});run=view;
        if(run.phase!=='AUGMENT_CHOICE')break;
        if(run.privateAugmentOffer?.augmentIds?.length){
          run=await call(admin,userId,{action:'pve.chooseAugment',run_id:run.id,action_id:aid(seq++),expected_version:admin.version,augment_id:run.privateAugmentOffer.augmentIds[0]});
          picked=true;break;
        }
      }
      if(!picked&&run.phase==='AUGMENT_CHOICE')throw new Error('stalled augment choice');
      continue;
    }
    throw new Error(`unhandled phase ${run.phase}`);
  }
  if(guard>=1200)throw new Error(`playtest guard exhausted at ${run.phase}`);
  const combats=admin.telemetry.filter(x=>x.logType==='COMBAT').map(x=>x.payload);
  return {
    seed,mixed,outcome:run.phase,visited,
    failedRoom:run.phase==='RUN_FAILED'?run.map.nodes.find(n=>n.id===run.currentRoomNodeId)?.type:null,
    finalFlame:run.flame,
    finalHp:run.players.map(p=>p.hp),
    finalGold:run.players.map(p=>p.runGold),
    relicCounts:run.players.map(p=>p.relics.length),
    combats
  };
}
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const percentile=(a,p)=>{
  if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),i=Math.min(b.length-1,Math.floor((b.length-1)*p));return b[i];
};
function summarize(label,runs){
  const combatRows=runs.flatMap(r=>r.combats.map(c=>({...c,runOutcome:r.outcome})));
  const byRoom={};
  for(const room of ['NORMAL_COMBAT','ELITE_COMBAT','BOSS']){
    const rows=combatRows.filter(x=>x.room_type===room),turns=rows.map(x=>x.turn_count);
    byRoom[room]={
      encounters:rows.length,
      wins:rows.filter(x=>x.outcome==='VICTORY').length,
      avgTurns:Number(mean(turns).toFixed(2)),
      medianTurns:percentile(turns,.5),
      p90Turns:percentile(turns,.9),
      minTurns:turns.length?Math.min(...turns):0,
      maxTurns:turns.length?Math.max(...turns):0,
      target:TARGET[room],
      avgPartyDamage:Number(mean(rows.map(x=>x.party_damage_total)).toFixed(2)),
      avgFlameSpent:Number(mean(rows.map(x=>x.flame_spent)).toFixed(2)),
      avgCollisions:Number(mean(rows.map(x=>Object.values(x.collision_count||{}).reduce((a,b)=>a+b,0))).toFixed(2)),
      avgValidAttacks:Number(mean(rows.map(x=>Object.values(x.valid_attack_count||{}).reduce((a,b)=>a+b,0))).toFixed(2))
    };
  }
  const wins=runs.filter(r=>r.outcome==='FLOOR_CLEAR');
  const byMonster={};
  for(const monsterId of ['f1_armored_boar','f1_coward_hunter','f1_echo_bat','f1_fallen_lord']){
    const rows=combatRows.filter(x=>x.monster_id===monsterId),turns=rows.map(x=>x.turn_count);
    byMonster[monsterId]={
      encounters:rows.length,wins:rows.filter(x=>x.outcome==='VICTORY').length,
      avgTurns:Number(mean(turns).toFixed(2)),medianTurns:percentile(turns,.5),p90Turns:percentile(turns,.9),
      minTurns:turns.length?Math.min(...turns):0,maxTurns:turns.length?Math.max(...turns):0,
      avgDamage:Number(mean(rows.map(x=>x.party_damage_total)).toFixed(2)),
      avgFlameSpent:Number(mean(rows.map(x=>x.flame_spent)).toFixed(2)),
      avgCollisions:Number(mean(rows.map(x=>Object.values(x.collision_count||{}).reduce((a,b)=>a+b,0))).toFixed(2)),
      avgValidAttacks:Number(mean(rows.map(x=>Object.values(x.valid_attack_count||{}).reduce((a,b)=>a+b,0))).toFixed(2))
    };
  }
  return {
    label,runs:runs.length,floorClear:wins.length,runFailed:runs.length-wins.length,
    clearRate:Number((wins.length/runs.length).toFixed(3)),
    failuresByRoom:runs.filter(r=>r.failedRoom).reduce((m,r)=>(m[r.failedRoom]=(m[r.failedRoom]||0)+1,m),{}),
    avgFinalFlame:Number(mean(wins.map(r=>r.finalFlame)).toFixed(2)),
    avgFinalPartyHp:Number(mean(wins.map(r=>r.finalHp.reduce((a,b)=>a+b,0))).toFixed(2)),
    avgFinalPartyGold:Number(mean(wins.map(r=>r.finalGold.reduce((a,b)=>a+b,0))).toFixed(2)),
    avgRelicsPerPlayer:Number(mean(wins.flatMap(r=>r.relicCounts)).toFixed(2)),
    failureSeeds:runs.filter(r=>r.outcome==='RUN_FAILED').map(r=>r.seed).slice(0,8),
    byRoom,byMonster
  };
}

test('PVE-014 balance sweep collects multi-seed F1 data across human compositions and mixed AI',async()=>{
  const cohorts=[
    {label:'W-T-G-M humans',characters:['warrior','twins','gunner','mage'],mixed:false},
    {label:'A-W-M-G humans',characters:['adventurer','warrior','mage','gunner'],mixed:false},
    {label:'A-T-G-M humans',characters:['adventurer','twins','gunner','mage'],mixed:false},
    {label:'W + G/M/T AI',characters:['warrior','gunner','mage','twins'],mixed:true},
  ];
  const summaries=[];
  for(const cohort of cohorts){
    const runs=[];
    for(let i=0;i<25;i++)runs.push(await playFloor({...cohort,seed:`pve014-sweep-${cohort.label}-${i}`}));
    summaries.push(summarize(cohort.label,runs));
  }
  console.log('[PVE-014 BALANCE SWEEP]',JSON.stringify(summaries));
  assert.equal(summaries.length,4);
  assert.ok(summaries.every(x=>x.runs===25));
  assert.ok(summaries.slice(0,3).every(x=>x.byRoom.NORMAL_COMBAT.encounters>=25));
});
