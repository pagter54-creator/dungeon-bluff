import {choose} from './rng.js';
import {onceKey,recoverPhysicalCard,grantAugmentExp} from './augment-framework.js';
import {resourceMax} from './resources.js';
import {SEER_CONTRACTS,SEER_CONTRACT_IDS} from './seer-contracts.js';

const framework=run=>(run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0});
const root=run=>{
  const f=framework(run);
  f.cardState||={};
  return f.seer||=( {recoveredCards:{},buffs:[],applied:{},sequence:0} );
};
export function scopedSeerState(run,player){
  const f=framework(run);f.cardState||={};
  const defaults={
    resetScope:'COMBAT',ownerId:player.playerId,turnStartRevelation:0,
    activationTurn:null,activationSerial:0,activationResolvedTurn:null,
    foresight:0,foresightStreak:0,prediction:null,predictionSuccessTypes:[],
    repeatedRecoveredNumbers:{},sharedForesight:0
  };
  const s=f.cardState[player.playerId+':seer']||=structuredClone(defaults);
  for(const [key,value] of Object.entries(defaults))if(s[key]==null)s[key]=structuredClone(value);
  return s;
}
const owned=(p,id)=>Boolean(p?.augments?.includes(id));
const inSeerRange=id=>/^aug-(15[1-9]|16\d|17\d|180)$/.test(String(id||''));
const roomType=run=>run.phase==='COMBAT'?'COMBAT':run.phase==='EVENT'?'EVENT':run.phase==='REWARD_ROOM'?'REWARD':run.phase==='SHOP'?'SHOP':run.phase==='REST'?'REST':null;
const roomAllowed=(run,id)=>Boolean(SEER_CONTRACTS[id]?.roomApplicability?.[roomType(run)]);
const playerById=(run,id)=>run.players.find(p=>p.playerId===id)||null;
const privateFor=(run,p)=>run.combat?.privateByPlayer?.[p.playerId]||run.roomState?.privateByPlayer?.[p.playerId]||null;
const currentTurn=run=>Number(run.combat?.turn??run.roomState?.attempt??run.roomState?.turn??0)||0;
const currentCycle=(run,p)=>Number(privateFor(run,p)?.cycleIndex)||1;
const actionRoot=(run,p,ctx={},suffix='effect')=>ctx.rootActionId||`action:${run.combat?.id||run.currentRoomNodeId||run.id}:${currentTurn(run)}:${p.playerId}:${ctx.resolved?.cardInstanceId||ctx.cardInstanceId||suffix}`;

