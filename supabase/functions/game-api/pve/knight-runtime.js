import {resourceMax} from './resources.js';
import {findAugmentStatus,consumeAugmentStatus,recoverPhysicalCard,upsertAugmentStatus} from './augment-framework.js';

const state=run=>(run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0});
const kstate=(run,player)=>{
  const f=state(run);f.knight||={};return f.knight[player.playerId]||=( {combatId:run.combat?.id||null} );
};
const owned=(p,id)=>p?.augments?.includes(id);
const room=run=>run.phase==='COMBAT'?'COMBAT':run.phase==='EVENT'?'EVENT':run.phase==='REWARD_ROOM'?'REWARD':null;
const cycle=(run,p,ctx={})=>ctx.privateState?.cycleIndex??run.combat?.privateByPlayer?.[p.playerId]?.cycleIndex??run.roomState?.privateByPlayer?.[p.playerId]?.cycleIndex??1;
const cap=(p)=>resourceMax(p,'toughnessCharges',2);
const gain=(p,n)=>{const before=Math.max(0,Number(p.publicResources.toughnessCharges)||0);p.publicResources.toughnessCharges=Math.min(cap(p),before+Math.max(0,n));return p.publicResources.toughnessCharges-before;};
const mark=(run,id,trigger,success,extra={})=>{state(run).telemetry.push({augmentId:id,trigger,triggerCount:1,successCount:success?1:0,...extra});};
const setOnce=(s,key,value=true)=>{if(s[key])return false;s[key]=value;return true;};
const usedSkill=(s,run)=>s.toughnessUsedTurn===Number(run.combat?.turn??run.roomState?.attempt??run.roomState?.turn??1);
const crush=r=>Boolean(r?.valid&&r?.collisionImmune&&Number(r?.crushedCardCount)>0);

