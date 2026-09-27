import {newPlayerRunState,newCombatState} from './model.js';
import {PVE_CHARACTER_DEFS} from './characters.js';
import {GAME_MODE,roomGameMode} from '../game-mode.js';
import {beginEntryLoading,finishEntryLoading} from '../entry-loading.js';
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
export const PVE_ROOM_CHARACTER_MAP=Object.freeze({
  adventurer:'adventurer',warrior:'warrior',rogue:'rogue',mage:'mage',berserker:'berserker',
  vampire:'vampire',imp:'imp',seer:'prophet',gunner:'gunner',fighter:'martial_artist',
  demonsword:'demon_swordsman',twins:'twins'
});
export function pveCharacterIdForRoom(characterId){return PVE_ROOM_CHARACTER_MAP[characterId]||null;}
export function unsupportedPveRoomCharacters(members){
  return [...new Set((members||[]).map(m=>m.character_id).filter(id=>{
    const mapped=pveCharacterIdForRoom(id);return !mapped||!Object.hasOwn(PVE_CHARACTER_DEFS,mapped);
  }))];
}
export function buildInitialPveRun(bundle,{seed=null,depthCount=8,now=Date.now()}={}){
  const unsupported=unsupportedPveRoomCharacters(bundle?.members||[]);
  if(unsupported.length){
    const error=new Error(`현재 협력 탐험에서 지원하지 않는 캐릭터가 있습니다: ${unsupported.join(', ')}`);
    error.code='PVE_UNSUPPORTED_CHARACTER';error.characterIds=unsupported;throw error;
  }
  const players=bundle.members.map(member=>{
    const player=newPlayerRunState({...member,character_id:pveCharacterIdForRoom(member.character_id)});
    player.lobbyCharacterId=member.character_id;
    player.displayName=member.display_name;
    return player;
  });
  const run={id:crypto.randomUUID(),roomId:bundle.room.id,seed:typeof seed==='string'&&seed.length<=128?seed:crypto.randomUUID(),rngCounter:0,version:0,phase:'MAP_VOTE',floor:1,depth:0,flame:4,maxFlame:5,map:null,currentRoomNodeId:null,players,usedMonsterIds:[],chosenBossIds:{1:'f1_fallen_lord'},contentVersion:'F1_VERTICAL_SLICE_V1',createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString()};
  installRelicCatalog(run,F1_RELIC_DEFINITIONS);
  run.map=generateFloorMap(run,Number.isInteger(depthCount)&&depthCount>=2&&depthCount<=12?depthCount:8);
  run.map.voteDeadline=new Date(now+15000).toISOString();
  beginEntryLoading(run);
  return run;
}
export function projectPveRunForUser(run,userId){
  const me=viewer(run,userId);return me?projectRun(run,me.playerId):null;
}
async function settleIfTerminal(admin,run){
  if(!['RUN_CLEAR','RUN_FAILED','ABANDONED'].includes(run?.phase))return null;
  if(typeof admin.from!=='function')return null;
  const {data,error}=await admin.rpc('pve_settle_rewards',{p_run:run.id});
  if(error)throw new Error(error.message||'PVE 보상을 정산하지 못했습니다.');
  return data;
}
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
  if(run.entryLoading)return run;
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
export async function markPveEntryAssetsLoaded({admin,user,runId,expectedVersion,actionId}){
  if(!uuid(runId)||!uuid(actionId))throw new Error('올바른 PVE 로딩 요청이 필요합니다.');
  const snapshot=await readRun(admin,runId,actionId);
  if(!snapshot?.state)throw new Error('PVE 원정을 찾을 수 없습니다.');
  if(snapshot.action_result)return snapshot.action_result;
  const run=snapshot.state;run.version=snapshot.version;
  const me=viewer(run,user.id);if(!me)throw new Error('이 PVE 원정의 참가자가 아닙니다.');
  if(typeof admin.from==='function'){
    const {data:membership,error}=await admin.from('room_members').select('id').eq('room_id',run.roomId).eq('user_id',user.id).maybeSingle();
    if(error||!membership)throw new Error('현재 이 PVE 방의 참가자가 아닙니다.');
  }
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion!==snapshot.version){
    const error=new Error('STATE_CONFLICT');error.code='STATE_CONFLICT';throw error;
  }
  if(!run.entryLoading||run.entryLoading.ready.includes(me.playerId))return {state:run,version:run.version};
  run.entryLoading.ready.push(me.playerId);
  finishEntryLoading(run,run.players.map(p=>({id:p.playerId,member_type:p.memberType})));
  run.updatedAt=new Date().toISOString();
  const saved=await commitRun(admin,run,expectedVersion,actionId);
  if(saved.conflict){const error=new Error('STATE_CONFLICT');error.code='STATE_CONFLICT';throw error;}
  return saved;
}

