import {choose} from './rng.js';
import {recoverPhysicalCard,upsertAugmentStatus} from './augment-framework.js';

const framework=run=>(run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0});
const owned=(p,id)=>Boolean(p?.augments?.includes(id));
const turn=run=>Number(run.combat?.turn??run.roomState?.attempt??run.roomState?.turn??1);
const cycle=(run,p,ctx={})=>ctx.privateState?.cycleIndex??run.combat?.privateByPlayer?.[p.playerId]?.cycleIndex??run.roomState?.privateByPlayer?.[p.playerId]?.cycleIndex??1;
const combatRoom=run=>run.phase==='COMBAT';
const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
const rstate=(run,p)=>{
  const f=framework(run);f.rogue||={};
  return f.rogue[p.playerId]||={combatId:run.combat?.id||null,sneakyStacks:clamp(p.publicResources?.sneakyStack,0,2),soloLowestStreak:0,criticalStacks:0,leapStreak:0,leapChain:0};
};
const poisonState=(run,owner)=>{
  const f=framework(run);f.roguePoison||={};
  return f.roguePoison[owner.playerId]||={ownerId:owner.playerId,sourceAugmentId:'aug-071',targetId:run.combat?.monster?.id||null,stacks:0,cap:3,hitProgress:0,defenseDebuffUntilTurn:0,defenseNullifyCharges:0};
};
const mark=(run,id,trigger,success,extra={})=>framework(run).telemetry.push({augmentId:id,trigger,triggerCount:1,successCount:success?1:0,...extra});
const fire=(run,fired,id,trigger,success,extra={})=>{mark(run,id,trigger,success,extra);if(success)fired.push({augmentId:id,trigger});return success;};
const isSoloLowest=r=>Boolean(r?.valid&&r?.soloLowest);
const isJump=(prior,current,valid)=>Boolean(valid&&Number.isFinite(prior)&&Number.isFinite(current)&&Math.abs(current-prior)>=3);
const jumpDirection=(prior,current)=>current>prior?1:current<prior?-1:0;
const alive=run=>run.players.filter(x=>x.status!=='DOWNED').sort((a,b)=>a.seat-b.seat);

function mirrorSneaky(p,s){
  p.publicResources||={};
  p.publicResources.sneakyStack=clamp(s.sneakyStacks,0,2);
}
function armDirectReduction(run,p,id){
  upsertAugmentStatus(run,p,{statusId:'NEXT_DIRECT_DAMAGE_REDUCTION:'+id+':'+p.playerId,targetId:p.playerId,sourceId:id,resetScope:'COMBAT',payload:{amount:1}});
}
function poisonOwners(run){
  return run.players.filter(p=>p.characterId==='rogue'&&owned(p,'aug-071')).sort((a,b)=>a.seat-b.seat);
}
function currentPrivate(run,p,ctx={}){return ctx.privateState??run.combat?.privateByPlayer?.[p.playerId]??run.roomState?.privateByPlayer?.[p.playerId]??null;}
function cardById(p,id){return p.cardPool?.find(c=>c.id===id)||null;}
function recoverOne(run,p,cardId,ctx,id){
  if(!cardId)return false;
  const priv=currentPrivate(run,p,ctx);if(!priv)return false;
  const out=recoverPhysicalCard(run,p,cardId,{privateState:priv,rootActionId:id+':'+run.id+':'+p.playerId+':'+cycle(run,p,ctx),recoveryCeiling:4});
  if(out.applied)mark(run,id,'TURN_END',true,{recoveryCount:1,cardInstanceId:cardId});
  return Boolean(out.applied);
}
function eligibleSpent(p,priv,predicate=()=>true){
  return (priv?.spentCardIds||[]).map((id,index)=>({id,index,card:cardById(p,id)})).filter(x=>x.card&&predicate(x.card));
}
function chooseLowestRecent(candidates){
  return [...candidates].sort((a,b)=>a.card.baseNumber-b.card.baseNumber||b.index-a.index)[0]||null;
}

