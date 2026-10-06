import {prophecySlot} from '../prophet-vampire-core.js';
import {collisionParticipants,revelationGain,armPastFragment,capturePastFragment,consumePastFragment,lowestValidThrall,revelationVisible} from '../prophet-vampire-core.js';
import {choose} from './rng.js';
const has=(p,n)=>p.augments?.includes('aug-'+n);
const live=p=>p.status!=='DOWNED'&&p.hp>0;
export function coreState(run,p){
 const f=run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};f.cardState||={};
 const key=p.playerId+':pvCore',scope=run.combat?.id||run.roomState?.id||run.currentRoomNodeId;
 if(f.cardState[key]?.scope!==scope)f.cardState[key]={scope,claims:{},revelation:0,zeroState:'BASE_ZERO',pendingDamage:0,streak:0,pairStreak:{},receipts:[],blood:0};
 return f.cardState[key];
}
const turn=run=>run.combat?.turn??run.roomState?.turn??run.roomState?.attempt??0;
const claim=(run,p,n,scope='TURN',suffix='')=>{const s=coreState(run,p),k=n+':'+(scope==='COMBAT'?'combat':turn(run))+':'+suffix;if(s.claims[k])return false;s.claims[k]=true;return true;};
const current=(run,p)=>run.combat?.privateByPlayer?.[p.playerId]||run.roomState?.privateByPlayer?.[p.playerId];
const get=(run,id)=>run.players.find(p=>p.playerId===id);
const rcFor=(cards,id)=>cards.find(c=>c.playerId===id);
const clampBlood=(p,n)=>Math.min(has(p,319)||has(p,324)?8:6,Math.max(0,n));
const blood=(run,p,n)=>p.publicResources.blood=clampBlood(p,(p.publicResources.blood||0)+n);
const dominance=(p,n)=>p.publicResources.dominance=Math.min(has(p,308)?3:2,(p.publicResources.dominance||0)+n);
function pending(run,p,key,value){const s=coreState(run,p);s[key]=Math.max(s[key]||0,value);}
function lowestHp(run,candidates,key){if(!candidates.length)return null;const hp=Math.min(...candidates.map(p=>p.hp));return choose(run,candidates.filter(p=>p.hp===hp),'pvCore:'+key);}
function heal(p,n){if(!p)return 0;const delta=Math.max(0,Math.min(p.maxHp-p.hp,n));p.hp+=delta;return delta;}
export function prophetGain(run,p,amount,key,events=[]){
 const s=coreState(run,p);s.revelation=p.publicResources.revelation||0;p.publicResources.revelationMax=has(p,153)?8:6;
 const receipt=s.nextGainBonus||0;
 const result=revelationGain(s,amount,{eventId:key,max:has(p,153)?8:6,bonus:(run.phase==='COMBAT'&&has(p,151)?1:0)+receipt});
 if(result.applied){s.nextGainBonus=0;p.publicResources.revelation=s.revelation;events.push({type:'PROPHET_REVELATION_GAINED',playerId:p.playerId,...result});
  if(run.phase==='COMBAT'&&has(p,151)&&result.amount>Math.min(amount,(has(p,153)?8:6)-result.before)){
   const rows=run.augmentFramework.telemetry||=[];rows.push({augmentId:'aug-151',playerId:p.playerId,trigger:'REVELATION_GAIN',triggerCount:1,successCount:1,eventId:key});if(rows.length>2048)rows.splice(0,rows.length-2048);
  }
 }
 return result;
}
export function activateFragment(run,p){
 if(run.phase!=='COMBAT')throw new Error('과거의 편린은 전투에서만 사용할 수 있습니다.');
 const s=coreState(run,p);s.revelation=p.publicResources.revelation||0;
 const visible=revelationVisible(s,{threshold:has(p,158)?2:3,turn:turn(run)});
 if(!armPastFragment(s,{actionId:`fragment:${s.scope}:${turn(run)}:${p.playerId}`,cost:s.discount?5:6}))return false;
 s.discount=false;p.publicResources.revelation=s.revelation;
 if(has(p,160)&&visible)s.visibilityHeldTurn=turn(run);
 if(has(p,155))p.publicResources.revelation=Math.min(has(p,153)?8:6,p.publicResources.revelation+1);
 return true;
}
export function prepareFragmentCards(run,cards){
 for(const rc of cards){const p=get(run,rc.playerId);if(p?.characterId!=='prophet')continue;
  const s=coreState(run,p);rc.isPastFragment=Boolean(s.fragment&&prophecySlot(p)?.id===rc.cardInstanceId);
  if(rc.isPastFragment){rc.workingNumber=s.fragment.value;rc.finalNumber=s.fragment.value;rc.fragmentFirstBonus=s.fragment.firstBonus||0;}
 }
}
export function captureFragments(run,cards,events=[]){
 for(const p of run.players.filter(p=>p.characterId==='prophet'&&live(p))){
  const s=coreState(run,p),priv=current(run,p),fragment=capturePastFragment(s,p.playerId,cards,{turn:turn(run)});
  if(!fragment)continue;
  const zero=prophecySlot(p);s.zeroCardId=zero.id;priv.spentCardIds=priv.spentCardIds.filter(id=>id!==zero.id);if(!priv.remainingCardIds.includes(zero.id))priv.remainingCardIds.push(zero.id);
  events.push({type:'PROPHET_PAST_FRAGMENT_CREATED',playerId:p.playerId,value:fragment.value});
  if(run.phase==='COMBAT'&&has(p,163)&&fragment.value>=5)prophetGain(run,p,1,'fragment-high:'+fragment.actionId,events);
 }
}
export function beforeCollision(run,cards,events=[],groups=null){
 const participants=groups?[...groups.values()].filter(g=>g.length>1).flat():collisionParticipants(cards),count=participants.length;
 for(const p of run.players.filter(p=>p.characterId==='prophet'&&live(p))){
  const s=coreState(run,p);
  if(!claim(run,p,'base-collision'))continue;
  const priorRevelation=p.publicResources.revelation||0;
  if(count){prophetGain(run,p,count,`collision:${s.scope}:${turn(run)}:${p.playerId}`,events);
   if(run.phase==='COMBAT'&&has(p,154)&&priorRevelation>=3&&!participants.some(c=>c.playerId===p.playerId))prophetGain(run,p,1,'star:'+turn(run),events);
  }
  if(run.phase==='COMBAT'&&has(p,157)&&count>=2&&s.previousCount===count)prophetGain(run,p,1,'repeat:'+turn(run),events);
  s.previousCount=count;s.collisionCount=count;
 }
}
export function afterValidity(run,cards,events=[]){
 if(!['COMBAT','EVENT','REWARD_ROOM'].includes(run.phase))return;
 for(const p of run.players.filter(live)){
  const s=coreState(run,p),rc=rcFor(cards,p.playerId);if(!rc||!claim(run,p,'validity'))continue;
  if(p.characterId==='vampire'&&rc.bloodCommandUsed)events.push({type:'VAMPIRE_THRALL_CONSUMED',playerId:p.playerId,targetId:rc.bloodCommandTargetId});
  if(p.characterId==='vampire'&&rc.bloodCommandUsed&&rc.valid){
   rc.vampireBonus=(rc.vampireBonus||0)+(run.phase==='COMBAT'?(has(p,306)?1:0)+(rc.swapBonusBefore||0)+(rc.dominanceBefore||0):0);
   if(run.phase==='COMBAT')p.publicResources.dominance=0;
  }
  if(p.characterId==='vampire'&&rc.valid&&!p.publicResources.thrallPlayerId){
   const target=lowestValidThrall(p.playerId,cards,{eligible:id=>live(get(run,id)),choose:ids=>choose(run,ids,`thrall:${s.scope}:${turn(run)}:${p.playerId}`)});
   if(target.targetId){p.publicResources.thrallPlayerId=target.targetId;s.mark={ownerVampireId:p.playerId,thrallPlayerId:target.targetId,createdRootActionId:`thrall:${s.scope}:${turn(run)}:${p.playerId}`,active:true};rc.newThrall=true;
    events.push({type:'VAMPIRE_THRALL_CREATED',playerId:p.playerId,targetId:target.targetId});
    if(run.phase==='COMBAT'&&has(p,303)&&target.candidates.length>1)s.thrallChoice={candidates:target.candidates,createdTurn:turn(run),markId:s.mark.createdRootActionId};
    if(run.phase!=='COMBAT')continue;
    if(has(p,301)&&rc.bloodCommandUsed)dominance(p,1);
    if(has(p,302)&&target.number<=2)dominance(p,1);
    if(has(p,305)&&rc.bloodCommandUsed)s.swapBonus=Math.max(s.swapBonus||0,1);
    if(has(p,307)&&target.number<=2)s.swapBonus=Math.max(s.swapBonus||0,1);
    if(has(p,311)||has(p,321))blood(run,p,1);
    if(has(p,312)&&target.number<rc.finalNumber)blood(run,p,1);
    if(has(p,310)&&rc.bloodCommandUsed&&claim(run,p,310,'COMBAT'))s.echo={targetId:rc.bloodCommandTargetId,expiresTurn:turn(run)+1};
   }
  }
  if(p.characterId==='vampire'){
   const other=rcFor(cards,rc.bloodCommandTargetId);
   if(run.phase!=='COMBAT')continue;
   if(rc.bloodCommandUsed&&other?.valid&&has(p,304))dominance(p,1);
   if(rc.bloodCommandUsed&&!rc.newThrall&&has(p,309))s.recoveryMark={createdTurn:turn(run)};
   if(s.recoveryMark&&turn(run)>s.recoveryMark.createdTurn&&rc.valid)delete s.recoveryMark;
   if(rc.bloodCommandUsed&&rc.valid&&has(p,316)&&rc.finalNumber>rc.ownerPreSwapWorkingNumber)blood(run,p,2);
   const thrall=rcFor(cards,p.publicResources.thrallPlayerId);
   if(has(p,328)&&thrall?.valid)blood(run,p,1);
  }
  if(p.characterId!=='prophet'||run.phase!=='COMBAT')continue;
  const failed=cards.filter(c=>c.playerId!==p.playerId&&c.invalidReason==='COLLISION'&&!c.valid);
  const participants=collisionParticipants(cards),groups=new Set(participants.map(c=>c.finalNumber));
  if(rc.valid&&rc.isPastFragment){
   if(has(p,164))s.nextGainBonus=(s.nextGainBonus||0)+1;
   if(has(p,168))s.discount=true;
   if(has(p,171))heal(lowestHp(run,run.players.filter(q=>q.playerId!==p.playerId&&live(q)),`171:${s.scope}:${turn(run)}`),1);
  }
  if(rc.isPastFragment&&rc.invalidReason==='COLLISION'&&has(p,166))p.publicResources.revelation=Math.min(has(p,153)?8:6,Math.max(p.publicResources.revelation||0,6));
  if(s.fragment?.createdTurn===turn(run)&&rc.valid&&has(p,165))s.fragment.firstBonus=1;
  if(has(p,173)&&failed.length>=2&&claim(run,p,173,'COMBAT'))heal(lowestHp(run,failed.map(c=>get(run,c.playerId)).filter(live),`173:${s.scope}`),1);
  if(has(p,174)&&groups.size>=2)for(const ally of run.players.filter(live))pending(run,ally,'directReduction',1);
  if(p.publicResources.revelation>=3)for(const f of failed){const ally=get(run,f.playerId);if(has(p,176))pending(run,ally,'pendingDamage',1);if(has(p,179))pending(run,ally,'directReduction',1);}
  if(has(p,175))for(const ally of run.players.filter(q=>q.playerId!==p.playerId&&live(q))){const other=rcFor(cards,ally.playerId),n=rc.valid&&other?.valid?(s.pairStreak[ally.playerId]||0)+1:0;s.pairStreak[ally.playerId]=n;if(n===2){rc.seerRuntimeBonus=(rc.seerRuntimeBonus||0)+1;other.seerRuntimeBonus=(other.seerRuntimeBonus||0)+1;}}
  s.heal178Due=has(p,178)&&s.collisionCount>=3&&(s.heals178||0)<2;
  s.failedAllies=failed.map(c=>c.playerId);
 }
}
export function beforePrimaryDamage(run,p,rc,damage){
 if(run.phase!=='COMBAT'||!rc?.valid)return;
 const s=coreState(run,p);if(!claim(run,p,'primary:'+rc.cardInstanceId))return;
 damage.amount+=(rc.seerRuntimeBonus||0)+(s.pendingDamage||0);s.pendingDamage=0;
 if(p.characterId==='prophet'){
  if(has(p,152)&&p.publicResources.revelation>=3&&claim(run,p,152,'COMBAT'))damage.amount++;
  if(has(p,159)&&p.publicResources.revelation>=3){p.publicResources.revelation--;damage.amount++;}
  if(rc.isPastFragment){damage.amount+=(has(p,161)?1:0)+(rc.fragmentFirstBonus||0);if(has(p,167)&&(run.combat._pvCards||[]).some(c=>c.playerId!==p.playerId&&c.valid&&c.finalNumber===rc.finalNumber))damage.amount++;}
 }
 if(p.characterId==='vampire'){
  const b=p.publicResources.blood||0;if(has(p,314)&&b>=3)damage.amount++;
  let cost=0;if(has(p,318)&&b>=6){cost=3;damage.amount+=4;}else if(has(p,315)&&b>=2){cost=2;damage.amount+=2;}
  if(cost){blood(run,p,-cost);s.bloodSpentTurn=turn(run);if(has(p,317)&&rc.newThrall)blood(run,p,1);}
  if(has(p,320)&&rc.bloodCommandUsed&&cost&&rc.newThrall&&claim(run,p,320,'COMBAT'))damage.amount+=3;
 }
}
export function afterDamageBatch(run,cards,packets,events=[]){
 if(run.phase!=='COMBAT')return;
 for(const p of run.players.filter(live)){
  const s=coreState(run,p),rc=rcFor(cards,p.playerId);if(!rc||!claim(run,p,'post-damage'))continue;
  if(p.characterId==='vampire'){
   const dealt=packets.filter(q=>q.sourcePlayerId===p.playerId&&!q.followUp).reduce((n,q)=>n+(q.actualDamage??q.amount??0),0);
   if(has(p,313)&&rc.valid&&dealt>=4&&claim(run,p,313))blood(run,p,1);
   for(const receipt of s.receipts)if(!receipt.consumed&&rcFor(cards,receipt.targetId)?.valid&&turn(run)>receipt.turn){receipt.consumed=true;if(has(p,330))blood(run,p,1);}
  }
  if(p.characterId==='prophet'){
   s.streak=rc.valid&&p.publicResources.revelation>=3?s.streak+1:0;s.streakGainDue=has(p,156)&&s.streak===2;
   if(has(p,180)&&(s.failedAllies||[]).length>=2&&packets.some(q=>(q.actualDamage??q.amount)>0))for(const id of s.failedAllies)pending(run,get(run,id),'pendingDamage',1);
  }
 }
}
export function consumeFragment(run,p,rc){
 const s=coreState(run,p);if(!rc.isPastFragment)return;
 consumePastFragment(s);if(has(p,170)&&claim(run,p,170,'COMBAT'))s.nextGainBonus=(s.nextGainBonus||0)+2;
}
export function transfusion(run,p,target,{emergency=false}={}){
 if(run.phase!=='COMBAT')return false;
 const s=coreState(run,p),cost=emergency?4:has(p,322)?3:4;
 if(!target||(!emergency&&!live(target))||target.playerId===p.playerId||target.hp>=target.maxHp||(p.publicResources.blood||0)<cost)return false;
 if(!has(p,emergency?327:321)||!claim(run,p,emergency?327:321,'COMBAT'))return false;
 blood(run,p,-cost);if(emergency){target.hp=1;target.status='ACTIVE';}else heal(target,1);
 if(has(p,325)||has(p,329))pending(run,target,'pendingDamage',2);
 if(has(p,326)||has(p,329))pending(run,target,'directReduction',1);
 s.receipts.push({targetId:target.playerId,turn:turn(run),consumed:false});return true;
}
export function endCoreTurn(run,events=[]){
 if(run.phase!=='COMBAT')return;
 for(const p of run.players.filter(q=>q.characterId==='prophet'&&live(q))){const s=coreState(run,p);
  if(!claim(run,p,'end'))continue;
  if(s.streakGainDue){prophetGain(run,p,1,'streak:'+turn(run),events);s.streak=0;s.streakGainDue=false;}
  if(s.heal178Due){const target=lowestHp(run,run.players.filter(q=>q.playerId!==p.playerId&&live(q)),`178:${s.scope}:${turn(run)}`);if(target){const amount=heal(target,1);s.heals178=(s.heals178||0)+1;events.push({type:'PLAYER_HEALED',playerId:target.playerId,sourcePlayerId:p.playerId,source:'aug-178',amount});}}
  delete s.visibilityHeldTurn;
 }
}
export function derivedProphetPackets(run,cards){
 if(run.phase!=='COMBAT')return [];
 const out=[];
 for(const p of run.players.filter(q=>q.characterId==='prophet'&&live(q))){
  if(!claim(run,p,'derived'))continue;
  let used172=0;
  for(const failed of cards.filter(c=>c.playerId!==p.playerId&&!c.valid&&c.invalidReason==='COLLISION')){
   const a=has(p,172)&&used172<3,b=has(p,177)&&failed.finalNumber>=3;
   if(a)used172++;if(!a&&!b)continue;
   out.push({sourcePlayerId:p.playerId,sourceCardId:null,numberUsed:null,amount:1,extraDamageComponent:true,followUp:false,derived:true,tags:['PROPHET_COLLISION_DERIVED'],damageEventId:`prophet-derived:${run.combat.id}:${turn(run)}:${p.playerId}:${failed.cardInstanceId}`,rootActionId:`prophet-derived:${run.combat.id}:${turn(run)}:${p.playerId}`,failedCardId:failed.cardInstanceId});
  }
 }
 return out;
}
export function chooseThrall(run,p,targetId){
 const s=coreState(run,p),c=run.combat;
 if(!has(p,303)||c?.phase!=='SELECTION_OPEN'||c.turnSubmissions[p.playerId]||!s.thrallChoice?.candidates.includes(targetId)||s.thrallChoice.markId!==s.mark?.createdRootActionId)throw new Error('권속을 선택할 수 없습니다.');
 p.publicResources.thrallPlayerId=targetId;s.mark.thrallPlayerId=targetId;delete s.thrallChoice;
 return true;
}
export function incomingCoreDamage(run,p,damage,type){
 if(type!=='DIRECT'||!(damage.amount>0))return;
 const s=coreState(run,p);if(s.directReduction){damage.amount=Math.max(0,damage.amount-s.directReduction);s.directReduction=0;}
}
export function afterIncomingCoreDamage(run,target,damageEvent,events=[]){
 if(run.phase!=='COMBAT'||!(damageEvent.actualDamage>0))return;
 const eventId=damageEvent.damageEventId||`incoming:${run.combat.id}:${turn(run)}:${target.playerId}`;
 const receipt=coreState(run,target);if(receipt.incomingReceipts?.[eventId])return;receipt.incomingReceipts||={};receipt.incomingReceipts[eventId]=true;
 let emergencyApplied=false;
 for(const p of run.players.filter(q=>q.characterId==='vampire'&&live(q)).sort((a,b)=>a.seat-b.seat)){
  if(has(p,323)&&damageEvent.damageType==='DIRECT'&&p.publicResources.thrallPlayerId===target.playerId&&claim(run,p,323,'COMBAT'))blood(run,p,1);
  const emergency=target.hp<=0&&transfusion(run,p,target,{emergency:true});
  if(emergency){emergencyApplied=true;events.push({type:'TRANSFUSION_USED',playerId:p.playerId,targetId:target.playerId,amount:1,cost:4,source:'aug-327',emergency:true,automatic:true,phase:'POST_DAMAGE_PRE_DOWN',bloodSpent:4});}
  if(!emergencyApplied&&target.hp===1&&transfusion(run,p,target))events.push({type:'TRANSFUSION_USED',playerId:p.playerId,targetId:target.playerId,amount:1,cost:has(p,322)?3:4,source:'aug-321',emergency:false,automatic:true,phase:'POST_DAMAGE_PRE_DOWN',bloodSpent:has(p,322)?3:4});
 }
}
export function resetProphecyCycle(run,p,priv,beforeReset=()=>{}){
 if(p.characterId!=='prophet')return false;
 const s=coreState(run,p),zero=prophecySlot(p),independent=has(p,169),normal=p.cardPool.filter(c=>!independent||c.id!==zero.id);
 if(normal.some(c=>priv.remainingCardIds.includes(c.id)))return false;
 beforeReset();
 const keep=independent&&s.fragment;
 priv.cycleIndex=(priv.cycleIndex||1)+1;priv.spentCardIds=[];priv.remainingCardIds=p.cardPool.map(c=>c.id);
 if(!keep){delete s.fragment;s.zeroState='BASE_ZERO';}
 return true;
}
export function fragmentRandomEligible(run,p,id){
 if(p.characterId!=='prophet'||!has(p,162))return true;
 const s=coreState(run,p);return !(s.fragment&&prophecySlot(p)?.id===id&&turn(run)<=s.fragment.createdTurn+1);
}