function armStatus(run,owner,statusId,sourceId,targetId=owner.playerId,payload={}){
  return upsertAugmentStatus(run,owner,{statusId,targetId,sourceId,resetScope:'COMBAT',payload});
}
function consumeSourceStatus(run,sourceId,targetId){
  const item=state(run).statuses
    .filter(x=>x.sourceId===sourceId&&x.targetId===targetId)
    .sort((a,b)=>(a.appliedAt||0)-(b.appliedAt||0)||String(a.ownerId).localeCompare(String(b.ownerId)))[0];
  if(item)consumeAugmentStatus(run,item);
  return item||null;
}
function nextCycleBonus(player,amount=1){
  player.persistentCharacterState.knightNextCycleToughness=(Number(player.persistentCharacterState.knightNextCycleToughness)||0)+amount;
}
export function consumeKnightNextCycleBonus(player){
  const amount=Math.max(0,Number(player?.persistentCharacterState?.knightNextCycleToughness)||0);
  if(!amount)return 0;
  delete player.persistentCharacterState.knightNextCycleToughness;
  return gain(player,amount);
}
export function knightFreeUseAvailable(player,privateState){
  if(!owned(player,'aug-038'))return false;
  const ci=privateState?.cycleIndex??1;
  return privateState?.knightToughnessFreeUsedCycle!==ci;
}
export function applyKnight(run,trigger,ctx={}){
  const p=ctx.player;if(!p)return [];
  const fired=[],r=ctx.resolved,s=kstate(run,p),rm=room(run),ci=cycle(run,p,ctx);
  const fire=(id,ok,extra={})=>{mark(run,id,trigger,ok,extra);if(ok)fired.push({augmentId:id,trigger});return ok;};

  // Effects applied to a guarded ally are owned by another Knight.
  if(trigger==='BEFORE_DAMAGE'&&rm==='COMBAT'&&r?.valid&&ctx.damage){
    const guarded=consumeSourceStatus(run,'aug-043',p.playerId);
    if(guarded){ctx.damage.amount+=1;fire('aug-043',true,{bonusDamage:1,ownerId:guarded.ownerId});}
  }

  if(p.characterId!=='warrior')return fired;
  const hasKnight=(p.augments||[]).some(id=>/^aug-0(?:3[1-9]|4[0-9]|5[0-9]|60)$/.test(id));
  if(!hasKnight)return fired;

  if(trigger==='COMBAT_START'){
    s.combatId=run.combat?.id||null;s.initialHp=p.hp;s.advance=0;
    if(owned(p,'aug-032'))fire('aug-032',gain(p,1)>0,{toughnessGained:1});
    return fired;
  }
  if(trigger==='ON_SKILL_USE'){
    if(!ctx.submission?.skillIntent)return fired;
    s.toughnessUsedTurn=Number(run.combat?.turn??run.roomState?.attempt??run.roomState?.turn??1);
    s.toughnessUsedCycle=ci;
    if(owned(p,'aug-038')&&ctx.privateState&&ctx.privateState.knightToughnessFreeUsedCycle!==ci){
      ctx.privateState.knightToughnessFreeUsedCycle=ci;
      ctx.submission.knightFreeToughness=true;
      fire('aug-038',true,{freeUseCount:1});
    }
    return fired;
  }
  if(trigger==='POST_COLLISION'){
    const didCrush=crush(r),used=Boolean(ctx.submission?.skillIntent??usedSkill(s,run));
    if(rm==='COMBAT'&&owned(p,'aug-034')&&didCrush&&s.refund034Cycle!==ci){s.refund034Cycle=ci;fire('aug-034',gain(p,1)>0,{toughnessGained:1});}
    if(rm==='COMBAT'&&owned(p,'aug-035')&&used&&!r?.collisionEventId&&s.refund035Cycle!==ci){s.refund035Cycle=ci;fire('aug-035',gain(p,1)>0,{toughnessGained:1});}
    if(rm==='COMBAT'&&owned(p,'aug-036')&&didCrush){s.armed036=true;s.armed036Turn=Number(run.combat?.turn||0);fire('aug-036',true);}
    if(rm==='COMBAT'&&owned(p,'aug-039')&&didCrush&&!s.acquired039){s.acquired039=true;armStatus(run,p,'NEXT_DIRECT_DAMAGE_REDUCTION:aug-039:'+p.playerId,'aug-039',p.playerId,{amount:1});fire('aug-039',true,{protectionApplied:1});}
    if(owned(p,'aug-044')&&r?.guardianSacrifice&&r.guardianRescueTargetId&&s.reserve044Cycle!==ci){s.reserve044Cycle=ci;nextCycleBonus(p,1);fire('aug-044',true,{toughnessGained:1});}
    if(owned(p,'aug-045')&&r?.guardianSacrifice&&r.cardInstanceId&&s.recovered045Cycle!==ci){
      s.pending045={cycleIndex:ci,cardInstanceId:r.cardInstanceId};fire('aug-045',true);
    }
    if(rm==='COMBAT'&&owned(p,'aug-043')&&r?.guardianSacrifice&&r.guardianRescueTargetId){
      armStatus(run,p,'GUARDED_NEXT_VALID_ATTACK_043','aug-043',r.guardianRescueTargetId,{armedTurn:Number(run.combat?.turn||0)});fire('aug-043',true);
    }
    if(rm==='COMBAT'&&owned(p,'aug-054')&&didCrush&&s.refund054Cycle!==ci){s.refund054Cycle=ci;fire('aug-054',gain(p,1)>0,{toughnessGained:1,cardsCrushed:Number(r.crushedCardCount)||0});}
    if(rm==='COMBAT'&&owned(p,'aug-056')&&didCrush){s.armed056=true;s.armed056Turn=Number(run.combat?.turn||0);fire('aug-056',true);}
    if(rm==='COMBAT'&&owned(p,'aug-057')&&didCrush&&s.breakthroughReady){
      s.breakthroughReady=false;r.knight057Bonus=1;gain(p,1);fire('aug-057',true,{toughnessGained:1,bonusDamage:1});
    }
    if(rm==='COMBAT'&&owned(p,'aug-059')&&didCrush&&Number(r.crushedCardCount)>=2&&!s.used059&&run.combat?.monster){
      s.used059=true;const before=Math.max(0,Number(run.combat.monster.defense)||0);run.combat.monster.defense=Math.max(0,before-1);
      fire('aug-059',true,{armorPenetrated:before-run.combat.monster.defense});
    }
    if(rm==='COMBAT'&&owned(p,'aug-060')&&didCrush){
      s.advance=Math.min(4,(Number(s.advance)||0)+1);r.knightCrush060=true;r.knightAdvanceStacks=s.advance;
      fire('aug-060',true,{stackMax:s.advance,cardsCrushed:Number(r.crushedCardCount)||0});
    }
    return fired;
  }
  if(trigger==='CARD_VALIDATED'&&rm==='COMBAT'&&r?.valid){
    const turn=Number(run.combat?.turn||0);
    if(owned(p,'aug-036')&&s.armed036&&turn>s.armed036Turn){r.knight036Bonus=1;s.armed036=false;}
    if(owned(p,'aug-056')&&s.armed056&&turn>s.armed056Turn){r.knight056Bonus=1;s.armed056=false;}
    if(owned(p,'aug-060')&&!r.knightCrush060)r.knightAdvanceStacks=Number(s.advance)||0;
    return fired;
  }
  if(trigger==='BEFORE_DAMAGE'&&rm==='COMBAT'&&r?.valid&&ctx.damage){
    let bonus=0;
    if(r.knight036Bonus)bonus+=1;
    if(owned(p,'aug-053')&&crush(r)&&Number(r.finalNumber)===5){bonus+=1;fire('aug-053',true,{bonusDamage:1});}
    if(owned(p,'aug-055')&&crush(r)&&Number(r.crushedCardCount)>=2){bonus+=3;fire('aug-055',true,{bonusDamage:3,cardsCrushed:Number(r.crushedCardCount)});}
    if(r.knight056Bonus)bonus+=1;
    if(r.knight057Bonus)bonus+=1;
    if(owned(p,'aug-058')&&crush(r)){const b=Math.min(4,Math.max(0,Number(r.crushedCardCount)||0)*2);bonus+=b;if(b)fire('aug-058',true,{bonusDamage:b,cardsCrushed:Number(r.crushedCardCount)||0});}
    if(owned(p,'aug-060')){const stacks=Math.max(0,Number(r.knightAdvanceStacks??s.advance)||0);bonus+=stacks;if(stacks)mark(run,'aug-060',trigger,true,{bonusDamage:stacks,stackMax:stacks});}
    if(bonus>0)ctx.damage.amount+=bonus;
    return fired;
  }
  if(trigger==='AFTER_DAMAGE'&&rm==='COMBAT'&&r?.valid&&owned(p,'aug-060')&&!r.knightCrush060&&s.decayed060Turn!==Number(run.combat?.turn||0)){
    const before=Math.max(0,Number(s.advance)||0);s.advance=Math.max(0,before-1);s.decayed060Turn=Number(run.combat?.turn||0);
    if(before!==s.advance)fire('aug-060',true,{stackMax:before});
    return fired;
  }
  if(trigger==='BEFORE_PLAYER_DAMAGE'&&rm==='COMBAT'&&ctx.damageType==='DIRECT'&&ctx.incomingDamage){
    if(owned(p,'aug-033')&&usedSkill(s,run)&&s.reduced033Turn!==s.toughnessUsedTurn&&ctx.incomingDamage.amount>0){
      ctx.incomingDamage.amount=Math.max(0,ctx.incomingDamage.amount-1);s.reduced033Turn=s.toughnessUsedTurn;fire('aug-033',true,{redirectDamage:1});
    }
    if(owned(p,'aug-042')&&ctx.redirectedFrom&&ctx.redirectSource===p.playerId&&!s.used042&&ctx.incomingDamage.amount>0){
      s.used042=true;ctx.incomingDamage.amount=Math.max(0,ctx.incomingDamage.amount-1);fire('aug-042',true,{redirectDamage:1});
    }
    if(owned(p,'aug-050')&&ctx.redirectedFrom&&ctx.redirectSource===p.playerId&&!s.used050&&ctx.incomingDamage.amount>=p.hp&&p.hp>0){
      const before=ctx.incomingDamage.amount;ctx.incomingDamage.amount=Math.max(0,p.hp-1);s.used050=true;
      for(const ally of run.players.filter(x=>x.status!=='DOWNED'))armStatus(run,p,'NEXT_DIRECT_DAMAGE_REDUCTION:aug-050:'+p.playerId,'aug-050',ally.playerId,{amount:1});
      fire('aug-050',true,{redirectDamage:before-ctx.incomingDamage.amount,protectionApplied:run.players.filter(x=>x.status!=='DOWNED').length});
    }
    return fired;
  }
  if(trigger==='PLAYER_DAMAGED'&&rm==='COMBAT'){
    if(owned(p,'aug-037')&&!s.used037&&Number(ctx.hpBefore)>=2&&Number(ctx.hpAfter)===1){
      s.used037=true;fire('aug-037',gain(p,1)>0,{toughnessGained:1});
    }
    if(owned(p,'aug-047')&&ctx.redirectedFrom&&ctx.redirectSource===p.playerId&&Number(ctx.damage?.amount)>0&&Number(ctx.hpAfter)===1&&!s.used047){
      s.used047=true;armStatus(run,p,'NEXT_DIRECT_DAMAGE_REDUCTION:aug-047:'+p.playerId,'aug-047',p.playerId,{amount:1});fire('aug-047',true,{protectionApplied:1});
    }
    return fired;
  }
  if(trigger==='TURN_END'){
    if(owned(p,'aug-045')&&s.pending045&&s.pending045.cycleIndex===ci&&s.recovered045Cycle!==ci){
      const card=p.cardPool?.find(x=>x.id===s.pending045.cardInstanceId);
      const out=card?.source==='BASE'?recoverPhysicalCard(run,p,s.pending045.cardInstanceId,{privateState:ctx.privateState,rootActionId:'aug-045:'+run.id+':'+p.playerId+':'+ci}):{applied:false};
      if(out.applied){s.recovered045Cycle=ci;mark(run,'aug-045',trigger,true,{recoveryCount:1});}
      delete s.pending045;
    }
    if(owned(p,'aug-057')&&rm==='COMBAT'&&Number(p.publicResources.toughnessCharges||0)===cap(p)&&!usedSkill(s,run)&&s.armed057Cycle!==ci){
      s.armed057Cycle=ci;s.breakthroughReady=true;fire('aug-057',true,{stackMax:1});
    }
    return fired;
  }
  if(trigger==='CYCLE_END'){
    if(owned(p,'aug-040')&&rm==='COMBAT'&&Number(p.publicResources.toughnessCharges||0)>=1&&s.reserve040Cycle!==ci){
      s.reserve040Cycle=ci;nextCycleBonus(p,1);fire('aug-040',true,{toughnessGained:1});
    }
    return fired;
  }
  if(trigger==='COMBAT_END'||trigger==='RUN_END'){
    delete p.persistentCharacterState.knightNextCycleToughness;
    return fired;
  }
  return fired;
}
