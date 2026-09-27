import {newPlayerRunState,newCombatState} from './model.js';
import {generateFloorMap,connectedNodeIds,resolveVote} from './map.js';
import {projectRun} from './projection.js';
import {submitCard,resolveBasicTurn,beginTurn} from './combat.js';
import {activateImmediateCharacterSkill} from './characters.js';
import {chooseAugment} from './augments.js';
import {enterRestRoom,applyRestChoice,enterShopRoom,reserveShopCard,cancelShopCardReservation,confirmShopCard,buyShopRelic,finishShop,enterRewardRoom,activateRewardSkill,submitRewardCard,resolveRewardAttempt,chooseRewardRelic,roomReady,expireShopReservations} from './rooms.js';
import {enterEventRoom,chooseEventOption} from './events.js';
import {F1_RELIC_DEFINITIONS,selectF1Monster,markF1MonsterUsed} from './content-f1.js';
import {installRelicCatalog} from './relics.js';

const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const fail=(json,message,status=400)=>json({error:message},status);
function viewer(run,userId){return run.players.find(p=>p.userId===userId);}
function nodeType(run,id){return run.map.nodes.find(n=>n.id===id)?.type;}
function enterNode(run,id){
  const type=nodeType(run,id);run.currentRoomNodeId=id;run.phase='ROOM_ENTER';
  if(type==='NORMAL_COMBAT'||type==='ELITE_COMBAT'||type==='BOSS'){
    const monster=selectF1Monster(run,type);markF1MonsterUsed(run,monster);
    run.phase='COMBAT';run.combat=newCombatState(run.players,monster.baseHp,type,monster);beginTurn(run);
  }
  else if(type==='REST')enterRestRoom(run);
  else if(type==='SHOP')enterShopRoom(run);
  else if(type==='REWARD_ROOM')enterRewardRoom(run);
  else if(type==='EVENT')enterEventRoom(run);
}
async function readRun(admin,runId,actionId=null){
  const {data,error}=await admin.rpc('pve_read',{p_run:runId,p_action_id:actionId});
  if(error)throw new Error('PVE 원정 상태를 읽지 못했습니다.');
  return data;
}
async function commitRun(admin,run,expectedVersion,actionId){
  const {data,error}=await admin.rpc('pve_try_commit',{p_run:run.id,p_expected:expectedVersion,p_action_id:actionId,p_state:run});
  if(error)throw new Error(error.message||'PVE 상태를 저장하지 못했습니다.');
  return data;
}
async function maintainForRead(admin,run){
  let changed=false;
  if(run.phase==='SHOP')changed=expireShopReservations(run)||changed;
  if(run.phase==='MAP_VOTE'&&run.map?.voteDeadline&&Date.now()>=Date.parse(run.map.voteDeadline)){
    const humans=run.players.filter(p=>p.memberType==='human').map(p=>p.playerId);
    const chosen=resolveVote(run,humans);
    enterNode(run,chosen);
    changed=true;
  }
  if(!changed)return run;
  run.updatedAt=new Date().toISOString();
  const saved=await commitRun(admin,run,run.version,crypto.randomUUID());
  const latest=saved.state;latest.version=saved.version;
  return latest;
}
export async function handlePveAction({admin,user,body,json}){
  const action=body.action;if(typeof action!=='string'||!action.startsWith('pve.'))return null;
  if(action==='pve.createRun'){
    if(!uuid(body.room_id))return fail(json,'올바른 room_id가 필요합니다.');
    const {data:bundle,error}=await admin.rpc('game_read',{p_room:body.room_id});
    if(error||!bundle)return fail(json,'방을 찾을 수 없습니다.',404);
    if(bundle.room.host_user_id!==user.id)return fail(json,'호스트만 PVE 원정을 시작할 수 있습니다.',403);
    if(bundle.members?.length!==4)return fail(json,'PVE 원정은 4인이 필요합니다.');
    if(bundle.session)return fail(json,'기존 PVP 원정이 진행 중입니다.');
    const players=bundle.members.map(newPlayerRunState);
    const run={id:crypto.randomUUID(),roomId:body.room_id,seed:typeof body.seed==='string'&&body.seed.length<=128?body.seed:crypto.randomUUID(),rngCounter:0,version:0,phase:'MAP_VOTE',floor:1,depth:0,flame:4,maxFlame:5,map:null,currentRoomNodeId:null,players,usedMonsterIds:[],chosenBossIds:{1:'f1_fallen_lord'},contentVersion:'F1_VERTICAL_SLICE_V1',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    installRelicCatalog(run,F1_RELIC_DEFINITIONS);
    run.map=generateFloorMap(run,Number.isInteger(body.depth_count)&&body.depth_count>=2&&body.depth_count<=12?body.depth_count:8);
    run.map.voteDeadline=new Date(Date.now()+15000).toISOString();
    const {data,error:createError}=await admin.rpc('pve_create_run',{p_run_id:run.id,p_room:body.room_id,p_seed:run.seed,p_state:run});
    if(createError)return fail(json,createError.message||'PVE 원정을 생성하지 못했습니다.',409);
    run.version=data.version;return json({run:projectRun(run,viewer(run,user.id)?.playerId)});
  }
  if(!uuid(body.run_id))return fail(json,'올바른 run_id가 필요합니다.');
  const actionId=body.action_id;
  if(action!=='pve.getState'&&!uuid(actionId))return fail(json,'상태 변경에는 action_id UUID가 필요합니다.');
  const snapshot=await readRun(admin,body.run_id,actionId||null);
  if(!snapshot?.state)return fail(json,'PVE 원정을 찾을 수 없습니다.',404);
  let run=snapshot.state;run.version=snapshot.version;
  let me=viewer(run,user.id);if(!me)return fail(json,'이 PVE 원정의 참가자가 아닙니다.',403);
  if(action==='pve.getState'){
    run=await maintainForRead(admin,run);
    me=viewer(run,user.id)||me;
    return json({run:projectRun(run,me.playerId)});
  }
  if(snapshot.action_result){
    const prior=snapshot.action_result.state||run;
    prior.version=snapshot.action_result.committed_version??prior.version;
    const priorMe=viewer(prior,user.id)||me;
    return json({run:projectRun(prior,priorMe.playerId),idempotent:true});
  }
  if(!Number.isSafeInteger(body.expected_version))return fail(json,'expected_version이 필요합니다.');
  if(body.expected_version!==snapshot.version)return json({error:'STATE_CONFLICT',run:projectRun(run,me.playerId)},409);
  if(run.phase==='SHOP')expireShopReservations(run);

  if(action==='pve.voteNextRoom'){
    if(run.phase!=='MAP_VOTE')return fail(json,'현재는 다음 방 투표 단계가 아닙니다.');
    if(me.memberType!=='human')return fail(json,'AI는 맵 투표를 하지 않습니다.',403);
    const candidates=connectedNodeIds(run.map);
    const timedOut=run.map.voteDeadline&&Date.now()>=Date.parse(run.map.voteDeadline);
    if(body.node_id!=null&&!candidates.includes(body.node_id))return fail(json,'연결된 다음 방만 투표할 수 있습니다.');
    if(body.node_id!=null)run.map.votes[me.playerId]=body.node_id;
    const humans=run.players.filter(p=>p.memberType==='human').map(p=>p.playerId);
    const counts=Object.values(run.map.votes).reduce((m,id)=>(m[id]=(m[id]||0)+1,m),{});
    const majority=Object.values(counts).some(n=>n>humans.length/2);
    if(majority||timedOut){const chosen=resolveVote(run,humans);enterNode(run,chosen);}
  } else if(action==='pve.activateSkill'){
    if(run.phase!=='COMBAT')return fail(json,'현재 전투 중이 아닙니다.');
    activateImmediateCharacterSkill(run,me);
  } else if(action==='pve.submitCard'){
    if(run.phase!=='COMBAT')return fail(json,'현재 전투 중이 아닙니다.');
    if(typeof body.card_instance_id!=='string')return fail(json,'card_instance_id가 필요합니다.');
    submitCard(run,me.playerId,body.card_instance_id,body.skill_intent===true,body.skill_data??null);
    resolveBasicTurn(run);
  } else if(action==='pve.chooseAugment'){
    if(typeof body.augment_id!=='string')return fail(json,'augment_id가 필요합니다.');
    chooseAugment(run,me.playerId,body.augment_id);
  } else if(action==='pve.chooseEventOption'){
    if(me.memberType!=='human')return fail(json,'인간 플레이어만 직접 이벤트 선택을 할 수 있습니다.',403);
    if(typeof body.option_id!=='string')return fail(json,'option_id가 필요합니다.');
    chooseEventOption(run,me.playerId,body.option_id);
  } else if(action==='pve.restChoice'){
    if(me.memberType!=='human')return fail(json,'인간 플레이어만 직접 휴식 선택을 할 수 있습니다.',403);
    applyRestChoice(run,me.playerId,body.choice,body.number);
  } else if(action==='pve.shopReserveCard'){
    if(me.memberType!=='human')return fail(json,'인간 플레이어만 상점을 이용할 수 있습니다.',403);
    reserveShopCard(run,me.playerId,body.product_id);
  } else if(action==='pve.shopCancelCard'){
    cancelShopCardReservation(run,me.playerId,body.product_id);
  } else if(action==='pve.shopConfirmCard'){
    if(typeof body.replace_card_id!=='string')return fail(json,'replace_card_id가 필요합니다.');
    confirmShopCard(run,me.playerId,body.product_id,body.replace_card_id);
  } else if(action==='pve.shopBuyRelic'){
    buyShopRelic(run,me.playerId,body.product_id);
  } else if(action==='pve.shopReady'){
    finishShop(run,me.playerId);
  } else if(action==='pve.rewardActivateSkill'){
    activateRewardSkill(run,me.playerId);
  } else if(action==='pve.rewardSubmitCard'){
    if(typeof body.card_instance_id!=='string')return fail(json,'card_instance_id가 필요합니다.');
    submitRewardCard(run,me.playerId,body.card_instance_id,body.skill_intent===true);
    resolveRewardAttempt(run);
  } else if(action==='pve.rewardChooseRelic'){
    if(typeof body.relic_id!=='string')return fail(json,'relic_id가 필요합니다.');
    chooseRewardRelic(run,me.playerId,body.relic_id);
  } else if(action==='pve.roomReady'){
    roomReady(run,me.playerId);
  } else return fail(json,'지원하지 않는 PVE action입니다.',400);

  run.updatedAt=new Date().toISOString();
  const saved=await commitRun(admin,run,body.expected_version,actionId);
  if(saved.conflict)return json({error:'STATE_CONFLICT',run:projectRun(saved.state,me.playerId)},409);
  const latest=saved.state;latest.version=saved.version;
  return json({run:projectRun(latest,me.playerId),idempotent:Boolean(saved.duplicate)});
}
