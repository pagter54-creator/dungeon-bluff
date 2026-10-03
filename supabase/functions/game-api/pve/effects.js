import {recordEffectTelemetry} from './telemetry.js';
import {AUGMENT_BY_ID} from './augment-catalog.js';
import {resourceMax} from './resources.js';
import {dispatchAugmentTrigger} from './augment-framework.js';
import {applyContent005B} from './content-005b-runtime.js';
import {notifyBerserkerHeal} from './berserker-runtime.js';
import {applySeerRuntime} from './seer-runtime.js';

const VALID_OPERATIONS=new Set([
  'MODIFY_NUMBER','MODIFY_DAMAGE','SET_DAMAGE','ADD_STATUS','REMOVE_STATUS','HEAL','DAMAGE_SELF',
  'ADD_RESOURCE','SPEND_RESOURCE','RECOVER_CARD','DRAW_CARD','DISCARD_CARD','ADD_RUN_GOLD','ADD_EXP',
  'ADD_ARMOR','SET_COLLISION_IMMUNE','QUEUE_FOLLOW_UP_DAMAGE','SET_RESOURCE','SET_RESOURCE_MAX',
  'CAPTURE_RESOURCE','MODIFY_INCOMING_DAMAGE'
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
  const priv=ctx.privateState||privateState(run,player);if(!priv||!priv.spentCardIds.length)return null;
  let id=operation.cardInstanceId;
  if(!id&&operation.number!=null)id=priv.spentCardIds.find(x=>player.cardPool.find(c=>c.id===x)?.baseNumber===operation.number);
  if(!id)id=priv.spentCardIds[0];
  if(!priv.spentCardIds.includes(id))return null;
  priv.spentCardIds=priv.spentCardIds.filter(x=>x!==id);if(!priv.remainingCardIds.includes(id))priv.remainingCardIds.push(id);
  return id;
}
function discardCard(run,player,operation,ctx){
  const priv=ctx.privateState||privateState(run,player);if(!priv)return null;
  let id=operation.cardInstanceId;
  if(!id&&operation.number!=null)id=priv.remainingCardIds.find(x=>player.cardPool.find(c=>c.id===x)?.baseNumber===operation.number);
  if(!id)id=priv.remainingCardIds[0];
  if(!id||!priv.remainingCardIds.includes(id))return null;
  priv.remainingCardIds=priv.remainingCardIds.filter(x=>x!==id);if(!priv.spentCardIds.includes(id))priv.spentCardIds.push(id);
  return id;
}
function addMetric(metrics,key,value){if(value>0)metrics[key]=(metrics[key]||0)+value;}
function applyOperation(run,player,op,ctx,metrics){
  if(!VALID_OPERATIONS.has(op.type))throw new Error(`Unsupported PVE effect operation: ${op.type}`);
  const rawAmount=op.amountPath?getPath(ctx,op.amountPath):op.amount;
  const amount=Number(rawAmount||0);
  if(op.type==='MODIFY_NUMBER'){ctx.resolved.workingNumber+=amount;ctx.resolved.finalNumber=ctx.resolved.workingNumber;}
  else if(op.type==='MODIFY_DAMAGE'){const before=ctx.damage.amount;ctx.damage.amount=Math.max(0,ctx.damage.amount+amount);addMetric(metrics,'extra_damage',ctx.damage.amount-before);}
  else if(op.type==='SET_DAMAGE'){const before=ctx.damage.amount;ctx.damage.amount=Math.max(0,amount);addMetric(metrics,'extra_damage',ctx.damage.amount-before);}
  else if(op.type==='ADD_STATUS'){player.persistentCharacterState.statusEffects||=[];if(!player.persistentCharacterState.statusEffects.includes(op.status))player.persistentCharacterState.statusEffects.push(op.status);}
  else if(op.type==='REMOVE_STATUS'){player.persistentCharacterState.statusEffects=(player.persistentCharacterState.statusEffects||[]).filter(x=>x!==op.status);}
  else if(op.type==='HEAL'){const before=player.hp;player.hp=Math.min(player.maxHp,player.hp+Math.max(0,amount));const healed=Math.max(0,player.hp-before);addMetric(metrics,'healing',healed);if(healed>0)notifyBerserkerHeal(run,player,healed,ctx.sourceAugmentId||ctx.sourceRelicId||'EFFECT_HEAL');}
  else if(op.type==='DAMAGE_SELF')player.hp=Math.max(0,player.hp-Math.max(0,amount));
  else if(op.type==='ADD_RESOURCE'){const before=Number(player.publicResources[op.resource])||0;const max=resourceMax(player,op.resource,Infinity);player.publicResources[op.resource]=Math.min(max,before+amount);addMetric(metrics,'resources_refunded',player.publicResources[op.resource]-before);}
  else if(op.type==='SET_RESOURCE'){const max=resourceMax(player,op.resource,Infinity);player.publicResources[op.resource]=Math.max(0,Math.min(max,amount));}
  else if(op.type==='SET_RESOURCE_MAX'){player.publicResources[`${op.resource}Max`]=Math.max(0,amount);const current=Number(player.publicResources[op.resource]);if(Number.isFinite(current))player.publicResources[op.resource]=Math.min(current,amount);}
  else if(op.type==='CAPTURE_RESOURCE'){if(ctx.resolved)ctx.resolved[op.field||op.resource]=Number(player.publicResources[op.resource])||0;}
  else if(op.type==='SPEND_RESOURCE')player.publicResources[op.resource]=Math.max(0,(Number(player.publicResources[op.resource])||0)-Math.max(0,amount));
  else if(op.type==='RECOVER_CARD'){const id=recoverCard(run,player,op,ctx);if(id){ctx.events?.push({type:'PRIVATE_CARD_RECOVERED',playerId:player.playerId,cardInstanceId:id});addMetric(metrics,'cards_recovered',1);}}
  else if(op.type==='DRAW_CARD'){const id=recoverCard(run,player,op,ctx);if(id){ctx.events?.push({type:'PRIVATE_CARD_DRAWN',playerId:player.playerId,cardInstanceId:id});addMetric(metrics,'cards_recovered',1);}}
  else if(op.type==='DISCARD_CARD')discardCard(run,player,op,ctx);
  else if(op.type==='ADD_RUN_GOLD'){player.runGold+=amount;addMetric(metrics,'gold_bonus',amount);}
  else if(op.type==='ADD_EXP'){player.growthExp+=amount;addMetric(metrics,'exp_bonus',amount);}
  else if(op.type==='ADD_ARMOR')player.publicResources.armor=(Number(player.publicResources.armor)||0)+Math.max(0,amount);
  else if(op.type==='MODIFY_INCOMING_DAMAGE'){const before=Math.max(0,Number(ctx.incomingDamage?.amount)||0);if(ctx.incomingDamage)ctx.incomingDamage.amount=Math.max(0,before+amount);addMetric(metrics,'prevented_damage',before-(ctx.incomingDamage?.amount||0));}
  else if(op.type==='SET_COLLISION_IMMUNE')ctx.resolved.collisionImmune=op.value!==false;
  else if(op.type==='QUEUE_FOLLOW_UP_DAMAGE'){const queued=Math.max(0,amount);ctx.followUps||=[];ctx.followUps.push({sourcePlayerId:player.playerId,amount:queued,tags:op.tags||['EFFECT'],followUp:true});addMetric(metrics,'extra_damage',queued);}
}
function definitionsFor(run,player){
  const catalog=run.effectCatalog||{};
  return [...(player.augments||[]),...(player.relics||[])].flatMap(id=>((catalog[id]||AUGMENT_BY_ID[id])?.effects||[]).map(effect=>({...effect,augmentId:id})));

}
export function applyOwnedEffects(run,trigger,ctx={}){
  const players=ctx.player?[ctx.player]:run.players;
  const fired=[];
  for(const player of players){
    const defs=definitionsFor(run,player).filter(e=>e.trigger===trigger&&(!ctx.followUp||(e.tags||[]).includes('MULTI_HIT'))).sort((a,b)=>(a.priority||0)-(b.priority||0)||String(a.augmentId).localeCompare(String(b.augmentId))||String(a.id).localeCompare(String(b.id)));
    for(const effect of defs){
      if(effect.augmentId==='aug-001'&&run.phase!=='COMBAT')continue;
      if(['EVENT','REWARD_ROOM'].includes(run.phase)&&['CARD_VALIDATED','BEFORE_DAMAGE','AFTER_DAMAGE'].includes(trigger)&&String(effect.augmentId).startsWith('aug-'))continue;
      const local={...ctx,run,player,privateState:ctx.privateState||privateState(run,player)};
      if(!conditionMatches(effect.condition,local)){recordEffectTelemetry(run,effect,player.playerId,false);continue;}
      const c=counter(run,player,effect,local);
      if(effect.maxTriggers!=null&&c.value>=effect.maxTriggers){recordEffectTelemetry(run,effect,player.playerId,false);continue;}
      const metrics={};
      for(const op of effect.operations||[])applyOperation(run,player,op,local,metrics);
      run.effectCounters[c.key]=c.value+1;
      recordEffectTelemetry(run,effect,player.playerId,true,metrics);
      fired.push({playerId:player.playerId,effectId:effect.id,trigger});
    }
  }
  fired.push(...dispatchAugmentTrigger(run,trigger,ctx));
  fired.push(...applyContent005B(run,trigger,ctx));
  fired.push(...applySeerRuntime(run,trigger,ctx));
  return fired;
}
export function applyEffectDefinitions(run,player,definitions,trigger,ctx={}){
  const old=run.effectCatalog;const ids=[];
  run.effectCatalog={...(old||{})};
  for(const def of definitions){const owner=`__test_${def.id}`;run.effectCatalog[owner]={effects:[def]};player.relics.push(owner);ids.push(owner);}
  try{return applyOwnedEffects(run,trigger,{...ctx,player});}
  finally{player.relics=player.relics.filter(x=>!ids.includes(x));run.effectCatalog=old;}
}
