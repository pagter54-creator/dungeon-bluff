import {ADVENTURER_CONTRACTS} from './adventurer-contracts.js';
import {onceKey,grantAugmentExp,upsertAugmentStatus,consumeAugmentStatus,grantAugmentGold,grantRelicOpportunity} from './augment-framework.js';

export const EQUIPMENT_CATEGORY=Object.freeze({LOW:'LOW',UTILITY:'UTILITY',WEAPON:'WEAPON'});
export function equipmentCategory(number){return number>=1&&number<=2?'LOW':number===3?'UTILITY':number===4||number===5?'WEAPON':null;}
const framework=run=>run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};
export function scopedAdventurerState(run,p,key,resetScope='COMBAT'){
  const f=framework(run);f.cardState||={};
  return f.cardState[p.playerId+':ad:'+key]||={resetScope,ownerId:p.playerId};
}
const owned=(p,id)=>p.augments?.includes(id);
const token=(run,p,ctx={})=>ctx.actionId||ctx.rootActionId||ctx.damageEventId||[run.id,run.currentRoomNodeId,run.combat?.id||'room',run.combat?.turn||run.roomState?.attempt||0,p.playerId,ctx.resolved?.cardInstanceId||'effect'].join(':');
function claim(run,p,id,scope,ctx={},component=''){
  const key=onceKey(run,p,id+':'+component,scope,ctx),f=framework(run);
  if(key&&f.once[key])return false;
  if(key)f.once[key]={scope,playerId:p.playerId,augmentId:id,component};
  return true;
}
function record(run,id,trigger,success,metrics={}){
  framework(run).telemetry.push({augmentId:id,trigger,triggerCount:1,successCount:success?1:0,...metrics});
}
function exp(run,p,id,amount,key){
  const result=grantAugmentExp(run,p,amount,id,key+':'+p.playerId);
  if(result.applied)record(run,id,'EXP_GRANT',true,{expGranted:amount});
  return result.applied;
}
function partyExp(run,owner,id,amount,key){for(const p of run.players)exp(run,p,id,amount,key+':'+owner.playerId);}
function partyGold(run,owner,id,amount,key){
  for(const p of run.players){const result=grantAugmentGold(run,p,amount,id,key+':'+owner.playerId+':'+p.playerId);if(result.applied)record(run,id,'GOLD_GRANT',true,{goldGranted:result.resourceDelta});}
}
function protect(run,p,id,target,amount){
  if(id==='aug-012')framework(run).statuses=framework(run).statuses.filter(x=>x.sourceId!==id||x.targetId!==target.playerId);
  upsertAugmentStatus(run,p,{statusId:'NEXT_DIRECT_DAMAGE_REDUCTION:'+id+':'+target.playerId,targetId:target.playerId,sourceId:id,payload:{amount}});
  record(run,id,'PROTECTION',true,{protectionApplied:amount});
}
function bonus(ctx,id,amount){ctx.resolved.adventurerBonuses||={};ctx.resolved.adventurerBonuses[id]=(ctx.resolved.adventurerBonuses[id]||0)+amount;}
const handlers={};
const register=(ids,trigger,handler)=>{for(const id of ids){handlers[id]||={};handlers[id][trigger]=handler;}};
register(['aug-001','aug-003','aug-006','aug-009'],'CARD_VALIDATED',(run,p,id,ctx)=>{
  const s=scopedAdventurerState(run,p,id),r=ctx.resolved;
  if(id==='aug-001')return Boolean(r.valid); // The fixed reference handler owns this card's public veteran resource.
  s.streak=r.valid?Math.min(id==='aug-006'?3:Number.MAX_SAFE_INTEGER,(s.streak||0)+1):0;
  const threshold=id==='aug-003'?3:id==='aug-009'?4:1,amount=id==='aug-009'?3:id==='aug-006'?s.streak:1;
  record(run,id,'STREAK',r.valid,{streakMax:s.streak});
  if(r.valid&&s.streak>=threshold){bonus(ctx,id,amount);return true;}return false;
});
register(['aug-002','aug-008'],'ON_ACQUIRE',(run,p,id,ctx)=>{
  if(!claim(run,p,id,'ONCE_PER_RUN',ctx,'hp'))return false;
  p.maxHp+=1;p.hp=Math.min(p.maxHp,p.hp+1);return true;
});
register(['aug-004'],'POST_COLLISION',(run,p,id,ctx)=>{
  const s=scopedAdventurerState(run,p,id);
  if(ctx.resolved?.invalidReason!=='COLLISION'||s.collided)return false;
  s.collided=true;return true;
});
register(['aug-004'],'CARD_VALIDATED',(run,p,id,ctx)=>{
  const s=scopedAdventurerState(run,p,id);
  return Boolean(ctx.resolved.valid&&s.collided&&claim(run,p,id,'ONCE_PER_COMBAT',ctx)&&exp(run,p,id,1,token(run,p,ctx)+':'+id));
});
register(['aug-005'],'BEFORE_PLAYER_DAMAGE',(run,p,id,ctx)=>{
  if(ctx.damageType!=='DIRECT'||!(ctx.incomingDamage?.amount>0)||!claim(run,p,id,'ONCE_PER_COMBAT',ctx))return false;
  ctx.incomingDamage.amount=Math.max(0,ctx.incomingDamage.amount-1);
  scopedAdventurerState(run,p,id).ready=true;record(run,id,'PROTECTION',true,{protectionApplied:1});return true;
});
register(['aug-005'],'CARD_VALIDATED',(run,p,id,ctx)=>{
  const s=scopedAdventurerState(run,p,id);
  if(!ctx.resolved.valid||!s.ready)return false;s.ready=false;bonus(ctx,id,1);return true;
});
register(['aug-007','aug-010'],'CARD_VALIDATED',(run,p,id,ctx)=>{
  const s=scopedAdventurerState(run,p,id);s.submitted=(s.submitted||0)+1;s.valid=(s.valid||0)+(ctx.resolved.valid?1:0);
  return Boolean(id==='aug-007'&&ctx.resolved.valid&&s.valid%3===0&&exp(run,p,id,1,token(run,p,ctx)+':'+id));
});
register(['aug-010'],'COMBAT_END',(run,p,id,ctx)=>{
  const s=scopedAdventurerState(run,p,id);
  return Boolean(run.combat?.monster?.hp<=0&&s.submitted>0&&s.valid*5>=s.submitted*4&&claim(run,p,id,'ONCE_PER_COMBAT',ctx)&&exp(run,p,id,3,token(run,p,ctx)+':'+id));
});

