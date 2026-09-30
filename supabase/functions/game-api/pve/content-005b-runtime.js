import {resourceMax} from './resources.js';
import {grantAugmentExp,upsertAugmentStatus} from './augment-framework.js';

const IDS=new Set(['aug-004','aug-015','aug-016','aug-062','aug-084','aug-088','aug-095','aug-122','aug-125','aug-133','aug-142']);
const category=n=>n<=2?'LOW':n===3?'UTILITY':'WEAPON';
const framework=run=>run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};
function cardState(run,player,id){
  const f=framework(run);f.cardState||={};
  const key=player.playerId+':'+id;
  return f.cardState[key]||=( {resetScope:'COMBAT',ownerId:player.playerId,combatId:run.combat?.id||null} );
}
const mark=(run,id,trigger,success,extra={})=>{
  const f=framework(run);
  f.telemetry.push({augmentId:id,trigger,triggerCount:1,successCount:success?1:0,...extra});
};
const playerOwned=(player,id)=>player.augments?.includes(id);
function runRule(run,id,trigger,ctx){
  const p=ctx.player,r=ctx.resolved;
  if(!p||!playerOwned(p,id))return false;
  const s=cardState(run,p,id),turn=run.combat?.turn||0;
  if(id==='aug-004'){
    if(trigger==='POST_COLLISION'&&r?.invalidReason==='COLLISION'&&!s.collided){s.collided=true;mark(run,id,trigger,true);return true;}
    if(trigger==='CARD_VALIDATED'&&r?.valid&&s.collided&&!s.used){
      const result=grantAugmentExp(run,p,1,id,`aug-004:${run.combat.id}`);
      s.used=true;mark(run,id,trigger,result.applied,{expGranted:result.applied?1:0});return result.applied;
    }
  }
  if(id==='aug-015'){
    if(trigger==='CARD_VALIDATED'){
      const prior=s.lastNumber,current=r?.finalNumber;
      const active=Boolean(r?.valid&&Number.isInteger(prior)&&Number.isInteger(current)&&Math.abs(current-prior)>=2);
      s.lastNumber=current;
      if(!active)return false;
      const kind=category(current);
      if(kind==='LOW')upsertAugmentStatus(run,p,{statusId:'NEXT_DIRECT_DAMAGE_REDUCTION:aug-015',targetId:p.playerId,sourceId:id,payload:{amount:1}});
      if(kind==='UTILITY')grantAugmentExp(run,p,1,id,`aug-015:${run.combat.id}:${turn}:${p.playerId}`);
      if(kind==='WEAPON')r.equipmentChangeBonus=2;
      mark(run,id,trigger,true,{bonusDamage:kind==='WEAPON'?2:0,expGranted:kind==='UTILITY'?1:0});
      return true;
    }
    if(trigger==='BEFORE_DAMAGE'&&r?.equipmentChangeBonus&&ctx.damage){ctx.damage.amount+=r.equipmentChangeBonus;return true;}
  }
  if(id==='aug-016'){
    if(trigger==='CARD_VALIDATED'&&r?.valid){
      const cycle=run.combat?.privateByPlayer?.[p.playerId]?.cycleIndex;
      if(s.cycle!==cycle){s.cycle=cycle;s.categories=[];s.used=false;}
      const kind=category(r.finalNumber);
      if(!s.categories.includes(kind))s.categories.push(kind);
      if(s.categories.length===3&&!s.used){s.used=true;r.equipmentCompletionBonus=2;mark(run,id,trigger,true,{bonusDamage:2});return true;}
    }
    if(trigger==='BEFORE_DAMAGE'&&r?.equipmentCompletionBonus&&ctx.damage){ctx.damage.amount+=2;return true;}
  }
  if(id==='aug-062'){
    if(trigger==='BEFORE_DAMAGE'&&r?.valid&&r.soloLowest&&r.finalNumber===1&&ctx.damage){ctx.damage.amount+=1;mark(run,id,trigger,true,{bonusDamage:1});return true;}
  }
  if(id==='aug-084'||id==='aug-088'){
    if(trigger==='CARD_VALIDATED'&&r){
      const prior=s.lastNumber,current=r.finalNumber;
      const jump=Boolean(r.valid&&Number.isInteger(prior)&&Math.abs(current-prior)>=3);
      const direction=jump?Math.sign(current-prior):0;
      r.content005bBonuses||={};
      if(id==='aug-084')r.content005bBonuses[id]=jump&&s.lastJumpTurn===turn-1?1:0;
      if(id==='aug-088')r.content005bBonuses[id]=jump&&s.lastDirection&&direction!==s.lastDirection?3:0;
      if(jump){s.lastJumpTurn=turn;s.lastDirection=direction;}
      else if(id==='aug-084')s.lastJumpTurn=null;
      s.lastNumber=current;
      if(r.content005bBonuses[id]){mark(run,id,trigger,true,{bonusDamage:r.content005bBonuses[id]});return true;}
    }
    if(trigger==='BEFORE_DAMAGE'&&r?.content005bBonuses?.[id]&&ctx.damage){ctx.damage.amount+=r.content005bBonuses[id];return true;}
  }
  if(id==='aug-095'){
    if(trigger==='TURN_START'){s.fullAtTurn=Number(p.publicResources.mana)===resourceMax(p,'mana',4)?turn:null;return false;}
    if(trigger==='BEFORE_DAMAGE'&&r?.valid&&r.skillUsed==='amplify'&&s.fullAtTurn===turn&&ctx.damage){ctx.damage.amount+=2;mark(run,id,trigger,true,{bonusDamage:2});return true;}
  }
  if(id==='aug-122'){
    if(trigger==='BEFORE_DAMAGE'&&r?.valid&&p.hp>1&&ctx.damage){ctx.damage.amount+=1;mark(run,id,trigger,true,{bonusDamage:1});return true;}
  }
  if(id==='aug-125'){
    if(trigger==='CARD_VALIDATED'&&r){
      s.streak=r.valid&&p.hp>1?(s.streak||0)+1:0;
      if(s.streak>=2){r.content005bBonuses||={};r.content005bBonuses[id]=2;}
    }
    if(trigger==='BEFORE_DAMAGE'&&r?.content005bBonuses?.[id]&&ctx.damage){ctx.damage.amount+=2;mark(run,id,trigger,true,{bonusDamage:2});return true;}
  }
  if(id==='aug-133'){
    if(trigger==='BEFORE_DAMAGE'&&r?.valid&&r.revengeConsumed&&ctx.damage){ctx.damage.amount+=1;mark(run,id,trigger,true,{bonusDamage:1});return true;}
  }
  if(id==='aug-142'){
    if(trigger==='BEFORE_DAMAGE'&&r?.valid&&p.hp===1&&ctx.damage){ctx.damage.amount+=1;mark(run,id,trigger,true,{bonusDamage:1});return true;}
  }
  return false;
}
const TRIGGERS=Object.freeze({
  POST_COLLISION:['aug-004'],
  CARD_VALIDATED:['aug-004','aug-015','aug-016','aug-084','aug-088','aug-125'],
  TURN_START:['aug-095'],
  BEFORE_DAMAGE:['aug-015','aug-016','aug-062','aug-084','aug-088','aug-095','aug-122','aug-125','aug-133','aug-142']
});
export function applyContent005B(run,trigger,ctx={}){
  if(run.phase!=='COMBAT'||ctx.followUp)return [];
  const candidates=TRIGGERS[trigger]||[],p=ctx.player;
  if(!p)return [];
  const owned=new Set(p.augments||[]);
  const fired=[];
  for(const id of candidates)if(owned.has(id)&&runRule(run,id,trigger,ctx))fired.push({augmentId:id,trigger});
  return fired;
}
export function content005BImplemented(id){return IDS.has(id);}
