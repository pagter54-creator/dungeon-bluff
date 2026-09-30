import {choose} from './rng.js';

export const AUGMENT_TRIGGERS=Object.freeze(['ON_ACQUIRE','COMBAT_START','TURN_START','PRE_SELECT','ON_SKILL_USE','ON_SUBMIT','POST_REVEAL','PRE_COLLISION','POST_COLLISION','ON_VALID','ON_INVALID','PRE_DAMAGE','POST_DAMAGE','ON_DAMAGE_TAKEN','ON_HEAL','ON_KILL','ON_DOWN','ON_RECOVER_CARD','ON_DRAW','ON_CYCLE_RESET','TURN_END','COMBAT_END','ROOM_END','FLOOR_END','RUN_END']);
export const ONCE_SCOPES=Object.freeze(['NONE','ONCE_PER_TURN','ONCE_PER_CYCLE','ONCE_PER_COMBAT','ONCE_PER_ROOM','ONCE_PER_FLOOR','ONCE_PER_RUN']);
export const RESET_SCOPES=Object.freeze(['TURN','CYCLE','COMBAT','ROOM','FLOOR','RUN']);
export const VISIBILITIES=Object.freeze(['PUBLIC','OWNER_PRIVATE','SERVER_ONLY']);
export const ROOM_TYPES=Object.freeze(['COMBAT','EVENT','REWARD','SHOP','REST']);
export const DEFAULT_STACK_CAP=3;
const alias={PRE_COLLISION_SELF_MODIFY:'PRE_COLLISION',CARD_VALIDATED:'ON_VALID',BEFORE_DAMAGE:'PRE_DAMAGE',AFTER_DAMAGE:'POST_DAMAGE',PLAYER_DAMAGED:'ON_DAMAGE_TAKEN',PLAYER_DOWNED:'ON_DOWN',MONSTER_KILLED:'ON_KILL',CYCLE_END:'ON_CYCLE_RESET'};
const unsupported=()=>{const error=new Error('UNSUPPORTED_AUGMENT_EFFECT');error.code='UNSUPPORTED_AUGMENT_EFFECT';throw error;};
const integer=(x)=>Number.isSafeInteger(Number(x))&&Number(x)>=0?Number(x):null;
const state=run=>(run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0});
const roomType=run=>run.phase==='COMBAT'?'COMBAT':run.phase==='REWARD_ROOM'?'REWARD':run.phase==='EVENT'?'EVENT':run.phase==='SHOP'?'SHOP':run.phase==='REST'?'REST':run.roomState?.type==='REWARD_ROOM'?'REWARD':null;
const roomId=run=>run.currentRoomNodeId||run.combat?.id||run.roomState?.id||null;
const cycleId=(run,player,ctx)=>ctx.privateState?.cycleIndex??run.combat?.privateByPlayer?.[player.playerId]?.cycleIndex??run.roomState?.privateByPlayer?.[player.playerId]?.cycleIndex??run.cardCycles?.[player.playerId]?.cycleIndex??null;
export function makeAugmentEnvelope(run,player,trigger,ctx={}){
  const s=state(run),orderKey=++s.sequence,combatId=run.combat?.id||null,turnId=String(run.combat?.turn??run.roomState?.turn??run.roomState?.attempt??'1');
  const rootActionId=ctx.rootActionId||'run:'+run.id+':version:'+run.version+':order:'+orderKey;
  return {eventId:ctx.eventId||rootActionId+':'+trigger+':'+orderKey,rootActionId,parentEventId:ctx.parentEventId||null,sourceType:ctx.sourceType||'AUGMENT',sourceId:ctx.sourceId||null,playerId:player.playerId,roomId:roomId(run),combatId,turnId,cycleId:cycleId(run,player,ctx),timestamp:ctx.timestamp||null,orderKey};
}
function scopeId(run,player,scope,ctx){
  if(scope==='NONE')return null;
  const e=ctx.envelope||makeAugmentEnvelope(run,player,'SCOPE',ctx);
  if(scope==='ONCE_PER_TURN')return (e.combatId||e.roomId)+':'+e.turnId;
  if(scope==='ONCE_PER_CYCLE')return (e.combatId||e.roomId)+':'+e.cycleId;
  if(scope==='ONCE_PER_COMBAT')return e.combatId;
  if(scope==='ONCE_PER_ROOM')return e.roomId;
  if(scope==='ONCE_PER_FLOOR')return String(run.floor);
  return run.id;
}
export function onceKey(run,player,augmentId,scope,ctx={}){
  if(!ONCE_SCOPES.includes(scope))unsupported();
  if(scope==='NONE')return null;
  const id=scopeId(run,player,scope,ctx);
  if(id==null||String(id).includes('null'))throw new Error('AUGMENT_SCOPE_CONTEXT_MISSING');
  return JSON.stringify([player.playerId,augmentId,scope,id]);
}
export function roomAllowed(def,room){
  if(!ROOM_TYPES.includes(room))return false;
  const value=def.roomApplicability?.[room];
  return value===true||value?.value===true||(!def.roomApplicability&&room==='COMBAT');
}
export function validateFrameworkEffect(def){
  if(!def||!def.augmentId||!AUGMENT_TRIGGERS.includes(def.trigger)||!ONCE_SCOPES.includes(def.onceScope||'NONE')||!RESET_SCOPES.includes(def.resetScope||'RUN')||!VISIBILITIES.includes(def.visibility||'SERVER_ONLY')||!Array.isArray(def.operations)||typeof def.condition==='function')unsupported();
  if(def.contractStatus==='SPEC_AMBIGUOUS'||def.status==='SPEC_AMBIGUOUS'||def.executable===false)unsupported();
  for(const op of def.operations)if(!SUPPORTED_OPERATIONS.has(op.type))unsupported();
  return def;
}
const SUPPORTED_OPERATIONS=new Set(['APPLY_STATUS','ADD_STACK','SET_STACK','CONSUME_STACK','REMOVE_STATUS','RECOVER_CARD','DRAW_CARD','MOVE_CARD_ZONE','VANISH_CARD','RETURN_TO_DECK','SHUFFLE_DETERMINISTIC','ADD_DAMAGE','SET_DAMAGE','MULTIPLY_DAMAGE','EXTRA_DAMAGE_COMPONENT','HEAL','SELF_DAMAGE','SCHEDULE_EFFECT','RULE_MODIFIER','ADD_RUN_GOLD','ADD_EXP','GRANT_RELIC']);
function status(run,op,player){return state(run).statuses.find(x=>x.statusId===op.statusId&&x.targetId===(op.targetId||player.playerId));}
function applyStatus(run,player,op){
  const s=state(run),targetId=op.targetId||player.playerId,existing=status(run,op,player),cap=op.cap??existing?.cap??(op.useDefaultCap?DEFAULT_STACK_CAP:null);
  if(op.type==='REMOVE_STATUS'){s.statuses=s.statuses.filter(x=>x!==existing);return {stackDelta:existing? -existing.stacks:0};}
  if(cap==null||integer(cap)==null||!RESET_SCOPES.includes(op.resetScope||'COMBAT'))unsupported();
  if(op.type==='CONSUME_STACK'&&!existing)return {stackDelta:0};
  const before=existing?.stacks||0;
  const requested=integer(op.stacks??1);if(requested==null)unsupported();
  const next=op.type==='SET_STACK'?Math.min(cap,requested):op.type==='CONSUME_STACK'?Math.max(0,before-requested):Math.min(cap,before+requested);
  if(next===0){if(existing)s.statuses=s.statuses.filter(x=>x!==existing);}
  else if(existing)existing.stacks=next;
  else s.statuses.push({statusId:op.statusId,sourceType:op.sourceType||'AUGMENT',sourceId:op.sourceId||null,ownerId:player.playerId,targetId,stacks:next,cap,payload:structuredClone(op.payload||{}),appliedAt:op.appliedAt||null,resetScope:op.resetScope||'COMBAT',visibility:op.visibility||'PUBLIC'});
  return {stackDelta:next-before};
}
export function recoverPhysicalCard(run,player,cardInstanceId,ctx={}){
  const priv=ctx.privateState||run.combat?.privateByPlayer?.[player.playerId]||run.roomState?.privateByPlayer?.[player.playerId];
  if(!priv||!player.cardPool?.some(card=>card.id===cardInstanceId)||!priv.spentCardIds?.includes(cardInstanceId)||priv.remainingCardIds?.includes(cardInstanceId)||priv.selectedCardId===cardInstanceId||run.combat?.turnSubmissions?.[player.playerId]?.cardInstanceId===cardInstanceId||run.roomState?.turnSubmissions?.[player.playerId]?.cardInstanceId===cardInstanceId)return {applied:false,reason:'CARD_NOT_RECOVERABLE'};
  const depth=integer(ctx.chainDepth??0),ceiling=integer(ctx.recoveryCeiling??4);
  if(depth==null||ceiling==null||depth>=ceiling)return {applied:false,reason:'RECOVERY_CHAIN_CEILING',telemetry:{chainDepth:depth}};
  const envelope=ctx.envelope||makeAugmentEnvelope(run,player,'ON_RECOVER_CARD',ctx);
  const counts=state(run).recoveryCounts||={};
  if((counts[envelope.rootActionId]||0)>=24)return {applied:false,reason:'ACTION_CHAIN_CEILING',telemetry:{rootActionId:envelope.rootActionId}};
  counts[envelope.rootActionId]=(counts[envelope.rootActionId]||0)+1;
  priv.spentCardIds=priv.spentCardIds.filter(id=>id!==cardInstanceId);priv.remainingCardIds.push(cardInstanceId);
  return {applied:true,cardInstanceId,rootActionId:envelope.rootActionId,recoveryChainId:ctx.recoveryChainId||envelope.rootActionId+':recovery',parentEventId:envelope.eventId,chainDepth:depth+1};
}
function zones(player,ctx){
  const priv=ctx.privateState;
  if(!priv)return null;
  return player.characterId==='gambler'?{DRAW_PILE:priv.drawPileIds,HAND:priv.remainingCardIds,DISCARD:priv.discardPileIds,VANISHED:priv.vanishedCardIds}:{HAND:priv.remainingCardIds,DISCARD:priv.spentCardIds};
}
export function movePhysicalCard(player,cardInstanceId,from,to,ctx={}){
  const z=zones(player,ctx);if(!z?.[from]||!z?.[to]||!player.cardPool.some(c=>c.id===cardInstanceId)||!z[from].includes(cardInstanceId)||z[to].includes(cardInstanceId))return {applied:false,reason:'CARD_ZONE_INVALID'};
  z[from].splice(z[from].indexOf(cardInstanceId),1);z[to].push(cardInstanceId);return {applied:true,cardInstanceId};
}
export function drawPhysicalCard(run,player,ctx={}){
  const priv=ctx.privateState||run.combat?.privateByPlayer?.[player.playerId]||run.roomState?.privateByPlayer?.[player.playerId];
  if(!priv)return {applied:false,reason:'DECK_STATE_MISSING'};
  if(player.characterId==='gambler'){
    if(!priv.drawPileIds.length){priv.drawPileIds=[...priv.discardPileIds];priv.discardPileIds=[];}
    if(!priv.drawPileIds.length)return {applied:false,reason:'DECK_EMPTY'};
    const cardId=choose(run,priv.drawPileIds,'augment-draw:'+run.id+':'+player.playerId+':'+(priv.drawCount||0));
    priv.drawPileIds.splice(priv.drawPileIds.indexOf(cardId),1);priv.remainingCardIds.push(cardId);priv.drawCount=(priv.drawCount||0)+1;
    return {applied:true,cardInstanceId:cardId};
  }
  const id=priv.spentCardIds?.[0];return id?recoverPhysicalCard(run,player,id,{...ctx,privateState:priv}):{applied:false,reason:'CYCLE_EMPTY'};
}
export function applyDamageOperation(packet,op,room){
  if(room!=='COMBAT')return {applied:false,reason:'COMBAT_ONLY_DAMAGE'};
  if(!packet||!Number.isFinite(packet.amount))unsupported();
  const before=packet.amount,amount=Number(op.amount);
  if(!Number.isFinite(amount)||amount<0)unsupported();
  if(op.type==='ADD_DAMAGE')packet.amount+=amount;
  else if(op.type==='SET_DAMAGE')packet.amount=amount;
  else if(op.type==='MULTIPLY_DAMAGE')packet.amount*=amount;
  else if(op.type==='EXTRA_DAMAGE_COMPONENT'){packet.components||=[];packet.components.push({amount,sourceType:op.sourceType||'AUGMENT',sourceId:op.sourceId||null,playerId:op.playerId||null});}
  else unsupported();
  packet.amount=Math.max(0,packet.amount);
  return {applied:true,amount:packet.amount-before,actualDamage:packet.amount};
}
export function applyVitalOperation(player,op){
  const requested=integer(op.amount);if(requested==null)unsupported();
  const before=player.hp;
  if(op.type==='HEAL'){const cap=op.capMode==='CUSTOM_CAP'?integer(op.cap):player.maxHp;if(cap==null)unsupported();player.hp=Math.min(cap,player.hp+requested);}
  else if(op.type==='SELF_DAMAGE')player.hp=Math.max(op.canDown===false?Math.min(before,integer(op.minimumHp??1)??0):0,player.hp-requested);
  else unsupported();
  return {applied:true,requestedAmount:requested,actualAmount:Math.abs(player.hp-before),preventedByCap:Math.max(0,requested-Math.abs(player.hp-before)),downResult:player.hp===0};
}
export function scheduleDelayed(run,op,envelope){
  if(op.resolveAt==null||op.cancelCondition==null||!RESET_SCOPES.includes(op.resetScope)||!op.sourceAugmentId)unsupported();
  const item={id:envelope.eventId+':delay',scheduledAt:op.scheduledAt??envelope.orderKey,resolveAt:op.resolveAt,cancelCondition:structuredClone(op.cancelCondition),resetScope:op.resetScope,payload:structuredClone(op.payload||{}),sourceAugmentId:op.sourceAugmentId,combatId:envelope.combatId,roomId:envelope.roomId,ownerId:envelope.playerId,bossDeathBehavior:op.bossDeathBehavior||'CANCEL'};
  state(run).delayed.push(item);return item;
}
export function resolveDelayed(run,now,context={}){
  const s=state(run),out=[];s.delayed=s.delayed.filter(item=>{
    if(item.combatId&&item.combatId!==run.combat?.id){out.push({id:item.id,applied:false,reason:'COMBAT_ENDED'});return false;}
    if(context.bossDead&&item.bossDeathBehavior==='CANCEL'){out.push({id:item.id,applied:false,reason:'BOSS_DEAD'});return false;}
    if(item.resolveAt>now)return true;
    if(context.cancel?.(item.cancelCondition,item)){out.push({id:item.id,applied:false,reason:'CANCEL_CONDITION'});return false;}
    out.push({id:item.id,applied:true,payload:item.payload});return false;
  });return out;
}
export function getEffectiveRule(base,modifiers=[],key){
  let value=base;for(const mod of [...modifiers].filter(x=>x.key===key).sort((a,b)=>(a.priority||0)-(b.priority||0)||String(a.augmentId).localeCompare(String(b.augmentId)))){
    if(mod.operation==='ADD')value+=mod.value;
    else if(mod.operation==='OVERRIDE'||mod.operation==='REPLACE')value=mod.value;
    else if(mod.operation==='CAP_CHANGE')value=Math.max(value,mod.value);
    else if(mod.operation==='MULTIPLY')value*=mod.value;
    else if(mod.operation==='UNLOCK')value=Boolean(value)||Boolean(mod.value);
    else unsupported();
  }return value;
}
export const CLASS_ADAPTERS=Object.freeze({gambler:['DRAW_CARD','MOVE_CARD_ZONE','VANISH_CARD','RETURN_TO_DECK','SHUFFLE_DETERMINISTIC'],gunner:['magazine','fullBurst','overheat','cooldown'],demon_swordsman:['devour','ghostSlash','transformation'],vampire:['thrall','blood','transfusion'],imp:['PRE_COLLISION_STEAL','mischief'],twins:['parity','acrobatics','recharge'],martial_artist:['combo','finisher']});
export function resolveClassAugmentHook(run,player,hook,base){
  if(!CLASS_ADAPTERS[player.characterId]?.includes(hook))unsupported();
  const modifiers=(state(run).temporary||[]).filter(mod=>mod.ownerId===player.playerId);
  return getEffectiveRule(base,modifiers,hook);
}
function grant(run,player,op,envelope){
  const s=state(run),id=op.applicationId||envelope.rootActionId+':'+op.type+':'+(op.sourceAugmentId||'fixture');
  if(s.grants[id])return {applied:false,reason:'DUPLICATE_GRANT'};
  const amount=integer(op.amount??0);if(amount==null)unsupported();
  if(op.type==='ADD_RUN_GOLD')player.runGold+=amount;
  else if(op.type==='ADD_EXP')player.growthExp+=amount;
  else if(op.type==='GRANT_RELIC'){
    const candidates=(op.candidateIds||[]).filter(relicId=>op.duplicatePolicy==='ALLOW'||!player.relics.includes(relicId));
    const relicId=op.relicId|| (candidates.length?choose(run,candidates,'augment-relic:'+id):null);
    if(!relicId)return {applied:false,reason:'NO_RELIC_CANDIDATE'};
    if(player.relics.includes(relicId)&&op.duplicatePolicy!=='ALLOW')return {applied:false,reason:'DUPLICATE_RELIC'};
    player.relics.push(relicId);
  }
  s.grants[id]={rootActionId:envelope.rootActionId,sourceAugmentId:op.sourceAugmentId||null};
  return {applied:true,resourceDelta:op.type==='GRANT_RELIC'?0:amount};
}
function operate(run,player,op,ctx,envelope){
  if(['APPLY_STATUS','ADD_STACK','SET_STACK','CONSUME_STACK','REMOVE_STATUS'].includes(op.type))return {applied:true,...applyStatus(run,player,op)};
  if(op.type==='RECOVER_CARD'){const result=recoverPhysicalCard(run,player,op.cardInstanceId,ctx);if(result.applied)dispatchAugmentTrigger(run,'ON_RECOVER_CARD',{player,privateState:ctx.privateState,rootActionId:result.rootActionId,parentEventId:result.parentEventId,recoveryChainId:result.recoveryChainId,chainDepth:result.chainDepth});return result;}
  if(op.type==='DRAW_CARD'){const result=drawPhysicalCard(run,player,ctx);if(result.applied)dispatchAugmentTrigger(run,'ON_DRAW',{player,privateState:ctx.privateState,rootActionId:envelope.rootActionId,parentEventId:envelope.eventId,chainDepth:(ctx.chainDepth||0)+1});return result;}
  if(['MOVE_CARD_ZONE','VANISH_CARD','RETURN_TO_DECK'].includes(op.type))return movePhysicalCard(player,op.cardInstanceId,op.from,op.to,ctx);
  if(op.type==='SHUFFLE_DETERMINISTIC'){const z=zones(player,ctx)?.[op.zone];if(!z)unsupported();for(let i=z.length-1;i>0;i--){const j=choose(run,Array.from({length:i+1},(_,n)=>n),'augment-shuffle:'+player.playerId+':'+i);[z[i],z[j]]=[z[j],z[i]];}return {applied:true};}
  if(['ADD_DAMAGE','SET_DAMAGE','MULTIPLY_DAMAGE','EXTRA_DAMAGE_COMPONENT'].includes(op.type))return applyDamageOperation(ctx.damage,op,roomType(run));
  if(op.type==='HEAL'||op.type==='SELF_DAMAGE'){
    const target=op.targetId?run.players.find(p=>p.playerId===op.targetId):player;if(!target)unsupported();
    const result=applyVitalOperation(target,op);
    if(result.actualAmount>0)dispatchAugmentTrigger(run,op.type==='HEAL'?'ON_HEAL':'ON_DAMAGE_TAKEN',{player:target,rootActionId:envelope.rootActionId,parentEventId:envelope.eventId,amount:result.actualAmount,damageType:op.damageType||'SELF',chainDepth:(ctx.chainDepth||0)+1});
    return result;
  }
  if(op.type==='SCHEDULE_EFFECT')return {applied:true,delayed:scheduleDelayed(run,op,envelope)};
  if(op.type==='RULE_MODIFIER'){state(run).temporary.push({...op,ownerId:player.playerId,augmentId:envelope.sourceId});return {applied:true};}
  if(['ADD_RUN_GOLD','ADD_EXP','GRANT_RELIC'].includes(op.type))return grant(run,player,op,envelope);
  unsupported();
}
function conditionMatches(condition,ctx){
  if(condition.all)return condition.all.every(item=>conditionMatches(item,ctx));
  if(condition.any)return condition.any.some(item=>conditionMatches(item,ctx));
  if(condition.not)return !conditionMatches(condition.not,ctx);
  const actual=String(condition.path||'').split('.').filter(Boolean).reduce((value,key)=>value?.[key],ctx);
  if(Object.hasOwn(condition,'eq'))return actual===condition.eq;
  if(Object.hasOwn(condition,'gte'))return Number(actual)>=Number(condition.gte);
  if(Object.hasOwn(condition,'gt'))return Number(actual)>Number(condition.gt);
  if(Object.hasOwn(condition,'lte'))return Number(actual)<=Number(condition.lte);
  if(Object.hasOwn(condition,'lt'))return Number(actual)<Number(condition.lt);
  return Boolean(actual);
}
export function dispatchAugmentTrigger(run,trigger,ctx={}){
  if((ctx.chainDepth||0)>=4){state(run).telemetry.push({trigger,applied:false,reason:'EFFECT_CHAIN_CEILING'});return [];}
  const canonical=trigger==='CARD_VALIDATED'&&ctx.resolved?.valid===false?'ON_INVALID':alias[trigger]||trigger;if(!AUGMENT_TRIGGERS.includes(canonical))return [];
  const catalog=run.frameworkEffects||{},players=ctx.player?[ctx.player]:run.players||[],results=[];
  for(const player of players){
    const owned=new Set(player.augments||[]);
    const defs=[...owned].flatMap(id=>catalog[id]||[]).filter(def=>def.trigger===canonical).sort((a,b)=>(a.priority||0)-(b.priority||0)||String(a.augmentId).localeCompare(String(b.augmentId))||String(a.id).localeCompare(String(b.id)));
    for(const def of defs){
      validateFrameworkEffect(def);
      const envelope=makeAugmentEnvelope(run,player,canonical,{...ctx,sourceId:def.augmentId});
      const base={augmentId:def.augmentId,trigger:canonical,eventId:envelope.eventId,roomType:roomType(run),applied:false,skipped:false,reason:null,stateChanges:[],telemetry:{}};
      if(canonical!=='ON_ACQUIRE'&&!roomAllowed(def,roomType(run))){base.skipped=true;base.reason='ROOM_NOT_APPLICABLE';results.push(base);continue;}
      const key=onceKey(run,player,def.augmentId,def.onceScope||'NONE',{...ctx,envelope});
      if(key&&state(run).once[key]){base.skipped=true;base.reason='ONCE_SCOPE_USED';results.push(base);continue;}
      if(def.condition&&!conditionMatches(def.condition,{run,player,...ctx})){base.skipped=true;base.reason='CONDITION_FALSE';results.push(base);continue;}
      for(const op of def.operations){const change=operate(run,player,op,{...ctx,envelope},envelope);base.stateChanges.push(change);if(change.applied)base.applied=true;}
      if(base.applied&&key)state(run).once[key]={augmentId:def.augmentId,playerId:player.playerId,scope:def.onceScope,scopeId:scopeId(run,player,def.onceScope,{...ctx,envelope})};
      base.skipped=!base.applied;base.reason=base.applied?null:(base.stateChanges[0]?.reason||'NO_CHANGE');
      base.telemetry={augmentId:def.augmentId,trigger:canonical,applied:base.applied,reason:base.reason,roomType:base.roomType,turn:run.combat?.turn??null,cycle:envelope.cycleId,amount:base.stateChanges.reduce((a,x)=>a+(x.actualAmount||x.amount||0),0)};
      state(run).telemetry.push(base.telemetry);results.push(base);
    }
  }
  return results;
}
export function acquireAugmentOnce(run,player,augmentId,{actionId=null}={}){
  if(!player.augments.includes(augmentId))throw new Error('AUGMENT_NOT_OWNED');
  const s=state(run),key=player.playerId+':'+augmentId;
  if(s.acquired[key])return {applied:false,reason:'ALREADY_ACQUIRED',marker:s.acquired[key]};
  const marker={augmentId,playerId:player.playerId,appliedAtActionId:actionId||'run:'+run.id+':version:'+run.version,appliedAtVersion:run.version};
  s.acquired[key]=marker;
  const effects=dispatchAugmentTrigger(run,'ON_ACQUIRE',{player,rootActionId:marker.appliedAtActionId});
  return {applied:true,marker,effects};
}
export function cleanupAugmentScope(run,scope){
  if(!RESET_SCOPES.includes(scope))unsupported();
  const s=state(run);
  s.statuses=s.statuses.filter(x=>x.resetScope!==scope);
  s.delayed=s.delayed.filter(x=>x.resetScope!==scope);
  s.temporary=s.temporary.filter(x=>x.resetScope!==scope);
  const onceScope='ONCE_PER_'+scope;
  for(const [key,value] of Object.entries(s.once))if(value.scope===onceScope)delete s.once[key];
}
export function projectAugmentFramework(run,viewerPlayerId){
  const s=run.augmentFramework;if(!s)return null;
  return {statuses:s.statuses.filter(x=>x.visibility==='PUBLIC'||x.visibility==='OWNER_PRIVATE'&&x.ownerId===viewerPlayerId).map(x=>structuredClone(x))};
}
