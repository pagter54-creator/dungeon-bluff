const VALID_OPERATIONS=new Set([
  'MODIFY_NUMBER','MODIFY_DAMAGE','SET_DAMAGE','ADD_STATUS','REMOVE_STATUS','HEAL','DAMAGE_SELF',
  'ADD_RESOURCE','SPEND_RESOURCE','RECOVER_CARD','DRAW_CARD','DISCARD_CARD','ADD_RUN_GOLD','ADD_EXP',
  'ADD_ARMOR','SET_COLLISION_IMMUNE','QUEUE_FOLLOW_UP_DAMAGE'
]);
const getPath=(obj,path)=>String(path||'').split('.').filter(Boolean).reduce((v,k)=>v?.[k],obj);

function conditionMatches(condition,ctx){
  if(!condition)return true;
  if(Array.isArray(condition.all))return condition.all.every(x=>conditionMatches(x,ctx));
  if(Array.isArray(condition.any))return condition.any.some(x=>conditionMatches(x,ctx));
  if(condition.not)return !conditionMatches(condition.not,ctx);
  const actual=getPath(ctx,condition.path);
  if('eq' in condition)return actual===condition.eq;
  if('neq' in condition)return actual!==condition.neq;
  if('gte' in condition)return Number(actual)>=Number(condition.gte);
  if('lte' in condition)return Number(actual)<=Number(condition.lte);
  if('gt' in condition)return Number(actual)>Number(condition.gt);
  if('lt' in condition)return Number(actual)<Number(condition.lt);
  if('includes' in condition)return Array.isArray(actual)&&actual.includes(condition.includes);
  return Boolean(actual);
}
function scopeToken(run,player,effect,ctx){
  const scope=effect.resetScope||'NONE';
  if(scope==='TURN')return `turn:${run.combat?.id||'none'}:${run.combat?.turn||0}`;
  if(scope==='CYCLE')return `cycle:${run.combat?.id||'none'}:${ctx.privateState?.cycleIndex||run.combat?.privateByPlayer?.[player.playerId]?.cycleIndex||0}`;
  if(scope==='COMBAT')return `combat:${run.combat?.id||'none'}`;
  if(scope==='FLOOR')return `floor:${run.floor}`;
  if(scope==='RUN')return `run:${run.id}`;
  return 'none';
}
function counter(run,player,effect,ctx){
  run.effectCounters ||= {};
  const key=`${player.playerId}:${effect.id}:${scopeToken(run,player,effect,ctx)}`;
  return {key,value:run.effectCounters[key]||0};
}
function privateState(run,player){return run.combat?.privateByPlayer?.[player.playerId];}
function recoverCard(run,player,operation,ctx){
  const priv=privateState(run,player);if(!priv||!priv.spentCardIds.length)return null;
  let id=operation.cardInstanceId;
  if(!id&&operation.number!=null)id=priv.spentCardIds.find(x=>player.cardPool.find(c=>c.id===x)?.baseNumber===operation.number);
  if(!id)id=priv.spentCardIds[0];
  if(!priv.spentCardIds.includes(id))return null;
  priv.spentCardIds=priv.spentCardIds.filter(x=>x!==id);if(!priv.remainingCardIds.includes(id))priv.remainingCardIds.push(id);
  return id;
}
function discardCard(run,player,operation){
  const priv=privateState(run,player);if(!priv)return null;
  let id=operation.cardInstanceId;
  if(!id&&operation.number!=null)id=priv.remainingCardIds.find(x=>player.cardPool.find(c=>c.id===x)?.baseNumber===operation.number);
  if(!id)id=priv.remainingCardIds[0];
  if(!id||!priv.remainingCardIds.includes(id))return null;
  priv.remainingCardIds=priv.remainingCardIds.filter(x=>x!==id);if(!priv.spentCardIds.includes(id))priv.spentCardIds.push(id);
  return id;
}
function applyOperation(run,player,op,ctx){
  if(!VALID_OPERATIONS.has(op.type))throw new Error(`Unsupported PVE effect operation: ${op.type}`);
  const amount=Number(op.amount||0);
  if(op.type==='MODIFY_NUMBER'){ctx.resolved.workingNumber+=amount;ctx.resolved.finalNumber=ctx.resolved.workingNumber;}
  else if(op.type==='MODIFY_DAMAGE')ctx.damage.amount=Math.max(0,ctx.damage.amount+amount);
  else if(op.type==='SET_DAMAGE')ctx.damage.amount=Math.max(0,amount);
  else if(op.type==='ADD_STATUS'){player.persistentCharacterState.statusEffects||=[];if(!player.persistentCharacterState.statusEffects.includes(op.status))player.persistentCharacterState.statusEffects.push(op.status);}
  else if(op.type==='REMOVE_STATUS'){player.persistentCharacterState.statusEffects=(player.persistentCharacterState.statusEffects||[]).filter(x=>x!==op.status);}
  else if(op.type==='HEAL')player.hp=Math.min(player.maxHp,player.hp+Math.max(0,amount));
  else if(op.type==='DAMAGE_SELF')player.hp=Math.max(0,player.hp-Math.max(0,amount));
  else if(op.type==='ADD_RESOURCE')player.publicResources[op.resource]=(Number(player.publicResources[op.resource])||0)+amount;
  else if(op.type==='SPEND_RESOURCE')player.publicResources[op.resource]=Math.max(0,(Number(player.publicResources[op.resource])||0)-Math.max(0,amount));
  else if(op.type==='RECOVER_CARD'){const id=recoverCard(run,player,op,ctx);if(id)ctx.events?.push({type:'PRIVATE_CARD_RECOVERED',playerId:player.playerId,cardInstanceId:id});}
  else if(op.type==='DRAW_CARD'){const id=recoverCard(run,player,op,ctx);if(id)ctx.events?.push({type:'PRIVATE_CARD_DRAWN',playerId:player.playerId,cardInstanceId:id});}
  else if(op.type==='DISCARD_CARD')discardCard(run,player,op);
  else if(op.type==='ADD_RUN_GOLD')player.runGold+=amount;
  else if(op.type==='ADD_EXP')player.growthExp+=amount;
  else if(op.type==='ADD_ARMOR')player.publicResources.armor=(Number(player.publicResources.armor)||0)+Math.max(0,amount);
  else if(op.type==='SET_COLLISION_IMMUNE')ctx.resolved.collisionImmune=op.value!==false;
  else if(op.type==='QUEUE_FOLLOW_UP_DAMAGE'){ctx.followUps||=[];ctx.followUps.push({sourcePlayerId:player.playerId,amount:Math.max(0,amount),tags:op.tags||['EFFECT'],followUp:true});}
}
function definitionsFor(run,player){
  const catalog=run.effectCatalog||{};
  return [...(player.augments||[]),...(player.relics||[])].flatMap(id=>catalog[id]?.effects||[]);
}
export function applyOwnedEffects(run,trigger,ctx={}){
  const players=ctx.player?[ctx.player]:run.players;
  const fired=[];
  for(const player of players){
    const defs=definitionsFor(run,player).filter(e=>e.trigger===trigger).sort((a,b)=>(a.priority||0)-(b.priority||0)||String(a.id).localeCompare(String(b.id)));
    for(const effect of defs){
      const local={...ctx,run,player,privateState:privateState(run,player)};
      if(!conditionMatches(effect.condition,local))continue;
      const c=counter(run,player,effect,local);
      if(effect.maxTriggers!=null&&c.value>=effect.maxTriggers)continue;
      for(const op of effect.operations||[])applyOperation(run,player,op,local);
      run.effectCounters[c.key]=c.value+1;
      fired.push({playerId:player.playerId,effectId:effect.id,trigger});
    }
  }
  return fired;
}
export function applyEffectDefinitions(run,player,definitions,trigger,ctx={}){
  const old=run.effectCatalog;const ids=[];
  run.effectCatalog={...(old||{})};
  for(const def of definitions){const owner=`__test_${def.id}`;run.effectCatalog[owner]={effects:[def]};player.relics.push(owner);ids.push(owner);}
  try{return applyOwnedEffects(run,trigger,{...ctx,player});}
  finally{player.relics=player.relics.filter(x=>!ids.includes(x));run.effectCatalog=old;}
}