function telemetry(run,id,trigger,success,metrics={}){
  const f=framework(run),row={augmentId:id,trigger,triggerCount:1,successCount:success?1:0,...metrics};
  f.telemetry.push(row);if(f.telemetry.length>2048)f.telemetry.splice(0,f.telemetry.length-2048);
  f.telemetryTotals||={};const total=f.telemetryTotals[id+':'+trigger]||={augmentId:id,trigger,triggerCount:0,successCount:0};total.triggerCount++;if(success)total.successCount++;
}
function customClaim(run,p,id,key){
  const r=root(run),token=p.playerId+':'+id+':'+key;
  if(r.applied[token])return false;
  r.applied[token]=true;return true;
}
function claim(run,p,id,scope,ctx={},component=''){
  if(scope==='NONE'||scope==null)return customClaim(run,p,id,actionRoot(run,p,ctx)+':'+component);
  if(scope==='ONCE_PER_REVELATION_USE')return customClaim(run,p,id,'revelation:'+String(ctx.revelationSerial??scopedSeerState(run,p).activationSerial)+':'+component);
  if(scope==='ONCE_PER_PREDICTION')return customClaim(run,p,id,'prediction:'+String(ctx.predictionId??scopedSeerState(run,p).prediction?.id??'none')+':'+component);
  if(scope==='ONCE_PER_SHUFFLE'||scope==='ONCE_PER_BURST')return customClaim(run,p,id,scope+':'+actionRoot(run,p,ctx)+':'+component);
  if(typeof scope==='object')return customClaim(run,p,id,actionRoot(run,p,ctx)+':'+component);
  const f=framework(run),key=onceKey(run,p,id+':seer:'+component,scope,ctx);
  if(key&&f.once[key])return false;
  if(key)f.once[key]={scope,playerId:p.playerId,augmentId:id,component};
  return true;
}
function gainRevelation(run,p,amount,id,ctx={},reason='AUGMENT'){
  const before=Math.max(0,Number(p.publicResources.revelation)||0);
  const max=resourceMax(p,'revelation',3);
  const after=Math.min(max,before+Math.max(0,Number(amount)||0));
  p.publicResources.revelation=after;
  const gained=after-before;
  telemetry(run,id,'REVELATION_GAIN',gained>0,{revelationGained:gained,reason});
  if(gained>0)ctx.events?.push({type:'REVELATION_GAINED',playerId:p.playerId,before,after,amount:gained,reason,sourceAugmentId:id});
  return gained;
}
function addDamage(ctx,amount,id){
  if(!ctx.damage||!Number.isFinite(ctx.damage.amount)||!(amount>0))return false;
  ctx.damage.amount+=amount;
  ctx.resolved&&(ctx.resolved.seerModifierIds||=[]).push(id);
  return true;
}
function sortRemaining(target,priv){
  const order=new Map((target.cardPool||[]).map((c,i)=>[c.id,i]));
  priv.remainingCardIds.sort((a,b)=>(order.get(a)??999)-(order.get(b)??999)||String(a).localeCompare(String(b)));
}
function eligibleSpent(run,target){
  const priv=privateFor(run,target);if(!priv)return [];
  const submitted=(run.combat||run.roomState)?.turnSubmissions?.[target.playerId]?.cardInstanceId||null;
  const selected=priv.selectedCardId||null;
  return (priv.spentCardIds||[]).map((id,index)=>({id,index,card:target.cardPool.find(c=>c.id===id)})).filter(x=>
    x.card?.source==='BASE'&&x.id!==submitted&&x.id!==selected&&!(x.card.tags||[]).some(tag=>['TEMPORARY','TRANSFORMED','SPECIAL'].includes(tag))&&!(priv.remainingCardIds||[]).includes(x.id)
  ).sort((a,b)=>b.index-a.index||String(a.id).localeCompare(String(b.id))).map(x=>x.id);
}
function seededCandidates(run,owner,target,ids,count,label){
  const pool=[...ids],out=[];
  while(pool.length&&out.length<count){
    const id=choose(run,pool,`seer-selector:${run.floor}:${run.depth}:${run.currentRoomNodeId||run.combat?.id||'room'}:${currentTurn(run)}:${owner.playerId}:${target.playerId}:${label}:${out.length}`);
    out.push(id);pool.splice(pool.indexOf(id),1);
  }
  return out;
}
function selectRecoveryCard(run,owner,target,ids,skillData={},mode='BASE'){
  if(!ids.length)return {cardId:null,candidates:[]};
  let candidates=[...ids];
  const direct=String(skillData?.recover_card_id||skillData?.recoverCardId||skillData?.ally_recover_card_id||skillData?.allyRecoverCardId||'');
  if(mode==='SELF'&&owned(owner,'aug-152'))candidates=seededCandidates(run,owner,target,ids,2,'aug-152');
  if(mode==='ALLY'&&(owned(owner,'aug-162')||owned(owner,'aug-169')))candidates=seededCandidates(run,owner,target,ids,2,owned(owner,'aug-169')?'aug-169':'aug-162');
  const selectorEnabled=mode==='SELF'?(owned(owner,'aug-152')||owned(owner,'aug-158')):(owned(owner,'aug-162')||owned(owner,'aug-169'));
  if(selectorEnabled&&direct&&candidates.includes(direct))return {cardId:direct,candidates};
  if(mode==='SELF'&&owned(owner,'aug-158')&&direct&&ids.includes(direct))return {cardId:direct,candidates:ids};
  return {cardId:candidates[0],candidates};
}
function provenance(run,cardId){return root(run).recoveredCards[cardId]||null;}
function buff(run,{sourceAugmentId,ownerId,targetId,amount,validFromTurn=currentTurn(run),expiryTurn=null,uses=1}){
  root(run).buffs.push({id:`seer-buff:${++root(run).sequence}`,sourceAugmentId,ownerId,targetId,amount,validFromTurn,expiryTurn,uses,combatId:run.combat?.id||null});
}
function applyGlobalBuffs(run,ctx){
  if(!ctx.player||!ctx.damage||!ctx.resolved?.valid)return [];
  const r=root(run),turn=currentTurn(run),combatId=run.combat?.id||null,out=[];
  for(const item of r.buffs){
    if(item.uses<=0||item.targetId!==ctx.player.playerId||item.validFromTurn>turn||item.combatId&&item.combatId!==combatId||!roomAllowed(run,item.sourceAugmentId))continue;
    if(item.expiryTurn!=null&&turn>item.expiryTurn){item.uses=0;continue;}
    if(addDamage(ctx,item.amount,item.sourceAugmentId)){
      item.uses--;telemetry(run,item.sourceAugmentId,'PRE_DAMAGE',true,{bonusDamage:item.amount});
      out.push({augmentId:item.sourceAugmentId,applied:true,bonusDamage:item.amount});
    }
  }
  r.buffs=r.buffs.filter(x=>x.uses>0&&(x.expiryTurn==null||turn<=x.expiryTurn)&&(x.combatId==null||x.combatId===combatId));
  return out;
}

