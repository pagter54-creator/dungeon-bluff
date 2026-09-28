export function restoreCardCycle(run,player){
  const ids=new Set((player.cardPool||[]).map(card=>card.id));
  const saved=run.cardCycles?.[player.playerId];
  if(!saved)return {playerId:player.playerId,cycleIndex:1,spentCardIds:[],remainingCardIds:[...ids]};
  const spent=(saved.spentCardIds||[]).filter(id=>ids.has(id));
  const remaining=(saved.remainingCardIds||[]).filter(id=>ids.has(id)&&!spent.includes(id));
  for(const id of ids)if(!spent.includes(id)&&!remaining.includes(id))remaining.push(id);
  return {playerId:player.playerId,cycleIndex:saved.cycleIndex||1,spentCardIds:spent,remainingCardIds:remaining};
}
export function persistCardCycles(run,privateByPlayer){
  run.cardCycles=Object.fromEntries(run.players.map(player=>{
    const state=privateByPlayer[player.playerId];
    return [player.playerId,{playerId:player.playerId,cycleIndex:state.cycleIndex||1,spentCardIds:[...(state.spentCardIds||[])],remainingCardIds:[...(state.remainingCardIds||[])]}];
  }));
}
