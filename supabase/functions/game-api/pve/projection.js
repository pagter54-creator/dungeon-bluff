import {projectAugmentFramework} from './augment-framework.js';
export function projectRun(run,viewerPlayerId){
  const out=structuredClone(run);
  const publicFramework=projectAugmentFramework(run,viewerPlayerId);
  const opportunity=Object.entries(run.augmentFramework?.relicOpportunities||{}).find(([,x])=>x.playerId===viewerPlayerId&&x.status==='PENDING');
  if(opportunity)out.privateRelicOpportunity={id:opportunity[0],candidateIds:[...opportunity[1].candidateIds]};
  if(out.roomState?.type==='SHOP'&&run.augmentFramework?.cardState?.[viewerPlayerId+':ad:shopDiscount']?.ready){
    for(const item of [...out.roomState.cardStock,...out.roomState.relicStock]){item.basePrice=item.price;item.price=Math.max(0,item.price-1);}
  }
  delete out.augmentFramework;
  delete out.frameworkEffects;
  if(publicFramework)out.augmentStatuses=publicFramework.statuses;
  delete out.effectCatalog;
  delete out.effectCounters;
  if(out.combat)delete out.combat.effectCounters;
  delete out.relicCatalog;
  delete out._telemetryPending;
  delete out.cardCycles;
  if(!out.combat&&run.cardCycles?.[viewerPlayerId])out.privateCombat=structuredClone(run.cardCycles[viewerPlayerId]);
  if(out.combat?.monster){delete out.combat.monster.mechanic;delete out.combat.monster.behaviorState;delete out.combat.monster.pattern;}

  // Gambler aggregate pile counts/composition may be public; exact order, identities and history stay owner-only.
  for(const player of out.players||[]){
    if(player.characterId!=='gambler')continue;
    const source=run.players.find(p=>p.playerId===player.playerId);
    const state=run.combat?.privateByPlayer?.[player.playerId]||run.roomState?.privateByPlayer?.[player.playerId]||run.cardCycles?.[player.playerId];
    if(!state)continue;
    const composition=ids=>Array.from({length:7},(_,i)=>(ids||[]).filter(id=>source.cardPool.find(c=>c.id===id)?.baseNumber===i+1).length);
    const active=value=>source.cardPool.filter(c=>c.baseNumber===value&&!(state.vanishedCardIds||[]).includes(c.id)).length;
    player.gamblerDeck={handCount:(state.remainingCardIds||[]).length,drawCount:(state.drawPileIds||[]).length,discardCount:(state.discardPileIds||[]).length,
      vanishedCount:(state.vanishedCardIds||[]).length,
      drawComposition:composition(state.drawPileIds),discardComposition:composition(state.discardPileIds),
      sixCount:active(6),sevenCount:active(7),sixMax:active(6)>=2,sevenMax:active(7)>=2};
    if(player.playerId===viewerPlayerId){
      player.gamblerDeck.owner={sixProgress:[...(state.sixProgress||[])],sevenProgress:[...(state.sevenProgress||[])],
        luck:Number(state.luck)||0,specialCharge:Number(state.specialCharge)||0,
        cardCounter:Number(state.cardCounter)||0,firstDrawAfterShuffle:Boolean(state.firstDrawAfterShuffle)};
    }
  }
  // Physical card numbers are public; current-cycle usage stays private.

  for(const player of out.players||[]){
    if(player.playerId!==viewerPlayerId&&Array.isArray(player.cardPool)){
      player.cardPool=player.cardPool.map(({baseNumber,source,tags})=>({baseNumber,source,...(tags?{tags}: {})}));
    }
  }
  if(out.combat?.pendingDownPlayerIds)delete out.combat.pendingDownPlayerIds;
  for(const result of [out.combat?.publicTurnResult,out.floorTransitionResult?.publicTurnResult,out.roomState?.publicTurnResult].filter(Boolean)){
    const mutations=result.mutationEvents||[];
    result.presentationMutations=mutations.map(event=>{
      const safe={phase:event.phase,effectId:event.effectId,actorId:event.actorId??null,targetId:event.targetId??null};
      for(const key of ['before','after','actorBefore','targetBefore','actorAfter','targetAfter','stolen','totalActuallyStolen'])if(Number.isFinite(event[key]))safe[key]=event[key];
      if(Array.isArray(event.targetIds))safe.targetIds=[...event.targetIds];
      return safe;
    });
    delete result.numberHistories;
    delete result.mutationEvents;
    for(const card of result.cards||[]){
      // All-In partner identities/printed values and borrowed deck information are owner-private.
      if(card.playerId!==viewerPlayerId){
        for(const key of ['allInCardIds','allInValues','allInSum','allInRootActionId','gamblerBorrowBonus','doubleDownSecond','allAssets','aug237Reduced'])delete card[key];
      }
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
  if(out.roomState?.publicTurnResult?.mutationEvents){
    out.roomState.publicTurnResult.presentationMutations=out.roomState.publicTurnResult.mutationEvents.map(event=>({
      phase:event.phase,effectId:event.effectId,actorId:event.actorId??null,targetId:event.targetId??null,
      before:event.before,after:event.after,actorBefore:event.actorBefore,targetBefore:event.targetBefore,
      actorAfter:event.actorAfter,targetAfter:event.targetAfter
    }));
    delete out.roomState.publicTurnResult.mutationEvents;
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