export function recoverSeerPhysicalCard(run,owner,target,cardId,{sourceAugmentId='SEER_BASE_REVELATION',rootActionId=null,chainDepth=0,recoveryMode='SELF',skillData=null}={}){
  const priv=privateFor(run,target);if(!priv)return {applied:false,reason:'PRIVATE_STATE_MISSING'};
  const eligible=eligibleSpent(run,target);
  if(!eligible.includes(cardId))return {applied:false,reason:'CARD_NOT_ELIGIBLE'};
  const rootId=rootActionId||`skill:${run.combat?.id||run.id}:${currentTurn(run)}:${owner.playerId}:revelation:${scopedSeerState(run,owner).activationSerial}`;
  const result=recoverPhysicalCard(run,target,cardId,{privateState:priv,rootActionId:rootId,recoveryChainId:'recovery:'+rootId,chainDepth,recoveryCeiling:4});
  if(!result.applied)return result;
  sortRemaining(target,priv);
  const record={
    sourceAugmentId,rootActionId:rootId,recoveredFromZone:'SPENT',recoveredByPlayerId:owner.playerId,
    targetPlayerId:target.playerId,originalCardInstanceId:cardId,cardInstanceId:cardId,
    combatId:run.combat?.id||null,roomId:run.currentRoomNodeId||null,recoveredTurn:currentTurn(run),
    cycleIndex:priv.cycleIndex||1,recoveryMode,usedValidCount:0,revelationSerial:scopedSeerState(run,owner).activationSerial,
    numberDelta:owned(owner,'aug-166')&&[-1,1].includes(Number(skillData?.ally_number_delta??skillData?.allyNumberDelta))?Number(skillData?.ally_number_delta??skillData?.allyNumberDelta):0
  };
  root(run).recoveredCards[cardId]=record;
  const c=run.combat;
  if(c){
    c.derivedEventSequence=(Number(c.derivedEventSequence)||0)+1;
    c.pendingSkillEvents||=[];
    if(recoveryMode==='ALLY'||recoveryMode==='ALLY_CHAIN'){
      c.pendingSkillEvents.push({type:'FATE_MANIPULATOR_USED',turn:c.turn,playerId:owner.playerId,targetPlayerId:target.playerId,recoveredCardId:cardId,rootActionId:rootId,recoveryChainId:'recovery:'+rootId,parentEventId:null,chainDepth,sourceEffectId:sourceAugmentId});
    }
    c.pendingSkillEvents.push({type:'CARD_RECOVERED',cardInstanceId:cardId,eventId:`seer-recovery:${c.id}:${c.turn}:${c.derivedEventSequence}`,turn:c.turn,actorId:owner.playerId,targetPlayerId:target.playerId,fromZone:'SPENT',toZone:'REMAINING',sourceEffectId:sourceAugmentId,rootActionId:rootId,recoveryChainId:'recovery:'+rootId,parentEventId:null,chainDepth:result.chainDepth});
  }
  telemetry(run,sourceAugmentId,'ON_RECOVER_CARD',true,{cardsRecovered:1,allyRecoveries:target.playerId===owner.playerId?0:1});
  onRecovery(run,owner,target,record,skillData);
  return {...result,provenance:record};
}
function onRecovery(run,owner,target,record,skillData){
  const s=scopedSeerState(run,owner);
  if(target.playerId===owner.playerId){
    if(owned(owner,'aug-160'))record.strengthened=true;
    return;
  }
  if(owned(owner,'aug-163')&&roomAllowed(run,'aug-163')&&claim(run,owner,'aug-163','ONCE_PER_CYCLE',{privateState:privateFor(run,owner),rootActionId:record.rootActionId},'ally-to-self')){
    const ids=eligibleSpent(run,owner),selected=selectRecoveryCard(run,owner,owner,ids,skillData,'SELF');
    if(selected.cardId)recoverSeerPhysicalCard(run,owner,owner,selected.cardId,{sourceAugmentId:'aug-163',rootActionId:record.rootActionId,chainDepth:1,recoveryMode:'SELF_CHAIN',skillData});
  }
  if(owned(owner,'aug-167')&&roomAllowed(run,'aug-167')&&claim(run,owner,'aug-167','ONCE_PER_TURN',{rootActionId:record.rootActionId},'shared')){
    s.sharedForesight=Math.min(3,(s.sharedForesight||0)+1);telemetry(run,'aug-167','ON_RECOVER_CARD',true,{stack:s.sharedForesight});
  }
}

