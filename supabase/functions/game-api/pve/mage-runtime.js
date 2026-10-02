import {resourceMax} from './resources.js';
import {upsertAugmentStatus,consumeAugmentStatus} from './augment-framework.js';

const framework=run=>(run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0});
const owned=(p,id)=>Boolean(p?.augments?.includes(id));
const turn=run=>Number(run.combat?.turn??run.roomState?.attempt??run.roomState?.turn??1);
const cycle=(run,p,ctx={})=>ctx.privateState?.cycleIndex??run.combat?.privateByPlayer?.[p.playerId]?.cycleIndex??run.roomState?.privateByPlayer?.[p.playerId]?.cycleIndex??1;
const combatRoom=run=>run.phase==='COMBAT';
const alive=run=>run.players.filter(p=>p.status!=='DOWNED').sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
const mark=(run,id,trigger,success,extra={})=>framework(run).telemetry.push({augmentId:id,trigger,triggerCount:1,successCount:success?1:0,...extra});
const fire=(run,fired,id,trigger,success,extra={})=>{mark(run,id,trigger,success,extra);if(success)fired.push({augmentId:id,trigger});return success;};

function mstate(run,p){
  const f=framework(run);f.mage||={};
  return f.mage[p.playerId]||={combatId:run.combat?.id||null,symmetry117:0,symmetry120:0};
}
function maxMana(p){return resourceMax(p,'mana',4);}
function gainMana(run,p,amount,id,trigger,extra={}){
  const before=Math.max(0,Number(p.publicResources?.mana)||0),after=Math.min(maxMana(p),before+Math.max(0,Number(amount)||0));
  p.publicResources.mana=after;const gained=after-before;
  mark(run,id,trigger,gained>0,{manaGained:gained,manaRefunded:gained,...extra});
  return gained;
}
function armReduction(run,owner,target,id){
  upsertAugmentStatus(run,owner,{statusId:`NEXT_DIRECT_DAMAGE_REDUCTION:${id}:${owner.playerId}:${target.playerId}`,targetId:target.playerId,sourceId:id,resetScope:'COMBAT',payload:{amount:1}});
}
function blessingStatus(run,owner,target,id,amount=2){
  upsertAugmentStatus(run,owner,{statusId:`MAGE_BLESSING:${id}:${owner.playerId}:${target.playerId}`,targetId:target.playerId,sourceId:id,resetScope:'COMBAT',payload:{amount}});
}
function harmfulMonsterStatuses(run,targetId){
  return (framework(run).statuses||[]).filter(item=>item.targetId===targetId&&item.sourceType==='MONSTER'&&item.payload?.harmful!==false)
    .sort((a,b)=>(Number(a.appliedAt)||0)-(Number(b.appliedAt)||0)||String(a.statusId).localeCompare(String(b.statusId)));
}
function processActualWhiteHeal(run,mage,target,before,healed,fired=[]){
  if(!(healed>0))return;
  const s=mstate(run,mage),t=turn(run);
  if(owned(mage,'aug-102')&&!s.used102&&before===1){armReduction(run,mage,target,'aug-102');s.used102=true;fire(run,fired,'aug-102','ON_HEAL',true,{healAmount:healed,targetId:target.playerId,protectionApplied:1});}
  if(owned(mage,'aug-103')&&s.refund103Turn!==t){const gained=gainMana(run,mage,1,'aug-103','ON_HEAL',{healAmount:healed,targetId:target.playerId});s.refund103Turn=t;if(gained)fired.push({augmentId:'aug-103',trigger:'ON_HEAL'});}
  if(owned(mage,'aug-104')&&!s.used104){blessingStatus(run,mage,target,'aug-104',2);s.used104=true;fire(run,fired,'aug-104','ON_HEAL',true,{healAmount:healed,targetId:target.playerId});}
  if(owned(mage,'aug-107')&&!s.used107){const status=harmfulMonsterStatuses(run,target.playerId)[0];if(status){consumeAugmentStatus(run,status);s.used107=true;fire(run,fired,'aug-107','ON_HEAL',true,{healAmount:healed,targetId:target.playerId,statusCleansed:1,statusId:status.statusId});}}
  if(owned(mage,'aug-109')){armReduction(run,mage,target,'aug-109');fire(run,fired,'aug-109','ON_HEAL',true,{healAmount:healed,targetId:target.playerId,protectionApplied:1});}
  if(owned(mage,'aug-110')){blessingStatus(run,mage,target,'aug-110',2);fire(run,fired,'aug-110','ON_HEAL',true,{healAmount:healed,targetId:target.playerId});}
}

