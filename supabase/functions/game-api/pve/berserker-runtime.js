const framework=run=>run.augmentFramework||=( {once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0} );
const owned=(p,id)=>Boolean(p?.augments?.includes(id));
const turn=run=>Number(run.combat?.turn)||0;
const combat=run=>run.phase==='COMBAT'&&Boolean(run.combat);
function state(run,p){
  const f=framework(run);f.berserker||={};
  const s=f.berserker[p.playerId]||=( {combatId:run.combat?.id||null} );
  if(run.combat&&s.combatId!==run.combat.id)f.berserker[p.playerId]={combatId:run.combat.id};
  return f.berserker[p.playerId];
}
function mark(run,id,trigger,success=true,extra={}){
  framework(run).telemetry.push({augmentId:id,trigger,triggerCount:1,successCount:success?1:0,...extra});
}
function healCap(p){return owned(p,'aug-131')?p.maxHp:Math.min(p.maxHp,2);}
function actualHeal(run,p,amount,source,events=[]){
  const before=p.hp,after=Math.min(healCap(p),before+Math.max(0,Number(amount)||0)),healed=Math.max(0,after-before);
  p.hp=after;
  if(healed>0){
    events.push({type:'BERSERKER_AUGMENT_HEAL',playerId:p.playerId,sourceAugmentId:source,amount:healed,before,after});
    notifyBerserkerHeal(run,p,healed,source);
  }
  return healed;
}
function firstHp1(run,p,before,after,source){
  if(!(before>1&&after===1))return false;
  const s=state(run,p);if(s.firstHp1Reached)return false;
  s.firstHp1Reached=true;s.firstHp1Source=source;s.firstHp1Turn=turn(run);
  mark(run,'aug-149','FIRST_HP1',owned(p,'aug-149'),{firstHp1Triggers:owned(p,'aug-149')?1:0,source});
  if(owned(p,'aug-149')&&!s.used149){s.used149=true;s.greatRageStartTurn=turn(run)+1;s.greatRageEndTurn=turn(run)+2;s.greatRageGuard=1;}
  return true;
}
function recordBrawlEvent(run,p,type){
  if(!owned(p,'aug-139'))return;
  const s=state(run,p);
  if(s.lastBrawlEvent&&s.lastBrawlEvent!==type){
    s.brawl=Math.min(4,(Number(s.brawl)||0)+1);
    mark(run,'aug-139',type==='HEAL'?'ON_HEAL':'PLAYER_DAMAGED',true,{stackMax:s.brawl});
  }
  s.lastBrawlEvent=type;
}
export function notifyBerserkerHeal(run,p,amount,source='HEAL'){
  if(p?.characterId!=='berserker'||!(Number(amount)>0)||!combat(run))return;
  const s=state(run,p);
  if(owned(p,'aug-124')&&!s.mealGranted){s.mealGranted=true;s.mealReady=true;mark(run,'aug-124','ON_HEAL',true,{healAmount:amount});}
  if(owned(p,'aug-129')){s.vigor=Math.min(3,(Number(s.vigor)||0)+1);mark(run,'aug-129','ON_HEAL',true,{healAmount:amount,stackMax:s.vigor});}
  recordBrawlEvent(run,p,'HEAL');
  if(p.hp>1){s.rage143=0;s.hp1Streak145=0;s.hp1Streak148=0;s.rampageCharges=0;}
}
export function planBerserkerCollisionHeal(run,p,resolved,{amount=1,healCap:cap}={}){
  if(p?.characterId!=='berserker'||!combat(run))return {amount,healCap:cap};
  const s=state(run,p);let next=Math.max(0,Number(amount)||0);
  if(owned(p,'aug-146')&&p.hp===1&&!s.used146){
    s.used146=true;s.guard146=1;next=0;mark(run,'aug-146','POST_COLLISION',true,{protectionApplied:1});
  }else if(owned(p,'aug-132'))next+=1;
  if(owned(p,'aug-135')&&p.hp>=cap){s.guard135=1;mark(run,'aug-135','POST_COLLISION',true,{protectionApplied:1});}
  return {amount:next,healCap:cap};
}
export function afterBerserkerAttackCost(run,p,resolved,{before,after,cost,events=[]}={}){
  if(p?.characterId!=='berserker'||!combat(run))return;
  const s=state(run,p),t=turn(run);resolved.berserkerActualHpCost=cost;
  firstHp1(run,p,before,after,'BASE_BERSERKER_SELF_DAMAGE');
  if(resolved.revengeConsumed&&owned(p,'aug-137')&&!s.used137){
    s.used137=true;const healed=actualHeal(run,p,1,'aug-137',events);mark(run,'aug-137','POST_PLAYER_ATTACK',healed>0,{healAmount:healed,revengeConsumed:1});
  }
  if(!(cost>0))return;
  mark(run,'aug-121','POST_PLAYER_ATTACK',owned(p,'aug-121'),{selfDamageTaken:cost});
  if(resolved.berserkerHeal127&&!s.used127){s.used127=true;actualHeal(run,p,1,'aug-127',events);mark(run,'aug-127','POST_PLAYER_ATTACK',true,{healAmount:1});}
  if(owned(p,'aug-130')&&s.refund130Turn!==t){
    s.refund130Turn=t;const healed=actualHeal(run,p,1,'aug-130',events);mark(run,'aug-130','POST_PLAYER_ATTACK',healed>0,{healAmount:healed});
  }
}
function addBonus(r,key,n){if(n>0)r[key]=(Number(r[key])||0)+n;}
function applyIncoming(run,p,ctx,fired){
  if(ctx.damageType!=='DIRECT'||!ctx.incomingDamage)return;
  const s=state(run,p);let n=Math.max(0,Number(ctx.incomingDamage.amount)||0),t=turn(run);
  const reduce=(id,key,amount=1,consume=true)=>{
    if(n<=0||!(Number(s[key])>0))return false;
    const d=Math.min(amount,n);n-=d;if(consume)s[key]=Math.max(0,Number(s[key])-1);
    mark(run,id,'BEFORE_PLAYER_DAMAGE',true,{protectionConsumed:d});fired.push({augmentId:id,trigger:'BEFORE_PLAYER_DAMAGE'});return true;
  };
  if(owned(p,'aug-150')&&s.bloodArmorReady&&n>0){s.bloodArmorReady=false;n=0;mark(run,'aug-150','BEFORE_PLAYER_DAMAGE',true,{protectionConsumed:1});fired.push({augmentId:'aug-150',trigger:'BEFORE_PLAYER_DAMAGE'});}
  if(n>0&&owned(p,'aug-134')&&!s.used134){s.used134=true;n=Math.max(0,n-1);mark(run,'aug-134','BEFORE_PLAYER_DAMAGE',true,{protectionConsumed:1});fired.push({augmentId:'aug-134',trigger:'BEFORE_PLAYER_DAMAGE'});}
  if(n>0&&owned(p,'aug-144')&&p.hp===1&&!s.used144){s.used144=true;n=Math.max(0,n-1);mark(run,'aug-144','BEFORE_PLAYER_DAMAGE',true,{protectionConsumed:1});fired.push({augmentId:'aug-144',trigger:'BEFORE_PLAYER_DAMAGE'});}
  reduce('aug-135','guard135');reduce('aug-140','guard140');reduce('aug-146','guard146');reduce('aug-147','guard147');
  if(n>0&&owned(p,'aug-149')&&t>=Number(s.greatRageStartTurn)&&t<=Number(s.greatRageEndTurn)&&s.greatRageGuard>0)reduce('aug-149','greatRageGuard');
  if(n>0&&owned(p,'aug-139')&&(Number(s.brawl)||0)>=2&&s.brawlGuardTurn!==t){n=Math.max(0,n-1);s.brawl=Math.max(0,s.brawl-1);s.brawlGuardTurn=t;mark(run,'aug-139','BEFORE_PLAYER_DAMAGE',true,{protectionConsumed:1,stackMax:s.brawl});fired.push({augmentId:'aug-139',trigger:'BEFORE_PLAYER_DAMAGE'});}
  if(n>0&&owned(p,'aug-138')&&!s.used138&&n>=p.hp){s.used138=true;n=Math.max(0,p.hp-1);mark(run,'aug-138','BEFORE_PLAYER_DAMAGE',true,{protectionConsumed:1});fired.push({augmentId:'aug-138',trigger:'BEFORE_PLAYER_DAMAGE'});}
  ctx.incomingDamage.amount=n;
}
export function applyBerserker(run,trigger,ctx={}){
  const p=ctx.player;if(p?.characterId!=='berserker')return [];
  const has=(p.augments||[]).some(id=>{const n=Number(String(id).slice(4));return n>=121&&n<=150;});
  if(!has)return [];
  const fired=[],s=state(run,p),r=ctx.resolved,t=turn(run);
  if(trigger==='ON_ACQUIRE'){
    if(owned(p,'aug-150')){p.maxHp=1;p.hp=Math.min(p.hp,1);}
    else if(owned(p,'aug-141')){p.maxHp=Math.min(p.maxHp,2);p.hp=Math.min(p.hp,p.maxHp);}
    return fired;
  }
  if(trigger==='COMBAT_START'&&combat(run)){
    const keepMax=p.maxHp;
    framework(run).berserker[p.playerId]={combatId:run.combat.id,firstHp1Reached:p.hp===1};
    const ns=state(run,p);
    if(owned(p,'aug-150')){p.maxHp=1;p.hp=1;ns.bloodArmorReady=true;}
    else if(owned(p,'aug-141')){p.maxHp=Math.min(keepMax,2);p.hp=Math.min(p.hp,p.maxHp);}
    return fired;
  }
  if(!combat(run))return fired;
  if(trigger==='TURN_START')return fired;
  if(trigger==='BEFORE_PLAYER_DAMAGE'){applyIncoming(run,p,ctx,fired);return fired;}
  if(trigger==='PLAYER_DAMAGED'){
    const actual=Math.max(0,Number(ctx.damage?.amount)||0),before=Number(ctx.hpBefore),after=Number(ctx.hpAfter);
    firstHp1(run,p,before,after,'MONSTER_DAMAGE');
    if(ctx.damageType==='DIRECT'&&actual>0){
      if(owned(p,'aug-136')&&s.woundGainTurn!==t){s.woundGainTurn=t;s.woundMemory=Math.min(3,(Number(s.woundMemory)||0)+1);mark(run,'aug-136',trigger,true,{revengeGained:1,stackMax:s.woundMemory});fired.push({augmentId:'aug-136',trigger});}
      if(owned(p,'aug-140'))s.revenge140Ready=true;
      recordBrawlEvent(run,p,'DAMAGE');
    }
    return fired;
  }
  if(trigger==='POST_COLLISION'){
    const healed=Math.max(0,Number(r?.berserkerCollisionHeal)||0);
    if(healed>0)notifyBerserkerHeal(run,p,healed,'BERSERKER_COLLISION');
    return fired;
  }
  if(trigger==='CARD_VALIDATED'&&r){
    const valid=Boolean(r.valid),cost=valid&&p.hp>1?1:0,final=Number(r.finalNumber);
    r.berserkerExpectedHpCost=cost;
    if(owned(p,'aug-121')){r.bloodFrenzyExpectedHpCost=cost;}
    if(owned(p,'aug-123')&&valid&&s.speedReady){addBonus(r,'berserker123Bonus',1);s.speedReady=false;}
    if(owned(p,'aug-124')&&valid&&cost&&s.mealReady){addBonus(r,'berserker124Bonus',2);s.mealReady=false;}
    if(owned(p,'aug-125')){s.costStreak=valid&&cost?(Number(s.costStreak)||0)+1:0;if(s.costStreak>=2)addBonus(r,'berserker125Bonus',2);}
    if(owned(p,'aug-126')){
      if(s.pursuitTurn===t&&valid&&final>Number(s.pursuitNumber))addBonus(r,'berserker126Bonus',2);
      if(s.pursuitTurn===t)delete s.pursuitTurn;
    }
    if(owned(p,'aug-127')&&valid&&cost&&!s.used127){s.costCount127=(Number(s.costCount127)||0)+1;if(s.costCount127>=2)r.berserkerHeal127=true;}
    if(owned(p,'aug-128')){s.bloodStorm=valid&&cost?Math.min(4,(Number(s.bloodStorm)||0)+1):0;if(s.bloodStorm)addBonus(r,'berserker128Bonus',s.bloodStorm);if(s.bloodStorm===4&&!s.extra128Used){s.extra128Used=true;r.berserker128Extra=2;}}
    if(owned(p,'aug-129')&&valid&&cost&&(Number(s.vigor)||0)>0){addBonus(r,'berserker129Bonus',2*s.vigor);s.vigor=0;}
    if(valid&&cost){if(owned(p,'aug-123'))s.speedReady=true;if(owned(p,'aug-126')){s.pursuitTurn=t+1;s.pursuitNumber=final;}}
    if(valid&&r.revengeConsumed){
      if(owned(p,'aug-133'))addBonus(r,'berserker133Bonus',1);
      if(owned(p,'aug-136')&&(Number(s.woundMemory)||0)>0){addBonus(r,'berserker136Bonus',s.woundMemory);s.woundMemory=0;}
      if(owned(p,'aug-140')&&s.revenge140Ready){addBonus(r,'berserker140Bonus',4);s.revenge140Ready=false;s.guard140=1;}
    }
    if(owned(p,'aug-139')&&valid&&(Number(s.brawl)||0)>0)addBonus(r,'berserker139Bonus',s.brawl);
    if(owned(p,'aug-141')&&valid&&p.hp===1)addBonus(r,'berserker141Bonus',2);
    if(owned(p,'aug-142')&&valid&&p.hp===1)addBonus(r,'berserker142Bonus',1);
    if(owned(p,'aug-143')){
      if(valid&&p.hp===1)s.rage143=Math.min(3,(Number(s.rage143)||0)+1);else s.rage143=0;
      if(valid&&p.hp===1)addBonus(r,'berserker143Bonus',s.rage143);
    }
    if(owned(p,'aug-145')){
      if(valid&&p.hp===1&&(Number(s.rampageCharges)||0)>0){addBonus(r,'berserker145Bonus',2);s.rampageCharges--;}
      if(valid&&p.hp===1)s.hp1Streak145=(Number(s.hp1Streak145)||0)+1;else s.hp1Streak145=0;
      if(s.hp1Streak145>=2&&!s.used145){s.used145=true;s.rampageCharges=2;}
    }
    if(owned(p,'aug-147')&&valid&&p.hp===1&&(final===4||final===5))s.guard147=1;
    if(owned(p,'aug-148')){
      if(valid&&p.hp===1)s.hp1Streak148=(Number(s.hp1Streak148)||0)+1;else s.hp1Streak148=0;
      if(s.hp1Streak148>=3&&!s.used148){s.used148=true;addBonus(r,'berserker148Bonus',4);r.berserker148Extra=2;}
    }
    if(owned(p,'aug-149')&&valid&&t>=Number(s.greatRageStartTurn)&&t<=Number(s.greatRageEndTurn)&&s.greatRageDamageTurn!==t){s.greatRageDamageTurn=t;addBonus(r,'berserker149Bonus',3);}
    if(owned(p,'aug-150')&&valid)addBonus(r,'berserker150Bonus',3);
    return fired;
  }
  if(trigger==='BEFORE_DAMAGE'&&r&&ctx.damage&&!ctx.followUp){
    const keys=['berserker123Bonus','berserker124Bonus','berserker125Bonus','berserker126Bonus','berserker128Bonus','berserker129Bonus','berserker133Bonus','berserker136Bonus','berserker139Bonus','berserker140Bonus','berserker141Bonus','berserker142Bonus','berserker143Bonus','berserker145Bonus','berserker148Bonus','berserker149Bonus','berserker150Bonus'];
    let bonus=0;for(const k of keys)bonus+=Math.max(0,Number(r[k])||0);
    if(owned(p,'aug-122')&&(r.berserkerExpectedHpCost>0||(r.berserkerExpectedHpCost==null&&r.valid&&p.hp>1)))bonus+=1;
    if(owned(p,'aug-133')&&r.valid&&r.revengeConsumed&&!Number(r.berserker133Bonus))bonus+=1;
    if(owned(p,'aug-142')&&r.valid&&p.hp===1&&!Number(r.berserker142Bonus))bonus+=1;
    if(bonus>0){ctx.damage.amount+=bonus;mark(run,'BERSERKER_V02',trigger,true,{bonusDamage:bonus});}
    const extra=Math.max(0,Number(r.berserker128Extra)||0)+Math.max(0,Number(r.berserker148Extra)||0);
    if(extra>0&&Array.isArray(ctx.followUps))ctx.followUps.push({sourcePlayerId:p.playerId,amount:extra,tags:['BERSERKER_EXTRA_COMPONENT'],followUp:true,followUpDepth:1});
    return fired;
  }
  return fired;
}
