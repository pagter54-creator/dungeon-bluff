// Resolve every target from one post-exchange snapshot. Player object order is
// the room's fixed seat order, independent of submission arrival order.
export function stealCardNumbers(cards,players,effects,seatOrder=Object.keys(players)) {
  const snapshot=new Map(cards.map(card=>[card.memberId,card.value]));
  const byId=new Map(cards.map(card=>[card.memberId,card]));
  const remaining=new Map(snapshot);
  const imps=seatOrder.filter(id=>players[id]?.skillId==='number_steal'&&!players[id].knockedOut&&byId.has(id));
  for(const impId of imps){
    const imp=byId.get(impId),number=snapshot.get(impId);
    for(const targetId of seatOrder){
      if(targetId===impId||players[targetId]?.skillId==='number_steal'||!byId.has(targetId)||snapshot.get(targetId)!==number)continue;
      if((remaining.get(targetId)||0)<=0)continue;
      remaining.set(targetId,remaining.get(targetId)-1);
      const target=byId.get(targetId);
      imp.impFrom??=imp.value;target.impFrom??=target.value;
      imp.value++;target.value--;
      effects.push({type:'imp_number_steal',memberId:impId,targetId,amount:1,sourceValue:imp.value-1,targetValue:target.value+1});
    }
  }
}
