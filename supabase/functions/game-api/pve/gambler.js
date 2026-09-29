import {choose} from './rng.js';

export const GAMBLER_BASE_DECK=Object.freeze([1,1,2,2,3,3,4,4,5,5,6]);

export function freshGamblerState(player){
  return {playerId:player.playerId,cycleIndex:0,remainingCardIds:[],spentCardIds:[],
    drawPileIds:player.cardPool.map(card=>card.id),discardPileIds:[],vanishedCardIds:[],
    sixProgress:[],sevenProgress:[],drawCount:0,unlockSerial:0};
}

function drawOne(run,player,state){
  if(!state.drawPileIds.length){
    state.drawPileIds=[...state.discardPileIds];
    state.discardPileIds=[];
  }
  if(!state.drawPileIds.length)return null;
  const cardId=choose(run,state.drawPileIds,`gambler-draw:${run.floor}:${run.depth}:${run.currentRoomNodeId||'room'}:${player.playerId}:${state.drawCount}`);
  state.drawPileIds=state.drawPileIds.filter(id=>id!==cardId);
  state.drawCount++;
  return cardId;
}
export function drawGamblerHand(run,player,state){
  if(player.characterId!=='gambler'||state.remainingCardIds.length)return;
  while(state.remainingCardIds.length<2){
    const cardId=drawOne(run,player,state);
    if(!cardId)break;
    state.remainingCardIds.push(cardId);
  }
}

function registered(player,value){
  return player.cardPool.filter(card=>card.baseNumber===value).length;
}
function unlock(run,player,state,value){
  if(registered(player,value)>=2)return;
  const id=`${player.playerId}:gambler:unlock:${value}:${++state.unlockSerial}`;
  player.cardPool.push({id,baseNumber:value,source:'GAMBLER_UNLOCK'});
  state.discardPileIds.push(id);
}
export function settleGamblerHand(run,player,state,selectedId,finalNumber){
  if(player.characterId!=='gambler')return false;
  if(!state.remainingCardIds.includes(selectedId))throw new Error('GAMBLER_CARD_NOT_IN_HAND');
  for(const id of state.remainingCardIds){
    const card=player.cardPool.find(c=>c.id===id);
    if(id===selectedId&&card?.baseNumber>=6)state.vanishedCardIds.push(id);
    else state.discardPileIds.push(id);
  }
  state.remainingCardIds=[];state.spentCardIds=[];
  if(Number.isInteger(finalNumber)&&finalNumber>=1&&finalNumber<=5){
    for(const [value,key,needed] of [[6,'sixProgress',3],[7,'sevenProgress',5]]){
      if(registered(player,value)>=2){state[key]=[];continue;}
      if(!state[key].includes(finalNumber))state[key].push(finalNumber);
      if(state[key].length>=needed){state[key]=[];unlock(run,player,state,value);}
    }
  }
  drawGamblerHand(run,player,state);
  return true;
}