export function mageNaturalManaRecovery(run,p){
  if(p?.characterId!=='mage'||p.status==='DOWNED')return 0;
  const s=mstate(run,p),t=turn(run),before=Math.max(0,Number(p.publicResources.mana)||0);let amount=1;
  if(s.skipNaturalTurn===t){amount=0;delete s.skipNaturalTurn;mark(run,'aug-097','TURN_START',true,{manaGained:0,naturalRecoverySkipped:1});}
  if(s.extraNaturalTurn===t){amount+=1;delete s.extraNaturalTurn;const id=s.extraNaturalSource||'aug-096';delete s.extraNaturalSource;mark(run,id,'TURN_START',true,{manaGained:1});}
  const after=Math.min(maxMana(p),before+amount);p.publicResources.mana=after;return after-before;
}

export function resolveMageWhiteMagicCollision(run,resolved,group,events=[]){
  const mage=run.players.find(p=>p.playerId===resolved?.playerId);
  if(!combatRoom(run)||mage?.characterId!=='mage'||!owned(mage,'aug-101')||!(Number(resolved?.resourceSpent)>0)||resolved.valid)return {healAmount:0,triggered:false};
  const s=mstate(run,mage),t=turn(run),candidates=group.filter(card=>card.playerId!==mage.playerId).map(card=>run.players.find(p=>p.playerId===card.playerId)).filter(p=>p&&p.status!=='DOWNED');
  if(!candidates.length)return {healAmount:0,triggered:false};
  const bySeat=[...candidates].sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
  let targets=[bySeat[0]];
  if(owned(mage,'aug-105')&&candidates.length>=2&&s.white105Turn!==t){targets=[...candidates].sort((a,b)=>a.hp-b.hp||a.seat-b.seat||a.playerId.localeCompare(b.playerId)).slice(0,2);s.white105Turn=t;mark(run,'aug-105','POST_COLLISION',true,{healTargets:targets.length});}
  const fired=[],heals=[];let total=0;
  const healTarget=(target,source='aug-101')=>{
    const before=target.hp;
    if(before>=target.maxHp&&owned(mage,'aug-106')){
      armReduction(run,mage,target,'aug-106');mark(run,'aug-106','POST_COLLISION',true,{targetId:target.playerId,protectionApplied:1,healAmount:0});
      events.push({type:'WHITE_MAGIC_BARRIER',phase:'POST_COLLISION_EFFECTS',playerId:mage.playerId,targetId:target.playerId,sourceAugmentId:'aug-106',amount:1});
      heals.push({targetId:target.playerId,before,after:before,amount:0,source,barrier:true});return;
    }
    const after=Math.min(target.maxHp,before+1),healed=Math.max(0,after-before);target.hp=after;total+=healed;
    heals.push({targetId:target.playerId,before,after,amount:healed,source});
    const healEventId=`heal:white:${run.combat?.id||run.id}:${t}:${mage.playerId}:${target.playerId}:${source}`;
    events.push({type:'WHITE_MAGIC_HEAL',phase:'POST_COLLISION_EFFECTS',collisionEventId:resolved.collisionEventId||null,healEventId,playerId:mage.playerId,targetId:target.playerId,requestedHeal:1,amount:healed,before,after,wastedHeal:1-healed,sourceAugmentId:source});
    if(healed>0){events.push({type:'PLAYER_HEALED',phase:'POST_COLLISION_EFFECTS',collisionEventId:resolved.collisionEventId||null,healEventId,playerId:target.playerId,sourcePlayerId:mage.playerId,source:'WHITE_MAGIC',amount:healed,before,after});processActualWhiteHeal(run,mage,target,before,healed,fired);}
  };
  for(const target of targets)healTarget(target,'aug-101');
  if(owned(mage,'aug-108')&&!s.used108){
    const excluded=new Set([mage.playerId,...targets.map(x=>x.playerId)]),extra=alive(run).filter(p=>!excluded.has(p.playerId)).sort((a,b)=>a.hp-b.hp||a.seat-b.seat||a.playerId.localeCompare(b.playerId))[0];
    if(extra){s.used108=true;healTarget(extra,'aug-108');mark(run,'aug-108','POST_COLLISION',true,{healTargets:1,targetId:extra.playerId});}
  }
  resolved.whiteMagicTargetId=targets[0]?.playerId||null;resolved.whiteMagicHeal=total;resolved.whiteMagicHeals=heals;
  mark(run,'aug-101','POST_COLLISION',true,{healAmount:total,healTargets:heals.filter(x=>x.amount>0).length});
  return {healAmount:total,triggered:true,fired};
}

