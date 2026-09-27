import crypto from 'node:crypto';

export const REFERENCE_POLICY_ID='reference_communication_v1';
export const REFERENCE_NEGOTIATION_MAX_YIELDS=2;

const stableHash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const seededRank=(seed,key)=>Number.parseInt(stableHash(`${seed}|${key}`).slice(0,12),16);
const uniqueSorted=values=>[...new Set(values)].sort((a,b)=>a-b);
const countBy=(values,keyFn)=>{
  const out=new Map();
  for(const value of values){const key=keyFn(value);out.set(key,(out.get(key)||0)+1);}
  return out;
};

function selfPlayer(view,playerId){
  const player=(view.players||[]).find(p=>p.playerId===playerId);
  if(!player)return null;
  if(view.privateCombat?.playerId&&view.privateCombat.playerId!==playerId)throw new Error('Reference intent received foreign private combat state.');
  return player;
}
function remainingOwnCards(view,playerId){
  const player=selfPlayer(view,playerId);
  if(!player)return [];
  const remaining=new Set(view.privateCombat?.remainingCardIds||[]);
  return (player.cardPool||[]).filter(card=>remaining.has(card.id));
}
function basePreferenceScore(player,number,minAvailable){
  let score=number*10;
  if(player.characterId==='rogue'&&number===minAvailable){
    // Sneaky Strike can turn a unique-lowest card into damage 5, but the bot does not
    // assume success before hearing team intents. This is deliberately only a light bias.
    score+=30+(Number(player.publicResources?.sneakyStack)||0)*3;
  }
  return score;
}
function mageAdjustment(player){
  if(player.characterId!=='mage')return null;
  const mana=Math.max(0,Number(player.publicResources?.mana)||0);
  const maxMana=Math.max(4,Number(player.publicResources?.manaMax)||4);
  if(maxMana>=6&&mana>=6)return {bonus:3,spend:6};
  if(mana>=4)return {bonus:2,spend:4};
  if(mana>=2)return {bonus:1,spend:2};
  return null;
}

export function buildReferenceIntent(view,playerId,{seed='reference',contextKey='turn'}={}){
  const player=selfPlayer(view,playerId);
  if(!player||player.status==='DOWNED')return null;
  const ownCards=remainingOwnCards(view,playerId);
  const availableNumbers=uniqueSorted(ownCards.map(card=>card.baseNumber));
  if(!availableNumbers.length)return null;
  const minAvailable=Math.min(...availableNumbers);
  const ranked=[...availableNumbers].sort((a,b)=>{
    const diff=basePreferenceScore(player,b,minAvailable)-basePreferenceScore(player,a,minAvailable);
    if(diff)return diff;
    return seededRank(seed,`${contextKey}:${playerId}:pref:${a}`)-seededRank(seed,`${contextKey}:${playerId}:pref:${b}`);
  });
  const adjustment=mageAdjustment(player);
  return {
    playerId,
    seat:Number(player.seat)||0,
    characterId:player.characterId,
    availableNumbers,
    preferredNumbers:ranked,
    avoidNumbers:[],
    initialChoice:ranked[0],
    skillIntent:null,
    sharedSignals:{
      toughnessAvailable:player.characterId==='warrior'&&(Number(player.publicResources?.toughnessCharges)||0)>0,
      mageAdjustment:adjustment,
      veteranStreak:player.characterId==='adventurer'?(Number(player.publicResources?.veteranStreak)||0):0,
      sneakyStack:player.characterId==='rogue'?(Number(player.publicResources?.sneakyStack)||0):0
    }
  };
}
function planFromBase(intent,baseNumber,skillIntent=false){
  const adjustment=skillIntent?intent.sharedSignals?.mageAdjustment:null;
  return {
    baseNumber,
    finalNumber:baseNumber+(adjustment?.bonus||0),
    skillIntent:Boolean(skillIntent),
    skillSpend:skillIntent?(adjustment?.spend||0):0
  };
}
function conflictsFor(plans){
  const counts=countBy([...plans.values()],x=>x.finalNumber);
  return new Map([...plans].map(([pid,plan])=>[pid,(counts.get(plan.finalNumber)||0)>1]));
}
function rotatedLobbyOrder(intents,seed,contextKey){
  const lobby=[...intents].sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
  if(lobby.length<2)return lobby;
  const offset=seededRank(seed,`${contextKey}:lobby-rotation`)%lobby.length;
  return [...lobby.slice(offset),...lobby.slice(0,offset)];
}
function uniqueAgainst(plan,plans,playerId){
  for(const [pid,other] of plans)if(pid!==playerId&&other.finalNumber===plan.finalNumber)return false;
  return true;
}
function rogueSoloLowestCandidate(intent,plans){
  if(intent.characterId!=='rogue')return null;
  const otherNumbers=[...plans].filter(([pid])=>pid!==intent.playerId).map(([,p])=>p.finalNumber);
  if(!otherNumbers.length)return null;
  const floor=Math.min(...otherNumbers);
  const candidates=intent.availableNumbers.filter(n=>n<floor);
  if(!candidates.length)return null;
  // Sneaky Strike is 5 base damage when unique-lowest, so using the lowest available
  // is a reasonable human play but not a global optimizer.
  return Math.min(...candidates);
}
function alternativePlans(intent,current,plans){
  const out=[];
  if(intent.characterId==='mage'&&intent.sharedSignals?.mageAdjustment&&!current.skillIntent){
    out.push({...planFromBase(intent,current.baseNumber,true),reason:'MAGE_COLLISION_ADJUST'});
  }
  const idx=Math.max(0,intent.preferredNumbers.indexOf(current.baseNumber));
  const alternatives=intent.preferredNumbers.filter(n=>n!==current.baseNumber);
  // The policy may inspect at most two alternatives. No permutations/backtracking/global assignment search.
  for(const baseNumber of alternatives.slice(0,REFERENCE_NEGOTIATION_MAX_YIELDS)){
    out.push({...planFromBase(intent,baseNumber,false),reason:'YIELD_TO_AVOID_COLLISION'});
  }
  return out.slice(0,REFERENCE_NEGOTIATION_MAX_YIELDS+1);
}

