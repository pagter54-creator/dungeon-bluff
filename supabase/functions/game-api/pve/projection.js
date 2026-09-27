function publicCardCycles(players,privateByPlayer){
  const states={};
  for(const player of players||[]){
    const state=privateByPlayer?.[player.playerId];
    if(!state)continue;
    const remaining=new Set(state.remainingCardIds||[]);
    states[player.playerId]={
      cycleIndex:Number(state.cycleIndex)||1,
      cards:(player.cardPool||[]).map(card=>({baseNumber:card.baseNumber,used:!remaining.has(card.id)}))
    };
  }
  return states;
}

export function projectRun(run,viewerPlayerId){
  const out=structuredClone(run);
  delete out.effectCatalog;
  delete out.relicCatalog;
  delete out._telemetryPending;

  // Card counting is public in the shared Gameplay UI. Expose only numbers and
  // spent/remaining state; never expose another player's physical card IDs or
  // current selectedCardId/skillIntent.
  if(out.combat?.privateByPlayer)out.combat.publicCardCycles=publicCardCycles(out.players,out.combat.privateByPlayer);
  if(out.roomState?.privateByPlayer)out.roomState.publicCardCycles=publicCardCycles(out.players,out.roomState.privateByPlayer);

  for(const player of out.players||[]){
    if(player.playerId!==viewerPlayerId&&Array.isArray(player.cardPool)){
      player.cardPool=player.cardPool.map(({baseNumber,source,tags})=>({baseNumber,source,...(tags?{tags}: {})}));
    }
  }
  if(out.combat?.pendingDownPlayerIds)delete out.combat.pendingDownPlayerIds;
  if(out.combat?.publicTurnResult){
    const mutations=out.combat.publicTurnResult.mutationEvents||[];
    out.combat.publicTurnResult.presentationMutations=mutations.map(event=>{
      const safe={phase:event.phase,effectId:event.effectId,actorId:event.actorId??null,targetId:event.targetId??null};
      for(const key of ['before','after','actorBefore','targetBefore','actorAfter','targetAfter','stolen','totalActuallyStolen'])if(Number.isFinite(event[key]))safe[key]=event[key];
      if(Array.isArray(event.targetIds))safe.targetIds=[...event.targetIds];
      return safe;
    });
    delete out.combat.publicTurnResult.numberHistories;
    delete out.combat.publicTurnResult.mutationEvents;
    for(const card of out.combat.publicTurnResult.cards||[]){
      delete card.numberHistory;
      delete card.stealTargets;
      delete card.dominanceBefore;
      delete card.dominanceBonus;
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