function readyAllies(run,owner){
  const c=run.combat;if(!c)return [];
  return run.players.filter(p=>p.playerId!==owner.playerId&&p.status!=='DOWNED'&&c.turnSubmissions[p.playerId])
    .sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
}
function inspectReadyAlly(run,owner,{seeded=false,sourceAugmentId='SEER_BASE_REVELATION'}={}){
  const candidates=readyAllies(run,owner);if(!candidates.length)return null;
  const target=seeded?choose(run,candidates,`seer-inspection:${run.combat.id}:${run.combat.turn}:${owner.playerId}:${sourceAugmentId}`):candidates[0];
  const sub=run.combat.turnSubmissions[target.playerId],card=target.cardPool.find(c=>c.id===sub.cardInstanceId);
  if(!card)return null;
  const priv=privateFor(run,owner);
  const value={turn:run.combat.turn,targetPlayerId:target.playerId,selectedNumber:card.baseNumber,recoveredCardId:null};
  if(priv)priv.revelationPeek=value;
  telemetry(run,sourceAugmentId,'INSPECTION',true,{inspectionCount:1,targetPlayerId:target.playerId});
  return value;
}
function normalizePrediction(raw,run){
  if(!raw)return null;
  const type=String(raw.type||raw.kind||'').toUpperCase();
  if(!['COLLISION','NO_COLLISION','NUMBER_VALID','EXACT_PLAYER_NUMBER'].includes(type))return null;
  const number=raw.number==null?null:Number(raw.number);
  if(['NUMBER_VALID','EXACT_PLAYER_NUMBER'].includes(type)&&(!Number.isInteger(number)||number<0||number>9))return null;
  const targetPlayerId=raw.target_player_id||raw.targetPlayerId||null;
  if(type==='EXACT_PLAYER_NUMBER'){
    if(!targetPlayerId)return null;
    const target=playerById(run,targetPlayerId);
    if(!target||target.status==='DOWNED')return null;
  }
  return {type,number,targetPlayerId};
}
function declarePrediction(run,owner,skillData,rootActionId){
  if(!owned(owner,'aug-171'))return null;
  const raw=normalizePrediction(skillData?.prediction,run);
  if(!raw){const e=new Error('불길한 예언은 prediction.type을 명시해야 합니다.');e.code='INVALID_SKILL_REQUEST';throw e;}
  const s=scopedSeerState(run,owner),turn=currentTurn(run);
  const p={id:`prediction:${run.combat.id}:${turn}:${owner.playerId}:${s.activationSerial}`,status:'ARMED',...raw,
    declaredTurn:turn,targetTurn:turn+1,createdTurn:turn,expiryTurn:turn+1,originCombatId:run.combat.id,originRoomId:run.currentRoomNodeId||run.combat.id,
    cancelRule:'COMBAT_END_OR_SOURCE_INVALIDATED',rootActionId,sourceAugmentId:'aug-171'};
  s.prediction=p;telemetry(run,'aug-171','PREDICTION_SCHEDULED',true,{predictionScheduled:1,predictionType:p.type});
  if(owned(owner,'aug-177')&&roomAllowed(run,'aug-177')){
    const peek=inspectReadyAlly(run,owner,{seeded:true,sourceAugmentId:'aug-177'});
    if(peek)p.ownerInspection={targetPlayerId:peek.targetPlayerId};
  }
  return p;
}
function predictionSuccess(p,cards){
  if(p.type==='COLLISION')return cards.some(c=>c.invalidReason==='COLLISION');
  if(p.type==='NO_COLLISION')return !cards.some(c=>c.invalidReason==='COLLISION');
  if(p.type==='NUMBER_VALID')return cards.some(c=>c.valid&&c.finalNumber===p.number&&(!p.targetPlayerId||c.playerId===p.targetPlayerId));
  if(p.type==='EXACT_PLAYER_NUMBER')return cards.some(c=>c.playerId===p.targetPlayerId&&c.finalNumber===p.number);
  return false;
}
function evaluatePrediction(run,owner,ctx){
  const s=scopedSeerState(run,owner),p=s.prediction,turn=currentTurn(run);
  if(!p||p.status!=='ARMED')return false;
  if(run.phase!=='COMBAT'||p.originCombatId&&p.originCombatId!==run.combat?.id||p.originRoomId&&p.originRoomId!==(run.currentRoomNodeId||run.combat?.id)){
    p.status='CANCELLED';telemetry(run,'aug-171','PREDICTION_CANCELLED',true,{predictionCancelled:1,reason:'SOURCE_SCOPE_CHANGED'});return false;
  }
  if(p.targetTurn!==turn||!Array.isArray(ctx.cards))return false;
  const success=predictionSuccess(p,ctx.cards);p.status=success?'CONDITION_MET':'CONSUMED';p.evaluatedTurn=turn;p.success=success;
  telemetry(run,'aug-171','PREDICTION_RESOLVED',success,{predictionResolved:1,predictionType:p.type});
  if(!success){s.foresightStreak=0;p.status='CONSUMED';return false;}
  s.foresight=Math.min(2,(s.foresight||0)+1);
  const typeKey=p.type==='EXACT_PLAYER_NUMBER'?'NUMBER_VALID':p.type;
  if(!s.predictionSuccessTypes.includes(typeKey))s.predictionSuccessTypes.push(typeKey);
  if(owned(owner,'aug-172')&&p.type==='COLLISION'&&claim(run,owner,'aug-172','ONCE_PER_TURN',ctx,'prediction')){
    buff(run,{sourceAugmentId:'aug-172',ownerId:owner.playerId,targetId:owner.playerId,amount:1,validFromTurn:turn});
  }
  if(owned(owner,'aug-173')&&p.type==='NO_COLLISION'&&ctx.cards.filter(c=>c.valid&&playerById(run,c.playerId)?.status!=='DOWNED').length>=2&&claim(run,owner,'aug-173','ONCE_PER_TURN',ctx,'prediction')){
    ctx.resolved.seerRuntimeBonus=(ctx.resolved.seerRuntimeBonus||0)+1;telemetry(run,'aug-173','ON_VALID',true,{bonusDamage:1});
  }
  if(owned(owner,'aug-174')&&p.type==='NUMBER_VALID'&&ctx.resolved?.valid&&ctx.resolved.finalNumber===p.number&&claim(run,owner,'aug-174','ONCE_PER_TURN',ctx,'prediction')){
    ctx.resolved.seerRuntimeBonus=(ctx.resolved.seerRuntimeBonus||0)+1;telemetry(run,'aug-174','ON_VALID',true,{bonusDamage:1});
  }
  if(owned(owner,'aug-175')){
    s.foresightStreak=Math.min(3,(s.foresightStreak||0)+1);
    if(ctx.resolved?.valid)ctx.resolved.seerRuntimeBonus=(ctx.resolved.seerRuntimeBonus||0)+s.foresightStreak;
    telemetry(run,'aug-175','PREDICTION_STREAK',true,{stack:s.foresightStreak});
  }
  const high=p.type==='EXACT_PLAYER_NUMBER';
  if(high&&owned(owner,'aug-176')&&claim(run,owner,'aug-176','ONCE_PER_COMBAT',ctx,'high')){
    gainRevelation(run,owner,3,'aug-176',ctx,'HIGH_DIFFICULTY_PREDICTION');
  }
  if(high&&owned(owner,'aug-178')&&claim(run,owner,'aug-178','ONCE_PER_COMBAT',ctx,'high')){
    s.foresight=3;
    for(const target of run.players.filter(x=>x.status!=='DOWNED'))buff(run,{sourceAugmentId:'aug-178',ownerId:owner.playerId,targetId:target.playerId,amount:1,validFromTurn:turn});
    telemetry(run,'aug-178','PREDICTION_HIGH',true,{predictionResolved:1});
  }
  if(owned(owner,'aug-179')&&s.foresightStreak>=3&&claim(run,owner,'aug-179','ONCE_PER_COMBAT',ctx,'party')){
    for(const target of run.players.filter(x=>x.status!=='DOWNED'))buff(run,{sourceAugmentId:'aug-179',ownerId:owner.playerId,targetId:target.playerId,amount:2,validFromTurn:turn});
    telemetry(run,'aug-179','PREDICTION_STREAK_3',true,{bonusDamage:2});
  }
  if(owned(owner,'aug-180')&&['COLLISION','NO_COLLISION','NUMBER_VALID'].every(x=>s.predictionSuccessTypes.includes(x))&&claim(run,owner,'aug-180','ONCE_PER_COMBAT',ctx,'fulfill')){
    const rootId=actionRoot(run,owner,ctx,'aug-180');
    for(const target of run.players)grantAugmentExp(run,target,2,'aug-180',rootId+':'+target.playerId);
    buff(run,{sourceAugmentId:'aug-180',ownerId:owner.playerId,targetId:owner.playerId,amount:4,validFromTurn:turn});
    telemetry(run,'aug-180','PREDICTION_FULFILLED',true,{expGranted:2*run.players.length,bonusDamage:4});
  }
  p.status='CONSUMED';
  return true;
}