function equipment(run,p,ctx){
  const r=ctx.resolved,s=scopedAdventurerState(run,p,'equipment'),cycle=run.combat?.privateByPlayer?.[p.playerId]?.cycleIndex||1;
  if(s.cycle!==cycle){s.cycle=cycle;s.used=[];s.complete=false;s.ready=false;}
  const previous=s.lastNumber;s.lastNumber=r.finalNumber;
  const numberCategory=equipmentCategory(r.finalNumber);
  const submittedChoice=run.combat?.turnSubmissions?.[p.playerId]?.skillData?.equipmentCategory;
  const category=owned(p,'aug-020')?(submittedChoice||numberCategory):numberCategory;
  if(submittedChoice&&!Object.values(EQUIPMENT_CATEGORY).includes(submittedChoice))throw new Error('INVALID_EQUIPMENT_CATEGORY');
  // Weapon alternation is a successful number sequence, independent of the base per-cycle equipment use.
  if(owned(p,'aug-014')){
    if(r.valid&&numberCategory==='WEAPON'&&[4,5].includes(s.lastWeapon)&&s.lastWeapon!==r.finalNumber)bonus(ctx,'aug-014',1);
    s.lastWeapon=r.valid&&numberCategory==='WEAPON'?r.finalNumber:null;
  }
  const ready=s.ready;
  if(owned(p,'aug-018')&&r.valid&&ready){s.ready=false;protect(run,p,'aug-018',p,1);equipmentExp(run,p,'aug-018',1,s,ctx);bonus(ctx,'aug-018',1);}
  const active=r.valid&&category&&Number.isInteger(previous)&&previous!==r.finalNumber&&!s.used.includes(category);
  if(!active){
    if(!r.valid||category===s.lastCategory){s.retrofit=0;s.lastCategory=null;}
    return;
  }
  r.equipmentCategory=category;s.used.push(category);
  const retrofit=owned(p,'aug-017')&&s.lastCategory&&s.lastCategory!==category?Math.min(2,(s.retrofit||0)+1):0;
  s.retrofit=retrofit;s.lastCategory=category;
  const enhanced=owned(p,'aug-015')&&Math.abs(previous-r.finalNumber)>=2;
  const retroReady=retrofit===2;if(retroReady)s.retrofit=0;
  const capstone=owned(p,'aug-019');
  const source=capstone?'aug-019':'aug-011';
  const additions=(enhanced?1:0)+(retroReady?1:0);
  if(category==='LOW'){
    protect(run,p,source,p,(capstone?2:1)+additions);
    if(owned(p,'aug-012')){
      const target=run.players.filter(x=>x.status!=='DOWNED'&&x.hp>0).sort((a,b)=>a.hp-b.hp||a.seat-b.seat||a.playerId.localeCompare(b.playerId))[0];
      if(target)protect(run,p,'aug-012',target,1);
    }
  }else if(category==='UTILITY'){
    equipmentExp(run,p,source,capstone?2:1,s,ctx);
    if(owned(p,'aug-013')&&claim(run,p,'aug-013','ONCE_PER_COMBAT',ctx))equipmentExp(run,p,'aug-013',1,s,ctx);
    if(enhanced)equipmentExp(run,p,'aug-015',1,s,ctx);
    if(retroReady)equipmentExp(run,p,'aug-017',1,s,ctx);
  }else{
    bonus(ctx,source,capstone?4:1);
    if(enhanced)bonus(ctx,'aug-015',2);
    if(retroReady)bonus(ctx,'aug-017',2);
  }
  for(const id of ['aug-011','aug-019','aug-020'])if(owned(p,id))record(run,id,'EQUIPMENT_ACTIVATED',true);
  if(enhanced)record(run,'aug-015','EQUIPMENT_ENHANCED',true);
  if(retroReady)record(run,'aug-017','EQUIPMENT_ENHANCED',true);
  if(s.used.length===3&&!s.complete){
    s.complete=true;
    if(owned(p,'aug-016')){bonus(ctx,'aug-016',2);record(run,'aug-016','SET_COMPLETE',true);}
    if(owned(p,'aug-018'))s.ready=true;
  }
}
function equipmentExp(run,p,id,amount,s,ctx){
  const grant=Math.min(amount,Math.max(0,2-(s.exp||0)));
  if(grant&&exp(run,p,id,grant,token(run,p,ctx)+':equipment:'+id))s.exp=(s.exp||0)+grant;
}

