// Pure card predicates shared by every card-based PVE event definition.
export function eventPrimitives(cards,{exactNumber=null,threshold=null,min=null,max=null,basis='VALID_SUM'}={}){
  const valid=cards.filter(card=>card.valid),collided=cards.filter(card=>card.invalidReason==='COLLISION');
  const ordered=[...valid].sort((a,b)=>b.finalNumber-a.finalNumber||(a.seat??0)-(b.seat??0)||a.playerId.localeCompare(b.playerId));
  const highest=ordered.filter(card=>card.finalNumber===ordered[0]?.finalNumber);
  const lowest=ordered.filter(card=>card.finalNumber===ordered.at(-1)?.finalNumber);
  const validSum=valid.reduce((sum,card)=>sum+card.finalNumber,0);
  const value=basis==='VALID_COUNT'?valid.length:validSum;
  const ids=list=>list.map(card=>card.playerId);
  return {
    HIGHEST_VALID:ids(highest),LOWEST_VALID:ids(lowest),UNIQUE_VALID:ids(valid),
    COLLIDED:ids(collided),EXACT_NUMBER:ids(cards.filter(card=>card.finalNumber===exactNumber)),
    VALID_SUM:validSum,VALID_COUNT:valid.length,ORDER_BY_VALUE:ids(ordered),
    ALL_COLLIDE:cards.length>0&&valid.length===0,
    NO_COLLISION:cards.every(card=>card.collisionGroupSize===1),
    ABOVE_THRESHOLD:threshold!=null&&value>=threshold,
    BELOW_THRESHOLD:threshold!=null&&value<=threshold,
    BETWEEN:min!=null&&max!=null&&value>=min&&value<=max,
    TIED_HIGHEST:highest.length>1,TIED_LOWEST:lowest.length>1
  };
}
function conditionMet(primitives,condition){
  if(!condition)return primitives.VALID_COUNT>0;
  const value=primitives[condition.primitive];
  if(condition.eq!=null)return value===condition.eq;
  if(condition.gte!=null)return Number(value)>=condition.gte;
  if(condition.lte!=null)return Number(value)<=condition.lte;
  return Boolean(value);
}
function targets(rule,primitives,run){
  if(rule.target==='PARTY')return run.players.map(player=>player.playerId);
  if(rule.target?.startsWith('RANK_'))return primitives.ORDER_BY_VALUE[Number(rule.target.slice(5))-1]?[primitives.ORDER_BY_VALUE[Number(rule.target.slice(5))-1]]:[];
  return Array.isArray(primitives[rule.target])?primitives[rule.target]:[];
}
function applyEffect(run,player,effect,privateState){
  const amount=Math.max(0,Number(effect.amount)||0);
  switch(effect.type){
    case 'HEAL':player.hp=Math.min(player.maxHp,player.hp+amount);break;
    case 'DAMAGE_HP':player.hp=Math.max(0,player.hp-amount);if(player.hp===0)player.status='DOWNED';break;
    case 'ADD_RUN_GOLD':player.runGold+=amount;break;
    case 'SPEND_RUN_GOLD':player.runGold=Math.max(0,player.runGold-amount);break;
    case 'ADD_EXP':player.growthExp+=amount;break;
    case 'ADD_SCORE':player.score=(Number(player.score)||0)+amount;break;
    case 'ADD_FLAME':run.flame=Math.min(run.maxFlame,run.flame+amount);break;
    case 'SPEND_FLAME':run.flame=Math.max(0,run.flame-amount);break;
    case 'RECOVER_CARD':{
      const id=privateState?.spentCardIds?.[0];if(id){privateState.spentCardIds=privateState.spentCardIds.filter(x=>x!==id);privateState.remainingCardIds.push(id);}break;
    }
    case 'LOCK_CARD':{
      const id=privateState?.remainingCardIds?.[0];if(id){privateState.remainingCardIds=privateState.remainingCardIds.filter(x=>x!==id);privateState.spentCardIds.push(id);}break;
    }
    case 'ADD_STATUS':player.persistentCharacterState.statusEffects||=[];if(!player.persistentCharacterState.statusEffects.includes(effect.status))player.persistentCharacterState.statusEffects.push(effect.status);break;
    case 'ADD_ENGRAVING':player.engravings[String(effect.number)]=(Number(player.engravings[String(effect.number)])||0)+amount;break;
    case 'ADD_RELIC':if(run.relicCatalog?.some(relic=>relic.id===effect.relicId)&&!player.relics.includes(effect.relicId))player.relics.push(effect.relicId);break;
    case 'SET_DISCOUNT':player.persistentCharacterState.shopDiscount=amount;break;
    case 'SET_FLAG':player.persistentCharacterState.eventFlags||={};player.persistentCharacterState.eventFlags[effect.flag]=effect.value??true;break;
    default:throw new Error('Unsupported event effect: '+effect.type);
  }
}
export function resolveEventDefinition(run,definition,cards,privateByPlayer){
  const primitives=eventPrimitives(cards,{exactNumber:definition.exactNumber,threshold:definition.threshold,min:definition.min,max:definition.max,basis:definition.thresholdBasis});
  const outcome=primitives.ALL_COLLIDE?(definition.allCollide?.outcome||'ALL_COLLIDE'):(conditionMet(primitives,definition.successCondition)?'SUCCESS':'FAILURE');
  const rules=primitives.ALL_COLLIDE?(definition.allCollide?.rules||[]):(definition.rules||[]).filter(rule=>rule.when==='ALWAYS'||rule.when===outcome);
  if(!primitives.ALL_COLLIDE&&primitives.NO_COLLISION)rules.push(...(definition.noCollisionRules||[]));
  const rewards=Object.fromEntries(run.players.map(player=>[player.playerId,[]]));
  for(const rule of rules){
    const recipientIds=targets(rule,primitives,run);
    for(const playerId of recipientIds){
      const player=run.players.find(p=>p.playerId===playerId);
      for(const effect of rule.effects||[]){
        if(rule.target==='PARTY'&&['ADD_FLAME','SPEND_FLAME'].includes(effect.type)&&playerId!==recipientIds[0])continue;
        applyEffect(run,player,effect,privateByPlayer?.[playerId]);
        rewards[playerId].push({type:effect.type,amount:effect.amount??null});
      }
    }
  }
  return {outcome,primitives,rewards};
}