export async function handlePveAction({admin,user,body,json}){
  const action=body.action;if(typeof action!=='string'||!action.startsWith('pve.'))return null;
  if(action==='pve.createRun'){
    if(!uuid(body.room_id))return fail(json,'올바른 room_id가 필요합니다.');
    const {data:bundle,error}=await admin.rpc('game_read',{p_room:body.room_id});
    if(error||!bundle)return fail(json,'방을 찾을 수 없습니다.',404);
    if(bundle.room.host_user_id!==user.id)return fail(json,'호스트만 PVE 원정을 시작할 수 있습니다.',403);
    const canonicalRoomMode=Object.hasOwn(bundle.room||{},'game_mode');
    if(canonicalRoomMode&&roomGameMode(bundle.room)!==GAME_MODE.COOP_PVE)return fail(json,'협력 탐험 방에서만 PVE 원정을 시작할 수 있습니다.',409);
    if(canonicalRoomMode&&bundle.room.status!=='waiting')return fail(json,'대기 중인 방에서만 PVE 원정을 시작할 수 있습니다.',409);
    if(bundle.members?.length!==4)return fail(json,'PVE 원정은 4인이 필요합니다.');
    if(canonicalRoomMode&&!bundle.members.every(m=>m.member_type==='ai'||m.lobby_ready===true))return fail(json,'모든 플레이어가 준비를 완료해야 합니다.',409);
    if(bundle.session)return fail(json,'기존 PVP 원정이 진행 중입니다.');
    let run;try{run=buildInitialPveRun(bundle,{seed:body.seed,depthCount:body.depth_count});}
    catch(error){return fail(json,error.message||'PVE 캐릭터 구성을 확인해 주세요.',409);}
    const createArgs=canonicalRoomMode
      ? {name:'pve_start_room',args:{p_run_id:run.id,p_room:body.room_id,p_expected:bundle.room.version,p_seed:run.seed,p_state:run}}
      : {name:'pve_create_run',args:{p_run_id:run.id,p_room:body.room_id,p_seed:run.seed,p_state:run}};
    const {data,error:createError}=await admin.rpc(createArgs.name,createArgs.args);
    if(createError)return fail(json,createError.message||'PVE 원정을 생성하지 못했습니다.',409);
    if(data?.conflict)return json({error:'ROOM_VERSION_CONFLICT'},409);
    run.version=canonicalRoomMode?(data.run_version??0):(data.version??0);
    return json({run:projectPveRunForUser(run,user.id),...(canonicalRoomMode?{roomVersion:data.room_version}:{})});
  }
  if(!uuid(body.run_id))return fail(json,'올바른 run_id가 필요합니다.');
  const actionId=body.action_id;
  if(action!=='pve.getState'&&!uuid(actionId))return fail(json,'상태 변경에는 action_id UUID가 필요합니다.');
  const snapshot=await readRun(admin,body.run_id,actionId||null);
  if(!snapshot?.state)return fail(json,'PVE 원정을 찾을 수 없습니다.',404);
  let run=snapshot.state;run.version=snapshot.version;
  let me=viewer(run,user.id);if(!me)return fail(json,'이 PVE 원정의 참가자가 아닙니다.',403);
  if(typeof admin.from==='function'){
    const {data:membership,error:membershipError}=await admin.from('room_members').select('id').eq('room_id',run.roomId).eq('user_id',user.id).maybeSingle();
    if(membershipError||!membership)return fail(json,'현재 이 PVE 방의 참가자가 아닙니다.',403);
  }
  if(action==='pve.getState'){
    run=await maintainForRead(admin,run);
    me=viewer(run,user.id)||me;
    const settlement=await settleIfTerminal(admin,run);
    return json({run:projectRun(run,me.playerId),settlement});
  }
  if(snapshot.action_result){
    const prior=snapshot.action_result.state||run;
    prior.version=snapshot.action_result.committed_version??prior.version;
    const priorMe=viewer(prior,user.id)||me;
    return json({run:projectRun(prior,priorMe.playerId),idempotent:true});
  }
  if(!Number.isSafeInteger(body.expected_version))return fail(json,'expected_version이 필요합니다.');
  if(body.expected_version!==snapshot.version)return json({error:'STATE_CONFLICT',run:projectRun(run,me.playerId)},409);
  if(run.entryLoading)return fail(json,'원정대 이미지 로딩을 기다리는 중입니다.',409);
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
    activateImmediateCharacterSkill(run,me,body.skill_data??null);
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
  const settlement=await settleIfTerminal(admin,latest);
  return json({run:projectRun(latest,me.playerId),settlement,idempotent:Boolean(saved.duplicate)});
}
