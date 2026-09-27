export function projectRun(run,viewerPlayerId){
  const out=structuredClone(run);
  delete out.effectCatalog;
  delete out.relicCatalog;
  delete out._telemetryPending;
  for(const player of out.players||[]){
    if(player.playerId!==viewerPlayerId&&Array.isArray(player.cardPool)){
      player.cardPool=player.cardPool.map(({baseNumber,source,tags})=>({baseNumber,source,...(tags?{tags}: {})}));
    }
  }
  if(out.combat?.pendingDownPlayerIds)delete out.combat.pendingDownPlayerIds;
  if(out.combat?.publicTurnResult){
    delete out.combat.publicTurnResult.numberHistories;
    delete out.combat.publicTurnResult.mutationEvents;
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
  if(out.roomState?.privateByPlayer){
    const own=out.roomState.privateByPlayer[viewerPlayerId]||null;
    delete out.roomState.privateByPlayer;
    out.privateRoomState=own;
  }
  if(out.roomState?.turnSubmissions){
    out.roomState.readyPlayerIds=Object.keys(out.roomState.turnSubmissions);
    delete out.roomState.turnSubmissions;
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