export function applyMageCollisionCorrection(run,cards,groups,events=[]){
  if(!combatRoom(run))return groups;
  const ordered=[...cards].sort((a,b)=>{const pa=run.players.find(p=>p.playerId===a.playerId),pb=run.players.find(p=>p.playerId===b.playerId);return (pa?.seat??999)-(pb?.seat??999)||a.playerId.localeCompare(b.playerId);});
  for(const rc of ordered){
    const mage=run.players.find(p=>p.playerId===rc.playerId);if(mage?.characterId!=='mage'||rc.skillUsed!=='reverse_math')continue;
    if(cards.filter(x=>x.finalNumber===rc.finalNumber).length<2)continue;
    const s=mstate(run,mage),dir=Math.sign(Number(rc.skillValue)||0),ci=cycle(run,mage,{});let next=null,source=null;
    const free=n=>Number.isInteger(n)&&n>=0&&n<=6&&!cards.some(x=>x!==rc&&x.finalNumber===n);
    if(owned(mage,'aug-115')&&s.correct115Cycle!==ci){const candidate=rc.finalNumber+dir;if(free(candidate)){next=candidate;source='aug-115';s.correct115Cycle=ci;}}
    if(next==null&&owned(mage,'aug-118')&&(Number(s.correct118Count)||0)<2){const preferred=rc.finalNumber+dir,other=rc.finalNumber-dir;next=free(preferred)?preferred:free(other)?other:null;if(next!=null){source='aug-118';s.correct118Count=(Number(s.correct118Count)||0)+1;}}
    if(next==null)continue;
    const before=rc.finalNumber;rc.finalNumber=next;rc.workingNumber=next;rc.numberHistory.postStealNumber=next;rc.numberHistory.finalNumber=next;rc.mageAutoCorrectedBy=source;rc.mageAutoCorrectionBefore=before;
    events.push({type:'MAGE_COLLISION_AUTO_CORRECTED',phase:'COLLISION_RESOLVE',playerId:mage.playerId,sourceAugmentId:source,before,after:next,turn:turn(run)});mark(run,source,'COLLISION_RESOLVE',true,{reversePlusCount:dir>0?1:0,reverseMinusCount:dir<0?1:0});
  }
  const rebuilt=new Map();for(const rc of cards){const a=rebuilt.get(rc.finalNumber)||[];a.push(rc);rebuilt.set(rc.finalNumber,a);}return rebuilt;
}

