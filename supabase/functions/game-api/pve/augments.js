import {choose} from './rng.js';
import {AUGMENT_BY_ID,augmentCandidates} from './augment-catalog.js';

export const AUGMENT_THRESHOLDS=[50,150,350,750];

function completedTiers(player){
  player.persistentCharacterState.augmentTiers ||= [];
  return player.persistentCharacterState.augmentTiers;
}
export function dueAugmentTiers(player){
  const done=new Set(completedTiers(player));
  return AUGMENT_THRESHOLDS.map((threshold,i)=>({tier:i+1,threshold}))
    .filter(x=>player.growthExp>=x.threshold&&!done.has(x.tier)&&offerFor(player,x.tier).length>0)
    .map(x=>x.tier);
}
export function grantGrowthExp(run,playerId,amount){
  if(!Number.isInteger(amount)||amount<=0)return 0;
  const player=run.players.find(p=>p.playerId===playerId);
  if(!player)throw new Error('플레이어를 찾을 수 없습니다.');
  player.growthExp+=amount;
  return amount;
}
function offerFor(player,tier){
  return augmentCandidates(player.characterId,tier,player.augmentBuild).filter(x=>x.executable===true).map(x=>x.id);
}
function refreshOffer(run,playerId){
  const state=run.augmentChoice,tiers=state?.pendingByPlayer?.[playerId]||[];
  if(!tiers.length){delete state.offersByPlayer[playerId];return;}
  const player=run.players.find(p=>p.playerId===playerId);
  const ids=offerFor(player,tiers[0]);
  if(!ids.length)throw new Error('실행 가능한 증강 후보가 없습니다.');
  state.offersByPlayer[playerId]=ids;
}
function finishIfComplete(run){
  const state=run.augmentChoice;if(!state)return false;
  const pending=Object.values(state.pendingByPlayer).some(x=>x.length);
  if(pending)return false;
  const resume=state.resumePhase;
  delete run.augmentChoice;
  run.phase=resume;
  return true;
}
function applyChoice(run,playerId,augmentId){
  const state=run.augmentChoice;
  const player=run.players.find(p=>p.playerId===playerId);
  if(!state||!player)throw new Error('증강 선택 상태가 아닙니다.');
  const tiers=state.pendingByPlayer[playerId]||[];
  if(!tiers.length)throw new Error('선택할 증강이 없습니다.');
  const tier=tiers[0],offer=state.offersByPlayer[playerId]||[];
  if(!offer.includes(augmentId))throw new Error('현재 제시된 증강만 선택할 수 있습니다.');
  const def=AUGMENT_BY_ID[augmentId];
  if(!def||def.characterId!==player.characterId||def.tier!==tier)throw new Error('증강 정의가 선택 상태와 일치하지 않습니다.');
  if(tier===1){
    player.augmentBuild=def.build;
  }else if(def.build!==player.augmentBuild){
    throw new Error('선택한 빌드 라인의 증강만 선택할 수 있습니다.');
  }
  if(player.augments.includes(augmentId))throw new Error('이미 획득한 증강입니다.');
  player.augments.push(augmentId);
  completedTiers(player).push(tier);
  tiers.shift();
  refreshOffer(run,playerId);
  return def;
}
function autoChooseAI(run){
  const state=run.augmentChoice;if(!state)return;
  for(const player of [...run.players].sort((a,b)=>a.seat-b.seat)){
    if(player.memberType!=='ai')continue;
    while((state.pendingByPlayer[player.playerId]||[]).length){
      const tier=state.pendingByPlayer[player.playerId][0];
      const offer=state.offersByPlayer[player.playerId]||[];
      const id=choose(run,offer,`augment-ai:${player.playerId}:${tier}`);
      applyChoice(run,player.playerId,id);
    }
  }
}
export function beginAugmentChoices(run,resumePhase=run.phase){
  if(run.augmentChoice)return true;
  const pendingByPlayer={};
  for(const player of run.players){
    const due=dueAugmentTiers(player);
    if(due.length)pendingByPlayer[player.playerId]=due;
  }
  if(!Object.keys(pendingByPlayer).length)return false;
  run.augmentChoice={resumePhase,pendingByPlayer,offersByPlayer:{}};
  for(const playerId of Object.keys(pendingByPlayer))refreshOffer(run,playerId);
  run.phase='AUGMENT_CHOICE';
  autoChooseAI(run);
  finishIfComplete(run);
  return true;
}
export function chooseAugment(run,playerId,augmentId){
  if(run.phase!=='AUGMENT_CHOICE'||!run.augmentChoice)throw new Error('현재 증강 선택 단계가 아닙니다.');
  const player=run.players.find(p=>p.playerId===playerId);
  if(!player||player.memberType!=='human')throw new Error('인간 플레이어만 직접 증강을 선택할 수 있습니다.');
  const def=applyChoice(run,playerId,augmentId);
  autoChooseAI(run);
  finishIfComplete(run);
  return def;
}