function processPartyPoisonBeforeDamage(run,p,ctx,fired){
  if(!combatRoom(run)||ctx.followUp||!ctx.resolved?.valid||!ctx.damage)return;
  const f=framework(run);f.roguePartyBonus||={};f.rogueToxicMark||={};

  if(f.roguePartyBonus[p.playerId]){
    ctx.damage.amount+=1;delete f.roguePartyBonus[p.playerId];
    const source=f.roguePartyBonusSource?.[p.playerId];if(source)mark(run,'aug-076','BEFORE_DAMAGE',true,{bonusDamage:1,ownerId:source,targetId:p.playerId});
  }
  if(f.rogueToxicMark[p.playerId]){
    ctx.damage.amount+=1;delete f.rogueToxicMark[p.playerId];
    const source=f.rogueToxicMarkSource?.[p.playerId];if(source)mark(run,'aug-074','BEFORE_DAMAGE',true,{bonusDamage:1,ownerId:source,targetId:p.playerId});
  }

  for(const owner of poisonOwners(run)){
    const ps=poisonState(run,owner);if(ps.stacks<=0)continue;
    const poisonBefore=ps.stacks;
    if(owned(owner,'aug-079')&&poisonBefore>=2){ctx.damage.amount+=1;mark(run,'aug-079','BEFORE_DAMAGE',true,{bonusDamage:1,poisonStacks:poisonBefore,ownerId:owner.playerId});}
    if(owned(owner,'aug-074')){
      f.rogueToxicMark[p.playerId]=true;f.rogueToxicMarkSource||={};f.rogueToxicMarkSource[p.playerId]=owner.playerId;
    }
    ps.hitProgress=(Number(ps.hitProgress)||0)+1;
    if(ps.hitProgress<2)continue;
    ps.hitProgress=0;

    let damage=2,consume=1,source='aug-071';
    if(ps.stacks>=3&&owned(owner,'aug-078')&&!ps.used078){
      damage=9;consume=3;source='aug-078';ps.used078=true;ps.defenseNullifyCharges=Math.max(1,Number(ps.defenseNullifyCharges)||0);
    }else if(ps.stacks>=3&&owned(owner,'aug-077')){
      damage=7;consume=3;source='aug-077';
    }
    ps.stacks=Math.max(0,ps.stacks-consume);
    if(owned(owner,'aug-080')&&ps.stacks===0&&ps.retained080Turn!==turn(run)){
      ps.stacks=1;ps.retained080Turn=turn(run);mark(run,'aug-080','POISON_EXPLOSION',true,{poisonStacks:1,ownerId:owner.playerId});
    }
    if(owned(owner,'aug-075')){ps.defenseDebuffUntilTurn=Math.max(Number(ps.defenseDebuffUntilTurn)||0,turn(run)+2);mark(run,'aug-075','POISON_EXPLOSION',true,{armorPenetrated:1,ownerId:owner.playerId});}
    if(owned(owner,'aug-076')){
      f.roguePartyBonusSource||={};
      for(const ally of alive(run)){f.roguePartyBonus[ally.playerId]=true;f.roguePartyBonusSource[ally.playerId]=owner.playerId;}
      mark(run,'aug-076','POISON_EXPLOSION',true,{ownerId:owner.playerId});
    }
    if(ctx.followUps)ctx.followUps.push({sourcePlayerId:owner.playerId,amount:damage,numberUsed:null,tags:['ROGUE_POISON'],sourceAugmentId:source,followUpDepth:1});
    mark(run,source,'POISON_EXPLOSION',true,{poisonExplosions:1,poisonDamage:damage,poisonStacks:ps.stacks,ownerId:owner.playerId});
  }
}