function processBlessings(run,p,ctx,fired){
  if(!combatRoom(run)||ctx.followUp||ctx.resolved?.valid!==true||!ctx.damage)return;
  const items=(framework(run).statuses||[]).filter(item=>item.targetId===p.playerId&&String(item.statusId).startsWith('MAGE_BLESSING:')).sort((a,b)=>(a.appliedAt||0)-(b.appliedAt||0)||String(a.sourceId).localeCompare(String(b.sourceId)));
  for(const item of items){
    const amount=Math.max(0,Number(item.payload?.amount)||0);ctx.damage.amount+=amount;consumeAugmentStatus(run,item);
    const owner=run.players.find(x=>x.playerId===item.ownerId);if(item.sourceId==='aug-110'&&owner){const gained=gainMana(run,owner,1,'aug-110','BEFORE_DAMAGE',{targetId:p.playerId,bonusDamage:amount});if(gained)fired.push({augmentId:'aug-110',trigger:'BEFORE_DAMAGE'});}else mark(run,item.sourceId,'BEFORE_DAMAGE',true,{targetId:p.playerId,bonusDamage:amount});
  }
}

export function applyMage(run,trigger,ctx={}){
  const p=ctx.player;if(!p)return [];
  const fired=[];processBlessings(run,p,ctx,fired);
  if(p.characterId!=='mage')return fired;
  const hasMage=(p.augments||[]).some(id=>{const n=Number(String(id).slice(4));return n>=91&&n<=120;});if(!hasMage)return fired;
  const s=mstate(run,p),r=ctx.resolved,t=turn(run),rm=combatRoom(run);
  if(trigger==='COMBAT_START'){
    framework(run).mage[p.playerId]={combatId:run.combat?.id||null,symmetry117:0,symmetry120:0};
    if(owned(p,'aug-091')){p.publicResources.manaMax=Math.max(6,Number(p.publicResources.manaMax)||0);fire(run,fired,'aug-091',trigger,true,{manaMax:p.publicResources.manaMax});}
    if(owned(p,'aug-092')||owned(p,'aug-099'))p.publicResources.manaMax=7;
    if(owned(p,'aug-092')){const before=Number(p.publicResources.mana)||0;p.publicResources.mana=Math.min(maxMana(p),Math.max(1,before));mark(run,'aug-092',trigger,true,{manaGained:p.publicResources.mana-before});}
    return fired;
  }
  if(trigger==='TURN_START'&&rm){if(owned(p,'aug-095')&&Number(p.publicResources.mana)===maxMana(p))s.fullManaTurn=t;return fired;}
  if(trigger==='CARD_VALIDATED'&&rm&&r){
    const valid=Boolean(r.valid),amplify=r.skillUsed==='amplify',reverse=r.skillUsed==='reverse_math',spent=Math.max(0,Number(r.resourceSpent)||0),direction=Math.sign(Number(r.skillValue)||0),magnitude=Math.abs(Number(r.skillValue)||0);
    if(valid&&s.next100&&s.next100.armedTurn<t){r.mage100NextBonus=2;delete s.next100;}
    if(amplify){
      if(valid&&owned(p,'aug-093')&&s.refund093Turn!==t){const gained=gainMana(run,p,1,'aug-093',trigger);s.refund093Turn=t;if(gained)fired.push({augmentId:'aug-093',trigger});}
      if(valid&&owned(p,'aug-094')&&spent>=4)r.mage094Bonus=2;
      if(valid&&owned(p,'aug-095')&&s.fullManaTurn===t)r.mage095Bonus=2;
      if(valid&&owned(p,'aug-096')&&(s.last096TriggerTurn==null||t-s.last096TriggerTurn>1)){s.extraNaturalTurn=t+1;s.extraNaturalSource='aug-096';s.last096TriggerTurn=t;fire(run,fired,'aug-096',trigger,true,{manaGained:1});}
      if(valid&&owned(p,'aug-097')&&spent>=6){r.mage097Bonus=4;s.skipNaturalTurn=t+1;}
      if(valid&&owned(p,'aug-098')&&s.refund098Turn!==t){const refund=Math.min(2,Math.floor(spent/2));const gained=gainMana(run,p,refund,'aug-098',trigger);s.refund098Turn=t;if(gained)fired.push({augmentId:'aug-098',trigger});}
      if(valid&&owned(p,'aug-099')&&spent===7)r.mage099Bonus=3;
      if(valid&&owned(p,'aug-100')&&!s.used100&&Number(r.resourceBefore)===maxMana(p)&&spent===Number(r.resourceBefore)){r.mage100Bonus=4;s.used100=true;s.next100={armedTurn:t};}
    }
    if(reverse){
      fire(run,fired,'aug-111',trigger,true,{reversePlusCount:direction>0?1:0,reverseMinusCount:direction<0?1:0,manaSpent:spent});
      const last=s.lastSuccessfulReverseDirection||0,alternating=valid&&last!==0&&direction!==last;
      if(valid&&owned(p,'aug-112')&&direction<0&&s.refund112Turn!==t){const gained=gainMana(run,p,1,'aug-112',trigger);s.refund112Turn=t;if(gained)fired.push({augmentId:'aug-112',trigger});}
      if(valid&&owned(p,'aug-113')&&(Number(r.finalNumber)===0||Number(r.finalNumber)>=6)&&s.boundary113Turn!==t){r.mage113Bonus=2;const gained=gainMana(run,p,1,'aug-113',trigger);s.boundary113Turn=t;if(gained||r.mage113Bonus)fired.push({augmentId:'aug-113',trigger});}
      if(valid&&owned(p,'aug-114')&&alternating)r.mage114Bonus=1;
      if(valid&&owned(p,'aug-116')&&magnitude===2&&spent===4&&!s.used116){s.extraNaturalTurn=t+1;s.extraNaturalSource='aug-116';s.used116=true;fire(run,fired,'aug-116',trigger,true,{manaGained:1});}
      if(owned(p,'aug-117')&&valid&&alternating)s.symmetry117=Math.min(3,(Number(s.symmetry117)||0)+1);
      if(valid&&owned(p,'aug-119')&&direction<0&&magnitude===2&&spent===4)r.mage119Bonus=3;
      if(owned(p,'aug-120')){
        if(valid&&alternating)s.symmetry120=Math.min(4,(Number(s.symmetry120)||0)+1);
        else if(!valid||(valid&&last!==0&&direction===last))s.symmetry120=Math.max(0,(Number(s.symmetry120)||0)-1);
        if(valid)r.mage120Bonus=Number(s.symmetry120)||0;
      }
      if(valid&&owned(p,'aug-117'))r.mage117Bonus=Number(s.symmetry117)||0;
      if(valid){if(owned(p,'aug-114')&&alternating)fire(run,fired,'aug-114',trigger,true,{bonusDamage:1});s.lastSuccessfulReverseDirection=direction;}
      if(owned(p,'aug-120'))mark(run,'aug-120',trigger,valid,{symmetryStackMax:s.symmetry120,reversePlusCount:valid&&direction>0?1:0,reverseMinusCount:valid&&direction<0?1:0});
    }
    return fired;
  }
  if(trigger==='BEFORE_DAMAGE'&&rm&&r?.valid&&ctx.damage&&!ctx.followUp){
    let bonus=0;const bonuses=[['aug-094','mage094Bonus'],['aug-095','mage095Bonus'],['aug-097','mage097Bonus'],['aug-099','mage099Bonus'],['aug-100','mage100Bonus'],['aug-100','mage100NextBonus'],['aug-113','mage113Bonus'],['aug-114','mage114Bonus'],['aug-117','mage117Bonus'],['aug-119','mage119Bonus'],['aug-120','mage120Bonus']];
    for(const [id,key] of bonuses){const amount=Math.max(0,Number(r[key])||0);if(owned(p,id)&&amount){bonus+=amount;fire(run,fired,id,trigger,true,{bonusDamage:amount,symmetryStackMax:id==='aug-120'?s.symmetry120:id==='aug-117'?s.symmetry117:undefined});}}
    if(bonus)ctx.damage.amount+=bonus;return fired;
  }
  return fired;
}

export function assertMageHandler(augmentId){
  const n=Number(String(augmentId||'').replace('aug-',''));
  if(!Number.isInteger(n)||n<91||n>120){const error=new Error('Mage augment handler is missing.');error.code='MAGE_RUNTIME_HANDLER_MISSING';throw error;}
  return true;
}