function discovery(run,p,ctx){
  if(!owned(p,'aug-021'))return;
  const cards=ctx.cards||[],s=scopedAdventurerState(run,p,'miracle');
  if(cards.length!==4||cards.some(x=>!x.valid)||new Set(cards.map(x=>x.finalNumber)).size!==4||!claim(run,p,'aug-021','ONCE_PER_COMBAT',ctx))return;
  s.discovered=true;
  const floor=scopedAdventurerState(run,p,'discoveries','FLOOR');floor.count=(floor.count||0)+1;
  const key=token(run,p,ctx)+':discovery',rewardSource=owned(p,'aug-022')?'aug-022':'aug-021';
  partyExp(run,p,rewardSource,owned(p,'aug-022')?2:1,key);
  record(run,'aug-021','DISCOVERY',true);
  if(owned(p,'aug-024'))for(const target of run.players)upsertAugmentStatus(run,p,{statusId:'NEXT_VALID_DAMAGE:aug-024:'+target.playerId,targetId:target.playerId,sourceId:'aug-024',payload:{amount:1,afterTurn:run.combat.turn}});
  if(owned(p,'aug-025')&&['ELITE','ELITE_COMBAT','BOSS'].includes(run.combat.roomType))partyExp(run,p,'aug-025',2,key+':elite');
  if(owned(p,'aug-026')&&floor.count>=2&&claim(run,p,'aug-026','ONCE_PER_FLOOR',ctx))scopedAdventurerState(run,p,'shopDiscount','RUN').ready=true;
  if(owned(p,'aug-028')){
    partyExp(run,p,'aug-028',2,key+':extra');
    if(floor.count===3&&claim(run,p,'aug-028','ONCE_PER_FLOOR',ctx))partyExp(run,p,'aug-028',5,key+':third');
  }
}
register(['aug-023'],'MONSTER_KILLED',(run,p,id,ctx)=>{
  if(!(run.combat?.monster?.hp<=0))return false;
  if(!scopedAdventurerState(run,p,'miracle').discovered||!claim(run,p,id,'ONCE_PER_FLOOR',ctx))return false;
  partyGold(run,p,id,1,token(run,p,ctx)+':'+id);return true;
});
register(['aug-029','aug-030'],'BOSS_CLEAR',(run,p,id,ctx)=>{
  if(run.combat?.roomType!=='BOSS'||!(run.combat.monster?.hp<=0))return false;
  const count=scopedAdventurerState(run,p,'discoveries','FLOOR').count||0;
  if(count<(id==='aug-029'?2:3)||!claim(run,p,id,id==='aug-029'?'ONCE_PER_FLOOR':'ONCE_PER_RUN',ctx))return false;
  if(id==='aug-029')partyGold(run,p,id,1,token(run,p,ctx)+':'+id);
  else{
    const result=grantRelicOpportunity(run,p,{applicationId:run.id+':aug-030',sourceAugmentId:id});
    record(run,id,'RELIC_OPPORTUNITY',result.applied,{relicGranted:result.applied&&!result.pending?1:0,reason:result.reason});
  }
  return true;
});
register(['aug-027'],'REWARD_RANKED',(run,p,id,ctx)=>{
  if(run.phase!=='REWARD_ROOM')return false;
  if(!(ctx.rank>=0&&ctx.rank<2&&ctx.resolved?.valid)||!claim(run,p,id,'ONCE_PER_ROOM',ctx))return false;
  return Boolean(ctx.addCandidate?.());
});
export function assertAdventurerHandler(id){if(!ADVENTURER_CONTRACTS[id]||!ADVENTURER_HANDLER_IDS.includes(id))throw new Error('MISSING_ADVENTURER_HANDLER:'+id);}
export const ADVENTURER_HANDLER_IDS=Object.freeze([...Object.keys(handlers),'aug-011','aug-012','aug-013','aug-014','aug-015','aug-016','aug-017','aug-018','aug-019','aug-020','aug-021','aug-022','aug-024','aug-025','aug-026','aug-028'].filter((id,index,all)=>all.indexOf(id)===index).sort());
export function applyAdventurer(run,trigger,ctx={}){
  if(ctx.followUp)return [];
  const p=ctx.player;if(!p)return [];
  const ids=(p.augments||[]).filter(id=>ADVENTURER_CONTRACTS[id]);
  const hasNextDamage=Boolean(ctx.resolved?.adventurerBonuses&&Object.keys(ctx.resolved.adventurerBonuses).length)||framework(run).statuses.some(x=>x.targetId===p.playerId&&x.statusId.startsWith('NEXT_VALID_DAMAGE:'));
  if(!ids.length&&!hasNextDamage)return [];
  const room=ctx.roomTypeOverride|| (run.phase==='REWARD_ROOM'?'REWARD':run.phase);
  const allowed=ids.filter(id=>trigger==='ON_ACQUIRE'||ADVENTURER_CONTRACTS[id].roomApplicability[room]);
  if(!allowed.length&&!hasNextDamage)return [];
  const f=framework(run),key=token(run,p,ctx)+':ad-dispatch:'+trigger+(trigger==='ON_ACQUIRE'?':'+ids.join(','):'');
  if(f.grants[key])return [];
  f.grants[key]={sourceAugmentId:'ADVENTURER_DISPATCH'};
  if(trigger==='CARD_VALIDATED'&&ctx.resolved&&room==='COMBAT'){
    if(ids.some(id=>Number(id.slice(4))>=11&&Number(id.slice(4))<=20)&&owned(p,'aug-011'))equipment(run,p,ctx);
    discovery(run,p,ctx);
    if(ctx.resolved.valid){
      for(const status of [...f.statuses].filter(x=>x.targetId===p.playerId&&x.statusId.startsWith('NEXT_VALID_DAMAGE:')&&run.combat.turn>x.payload.afterTurn)){
        bonus(ctx,status.sourceId,status.payload.amount);consumeAugmentStatus(run,status);
      }
    }
  }
  if(trigger==='BEFORE_DAMAGE'&&ctx.resolved?.valid&&ctx.damage&&room==='COMBAT'){
    for(const [id,amount] of Object.entries(ctx.resolved.adventurerBonuses||{})){
      ctx.damage.amount+=amount;record(run,id,trigger,true,{bonusDamage:amount});
    }
  }
  const fired=[];
  for(const id of allowed){
    assertAdventurerHandler(id);
    const handler=handlers[id]?.[trigger];
    const success=handler?Boolean(handler(run,p,id,ctx)):false;
    record(run,id,trigger,success);
    if(success)fired.push({augmentId:id,trigger});
  }
  return fired;
}
export function adventurerShopPrice(run,p,price,{consume=false}={}){
  const s=framework(run).cardState?.[p.playerId+':ad:shopDiscount'];
  if(!s?.ready)return price;
  if(consume){s.ready=false;record(run,'aug-026','SHOP_PURCHASE',true,{costReduction:Math.min(1,price)});}
  return Math.max(0,price-1);
}