export function initializeSeerCombat(player){
  if(player.characterId!=='prophet')return;
  player.publicResources.revelationMax=3;
  // USER_CONFIRMED_005C_FINAL_PATCH / SEER_COMBAT_START_REVELATION_1.
  // Fresh combat construction only: assignment, not gain; reconnect never calls this initializer.
  player.publicResources.revelation=1;
}
export function onSeerTurnStart(run,player){
  if(player.characterId!=='prophet')return;
  const s=scopedSeerState(run,player),priv=privateFor(run,player),turn=currentTurn(run);
  s.turnStartRevelation=Math.max(0,Number(player.publicResources.revelation)||0);
  if(priv&&priv.revelationPeek?.turn!==turn)delete priv.revelationPeek;
  if(s.prediction?.status==='ARMED'&&s.prediction.targetTurn<turn){
    s.prediction.status='CANCELLED';telemetry(run,'aug-171','PREDICTION_CANCELLED',true,{predictionCancelled:1,reason:'EXPIRED'});
  }
}
export function resolveSeerBaseValidity(run,player,resolved,events=[]){
  if(player.characterId!=='prophet')return 0;
  const s=scopedSeerState(run,player),turn=currentTurn(run);
  if(s.activationTurn!==turn||s.activationResolvedTurn===turn)return 0;
  s.activationResolvedTurn=turn;
  if(!resolved.valid){resolved.revelationGained=0;telemetry(run,'SEER_BASE','ACTIVATION_RESOLVE',false,{reason:resolved.invalidReason||'INVALID'});return 0;}
  const gained=gainRevelation(run,player,1,'SEER_BASE',{resolved,events},'ACTIVATION_TURN_VALID');
  resolved.revelationGained=gained;
  return gained;
}
export function cleanupSeerCombat(run,player){
  if(player.characterId!=='prophet')return;
  const r=root(run),combatId=run.combat?.id||null;
  for(const [id,p] of Object.entries(r.recoveredCards))if(p.combatId===combatId)delete r.recoveredCards[id];
  r.buffs=r.buffs.filter(x=>x.combatId!==combatId);
  const s=scopedSeerState(run,player);
  if(s.prediction?.status==='ARMED'){
    s.prediction.status='CANCELLED';
    telemetry(run,'aug-171','PREDICTION_CANCELLED',true,{predictionCancelled:1,reason:'COMBAT_END'});
  }
  const priv=privateFor(run,player);
  if(priv){delete priv.revelationPeek;delete priv.seerRecoveryCandidates;}
  const f=framework(run),key=player.playerId+':seer';
  delete f.cardState?.[key];
  // Revelation serials restart in the next combat; completed owner claims must not carry over.
  for(const token of Object.keys(r.applied||{}))if(token.startsWith(player.playerId+':'))delete r.applied[token];
  if(combatId)for(const once of Object.keys(f.once||{}))if(once.includes(player.playerId)&&once.includes(combatId))delete f.once[once];
}
export function activateSeerImmediateSkill(run,player,skillData=null){
  if(player.characterId!=='prophet')return null;
  const c=run.combat,priv=privateFor(run,player),s=scopedSeerState(run,player),before=Math.max(0,Number(player.publicResources.revelation)||0);
  if(before<1){const e=new Error('계시가 없습니다.');e.code='INSUFFICIENT_RESOURCE';throw e;}
  // Validate all user-supplied choices before consuming Revelation so rejected requests are transactional.
  if(owned(player,'aug-171')&&!normalizePrediction(skillData?.prediction,run)){
    const e=new Error('불길한 예언은 prediction.type을 명시해야 합니다.');e.code='INVALID_SKILL_REQUEST';throw e;
  }
  let requestedAllyIds=[];
  if(owned(player,'aug-161')){
    requestedAllyIds=[...(skillData?.target_player_ids||skillData?.targetPlayerIds||[])];
    const first=String(skillData?.target_player_id||skillData?.targetPlayerId||requestedAllyIds[0]||'');
    if(first&&!requestedAllyIds.includes(first))requestedAllyIds.unshift(first);
    if(!requestedAllyIds.length){const e=new Error('운명 조작자는 복구할 아군을 지정해야 합니다.');e.code='INVALID_SKILL_REQUEST';throw e;}
    const firstTarget=playerById(run,requestedAllyIds[0]);
    if(!firstTarget||firstTarget.playerId===player.playerId||firstTarget.status==='DOWNED'||!eligibleSpent(run,firstTarget).length){
      const e=new Error('대상 아군의 현재 사이클에 복구 가능한 사용 카드가 없습니다.');e.code='SKILL_NOT_READY';throw e;
    }
  }
  player.publicResources.revelation=before-1;s.activationTurn=c.turn;s.activationSerial=(s.activationSerial||0)+1;s.activationResolvedTurn=null;
  const rootActionId=`skill:${c.id}:${c.turn}:${player.playerId}:revelation:${s.activationSerial}`;
  telemetry(run,'SEER_BASE','ON_SKILL_USE',true,{revelationSpent:1});
  const event={type:'REVELATION_USED',playerId:player.playerId,turn:c.turn,revelationBefore:before,revelationAfter:player.publicResources.revelation,rootActionId,sourceEffectId:'SEER_BASE'};
  let recovered=[];
  if(owned(player,'aug-161')){
    const requested=[...requestedAllyIds];
    const maxTargets=owned(player,'aug-168')&&claim(run,player,'aug-168','ONCE_PER_COMBAT',{rootActionId,revelationSerial:s.activationSerial},'double')?2:1;
    const targets=[];
    for(const id of requested){const t=playerById(run,id);if(t&&t.playerId!==player.playerId&&t.status!=='DOWNED'&&!targets.includes(t))targets.push(t);if(targets.length>=maxTargets)break;}
    if(targets.length<maxTargets){
      const extras=run.players.filter(t=>t.playerId!==player.playerId&&t.status!=='DOWNED'&&!targets.includes(t)&&eligibleSpent(run,t).length)
        .sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
      targets.push(...extras.slice(0,maxTargets-targets.length));
    }
    if(!targets.length){const e=new Error('대상 아군의 현재 사이클에 복구 가능한 사용 카드가 없습니다.');e.code='SKILL_NOT_READY';throw e;}
    for(const target of targets){
      const ids=eligibleSpent(run,target),selected=selectRecoveryCard(run,player,target,ids,skillData,'ALLY');
      if(!selected.cardId)continue;
      if(priv)priv.seerRecoveryCandidates={turn:c.turn,targetPlayerId:target.playerId,candidateIds:[...selected.candidates]};
      const source=targets.length>1?'aug-168':'aug-161';
      const result=recoverSeerPhysicalCard(run,player,target,selected.cardId,{sourceAugmentId:source,rootActionId,chainDepth:0,recoveryMode:'ALLY',skillData});
      if(result.applied)recovered.push({targetPlayerId:target.playerId,cardInstanceId:selected.cardId});
    }
  }else{
    const ids=eligibleSpent(run,player),selected=selectRecoveryCard(run,player,player,ids,skillData,'SELF');
    if(priv)priv.seerRecoveryCandidates={turn:c.turn,targetPlayerId:player.playerId,candidateIds:[...selected.candidates]};
    if(selected.cardId){
      const result=recoverSeerPhysicalCard(run,player,player,selected.cardId,{sourceAugmentId:'SEER_BASE_REVELATION',rootActionId,chainDepth:0,recoveryMode:'SELF',skillData});
      if(result.applied)recovered.push({targetPlayerId:player.playerId,cardInstanceId:selected.cardId});
    }
  }
  if(owned(player,'aug-160'))s.aug160ActivationTurn=c.turn;
  const prediction=declarePrediction(run,player,skillData,rootActionId);
  if(prediction)event.predictionId=prediction.id;
  event.recoveredCount=recovered.length;event.recoveredPlayerIds=recovered.map(x=>x.targetPlayerId);
  event.recoveredCardId=recovered.length===1?recovered[0].cardInstanceId:null;
  event.targetPlayerId=priv?.revelationPeek?.targetPlayerId??(recovered.length===1?recovered[0].targetPlayerId:null);
  c.pendingSkillEvents||=[];c.pendingSkillEvents.push(event);
  return event;
}