export function negotiateReferenceIntents(intents,{seed='reference',contextKey='turn'}={}){
  const clean=(intents||[]).filter(Boolean).map(x=>structuredClone(x));
  const plans=new Map(clean.map(intent=>[intent.playerId,planFromBase(intent,intent.initialChoice,false)]));
  const initialPlans=new Map([...plans].map(([k,v])=>[k,{...v}]));
  const reasons=new Map(clean.map(x=>[x.playerId,'KEEP_FIRST_CHOICE']));
  const transitionCounts=new Map(clean.map(x=>[x.playerId,0]));

  // Rogue can announce a plausible solo-lowest attempt after hearing only volunteered initial intents.
  for(const intent of clean.filter(x=>x.characterId==='rogue')){
    const low=rogueSoloLowestCandidate(intent,plans);
    const current=plans.get(intent.playerId);
    if(low!=null&&current&&low!==current.baseNumber){
      plans.set(intent.playerId,planFromBase(intent,low,false));
      reasons.set(intent.playerId,'ROGUE_SOLO_LOWEST_ATTEMPT');
      transitionCounts.set(intent.playerId,1);
    }
  }

  // One deterministic, seed-rotated lobby-order pass. Each bot gets at most two real yields.
  const order=rotatedLobbyOrder(clean,seed,contextKey);
  for(const intent of order){
    const pid=intent.playerId;
    let current=plans.get(pid);
    if(!current)continue;
    const conflictMap=conflictsFor(plans);
    if(!conflictMap.get(pid))continue;

    let changed=false;
    let examinedYields=0;
    for(const candidate of alternativePlans(intent,current,plans)){
      const isYield=candidate.reason==='YIELD_TO_AVOID_COLLISION';
      if(isYield&&examinedYields++>=REFERENCE_NEGOTIATION_MAX_YIELDS)break;
      if(uniqueAgainst(candidate,plans,pid)){
        plans.set(pid,{baseNumber:candidate.baseNumber,finalNumber:candidate.finalNumber,skillIntent:candidate.skillIntent,skillSpend:candidate.skillSpend});
        reasons.set(pid,candidate.reason);
        transitionCounts.set(pid,(transitionCounts.get(pid)||0)+1);
        current=plans.get(pid);changed=true;break;
      }
    }
    if(changed)continue;

    // Knight uses Toughness only when normal limited negotiation could not resolve the clash
    // and the contested card is materially stronger than the best two offered alternatives.
    if(intent.characterId==='warrior'&&intent.sharedSignals?.toughnessAvailable){
      const alt=intent.preferredNumbers.filter(n=>n!==current.baseNumber).slice(0,REFERENCE_NEGOTIATION_MAX_YIELDS);
      const bestAlt=alt.length?Math.max(...alt):null;
      if(bestAlt==null||current.baseNumber-bestAlt>=2){
        plans.set(pid,{...current,skillIntent:true});
        reasons.set(pid,'KNIGHT_TOUGHNESS_PENETRATION');
      }
    }
  }

  // Do not waste Toughness if another player's later concession removed the collision.
  const finalConflicts=conflictsFor(plans);
  for(const intent of clean.filter(x=>x.characterId==='warrior')){
    const plan=plans.get(intent.playerId);
    if(plan?.skillIntent&&!finalConflicts.get(intent.playerId)){
      plans.set(intent.playerId,{...plan,skillIntent:false});
      if(reasons.get(intent.playerId)==='KNIGHT_TOUGHNESS_PENETRATION')reasons.set(intent.playerId,'KEEP_FIRST_CHOICE');
    }
  }

  const before=conflictsFor(initialPlans),after=conflictsFor(plans);
  const decisions=clean.map(intent=>{
    const initial=initialPlans.get(intent.playerId),final=plans.get(intent.playerId);
    const negotiationChanged=Boolean(
      initial.baseNumber!==final.baseNumber||
      initial.finalNumber!==final.finalNumber||
      initial.skillIntent!==final.skillIntent
    );
    return {
      playerId:intent.playerId,
      seat:intent.seat,
      characterId:intent.characterId,
      baseNumber:final.baseNumber,
      finalNumber:final.finalNumber,
      skillIntent:final.skillIntent,
      availableNumbers:[...intent.availableNumbers],
      preferredNumbers:[...intent.preferredNumbers],
      initialChoice:initial.finalNumber,
      finalChoice:final.finalNumber,
      negotiationChanged,
      changeReason:negotiationChanged?reasons.get(intent.playerId):'KEEP_FIRST_CHOICE',
      collisionExpectedBeforeNegotiation:Boolean(before.get(intent.playerId)),
      collisionExpectedAfterNegotiation:Boolean(after.get(intent.playerId)),
      candidateTransitions:transitionCounts.get(intent.playerId)||0
    };
  });
  return {policyId:REFERENCE_POLICY_ID,decisions,order:order.map(x=>x.playerId)};
}

