import {freshGamblerState} from './gambler.js';

export function restoreCardCycle(run,player){
  const ids=new Set((player.cardPool||[]).map(card=>card.id));
  const saved=run.cardCycles?.[player.playerId];
  if(player.characterId==='gambler'){
    if(!saved)return freshGamblerState(player);
    const zones=['remainingCardIds','drawPileIds','discardPileIds','vanishedCardIds'];
    const result={...freshGamblerState(player),...structuredClone(saved),playerId:player.playerId,cycleIndex:0,spentCardIds:[]};
    const seen=new Set();
    for(const zone of zones){
      result[zone]=(result[zone]||[]).filter(id=>ids.has(id)&&!seen.has(id)&&seen.add(id));
    }
    for(const id of ids)if(!seen.has(id))result.drawPileIds.push(id);
    return result;
  }
  if(!saved)return {playerId:player.playerId,cycleIndex:1,spentCardIds:[],remainingCardIds:[...ids]};
  const spent=(saved.spentCardIds||[]).filter(id=>ids.has(id));
  const remaining=(saved.remainingCardIds||[]).filter(id=>ids.has(id)&&!spent.includes(id));
  for(const id of ids)if(!spent.includes(id)&&!remaining.includes(id))remaining.push(id);
  return {playerId:player.playerId,cycleIndex:saved.cycleIndex||1,spentCardIds:spent,remainingCardIds:remaining};
}
export function persistCardCycles(run,privateByPlayer){
  run.cardCycles=Object.fromEntries(run.players.map(player=>{
    const state=privateByPlayer[player.playerId];
    if(player.characterId==='gambler')return [player.playerId,structuredClone(state)];
    return [player.playerId,{playerId:player.playerId,cycleIndex:state.cycleIndex||1,spentCardIds:[...(state.spentCardIds||[])],remainingCardIds:[...(state.remainingCardIds||[])]}];
  }));
}