function processRecoveredUse(run,ctx){
  const cardId=ctx.resolved?.cardInstanceId,prov=cardId?provenance(run,cardId):null;
  if(!prov||!ctx.resolved?.valid)return [];
  const owner=playerById(run,prov.recoveredByPlayerId);if(!owner)return [];
  const results=[],turn=currentTurn(run),target=ctx.player;
  const recoveredUseRoot=actionRoot(run,target,ctx);
  if(!customClaim(run,owner,'SEER_RECOVERED_USE',recoveredUseRoot+':'+cardId))return results;
  prov.usedValidCount=(prov.usedValidCount||0)+1;prov.lastValidTurn=turn;
  const self=owner.playerId===target.playerId,sourceCtx={...ctx,rootActionId:recoveredUseRoot};
  if(self&&owned(owner,'aug-151')&&roomAllowed(run,'aug-151')&&claim(run,owner,'aug-151','ONCE_PER_COMBAT',sourceCtx,'refund')){
    gainRevelation(run,owner,1,'aug-151',ctx,'RECOVERED_CARD_VALID');results.push({augmentId:'aug-151',applied:true});
  }
  if(self&&owned(owner,'aug-153')&&roomAllowed(run,'aug-153')&&claim(run,owner,'aug-153','ONCE_PER_CYCLE',{...sourceCtx,privateState:privateFor(run,owner)},'repeat')){
    const ids=eligibleSpent(run,owner),selected=selectRecoveryCard(run,owner,owner,ids,{},'SELF');
    if(selected.cardId){const rr=recoverSeerPhysicalCard(run,owner,owner,selected.cardId,{sourceAugmentId:'aug-153',rootActionId:sourceCtx.rootActionId,chainDepth:1,recoveryMode:'SELF_CHAIN'});results.push({augmentId:'aug-153',applied:rr.applied});}
  }
  if(self&&owned(owner,'aug-154')&&roomAllowed(run,'aug-154')&&claim(run,owner,'aug-154','ONCE_PER_TURN',sourceCtx,'exp')){
    const result=grantAugmentExp(run,owner,1,'aug-154',sourceCtx.rootActionId+':aug-154');telemetry(run,'aug-154','ON_VALID',result.applied,{expGranted:result.applied?1:0});results.push({augmentId:'aug-154',applied:result.applied});
  }
  if(self&&owned(owner,'aug-155')&&roomAllowed(run,'aug-155')&&turn-prov.recoveredTurn<=2&&claim(run,owner,'aug-155','ONCE_PER_COMBAT',sourceCtx,'refund')){
    gainRevelation(run,owner,1,'aug-155',ctx,'RECOVERED_WITHIN_2_TURNS');results.push({augmentId:'aug-155',applied:true});
  }
  if(self&&owned(owner,'aug-156')&&roomAllowed(run,'aug-156')){
    buff(run,{sourceAugmentId:'aug-156',ownerId:owner.playerId,targetId:owner.playerId,amount:1,validFromTurn:turn+1,expiryTurn:turn+1});telemetry(run,'aug-156','ON_VALID',true,{bonusDamage:1});results.push({augmentId:'aug-156',applied:true});
  }
  if(self&&owned(owner,'aug-157')&&roomAllowed(run,'aug-157')){
    const card=owner.cardPool.find(c=>c.id===cardId),n=card?.baseNumber;
    if(Number.isInteger(n)){
      const s=scopedSeerState(run,owner);s.repeatedRecoveredNumbers[n]=(s.repeatedRecoveredNumbers[n]||0)+1;
      if(s.repeatedRecoveredNumbers[n]>=2&&claim(run,owner,'aug-157','ONCE_PER_TURN',sourceCtx,'damage')){ctx.resolved.seerRuntimeBonus=(ctx.resolved.seerRuntimeBonus||0)+2;telemetry(run,'aug-157','ON_VALID',true,{bonusDamage:2});results.push({augmentId:'aug-157',applied:true});}
    }
  }
  if(self&&owned(owner,'aug-159')&&roomAllowed(run,'aug-159')&&scopedSeerState(run,owner).turnStartRevelation>=1&&claim(run,owner,'aug-159','ONCE_PER_TURN',sourceCtx,'damage')){
    ctx.resolved.seerRuntimeBonus=(ctx.resolved.seerRuntimeBonus||0)+4;telemetry(run,'aug-159','ON_VALID',true,{bonusDamage:4});results.push({augmentId:'aug-159',applied:true});
  }
  if(self&&owned(owner,'aug-160')&&roomAllowed(run,'aug-160')&&prov.strengthened&&claim(run,owner,'aug-160','ONCE_PER_TURN',sourceCtx,'strength')){
    ctx.resolved.seerRuntimeBonus=(ctx.resolved.seerRuntimeBonus||0)+3;telemetry(run,'aug-160','ON_VALID',true,{bonusDamage:3,mode:'RECOVERED_STRENGTHEN'});results.push({augmentId:'aug-160',applied:true});
  }
  if(!self&&owned(owner,'aug-164')&&roomAllowed(run,'aug-164')){ctx.resolved.seerRuntimeBonus=(ctx.resolved.seerRuntimeBonus||0)+2;telemetry(run,'aug-164','ON_VALID',true,{bonusDamage:2});results.push({augmentId:'aug-164',applied:true});}
  if(!self&&owned(owner,'aug-165')&&roomAllowed(run,'aug-165')&&claim(run,owner,'aug-165','ONCE_PER_COMBAT',sourceCtx,'refund')){gainRevelation(run,owner,1,'aug-165',ctx,'ALLY_RECOVERED_CARD_VALID');results.push({augmentId:'aug-165',applied:true});}
  if(!self&&owned(owner,'aug-169')&&roomAllowed(run,'aug-169')&&claim(run,owner,'aug-169','ONCE_PER_REVELATION_USE',{...sourceCtx,revelationSerial:prov.revelationSerial},'valid-bonus')){ctx.resolved.seerRuntimeBonus=(ctx.resolved.seerRuntimeBonus||0)+1;telemetry(run,'aug-169','ON_VALID',true,{bonusDamage:1});results.push({augmentId:'aug-169',applied:true});}
  if(!self&&owned(owner,'aug-170')&&roomAllowed(run,'aug-170')&&claim(run,owner,'aug-170','ONCE_PER_REVELATION_USE',{...sourceCtx,revelationSerial:prov.revelationSerial},'shared-future')){ctx.resolved.seerRuntimeBonus=(ctx.resolved.seerRuntimeBonus||0)+2;buff(run,{sourceAugmentId:'aug-170',ownerId:owner.playerId,targetId:owner.playerId,amount:2,validFromTurn:turn});telemetry(run,'aug-170','ON_VALID',true,{bonusDamage:4});results.push({augmentId:'aug-170',applied:true});}
  return results;
}
function applyRecoveredNumberMutation(run,ctx){
  const prov=provenance(run,ctx.resolved?.cardInstanceId);if(!prov||prov.numberDelta===0||prov.aug166Consumed)return [];
  const owner=playerById(run,prov.recoveredByPlayerId);
  if(!owner||!owned(owner,'aug-166')||!roomAllowed(run,'aug-166'))return [];
  if(!claim(run,owner,'aug-166','ONCE_PER_CYCLE',{...ctx,privateState:privateFor(run,owner),rootActionId:prov.rootActionId},'number-shift'))return [];
  const before=ctx.resolved.workingNumber,after=Math.max(0,before+prov.numberDelta);
  ctx.resolved.workingNumber=after;ctx.resolved.finalNumber=after;prov.aug166Consumed=true;
  telemetry(run,'aug-166','PRE_COLLISION_SELF_MODIFY',true,{numberDelta:after-before});
  return [{augmentId:'aug-166',applied:true,numberDelta:after-before}];
}