export function rogueArmorPenetration(run,player,resolved,defense){
  if(!combatRoom(run)||!resolved?.valid||defense<=0)return 0;
  let penetration=0;
  for(const owner of poisonOwners(run)){
    const ps=poisonState(run,owner);
    if(ps.defenseDebuffUntilTurn>=turn(run)&&owned(owner,'aug-075'))penetration=Math.max(penetration,1);
  }
  if(penetration<defense){
    const owner=poisonOwners(run).find(o=>{const ps=poisonState(run,o);return owned(o,'aug-078')&&Number(ps.defenseNullifyCharges)>0;});
    if(owner){
      const ps=poisonState(run,owner);ps.defenseNullifyCharges=Math.max(0,Number(ps.defenseNullifyCharges)-1);penetration=defense;
      mark(run,'aug-078','PRE_MITIGATION',true,{armorPenetrated:defense,ownerId:owner.playerId,targetId:player?.playerId||null});
    }
  }
  return Math.min(defense,Math.max(0,penetration));
}

export function applyRogue(run,trigger,ctx={}){
  const p=ctx.player;if(!p)return [];
  const fired=[];
  processPartyPoisonBeforeDamage(run,p,ctx,fired);
  if(p.characterId!=='rogue')return fired;
  const hasRogue=(p.augments||[]).some(id=>{const n=Number(String(id).slice(4));return n>=61&&n<=90;});
  if(!hasRogue)return fired;
  const s=rstate(run,p),r=ctx.resolved,rm=combatRoom(run),ci=cycle(run,p,ctx),t=turn(run);

  if(trigger==='COMBAT_START'){
    framework(run).rogue[p.playerId]={combatId:run.combat?.id||null,sneakyStacks:clamp(p.publicResources?.sneakyStack,0,2),soloLowestStreak:0,criticalStacks:0,leapStreak:0,leapChain:0};
    if(owned(p,'aug-071'))framework(run).roguePoison={...(framework(run).roguePoison||{}),[p.playerId]:{ownerId:p.playerId,sourceAugmentId:'aug-071',targetId:run.combat?.monster?.id||null,stacks:0,cap:3,hitProgress:0,defenseDebuffUntilTurn:0,defenseNullifyCharges:0}};
    return fired;
  }
  if(trigger==='CARD_VALIDATED'&&rm&&r){
    const current=Number(r.finalNumber),valid=Boolean(r.valid),solo=isSoloLowest(r);
    const priorFinal=Number.isFinite(s.previousFinal)?s.previousFinal:null;
    const priorTurn=Number.isFinite(s.previousTurn)?s.previousTurn:null;
    const priorValid=Boolean(s.previousValid);
    const priorCardId=s.previousCardId||null;
    const jump=isJump(priorFinal,current,valid),direction=jump?jumpDirection(priorFinal,current):0;

    if(owned(p,'aug-061')){
      if(solo){
        const prior=clamp(s.sneakyStacks,0,2);r.rogueSneakyBonus=prior;r.rogueSneakySpend=prior;s.sneakyStacks=Math.min(2,prior+1);mirrorSneaky(p,s);
        fire(run,fired,'aug-061',trigger,true,{sneakyStacksGained:Math.max(0,s.sneakyStacks-prior),soloLowestCount:1,stackMax:s.sneakyStacks});
      }else{s.sneakyStacks=0;mirrorSneaky(p,s);}
    }

    if(owned(p,'aug-062')&&solo&&current===1)r.rogue062Bonus=1;
    if(owned(p,'aug-063')&&solo&&priorTurn===t-1&&priorValid&&current<priorFinal)r.rogue063Bonus=1;

    if(owned(p,'aug-064')&&solo&&[1,3].includes(current)&&s.recovered064Cycle!==ci)s.pending064={cycleIndex:ci,cardInstanceId:r.cardInstanceId};

    if(owned(p,'aug-065')){
      if(solo){s.criticalStacks=Math.min(3,(Number(s.criticalStacks)||0)+1);r.rogue065Bonus=s.criticalStacks;}
      else s.criticalStacks=0;
    }

    if(owned(p,'aug-066')){
      const w=s.underhandWindow;
      if(valid&&w&&w.turn===t-1&&current>w.finalNumber)r.rogue066Bonus=2;
      s.underhandWindow=solo?{turn:t,finalNumber:current}:null;
    }
    if(owned(p,'aug-067')&&solo){armDirectReduction(run,p,'aug-067');fire(run,fired,'aug-067',trigger,true,{protectionApplied:1});}
    if(owned(p,'aug-068')&&solo&&clamp(r.rogueSneakySpend,0,2)===2)r.rogue068Bonus=4;
    if(owned(p,'aug-069')&&solo&&s.recovered069Cycle!==ci)s.pending069={cycleIndex:ci};

    if(owned(p,'aug-070')){
      if(solo){s.soloLowestStreak=(Number(s.soloLowestStreak)||0)+1;r.rogue070Bonus=s.soloLowestStreak>=3?4:0;}
      else if((Number(s.soloLowestStreak)||0)>0){
        if(!s.used070Protection){s.used070Protection=true;fire(run,fired,'aug-070','STREAK_PROTECT',true,{stackMax:s.soloLowestStreak});}
        else s.soloLowestStreak=0;
      }
    }

    if(owned(p,'aug-071')&&solo){
      const ps=poisonState(run,p);let apply=1;
      if(owned(p,'aug-072')&&current===1&&s.poison072Cycle!==ci){apply=2;s.poison072Cycle=ci;}
      const before=ps.stacks;ps.stacks=Math.min(3,ps.stacks+apply);const actual=ps.stacks-before;r.roguePoisonApplied=actual;
      if(actual>0){fire(run,fired,'aug-071',trigger,true,{poisonApplied:actual,poisonStacks:ps.stacks,soloLowestCount:1});if(apply===2)fire(run,fired,'aug-072',trigger,true,{poisonApplied:actual,poisonStacks:ps.stacks});}
      if(owned(p,'aug-073')&&actual>0&&[1,3].includes(current)&&s.recovered073Cycle!==ci)s.pending073={cycleIndex:ci,cardInstanceId:r.cardInstanceId};
      if(owned(p,'aug-080')&&actual>0&&s.recovered080Cycle!==ci)s.pending080={cycleIndex:ci};
    }

    if(owned(p,'aug-083')&&s.next083){r.rogue083Bonus=1;s.next083=false;}
    if(owned(p,'aug-081')&&jump)r.rogue081Bonus=2;
    if(owned(p,'aug-082')&&jump&&priorFinal>=1&&priorFinal<=2&&current>=4&&current<=5)r.rogue082Bonus=1;
    if(owned(p,'aug-083')&&jump&&direction<0)s.next083=true;
    if(owned(p,'aug-084')&&jump&&s.lastJumpTurn===t-1)r.rogue084Bonus=1;

    if(jump){
      s.leapChain=(Number(s.leapChain)||0)+1;
      if(owned(p,'aug-085')){s.leapStreak=Math.min(3,(Number(s.leapStreak)||0)+1);r.rogue085Bonus=s.leapStreak;}
    }else if((Number(s.leapChain)||0)>0){
      if(owned(p,'aug-086')&&s.protected086Cycle!==ci){
        s.protected086Cycle=ci;
        fire(run,fired,'aug-086','STREAK_PROTECT',true,{leapStreakMax:s.leapChain});
      }else{
        s.leapChain=0;
        if(owned(p,'aug-085'))s.leapStreak=0;
      }
    }

    if(owned(p,'aug-087')&&jump&&Math.abs(current-priorFinal)===4)r.rogue087Bonus=4;
    if(owned(p,'aug-088')&&jump&&s.lastJumpTurn===t-1&&s.lastJumpDirection&&direction!==s.lastJumpDirection)r.rogue088Bonus=3;
    if(owned(p,'aug-089')&&jump&&Math.abs(current-priorFinal)===4)r.rogue089Bonus=6+(priorFinal===1&&current===5?2:0);
    if(owned(p,'aug-090')&&jump&&priorCardId&&s.recovered090Cycle!==ci)s.pending090={cycleIndex:ci,cardInstanceId:priorCardId};

    if(jump){s.lastJumpTurn=t;s.lastJumpDirection=direction;}
    else if(owned(p,'aug-084')||owned(p,'aug-088'))s.lastJumpTurn=null;

    s.previousFinal=Number.isFinite(current)?current:null;s.previousTurn=t;s.previousValid=valid;s.previousCardId=r.cardInstanceId||null;
    return fired;
  }

  if(trigger==='BEFORE_DAMAGE'&&rm&&r?.valid&&ctx.damage&&!ctx.followUp){
    let bonus=0;
    if(owned(p,'aug-061')&&Number(r.rogueSneakyBonus)>0){const b=clamp(r.rogueSneakyBonus,0,2);bonus+=b;s.sneakyStacks=Math.max(0,clamp(s.sneakyStacks,0,2)-b);mirrorSneaky(p,s);fire(run,fired,'aug-061',trigger,true,{bonusDamage:b});}
    const bonuses=[
      ['aug-062','rogue062Bonus'],['aug-063','rogue063Bonus'],['aug-065','rogue065Bonus'],['aug-066','rogue066Bonus'],['aug-068','rogue068Bonus'],['aug-070','rogue070Bonus'],
      ['aug-081','rogue081Bonus'],['aug-082','rogue082Bonus'],['aug-083','rogue083Bonus'],['aug-084','rogue084Bonus'],['aug-085','rogue085Bonus'],['aug-087','rogue087Bonus'],['aug-088','rogue088Bonus'],['aug-089','rogue089Bonus']
    ];
    for(const [id,key] of bonuses){const amount=Math.max(0,Number(r[key])||0);if(owned(p,id)&&amount){bonus+=amount;fire(run,fired,id,trigger,true,{bonusDamage:amount,leapStreakMax:s.leapStreak||0,soloLowestCount:r.soloLowest?1:0});}}
    if(bonus)ctx.damage.amount+=bonus;
    return fired;
  }

  if(trigger==='TURN_END'&&rm){
    const priv=currentPrivate(run,p,ctx);
    if(owned(p,'aug-064')&&s.pending064?.cycleIndex===ci&&s.recovered064Cycle!==ci){
      let id=s.pending064.cardInstanceId;
      if(!priv?.spentCardIds?.includes(id)){
        const pool=eligibleSpent(p,priv,c=>[1,3].includes(c.baseNumber));if(pool.length)id=choose(run,pool.map(x=>x.id),'rogue064:'+run.id+':'+p.playerId+':'+ci);
      }
      if(recoverOne(run,p,id,{...ctx,privateState:priv},'aug-064'))s.recovered064Cycle=ci;delete s.pending064;
    }
    if(owned(p,'aug-069')&&s.pending069?.cycleIndex===ci&&s.recovered069Cycle!==ci){
      const chosen=chooseLowestRecent(eligibleSpent(p,priv));if(chosen&&recoverOne(run,p,chosen.id,{...ctx,privateState:priv},'aug-069'))s.recovered069Cycle=ci;delete s.pending069;
    }
    if(owned(p,'aug-073')&&s.pending073?.cycleIndex===ci&&s.recovered073Cycle!==ci){
      if(recoverOne(run,p,s.pending073.cardInstanceId,{...ctx,privateState:priv},'aug-073'))s.recovered073Cycle=ci;delete s.pending073;
    }
    if(owned(p,'aug-080')&&s.pending080?.cycleIndex===ci&&s.recovered080Cycle!==ci){
      const chosen=chooseLowestRecent(eligibleSpent(p,priv,c=>c.source==='BASE'&&c.baseNumber>=1&&c.baseNumber<=3));if(chosen&&recoverOne(run,p,chosen.id,{...ctx,privateState:priv},'aug-080'))s.recovered080Cycle=ci;delete s.pending080;
    }
    if(owned(p,'aug-090')&&s.pending090?.cycleIndex===ci&&s.recovered090Cycle!==ci){
      if(recoverOne(run,p,s.pending090.cardInstanceId,{...ctx,privateState:priv},'aug-090'))s.recovered090Cycle=ci;delete s.pending090;
    }
    return fired;
  }
  return fired;
}

export function assertRogueHandler(augmentId){
  const n=Number(String(augmentId||'').replace('aug-',''));
  if(!Number.isInteger(n)||n<61||n>90){const error=new Error('Rogue augment handler is missing.');error.code='ROGUE_RUNTIME_HANDLER_MISSING';throw error;}
  return true;
}
