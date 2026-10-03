import {choose} from './rng.js';
import {IMP_CONTRACTS,IMP_CONTRACT_IDS} from './imp-contracts.js';

const roomType=run=>run.phase==='COMBAT'?'COMBAT':run.phase==='EVENT'?'EVENT':run.phase==='REWARD_ROOM'?'REWARD':run.phase==='SHOP'?'SHOP':run.phase==='REST'?'REST':null;
const byId=(run,id)=>run.players.find(p=>p.playerId===id)||null;
const cardByPlayer=(cards,id)=>cards.find(c=>c.playerId===id)||null;
const turn=run=>Number(run.combat?.turn||run.roomState?.turn||run.roomState?.attempt||1);
const cycle=(run,p)=>Number(run.combat?.privateByPlayer?.[p.playerId]?.cycleIndex||run.roomState?.privateByPlayer?.[p.playerId]?.cycleIndex||1);
const owned=(p,id)=>p?.augments?.includes(id);
const root=run=>{
  run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};
  return run.augmentFramework.imp||=( {state:{},once:{},mischief:{},buffs:[],telemetry:[],processedRoots:{}} );
};
export function scopedImpState(run,p){
  const r=root(run);return r.state[p.playerId]||=( {greed:0,markedThisTurn:[],mischiefValidTurn:[],excitement:0} );
}
export function impRoomAllowed(run,id){
  const c=IMP_CONTRACTS[id],rt=roomType(run);return Boolean(c&&rt&&c.roomApplicability?.[rt]);
}
const scopeKey=(run,p,scope,tag='')=>{
  const t=turn(run),cy=cycle(run,p),combat=run.combat?.id||'none',room=run.currentRoomNodeId||run.roomState?.id||combat;
  if(scope==='ONCE_PER_TURN')return `${p.playerId}:T:${combat}:${t}:${tag}`;
  if(scope==='ONCE_PER_CYCLE')return `${p.playerId}:C:${combat}:${cy}:${tag}`;
  if(scope==='ONCE_PER_COMBAT')return `${p.playerId}:B:${combat}:${tag}`;
  if(scope==='ONCE_PER_ROOM')return `${p.playerId}:R:${room}:${tag}`;
  if(scope==='ONCE_PER_FLOOR')return `${p.playerId}:F:${run.floor||1}:${tag}`;
  if(scope==='ONCE_PER_RUN')return `${p.playerId}:RUN:${run.id}:${tag}`;
  return null;
};
function claim(run,p,id,tag='effect',overrideScope=null){
  const scope=overrideScope||IMP_CONTRACTS[id]?.onceScope;
  if(!scope||scope==='NONE')return true;
  const key=scopeKey(run,p,scope,`${id}:${tag}`),r=root(run);
  if(r.once[key])return false;r.once[key]=true;return true;
}
function telemetry(run,id,trigger,success=true,extra={}){
  const row={augmentId:id,trigger,triggerCount:1,successCount:success?1:0,turn:turn(run),combatId:run.combat?.id||null,...extra};
  const r=root(run),f=run.augmentFramework;
  r.telemetry.push(row);if(r.telemetry.length>2048)r.telemetry.splice(0,r.telemetry.length-2048);
  f.telemetry||=[];f.telemetry.push({...row,classId:'imp'});if(f.telemetry.length>2048)f.telemetry.splice(0,f.telemetry.length-2048);
  f.telemetryTotals||={};const total=f.telemetryTotals[id+':'+trigger]||={augmentId:id,trigger,triggerCount:0,successCount:0};total.triggerCount++;if(success)total.successCount++;
}
export function impTelemetry(run,id){return root(run).telemetry.filter(x=>!id||x.augmentId===id);}
export function stolenNumberCap(p){return owned(p,'aug-198')?7:owned(p,'aug-192')?5:3;}
function clampStored(p){p.publicResources.stolenNumber=Math.max(0,Math.min(stolenNumberCap(p),Number(p.publicResources.stolenNumber)||0));return p.publicResources.stolenNumber;}
function addStored(p,amount){const before=clampStored(p),after=Math.min(stolenNumberCap(p),before+Math.max(0,Number(amount)||0));p.publicResources.stolenNumber=after;return after-before;}
function markKey(ownerId,targetId){return ownerId+':'+targetId;}
function addBuff(run,{sourceAugmentId,ownerId,targetId,amount,validFromTurn=turn(run),expiryTurn=null,validFromCycle=null,expiryCycle=null,requiresStoredSpend=false}){
  root(run).buffs.push({sourceAugmentId,ownerId,targetId,amount,uses:1,validFromTurn,expiryTurn,validFromCycle,expiryCycle,requiresStoredSpend,combatId:run.combat?.id||null});
}
function consumeBuffs(run,p,resolved){
  const r=root(run),t=turn(run),cy=cycle(run,p);let total=0;
  for(const b of r.buffs){
    if(b.uses<=0||b.targetId!==p.playerId)continue;
    if(b.combatId&&b.combatId!==run.combat?.id)continue;
    if(b.validFromTurn!=null&&t<b.validFromTurn)continue;
    if(b.expiryTurn!=null&&t>b.expiryTurn)continue;
    if(b.validFromCycle!=null&&cy<b.validFromCycle)continue;
    if(b.expiryCycle!=null&&cy>b.expiryCycle)continue;
    if(b.requiresStoredSpend&&!(Number(resolved.stolenNumberSpent)>0))continue;
    total+=Number(b.amount)||0;b.uses=0;telemetry(run,b.sourceAugmentId,'BUFF_CONSUMED',true,{bonusDamage:b.amount});
  }
  r.buffs=r.buffs.filter(b=>b.uses>0);return total;
}
export function initializeImpCombat(run,p){
  if(p.characterId!=='imp')return;
  scopedImpState(run,p);
  if(owned(p,'aug-198')&&impRoomAllowed(run,'aug-198')){p.publicResources.stolenNumber=Math.max(1,Number(p.publicResources.stolenNumber)||0);clampStored(p);telemetry(run,'aug-198','COMBAT_START',true,{stolenNumber:p.publicResources.stolenNumber});}
}
export function prepareImpSubmission(run,p,skillData=null){
  if(p.characterId!=='imp')return {spent:0};
  const priv=run.combat?.privateByPlayer?.[p.playerId]||run.roomState?.privateByPlayer?.[p.playerId];
  const data=skillData||{};let spent=0;
  if(owned(p,'aug-191')&&impRoomAllowed(run,'aug-191')){
    const have=clampStored(p),requested=Math.max(0,Number(data.stolen_number_spend??data.impSpend)||0);
    const maxSpend=owned(p,'aug-193')?have:Math.min(2,have);
    if(!Number.isInteger(requested)||requested>maxSpend)throw new Error('INVALID_STOLEN_NUMBER_SPEND');
    p.publicResources.stolenNumber=have-requested;spent=requested;
    telemetry(run,'aug-191','PRE_SELECT',requested>0,{stolenNumberSpent:requested,stolenNumberRemaining:p.publicResources.stolenNumber});
    if(owned(p,'aug-193')&&impRoomAllowed(run,'aug-193'))telemetry(run,'aug-193','PRE_SELECT',requested>2,{stolenNumberSpent:requested});
  }
  let tradeMode=null;
  if(owned(p,'aug-195')&&impRoomAllowed(run,'aug-195')&&data.impTradeMode!=null){
    tradeMode=String(data.impTradeMode).toUpperCase();if(!['ATTACK','DEFENSE'].includes(tradeMode))throw new Error('INVALID_IMP_TRADE_MODE');
    const have=clampStored(p);if(have<2)throw new Error('INSUFFICIENT_STOLEN_NUMBER');
    if(!claim(run,p,'aug-195','choice'))throw new Error('AUGMENT_ONCE_PER_TURN_CONSUMED');
    p.publicResources.stolenNumber=have-2;
    if(tradeMode==='ATTACK')addBuff(run,{sourceAugmentId:'aug-195',ownerId:p.playerId,targetId:p.playerId,amount:2,validFromTurn:turn(run)});
    else scopedImpState(run,p).directReduction=(scopedImpState(run,p).directReduction||0)+1;
    telemetry(run,'aug-195','PRE_SELECT',true,{mode:tradeMode,cost:2});
  }
  if(priv)priv.impSubmission={turn:turn(run),spent,tradeMode};
  return {spent,tradeMode};
}
export function modifyImpIncomingDamage(run,p,incomingDamage,damageType,rootActionId=''){
  if(p.characterId!=='imp'||damageType!=='DIRECT'||!incomingDamage)return 0;
  const s=scopedImpState(run,p);if(!(s.directReduction>0))return 0;
  const key='incoming:'+rootActionId;if(rootActionId&&root(run).processedRoots[key])return 0;
  const before=Math.max(0,Number(incomingDamage.amount)||0),reduced=Math.min(1,before);
  incomingDamage.amount=before-reduced;if(reduced){s.directReduction-=1;if(rootActionId)root(run).processedRoots[key]=true;telemetry(run,'aug-195','ON_DAMAGE_TAKEN',true,{preventedDamage:reduced});}
  return reduced;
}
function applyMischiefOnSteal(run,owner,target,rootActionId,events){
  if(!owned(owner,'aug-201')||!impRoomAllowed(run,'aug-201'))return;
  const r=root(run),key=markKey(owner.playerId,target.playerId),existing=r.mischief[key],t=turn(run);
  if(existing&&existing.expiryTurn>=t){
    delete r.mischief[key];
    const dangerous=owned(owner,'aug-209')&&impRoomAllowed(run,'aug-209');
    let amount=dangerous?2:1,prevented=false;
    if(dangerous)telemetry(run,'aug-209','PRE_DAMAGE',true,{bonusDamage:amount,mode:'REPEAT_EXPLOSION'});
    if(owned(owner,'aug-203')&&impRoomAllowed(run,'aug-203')&&claim(run,owner,'aug-203','explosion')){amount=0;prevented=true;telemetry(run,'aug-203','PRE_DAMAGE',true,{protectionApplied:1,targetPlayerId:target.playerId});}
    if(amount>0&&target.status!=='DOWNED'){
      target.hp-=amount;run.combat.pendingDownPlayerIds||=[];if(target.hp<=0&&!run.combat.pendingDownPlayerIds.includes(target.playerId))run.combat.pendingDownPlayerIds.push(target.playerId);
      events.push({type:'IMP_MISCHIEF_EXPLOSION',phase:'PRE_COLLISION_STEAL',sourcePlayerId:owner.playerId,sourceAugmentId:'aug-201',targetPlayerId:target.playerId,amount,rootActionId,chainDepth:1});
      if(owned(owner,'aug-206')&&impRoomAllowed(run,'aug-206')){const ok=claim(run,owner,'aug-206','explosion');telemetry(run,'aug-206','PRE_DAMAGE',ok,{bonusDamage:ok?1:0});if(ok)addBuff(run,{sourceAugmentId:'aug-206',ownerId:owner.playerId,targetId:owner.playerId,amount:1});}
    }else if(prevented)events.push({type:'IMP_MISCHIEF_EXPLOSION_PREVENTED',sourcePlayerId:owner.playerId,targetPlayerId:target.playerId,rootActionId});
    telemetry(run,'aug-201','MISCHIEF_REPEAT_STEAL',true,{mischiefConsumed:1,bonusDamage:amount});
    return;
  }
  const dangerous=owned(owner,'aug-209')&&impRoomAllowed(run,'aug-209'),fun=owned(owner,'aug-202')&&impRoomAllowed(run,'aug-202');
  const bonus=dangerous?5:2+(fun?1:0)+Math.max(0,Number(scopedImpState(run,owner).excitement)||0);
  if(fun)telemetry(run,'aug-202','PRE_COLLISION',true,{bonusDamage:1});
  if(dangerous)telemetry(run,'aug-209','PRE_COLLISION',true,{bonusDamage:5,mode:'MISCHIEF_BUFF'});
  r.mischief[key]={ownerId:owner.playerId,targetId:target.playerId,sourceAugmentId:'aug-201',appliedTurn:t,validFromTurn:t+1,expiryTurn:t+1,bonusDamage:bonus,weak:false,rootActionId};
  const s=scopedImpState(run,owner);if(!s.markedThisTurn.includes(target.playerId))s.markedThisTurn.push(target.playerId);
  telemetry(run,'aug-201','PRE_COLLISION_STEAL',true,{mischiefGained:1,targetPlayerId:target.playerId});
  if(owned(owner,'aug-204')&&impRoomAllowed(run,'aug-204')){const ok=s.markedThisTurn.length>=2&&claim(run,owner,'aug-204','multi');telemetry(run,'aug-204','PRE_DAMAGE',ok,{distinctMarkedAllies:s.markedThisTurn.length,bonusDamage:ok?1:0});if(ok)addBuff(run,{sourceAugmentId:'aug-204',ownerId:owner.playerId,targetId:owner.playerId,amount:1});}
}
export function applyImpPreCollisionSteal(run,cards,events=[]){
  const imps=run.players.filter(p=>p.characterId==='imp'&&p.status!=='DOWNED'&&cardByPlayer(cards,p.playerId)).sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
  for(const imp of imps){
    const actor=cardByPlayer(cards,imp.playerId),priv=run.combat?.privateByPlayer?.[imp.playerId]||run.roomState?.privateByPlayer?.[imp.playerId],pending=priv?.impSubmission?.turn===turn(run)?priv.impSubmission:{spent:0};
    const rootActionId=`steal:${run.combat?.id||run.currentRoomNodeId||run.roomState?.id||run.id}:${turn(run)}:${imp.playerId}`;
    if(root(run).processedRoots[rootActionId])continue;
    root(run).processedRoots[rootActionId]=true;
    actor.stolenNumberSpent=Math.max(0,Number(pending?.spent)||0);actor.workingNumber+=actor.stolenNumberSpent;
    const actorStart=actor.workingNumber;
    const eligible=cards.filter(card=>card.playerId!==imp.playerId&&byId(run,card.playerId)?.characterId!=='imp'&&byId(run,card.playerId)?.status!=='DOWNED'&&card.workingNumber===actorStart)
      .sort((a,b)=>(byId(run,a.playerId)?.seat??999)-(byId(run,b.playerId)?.seat??999)||a.playerId.localeCompare(b.playerId));
    let total=0;const victimIds=[],lowVictimIds=[];actor.stealEvents=[];
    for(const targetCard of eligible){
      const victim=byId(run,targetCard.playerId),before=targetCard.workingNumber,requested=1,actual=Math.min(requested,Math.max(0,before));
      const ev={phase:'PRE_COLLISION_STEAL',effectId:'imp-steal',sourcePlayerId:imp.playerId,sourceAugmentId:'IMP_BASE',actorId:imp.playerId,victimPlayerId:victim.playerId,targetId:victim.playerId,requestedAmount:requested,actualAmount:actual,stolen:actual,before,rootActionId,chainDepth:0};
      if(actual>0){targetCard.workingNumber=Math.max(0,before-actual);ev.after=targetCard.workingNumber;total+=actual;victimIds.push(victim.playerId);if(before===1||before===2)lowVictimIds.push(victim.playerId);actor.stealEvents.push(ev);events.push(ev);applyMischiefOnSteal(run,imp,victim,rootActionId,events);}
      else {ev.after=before;events.push(ev);}
    }
    const storageMode=owned(imp,'aug-191')&&impRoomAllowed(run,'aug-191');
    if(storageMode){actor.storedThisSteal=addStored(imp,total);telemetry(run,'aug-191','PRE_COLLISION',actor.storedThisSteal>0,{actualStolenAmount:total,storedAmount:actor.storedThisSteal});if(owned(imp,'aug-192')&&impRoomAllowed(run,'aug-192'))telemetry(run,'aug-192','PRE_COLLISION',actor.storedThisSteal>0,{cap:5,storedAmount:actor.storedThisSteal});}else actor.workingNumber=actorStart+total;
    actor.stealTotal=total;actor.stealTargets=[...new Set(victimIds)];actor.stealTargetCount=actor.stealTargets.length;actor.lowStealVictimCount=new Set(lowVictimIds).size;
    imp.publicResources.greed=total;
    if(total>0){
      events.push({phase:'PRE_COLLISION_STEAL',effectId:'imp-steal-summary',sourcePlayerId:imp.playerId,sourceAugmentId:'IMP_BASE',actorId:imp.playerId,before:actorStart,after:actor.workingNumber,totalActuallyStolen:total,distinctVictimCount:actor.stealTargetCount,targetIds:[...actor.stealTargets],rootActionId});
      if(owned(imp,'aug-189')&&impRoomAllowed(run,'aug-189')){const s=scopedImpState(run,imp);s.greed=Math.min(4,(s.greed||0)+1);telemetry(run,'aug-189','PRE_COLLISION',true,{stack:s.greed});}
      if(owned(imp,'aug-188')&&impRoomAllowed(run,'aug-188')){const ok=actor.stealTargetCount>=2&&actor.stealTargetCount===eligible.length&&claim(run,imp,'aug-188','sweep');telemetry(run,'aug-188','PRE_COLLISION',ok,{distinctVictims:actor.stealTargetCount,bonusDamage:ok?3:0});if(ok){for(const p of run.players.filter(x=>x.status!=='DOWNED'))addBuff(run,{sourceAugmentId:'aug-188',ownerId:imp.playerId,targetId:p.playerId,amount:3});}}
    }

  }
  for(const card of cards){card.finalNumber=card.workingNumber;if(card.numberHistory)card.numberHistory.postStealNumber=card.workingNumber;}
  return cards;
}
function spreadWeakMischief(run,owner,excludeTargetId,rootActionId){
  if(!owned(owner,'aug-207')||!impRoomAllowed(run,'aug-207')||!claim(run,owner,'aug-207','spread'))return null;
  const r=root(run),candidates=run.players.filter(p=>p.status!=='DOWNED'&&p.playerId!==excludeTargetId&&!r.mischief[markKey(owner.playerId,p.playerId)]);
  if(!candidates.length)return null;
  const target=choose(run,candidates.sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId)),`imp-mischief-spread:${run.combat?.id}:${turn(run)}:${owner.playerId}`);
  r.mischief[markKey(owner.playerId,target.playerId)]={ownerId:owner.playerId,targetId:target.playerId,sourceAugmentId:'aug-207',appliedTurn:turn(run),validFromTurn:turn(run)+1,expiryTurn:turn(run)+1,bonusDamage:1,weak:true,rootActionId};
  telemetry(run,'aug-207','ON_VALID',true,{mischiefGained:1,targetPlayerId:target.playerId});return target;
}
export function applyImpCardValidated(run,{player,resolved,cards=[],events=[]}={}){
  if(!player||!resolved?.valid)return 0;
  let bonus=0;const r=root(run),t=turn(run);
  // Consume Mischief owned by any living Imp. Each owner is independent.
  for(const [key,m] of Object.entries({...r.mischief})){
    if(m.targetId!==player.playerId||t<m.validFromTurn||t>m.expiryTurn)continue;
    const owner=byId(run,m.ownerId);if(!owner||owner.status==='DOWNED'){delete r.mischief[key];continue;}
    bonus+=Number(m.bonusDamage)||0;delete r.mischief[key];
    telemetry(run,m.sourceAugmentId||'aug-201','ON_VALID',true,{mischiefConsumed:1,bonusDamage:m.bonusDamage,targetPlayerId:player.playerId});
    if(owned(owner,'aug-205')&&impRoomAllowed(run,'aug-205')){const ok=resolved.finalNumber>=4&&claim(run,owner,'aug-205','marked-valid');telemetry(run,'aug-205','ON_VALID',ok,{bonusDamage:ok?2:0,finalNumber:resolved.finalNumber});if(ok)bonus+=2;}
    if(owned(owner,'aug-210')&&impRoomAllowed(run,'aug-210')){const s=scopedImpState(run,owner);s.excitement=Math.min(4,(s.excitement||0)+1);telemetry(run,'aug-210','ON_VALID',true,{stack:s.excitement});}
    spreadWeakMischief(run,owner,player.playerId,`mischief:${run.combat?.id}:${t}:${player.playerId}`);
    const s=scopedImpState(run,owner);if(!s.mischiefValidTurn.includes(player.playerId))s.mischiefValidTurn.push(player.playerId);
    if(owned(owner,'aug-208')&&impRoomAllowed(run,'aug-208')){const ok=s.mischiefValidTurn.length>=2&&claim(run,owner,'aug-208','riot');telemetry(run,'aug-208','ON_VALID',ok,{validMarkedPlayers:s.mischiefValidTurn.length,bonusDamage:ok?2:0});if(ok){for(const p of run.players.filter(x=>x.status!=='DOWNED'))addBuff(run,{sourceAugmentId:'aug-208',ownerId:owner.playerId,targetId:p.playerId,amount:2});}}
  }
  bonus+=consumeBuffs(run,player,resolved);
  if(player.characterId==='imp'){
    const s=scopedImpState(run,player);
    if((resolved.stealTotal||0)>0){
      if(owned(player,'aug-183')&&impRoomAllowed(run,'aug-183')){const ok=claim(run,player,'aug-183','next-turn');telemetry(run,'aug-183','ON_VALID',ok,{bonusDamage:ok?1:0});if(ok)addBuff(run,{sourceAugmentId:'aug-183',ownerId:player.playerId,targetId:player.playerId,amount:1,validFromTurn:t+1,expiryTurn:t+1});}
      if(owned(player,'aug-187')&&impRoomAllowed(run,'aug-187')){const ok=claim(run,player,'aug-187','next-cycle');telemetry(run,'aug-187','ON_VALID',ok,{bonusDamage:ok?2:0});if(ok){const c=cycle(run,player)+1;addBuff(run,{sourceAugmentId:'aug-187',ownerId:player.playerId,targetId:player.playerId,amount:2,validFromCycle:c,expiryCycle:c});}}
    }
    if(owned(player,'aug-196')&&impRoomAllowed(run,'aug-196')){const ok=Number(resolved.stolenNumberSpent)>=2&&claim(run,player,'aug-196','refund');telemetry(run,'aug-196','ON_VALID',ok,{stolenNumberRefund:ok?1:0});if(ok)addStored(player,1);}
    if(owned(player,'aug-200')&&impRoomAllowed(run,'aug-200')){const refund=Math.min(2,Math.floor(Number(resolved.stolenNumberSpent)/2));telemetry(run,'aug-200','ON_VALID',refund>0,{stolenNumberRefund:refund});if(refund)addStored(player,refund);}
    bonus+=Math.max(0,Number(s.excitement)||0);
  }
  if(bonus>0){resolved.impRuntimeBonus=(resolved.impRuntimeBonus||0)+bonus;}
  return bonus;
}
export function applyImpBeforeDamage(run,{player,resolved,damage,followUp=false}={}){
  if(!player||!resolved?.valid||followUp)return 0;let bonus=0;
  if(player.characterId==='imp'){
    const d=Number(resolved.stealTargetCount)||0,total=Number(resolved.stealTotal)||0;
    const rule=(id,condition,amount,extra={})=>{if(!owned(player,id)||!impRoomAllowed(run,id))return;const ok=Boolean(condition)&&claim(run,player,id,'damage');const value=ok?(typeof amount==='function'?amount():amount):0;telemetry(run,id,'PRE_DAMAGE',ok,{bonusDamage:value,...extra});if(ok)bonus+=value;};
    rule('aug-181',d>=2,2,{distinctVictims:d,actualStolenAmount:total});
    rule('aug-182',d>=2,2,{distinctVictims:d});
    rule('aug-184',Number(resolved.lowStealVictimCount)>0,1,{lowVictims:Number(resolved.lowStealVictimCount)||0});
    rule('aug-185',total>=2,2,{actualStolenAmount:total});
    rule('aug-186',resolved.finalNumber>=5,2,{finalNumber:resolved.finalNumber});
    rule('aug-190',total>=2,()=>Math.min(3,Math.floor(resolved.finalNumber/2)),{actualStolenAmount:total,finalNumber:resolved.finalNumber});
    rule('aug-197',Number(resolved.stolenNumberSpent)>=3,2,{stolenNumberSpent:Number(resolved.stolenNumberSpent)||0});
    rule('aug-199',Number(resolved.stolenNumberSpent)>=4,4,{stolenNumberSpent:Number(resolved.stolenNumberSpent)||0});
    if(owned(player,'aug-189')&&impRoomAllowed(run,'aug-189'))bonus+=Math.max(0,Number(scopedImpState(run,player).greed)||0);
  }
  bonus+=Math.max(0,Number(resolved.impRuntimeBonus)||0);
  if(bonus>0&&damage){damage.amount=Math.max(0,Number(damage.amount)||0)+bonus;resolved.impModifierIds=[...(resolved.impModifierIds||[]),'IMP_V02'];}
  return bonus;
}
export function onImpTurnEnd(run,p){
  if(p.characterId!=='imp')return;
  const s=scopedImpState(run,p);
  if(owned(p,'aug-194')&&impRoomAllowed(run,'aug-194')){const ok=clampStored(p)>=3;telemetry(run,'aug-194','TURN_END',ok,{storedNumber:p.publicResources.stolenNumber,bonusDamage:ok?2:0});if(ok)addBuff(run,{sourceAugmentId:'aug-194',ownerId:p.playerId,targetId:p.playerId,amount:2,validFromTurn:turn(run)+1,expiryTurn:turn(run)+1,requiresStoredSpend:true});}
  s.markedThisTurn=[];s.mischiefValidTurn=[];
  const t=turn(run),r=root(run);for(const [k,m] of Object.entries(r.mischief))if(m.ownerId===p.playerId&&m.expiryTurn<t)delete r.mischief[k];
  delete r.processedRoots[`steal:${run.combat?.id||run.currentRoomNodeId||run.roomState?.id||run.id}:${t}:${p.playerId}`];
}
export function cleanupImpRoom(run){
  const r=root(run),roomId=run.currentRoomNodeId||run.roomState?.id||null;
  if(!roomId)return;
  for(const k of Object.keys(r.processedRoots))if(k.includes(':'+roomId+':'))delete r.processedRoots[k];
  r.buffs=r.buffs.filter(b=>b.combatId!=null);
  for(const k of Object.keys(r.mischief))if(!r.mischief[k].combatId)delete r.mischief[k];
}
export function cleanupImpCombat(run,p){
  if(p.characterId!=='imp')return;const r=root(run),combatId=run.combat?.id;
  for(const k of Object.keys(r.mischief))if(r.mischief[k].ownerId===p.playerId||r.mischief[k].combatId===combatId)delete r.mischief[k];
  r.buffs=r.buffs.filter(b=>b.ownerId!==p.playerId&&b.combatId!==combatId);
  delete r.state[p.playerId];
  for(const k of Object.keys(r.once))if(k.includes(p.playerId+':B:'+combatId)||k.includes(p.playerId+':T:'+combatId)||k.includes(p.playerId+':C:'+combatId))delete r.once[k];
  for(const k of Object.keys(r.processedRoots))if(k.includes(combatId)||k.startsWith('incoming:'))delete r.processedRoots[k];
}
export function assertImpHandler(id){if(!IMP_CONTRACTS[id]||!IMP_HANDLER_IDS.includes(id))throw new Error('MISSING_IMP_HANDLER:'+id);}
export const IMP_HANDLER_IDS=Object.freeze([...IMP_CONTRACT_IDS]);
