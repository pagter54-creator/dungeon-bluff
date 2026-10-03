import {GUNNER_CONTRACTS} from './gunner-contracts.js';
const owns=(p,id)=>p.augments?.includes(id);
const cycle=(run,p)=>run.combat?.privateByPlayer?.[p.playerId]?.cycleIndex||1;
const turn=run=>run.combat?.turn||0;
const root=(run,p,r)=>'action:'+run.combat?.id+':'+turn(run)+':'+p.playerId+':'+(r?.cardInstanceId||'turn');
export function gunnerState(run,p){
  run.augmentFramework||={};run.augmentFramework.cardState||={};
  return run.augmentFramework.cardState[p.playerId+':gunner']||={
    ownerId:p.playerId,scope:'RUN',resetScope:'RUN',sourceAugmentId:'GUNNER_RUNTIME',overheatCap:3,overheatResetScope:'COMBAT_END',overheat:0,accuracy:0,weakness:0,output:0,output269:0,
    precisionShot:{armed:true,activationId:null},aug253:{preservationUsedThisCombat:false,preservedForCycleId:null},
    applied:{},once:{},telemetry:{augment:{},burstAttempts:0,burstSuccess:0,burstFailures:0,derivedCardsUsed:0,burstDamage:0,failureSelfDamage:0,precisionTriggers:0,defensePenetrated:0,overheatGained:0,overheatConsumed:0,maxOverheatReached:0}
  };
}
function fire(s,id){
  const row=s.telemetry.augment[id]||={augmentId:id,triggerCount:0,successCount:0};row.triggerCount++;row.successCount++;
}
function once(run,p,s,id,r=null){
  const contract=GUNNER_CONTRACTS[id];const scope=contract.onceScope;
  const key=id+':'+(scope==='ONCE_PER_COMBAT'?'combat':scope==='ONCE_PER_TURN'?'turn:'+turn(run):scope==='ONCE_PER_BURST'?'burst:'+root(run,p,r):'cycle:'+cycle(run,p));
  if(scope==='NONE')return true;if(s.once[key])return false;s.once[key]=true;return true;
}
function heat(run,p,s,delta){
  const before=s.overheat;s.overheat=Math.max(0,Math.min(3,before+delta));
  if(delta>0)s.telemetry.overheatGained+=s.overheat-before;else s.telemetry.overheatConsumed+=before-s.overheat;
  if(before<3&&s.overheat===3){s.telemetry.maxOverheatReached++;
    if(owns(p,'aug-267')&&once(run,p,s,'aug-267')){s.overheat=1;s.telemetry.overheatConsumed+=2;fire(s,'aug-267');}
    else s.blockedTurn=turn(run)+1;
  }
}
export function ensureGunnerMagazine(run,p){
  if(p.characterId!=='gunner'||!owns(p,'aug-241'))return false;
  const base=p.cardPool.filter(c=>c.source==='BASE');
  if(base.length!==3)return false;
  const id=p.playerId+':gunner:expanded:2';
  if(p.cardPool.some(c=>c.id===id))return false;
  const card={id,baseNumber:2,source:'BASE'};
  // Preserve every existing physical card identity/number, insert the new 2 before 3.
  const index=p.cardPool.findIndex(c=>c.baseNumber===3);p.cardPool.splice(index<0?p.cardPool.length:index,0,card);
  for(const priv of [run.combat?.privateByPlayer?.[p.playerId],run.cardCycles?.[p.playerId]].filter(Boolean)){
    if(!priv.remainingCardIds.includes(id)&&!priv.spentCardIds.includes(id))priv.remainingCardIds.push(id);
  }
  fire(gunnerState(run,p),'aug-241');return true;
}
export function resolveGunnerSelected(run,p,r,submission,events=[]){
  if(run.phase!=='COMBAT'||p.characterId!=='gunner')return false;
  const s=gunnerState(run,p),key=root(run,p,r)+':selected';
  if(s.applied[key]){Object.assign(r,s.applied[key]);return true;}
  const priv=run.combat.privateByPlayer[p.playerId],isActivation=Boolean(submission?.skillIntent);
  r.gunnerWeaknessBefore=s.weakness;
  r.gunnerSpentBefore=priv.spentCardIds.length;r.gunnerRemainingBefore=priv.remainingCardIds.length;
  r.gunnerPreviousFinal=s.previousFinal??null;
  if(owns(p,'aug-252')&&r.valid&&!s.setupSeenCycle){s.setupSeenCycle=true;s.precisionSetup=true;fire(s,'aug-252');r.gunnerSetupCreated=true;}
  if(owns(p,'aug-251')&&isActivation){
    r.precisionShot=true;r.skillUsed='precision_shot';
    s.precisionShot.armed=false;s.precisionShot.activationId=root(run,p,r);
    // A retried preserved use is consumed normally; the combat once flag remains spent.
    s.aug253.preservedForCycleId=null;
    if(r.valid){
      s.telemetry.precisionTriggers++;fire(s,'aug-251');
      if(owns(p,'aug-256')){r.gunnerWeaknessBonus=s.weakness;s.weakness=Math.min(3,s.weakness+1);fire(s,'aug-256');}
      if(owns(p,'aug-259')){r.gunnerAccuracyBonus=s.accuracy;s.accuracy=Math.min(4,s.accuracy+1);s.accuracyCollisionCount=0;fire(s,'aug-259');}
    }else if(r.invalidReason==='COLLISION'){
      if(owns(p,'aug-253')&&!s.aug253.preservationUsedThisCombat){s.precisionShot.armed=true;s.aug253.preservationUsedThisCombat=true;s.aug253.preservedForCycleId=String(cycle(run,p));fire(s,'aug-253');}
      if(owns(p,'aug-259')){s.accuracyCollisionCount=(s.accuracyCollisionCount||0)+1;s.accuracy=s.accuracyCollisionCount===1?Math.max(0,s.accuracy-1):0;fire(s,'aug-259');}
    }
    p.publicResources.fullBurstReady=s.precisionShot.armed;
  }else if(isActivation){
    const activation=s.activation||{heatBefore:s.overheat};
    markGunnerBurstPhase(run,p,r,'SELECTED_CARD_RESOLUTION');
    markGunnerBurstPhase(run,p,r,'BURST_SUCCESS_OR_FAILURE');
    s.telemetry.burstAttempts++;r.skillUsed='full_burst';r.fullBurstOutcome=r.valid?'SUCCESS':r.invalidReason==='COLLISION'?'FAIL_COLLISION':'FAIL_INVALID';
    r.gunnerHeatBefore=activation.heatBefore;r.gunnerHeatAtResolution=s.overheat;
    r.gunnerForced=Boolean(activation.forced);
    p.publicResources.fullBurstReady=false;
    if(r.valid){
      r.followUpCardIds=priv.remainingCardIds.filter(id=>id!==r.cardInstanceId);
      r.gunnerExtraCount=r.followUpCardIds.length;r.gunnerExtraCountAtActivation=activation.remainingCardIds?.length??r.gunnerExtraCount;s.telemetry.burstSuccess++;s.telemetry.derivedCardsUsed+=r.followUpCardIds.length;
      p.publicResources.burstReadyCycle=cycle(run,p)+(owns(p,'aug-261')||owns(p,'aug-269')?1:2);
      s.afterBurstCycle=cycle(run,p)+1;s.newCycleFirstValidUsed=false;
      if(owns(p,'aug-266')){s.output=Math.min(3,s.output+1);fire(s,'aug-266');}
      if(owns(p,'aug-269')){s.output269=Math.min(3,s.output269+1);fire(s,'aug-269');}
    }else{
      s.telemetry.burstFailures++;p.publicResources.burstReadyCycle=cycle(run,p)+1;
      if(r.invalidReason==='COLLISION'){r.burstMisfire=true;if(owns(p,'aug-261'))heat(run,p,s,1);}
      if(r.gunnerForced){r.burstMisfire=true;s.overheat=3;s.blockedTurn=turn(run)+1;}
      if(owns(p,'aug-266')){s.output=Math.max(0,s.output-2);fire(s,'aug-266');}
      if(owns(p,'aug-269')){s.output269=0;fire(s,'aug-269');}
    }
    if(owns(p,'aug-270')&&r.gunnerForced){r.gunner270Valid=r.valid;fire(s,'aug-270');}
  }
  if(r.valid&&s.afterBurstCycle===cycle(run,p)&&!s.newCycleFirstValidUsed){
    s.newCycleFirstValidUsed=true;
    for(const id of ['aug-243','aug-245'])if(owns(p,id)&&once(run,p,s,id)){r.gunnerReloadBonus=(r.gunnerReloadBonus||0)+1;fire(s,id);}
    if(owns(p,'aug-249')&&once(run,p,s,'aug-249')){s.nextBurstBonus=3;fire(s,'aug-249');}
  }
  s.previousFinal=r.finalNumber;
  // Save only adjudication fields: same root cannot gain stacks, consume resources or redo counters.
  s.applied[key]=Object.fromEntries(Object.entries(r).filter(([k])=>k.startsWith('gunner')||['precisionShot','skillUsed','followUpCardIds','fullBurstOutcome','burstMisfire'].includes(k)));
  return true;
}
export function gunnerPenetration(run,p,r,defense){
  if(run.phase!=='COMBAT'||p.characterId!=='gunner'||!r.valid||!r.precisionShot||!owns(p,'aug-257'))return 0;
  const s=gunnerState(run,p),key=root(run,p,r)+':penetration';
  if(key in s.applied)return s.applied[key];
  const amount=Math.min(1,Math.max(0,defense));s.applied[key]=0;
  if(amount&&once(run,p,s,'aug-257')){s.applied[key]=amount;s.telemetry.defensePenetrated+=amount;fire(s,'aug-257');r.penetratedDefenseAmount=amount;return amount;}
  return 0;
}
export function gunnerExtraComponent(run,p,r){
  if(run.phase!=='COMBAT'||!r.valid||r.fullBurstOutcome!=='SUCCESS'||r.gunnerExtraCountAtActivation!==3||!owns(p,'aug-248'))return null;
  const s=gunnerState(run,p),key=root(run,p,r)+':component';
  if(s.applied[key])return null;if(!once(run,p,s,'aug-248'))return null;
  s.applied[key]=true;fire(s,'aug-248');s.telemetry.burstDamage+=5;
  return {amount:5,sourceAugmentId:'aug-248',damageTaxonomy:'EXTRA_DAMAGE_COMPONENT',extraDamageComponent:true,createsSeparateHit:false,retriggerOnHit:false,derivedUse:false};
}
export function applyGunnerRuntime(run,trigger,ctx={}){
  const results=[];
  for(const p of ctx.player?[ctx.player]:run.players||[]){
    if(p.characterId!=='gunner')continue;
    if(trigger==='ON_ACQUIRE'){if(run.phase==='COMBAT')ensureGunnerMagazine(run,p);continue;}
    if(run.phase!=='COMBAT'&&trigger!=='COMBAT_END')continue;
    const s=gunnerState(run,p),r=ctx.resolved,key=root(run,p,r)+':'+trigger+':'+(ctx.followUp?ctx.sourceCardId||'derived':'primary');
    if(trigger==='COMBAT_START'){
      if(s.combatId===run.combat?.id)continue;
      const persistent=s.output269,telemetry=s.telemetry;delete run.augmentFramework.cardState[p.playerId+':gunner'];
      const fresh=gunnerState(run,p);fresh.combatId=run.combat?.id;fresh.output269=persistent;fresh.telemetry=telemetry;
      if(p.persistentCharacterState.gunnerMagazineOverridePending){fire(fresh,'aug-241');delete p.persistentCharacterState.gunnerMagazineOverridePending;}
      ensureGunnerMagazine(run,p);continue;
    }
    if(trigger==='COMBAT_END'){
      s.overheat=0;s.accuracy=0;s.weakness=0;s.output=0;s.precisionSetup=false;s.activation=null;s.precisionShot={armed:false,activationId:null};s.once={};s.applied={};s.burstActions={};s.blockedTurn=null;s.blockedResolvedTurn=null;s.burstUsedTurn=null;s.previousFinal=null;s.setupSeenCycle=false;s.nextBurstBonus=0;s.afterBurstCycle=null;s.aug253={preservationUsedThisCombat:false,preservedForCycleId:null};continue;
    }
    if(trigger==='CYCLE_END'){
      s.precisionShot={armed:true,activationId:null};s.aug253.preservedForCycleId=null;s.precisionSetup=false;s.setupSeenCycle=false;continue;
    }
    if(s.applied[key]){if(trigger==='BEFORE_DAMAGE'&&ctx.damage)ctx.damage.amount=s.applied[key].amount;continue;}
    if(trigger==='TURN_START'){
      syncGunnerMagazine(run,p);
      const priv=run.combat?.privateByPlayer?.[p.playerId];
      // Availability is refreshed below and mirrored after its predicate is final.
      if(owns(p,'aug-251'))p.publicResources.fullBurstReady=s.precisionShot.armed;
      else if(owns(p,'aug-261'))p.publicResources.fullBurstReady=cycle(run,p)>=(p.publicResources.burstReadyCycle||1);
      if(s.blockedTurn===turn(run)){
        if(!(owns(p,'aug-270')&&!s.once['aug-270:combat'])){p.publicResources.fullBurstReady=false;s.overheat=1;s.blockedResolvedTurn=turn(run);}
      }
      syncGunnerMagazine(run,p);continue;
    }
    if(trigger==='ON_SKILL_USE'&&!ctx.followUp){
      if(owns(p,'aug-251')){if(!s.precisionShot.armed)throw new Error('PRECISION_SHOT_UNAVAILABLE');s.precisionShot.activationId=root(run,p,r);}
      else{
        const forced=s.blockedTurn===turn(run)&&owns(p,'aug-270')&&once(run,p,s,'aug-270');
        const remainingAtActivation=(run.combat?.privateByPlayer?.[p.playerId]?.remainingCardIds||[]).filter(id=>id!==r?.cardInstanceId);
        s.activation={rootActionId:root(run,p,r),cycleId:cycle(run,p),remainingCardIds:[...remainingAtActivation],heatBefore:s.overheat,forced};
        markGunnerBurstPhase(run,p,r,'BURST_ACTIVATION');
        s.burstUsedTurn=turn(run);if(owns(p,'aug-261')){heat(run,p,s,1);fire(s,'aug-261');}
      }
    }
    if(trigger==='TURN_END'&&owns(p,'aug-261')&&s.burstUsedTurn!==turn(run)&&s.blockedResolvedTurn!==turn(run)){
      heat(run,p,s,owns(p,'aug-263')?-2:-1);fire(s,owns(p,'aug-263')?'aug-263':'aug-261');
    }
    if(trigger==='BEFORE_DAMAGE'&&r?.valid&&ctx.damage){
      let bonus=0;
      const add=(id,n,condition=true)=>{if(owns(p,id)&&condition&&once(run,p,s,id,r)){bonus+=n;fire(s,id);}};
      if(ctx.followUp){
        if(r.fullBurstOutcome==='SUCCESS'&&owns(p,'aug-242')&&s.extraBonusRoot!==root(run,p,r)){s.extraBonusRoot=root(run,p,r);s.extraBonusCount=0;}
        if(r.fullBurstOutcome==='SUCCESS'&&owns(p,'aug-242')&&s.extraBonusCount<3){bonus++;s.extraBonusCount++;fire(s,'aug-242');}
      }else{
        bonus+=r.gunnerReloadBonus||0;
        if(r.precisionShot){
          bonus+=r.gunnerSpentBefore===0?0:r.gunnerSpentBefore===1?1:owns(p,'aug-258')&&r.gunnerRemainingBefore===1?6:3;
          if(owns(p,'aug-258')&&r.gunnerRemainingBefore===1){fire(s,'aug-258');if(s.precisionSetup)bonus+=2;}
          if(s.precisionSetup&&!r.gunnerSetupCreated){add('aug-252',1);s.precisionSetup=false;}
          add('aug-254',2,r.gunnerRemainingBefore===1);
          add('aug-255',2,r.gunnerPreviousFinal!=null&&Math.abs(r.gunnerPreviousFinal-r.finalNumber)>=2);
          bonus+=(r.gunnerWeaknessBonus||0)+(r.gunnerAccuracyBonus||0);
          if(r.gunnerWeaknessBefore>=3&&r.gunnerRemainingBefore===1&&owns(p,'aug-260')&&once(run,p,s,'aug-260')){bonus+=7;s.weakness=0;fire(s,'aug-260');}
        }
        if(r.fullBurstOutcome==='SUCCESS'){
          add('aug-244',1,r.gunnerExtraCount>=2);add('aug-246',4,r.gunnerExtraCount===3);
          add('aug-247',3,r.gunnerExtraCount===1);add('aug-250',5,r.gunnerExtraCount===0);
          if(s.nextBurstBonus){bonus+=s.nextBurstBonus;s.nextBurstBonus=0;}
          add('aug-262',1,r.gunnerHeatAtResolution>=1);add('aug-264',1,r.gunnerHeatBefore>=2);
          add('aug-265',3,r.gunnerHeatAtResolution===2);add('aug-268',4,r.gunnerHeatAtResolution===3);
          bonus+=(owns(p,'aug-266')?s.output:0)+(owns(p,'aug-269')?s.output269:0);
          if(r.gunner270Valid)bonus+=8;
        }
      }
      ctx.damage.amount=Math.max(0,ctx.damage.amount+bonus);
      if(r.fullBurstOutcome==='SUCCESS')s.telemetry.burstDamage+=ctx.damage.amount;
      s.applied[key]={amount:ctx.damage.amount};results.push({playerId:p.playerId,trigger,bonus});continue;
    }
    s.applied[key]=true;
  }
  return results;
}

export function markGunnerBurstPhase(run,p,r,phase){
  if(run.phase!=='COMBAT'||p.characterId!=='gunner'||r?.precisionShot)return;
  const s=gunnerState(run,p),id=root(run,p,r);
  s.burstActions||={};
  const action=s.burstActions[id]||={rootActionId:id,ownerId:p.playerId,cycleId:cycle(run,p),phases:[],derivedUse:false};
  if(!action.phases.includes(phase))action.phases.push(phase);
}
export function syncGunnerMagazine(run,p){
  const priv=run.combat?.privateByPlayer?.[p.playerId];if(!priv||p.characterId!=='gunner')return;
  const s=gunnerState(run,p);
  s.magazine={magazineCardInstanceIds:p.cardPool.map(c=>c.id),remaining:[...priv.remainingCardIds],used:[...priv.spentCardIds],magazineSize:p.cardPool.length,cycleIndex:priv.cycleIndex,burstAvailability:p.publicResources.fullBurstReady===true,burstReadyCycle:p.publicResources.burstReadyCycle};
}
