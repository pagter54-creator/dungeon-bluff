export function isShuffleTurn(session){return session?.state.currentStage?.category==='boss'&&session.state.monster?.pending?.kind==='shuffle'&&session.state.monster.pending.turn===session.turn_index;}
export function selectionInfo(player,selected,twoCards=false){
 const available=player?.cycleCards?.filter(c=>!c.used&&cardAllowed(player,c))||[];
 const ids=Array.isArray(selected)?selected:selected?[selected]:[];
 const cards=available.filter(c=>ids.includes(c.id));
 const count=Math.min(twoCards?2:1,available.length);
 return {cards,count,ready:count>0&&cards.length===count};
}
export function toggleCardSelection(selected,id,twoCards=false){
 if(!twoCards)return id;
 const ids=Array.isArray(selected)?selected:[];
 return ids.includes(id)?ids.filter(c=>c!==id):[...ids,id].slice(-2);
}
export function cardAllowed(player,card){return player?.skillId!=='acrobatics'||card.value%2===player.characterRuntimeState?.parity;}
