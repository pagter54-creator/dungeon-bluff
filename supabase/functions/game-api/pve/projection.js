export function projectRun(run,viewerPlayerId){
  const out=structuredClone(run);
  for(const player of out.players||[]){
    if(player.playerId!==viewerPlayerId&&Array.isArray(player.cardPool)){
      player.cardPool=player.cardPool.map(({baseNumber,source,tags})=>({baseNumber,source,...(tags?{tags}: {})}));
    }
  }
  if(out.combat?.privateByPlayer){
    const own=out.combat.privateByPlayer[viewerPlayerId]||null;
    delete out.combat.privateByPlayer;
    out.privateCombat=own;
  }
  if(out.combat?.turnSubmissions){
    out.combat.readyPlayerIds=Object.keys(out.combat.turnSubmissions);
    delete out.combat.turnSubmissions;
  }
  if(out.augmentChoice){
    const pending=out.augmentChoice.pendingByPlayer?.[viewerPlayerId]||[];
    const offer=out.augmentChoice.offersByPlayer?.[viewerPlayerId]||[];
    out.augmentChoice.pendingPlayerIds=Object.entries(out.augmentChoice.pendingByPlayer||{}).filter(([,tiers])=>tiers.length).map(([id])=>id);
    out.privateAugmentOffer=pending.length?{tier:pending[0],augmentIds:[...offer]}:null;
    delete out.augmentChoice.pendingByPlayer;
    delete out.augmentChoice.offersByPlayer;
  }
  return out;
}