export function applySeerRuntime(run,trigger,ctx={}){
  const out=[];
  if(trigger==='BEFORE_DAMAGE')out.push(...applyGlobalBuffs(run,ctx));
  if(trigger==='PRE_COLLISION_SELF_MODIFY')out.push(...applyRecoveredNumberMutation(run,ctx));
  if(trigger==='CARD_VALIDATED')out.push(...processRecoveredUse(run,ctx));
  const p=ctx.player;
  if(!p||p.characterId!=='prophet')return out;
  if(trigger==='TURN_START'){onSeerTurnStart(run,p);return out;}
  if(trigger==='CARD_VALIDATED'){
    if(owned(p,'aug-160')&&roomAllowed(run,'aug-160')&&scopedSeerState(run,p).aug160ActivationTurn===currentTurn(run)&&ctx.resolved?.valid&&claim(run,p,'aug-160','ONCE_PER_TURN',ctx,'strength')){
      ctx.resolved.seerRuntimeBonus=(ctx.resolved.seerRuntimeBonus||0)+3;telemetry(run,'aug-160','ON_VALID',true,{bonusDamage:3,mode:'ACTIVATION_TURN'});out.push({augmentId:'aug-160',applied:true});
    }
    evaluatePrediction(run,p,ctx);
  }
  if(trigger==='BEFORE_DAMAGE'&&ctx.resolved?.valid){
    const direct=Math.max(0,Number(ctx.resolved.seerRuntimeBonus)||0);
    if(direct>0&&addDamage(ctx,direct,'SEER_RUNTIME_BONUS'))out.push({augmentId:'SEER_RUNTIME_BONUS',applied:true,bonusDamage:direct});
    const s=scopedSeerState(run,p);
    if(run.phase==='COMBAT'&&s.foresight>0){const amount=s.foresight;if(addDamage(ctx,amount,'aug-171')){s.foresight=0;telemetry(run,'aug-171','PRE_DAMAGE',true,{bonusDamage:amount});out.push({augmentId:'aug-171',applied:true,bonusDamage:amount});}}
  }
  if(trigger==='TURN_END'){
    const s=scopedSeerState(run,p),turn=currentTurn(run);
    if(s.prediction?.status==='ARMED'&&s.prediction.targetTurn<=turn){s.prediction.status='CANCELLED';telemetry(run,'aug-171','PREDICTION_CANCELLED',true,{predictionCancelled:1,reason:'TURN_END'});}
    root(run).buffs=root(run).buffs.filter(x=>x.expiryTurn==null||x.expiryTurn>=turn);
  }
  if(trigger==='COMBAT_END')cleanupSeerCombat(run,p);
  return out;
}

export function assertSeerHandler(id){
  if(!SEER_CONTRACTS[id]||!SEER_HANDLER_IDS.includes(id))throw new Error('MISSING_SEER_HANDLER:'+id);
}
export const SEER_HANDLER_IDS=Object.freeze([...SEER_CONTRACT_IDS]);