export function summarizeReferenceTurns(turns){
  const records=(turns||[]).flatMap(turn=>turn.records||[]);
  const byPlayer={},byCharacter={};
  const add=(bucket,key,record)=>{
    const row=bucket[key]||(bucket[key]={
      intents:0,firstChoiceKept:0,yieldCount:0,actualCollisionCount:0,validAttackCount:0,
      availableNumberTotal:0,beforeConflictCount:0,afterConflictCount:0,damage:0,
      availableBuckets:{}
    });
    row.intents++;
    if(!record.negotiationChanged)row.firstChoiceKept++;
    if(record.negotiationChanged)row.yieldCount++;
    if(record.actualCollision)row.actualCollisionCount++;
    if(record.validAttack)row.validAttackCount++;
    row.availableNumberTotal+=(record.availableNumbers||[]).length;
    if(record.collisionExpectedBeforeNegotiation)row.beforeConflictCount++;
    if(record.collisionExpectedAfterNegotiation)row.afterConflictCount++;
    row.damage+=Number(record.damage)||0;
    const count=String((record.availableNumbers||[]).length);
    const b=row.availableBuckets[count]||(row.availableBuckets[count]={intents:0,collisions:0});
    b.intents++;if(record.actualCollision)b.collisions++;
  };
  for(const record of records){add(byPlayer,record.playerId,record);add(byCharacter,record.characterId,record);}
  const decorate=bucket=>Object.fromEntries(Object.entries(bucket).map(([key,row])=>[key,{
    ...row,
    firstChoiceKeepRate:row.intents?row.firstChoiceKept/row.intents:0,
    yieldRate:row.intents?row.yieldCount/row.intents:0,
    collisionRate:row.intents?row.actualCollisionCount/row.intents:0,
    validAttackRate:row.intents?row.validAttackCount/row.intents:0,
    avgAvailableNumbers:row.intents?row.availableNumberTotal/row.intents:0
  }]));
  const total=records.length;
  const before=records.filter(x=>x.collisionExpectedBeforeNegotiation).length;
  const after=records.filter(x=>x.collisionExpectedAfterNegotiation).length;
  const resolved=records.filter(x=>x.collisionExpectedBeforeNegotiation&&!x.collisionExpectedAfterNegotiation).length;
  return {
    turnCount:(turns||[]).length,
    intentCount:total,
    totalIntentConflicts:before,
    resolvedIntentConflicts:resolved,
    unresolvedIntentConflicts:after,
    negotiationChangeCount:records.filter(x=>x.negotiationChanged).length,
    collisionRateBeforeNegotiation:total?before/total:0,
    collisionRateAfterNegotiation:total?after/total:0,
    negotiationResolutionRate:before?resolved/before:1,
    byPlayer:decorate(byPlayer),
    byCharacter:decorate(byCharacter)
  };
}
