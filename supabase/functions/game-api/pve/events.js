import {choose} from './rng.js';
import {selectF1Event,F1_EVENT_DEFINITIONS} from './content-f1.js';
import {restoreCardCycle,persistCardCycles} from './card-cycle.js';
import {drawGamblerHand,settleGamblerHand} from './gambler.js';
import {selfModifyCard,collisionImmunity,isCardSelectableForCharacter,validateCharacterSkillIntent,onTurnStartCharacter,onTurnEndCharacter,onCycleStartCharacter} from './characters.js';
import {initializeNumberHistories,recordSelfModification,applyPreCollisionSwap,applyPreCollisionSteal,finalizeNumbers,attachCollisionGroups,attachValidity,assignVampireThralls,validateNumberMutationState} from './number-mutation.js';
import {resolveEventDefinition} from './event-resolution.js';
import {queueTelemetry} from './telemetry.js';
import {clearCombatResourcesForPlayers} from './resources.js';
import {applyOwnedEffects} from './effects.js';
import {cleanupAugmentScope} from './augment-framework.js';

const playerFor=(run,id)=>run.players.find(p=>p.playerId===id);
const eventById=id=>F1_EVENT_DEFINITIONS.find(x=>x.id===id)||null;
function finishEvent(run){
  for(const player of run.players)applyOwnedEffects(run,'ROOM_END',{player});
  cleanupAugmentScope(run,'ROOM');
  clearCombatResourcesForPlayers(run.players);
  run.phase='ROOM_RESULT';
  run.roomResult={roomNodeId:run.currentRoomNodeId,readyPlayerIds:run.players.filter(p=>p.memberType==='ai').map(p=>p.playerId)};
}
function availableCards(run,player){
  const state=run.roomState.privateByPlayer[player.playerId];
  if(player.characterId==='gambler')drawGamblerHand(run,player,state);
  if(player.characterId!=='gambler'&&!state.remainingCardIds.length){
    state.cycleIndex+=1;state.spentCardIds=[];state.remainingCardIds=player.cardPool.map(card=>card.id);
    onCycleStartCharacter(player,state);
    applyOwnedEffects(run,'CYCLE_END',{player,privateState:state});cleanupAugmentScope(run,'CYCLE',{playerId:player.playerId});
  }
  return state.remainingCardIds.map(id=>player.cardPool.find(card=>card.id===id)).filter(card=>card&&isCardSelectableForCharacter(player,card));
}
export function enterEventRoom(run){
  const def=selectF1Event(run);
  run.phase='EVENT';
  run.roomState={
    type:'EVENT',eventId:def.id,name:def.name,illustration:def.illustration,
    description:def.description,ruleSummary:def.ruleSummary,resolutionType:def.resolutionType,
    turn:1,privateByPlayer:Object.fromEntries(run.players.map(player=>[player.playerId,restoreCardCycle(run,player)])),
    turnSubmissions:{},publicTurnResult:null
  };
  for(const player of run.players){onTurnStartCharacter(player,run);applyOwnedEffects(run,'TURN_START',{player,privateState:run.roomState.privateByPlayer[player.playerId]});applyOwnedEffects(run,'PRE_SELECT',{player,privateState:run.roomState.privateByPlayer[player.playerId]});}
  // Event rooms permit the same one-card number skills without combat damage.
  for(const player of run.players){
    if(player.characterId==='mage')player.publicResources.mana=Math.max(2,player.publicResources.mana||0);
    if(player.characterId==='warrior')player.publicResources.toughnessCharges=Math.max(1,player.publicResources.toughnessCharges||0);
  }
  for(const player of run.players.filter(p=>p.memberType==='ai'&&p.status!=='DOWNED').sort((a,b)=>a.seat-b.seat)){
    const cards=availableCards(run,player);
    if(!cards.length)throw new Error('AI가 이벤트에 제출할 카드가 없습니다.');
    const card=choose(run,cards,`f1-event-ai-card:${def.id}:${player.playerId}`);
    submitEventCard(run,player.playerId,card.id,false,null,true);
  }
}
export function submitEventCard(run,playerId,cardInstanceId,skillIntent=false,skillData=null,allowAi=false){
  if(run.phase!=='EVENT'||run.roomState?.type!=='EVENT')throw new Error('현재 이벤트 카드 제출 단계가 아닙니다.');
  const player=playerFor(run,playerId);
  if(!player||player.status==='DOWNED')throw new Error('카드를 제출할 수 없습니다.');
  if(player.memberType==='ai'&&!allowAi)throw new Error('AI 카드는 서버에서만 제출합니다.');
  if(run.roomState.turnSubmissions[playerId])throw new Error('이미 이벤트 카드를 제출했습니다.');
  const card=availableCards(run,player).find(candidate=>candidate.id===cardInstanceId);
  if(!card)throw new Error('이번 사이클에 사용할 수 있는 물리 카드가 아닙니다.');
  if(skillIntent&&!['mage','warrior','vampire'].includes(player.characterId))throw new Error('이 스킬은 이벤트 카드 판정에 사용할 수 없습니다.');
  validateCharacterSkillIntent(player,run.roomState.privateByPlayer[playerId],skillIntent,card,skillData);
  run.roomState.turnSubmissions[playerId]={playerId,cardInstanceId,skillIntent:Boolean(skillIntent),...(skillData?{skillData:structuredClone(skillData)}:{})};
  run.roomState.privateByPlayer[playerId].selectedCardId=cardInstanceId;
  run.roomState.privateByPlayer[playerId].skillIntent=Boolean(skillIntent);
  applyOwnedEffects(run,'ON_SUBMIT',{player,privateState:run.roomState.privateByPlayer[playerId],cardInstanceId});
  const active=run.players.filter(p=>p.status!=='DOWNED');
  if(active.every(p=>run.roomState.turnSubmissions[p.playerId]))return resolveEventTurn(run);
  return null;
}
export function resolveEventTurn(run){
  const room=run.roomState,def=eventById(room?.eventId);
  if(run.phase!=='EVENT'||!def)throw new Error('현재 이벤트를 판정할 수 없습니다.');
  const players=run.players.filter(p=>p.status!=='DOWNED').sort((a,b)=>a.seat-b.seat);
  if(players.some(p=>!room.turnSubmissions[p.playerId]))return null;
  const cards=players.map(player=>{
    const card=player.cardPool.find(c=>c.id===room.turnSubmissions[player.playerId].cardInstanceId);
    if(!card)throw new Error('제출한 이벤트 카드가 없습니다.');
    return {playerId:player.playerId,seat:player.seat,cardInstanceId:card.id,baseNumber:card.baseNumber,workingNumber:card.baseNumber,finalNumber:card.baseNumber,collisionImmune:false,valid:true};
  });
  const mutationEvents=[],effects=[];
  initializeNumberHistories(cards);
  for(const card of cards){const player=playerFor(run,card.playerId);selfModifyCard(player,card,room.turnSubmissions[card.playerId]);applyOwnedEffects(run,'PRE_COLLISION_SELF_MODIFY',{player,resolved:card,privateState:room.privateByPlayer[card.playerId]});}
  recordSelfModification(cards,mutationEvents);
  for(const card of cards)applyOwnedEffects(run,'PRE_COLLISION',{player:playerFor(run,card.playerId),resolved:card,privateState:room.privateByPlayer[card.playerId]});
  applyPreCollisionSwap(run,cards,mutationEvents,room);
  applyPreCollisionSteal(run,cards,mutationEvents);
  finalizeNumbers(cards);
  for(const card of cards)applyOwnedEffects(run,'POST_REVEAL',{player:playerFor(run,card.playerId),resolved:card,privateState:room.privateByPlayer[card.playerId]});
  for(const card of cards)card.collisionImmune=collisionImmunity(playerFor(run,card.playerId),room.turnSubmissions[card.playerId]);
  const groups=new Map();
  for(const card of cards){const group=groups.get(card.finalNumber)||[];group.push(card);groups.set(card.finalNumber,group);}
  attachCollisionGroups(run,cards,groups);
  for(const group of groups.values())if(group.length>1)for(const card of group)if(!card.collisionImmune){card.valid=false;card.invalidReason='COLLISION';}
  assignVampireThralls(run,cards,groups,effects);
  for(const card of cards)applyOwnedEffects(run,'POST_COLLISION',{player:playerFor(run,card.playerId),resolved:card,privateState:room.privateByPlayer[card.playerId]});
  attachValidity(cards);
  for(const card of cards)applyOwnedEffects(run,'CARD_VALIDATED',{player:playerFor(run,card.playerId),resolved:card,privateState:room.privateByPlayer[card.playerId]});
  validateNumberMutationState(run,cards,mutationEvents);
  for(const card of cards){
    const state=room.privateByPlayer[card.playerId];
    const owner=playerFor(run,card.playerId);
    if(owner.characterId==='gambler'){
      settleGamblerHand(run,owner,state,card.cardInstanceId,card.finalNumber);
      delete state.selectedCardId;delete state.skillIntent;
      continue;
    }
    state.remainingCardIds=state.remainingCardIds.filter(id=>id!==card.cardInstanceId);
    if(!state.spentCardIds.includes(card.cardInstanceId))state.spentCardIds.push(card.cardInstanceId);
    delete state.selectedCardId;delete state.skillIntent;
    if(!state.remainingCardIds.length){
      state.cycleIndex+=1;state.spentCardIds=[];state.remainingCardIds=playerFor(run,card.playerId).cardPool.map(c=>c.id);
      onCycleStartCharacter(playerFor(run,card.playerId),state);
    }
  }
  const resolution=resolveEventDefinition(run,def,cards,room.privateByPlayer);
  const valid=cards.filter(card=>card.valid),lowest=valid.length?Math.min(...valid.map(card=>card.finalNumber)):null;
  const soloLowest=valid.filter(card=>card.finalNumber===lowest).length===1;
  for(const card of cards){
    const player=playerFor(run,card.playerId);
    if(player.characterId==='martial_artist'&&card.invalidReason==='COLLISION'){
      player.score=(Number(player.score)||0)-1;
      resolution.rewards[player.playerId].push({type:'ADD_SCORE',amount:-1});
    }
    if(player.characterId==='rogue'&&card.valid&&card.finalNumber===lowest&&soloLowest){
      player.score=(Number(player.score)||0)+5;player.runGold+=2;
      resolution.rewards[player.playerId].push({type:'ADD_SCORE',amount:5},{type:'ADD_RUN_GOLD',amount:2});
    }
    onTurnEndCharacter(player,null,effects);applyOwnedEffects(run,'TURN_END',{player,privateState:room.privateByPlayer[player.playerId]});
    queueTelemetry(run,'EVENT',{eventId:def.id,turn:room.turn,playerId:card.playerId,baseNumber:card.baseNumber,finalNumber:card.finalNumber,collision:card.invalidReason==='COLLISION',valid:card.valid,outcomeCategory:resolution.outcome,reward:resolution.rewards[card.playerId],partyValidSum:resolution.primitives.VALID_SUM,validCount:resolution.primitives.VALID_COUNT});
  }
  cleanupAugmentScope(run,'TURN');
  persistCardCycles(run,room.privateByPlayer);
  room.publicTurnResult={
    turn:room.turn,eventId:def.id,name:def.name,outcome:resolution.outcome,
    cards:cards.map(card=>({playerId:card.playerId,baseNumber:card.baseNumber,finalNumber:card.finalNumber,valid:card.valid,invalidReason:card.invalidReason||null,collisionGroupSize:card.collisionGroupSize,collisionImmune:card.collisionImmune,rewards:resolution.rewards[card.playerId]})),
    mutationEvents,partyValidSum:resolution.primitives.VALID_SUM,validCount:resolution.primitives.VALID_COUNT
  };
  finishEvent(run);
  return room.publicTurnResult;
}
// Legacy choice events remain readable for runs created before EVENT-001.
export function chooseEventOption(run,playerId,optionId){
  if(run.phase!=='EVENT'||!run.roomState?.options)throw new Error('이 이벤트는 카드 제출로 판정합니다.');
  const player=playerFor(run,playerId),def=eventById(run.roomState.eventId);
  const option=def?.options?.find(item=>item.id===optionId);
  if(!player||!option)throw new Error('현재 이벤트의 선택지가 아닙니다.');
  if(run.roomState.choicesByPlayer[playerId])throw new Error('이미 선택했습니다.');
  for(const effect of option.result||[]){
    if(effect.type==='HEAL')player.hp=Math.min(player.maxHp,player.hp+effect.amount);
    if(effect.type==='ADD_RUN_GOLD')player.runGold+=effect.amount;
    if(effect.type==='ADD_EXP')player.growthExp+=effect.amount;
  }
  run.roomState.choicesByPlayer[playerId]={optionId};
  if(run.players.every(p=>run.roomState.choicesByPlayer[p.playerId]))finishEvent(run);
  return option;
}
