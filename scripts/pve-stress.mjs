import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {
  STRESS_SCHEMA_VERSION,STRESS_SCENARIOS,SPEC_AMBIGUITIES,CANONICAL_RULES,
  StressHardFailure,replayScenario,scenarioAvailability,skippedScenarioReport,balanceWarnings,t02GoldenComparable,t06GoldenComparable
} from './pve-stress-lib.mjs';

function argsOf(argv){
  const out={mode:'smoke',output:'artifacts/pve-stress',scenario:null,seed:null,count:null};
  for(let i=0;i<argv.length;i++){
    const a=argv[i],next=argv[i+1];
    if(a==='--mode'){out.mode=next;i++;}
    else if(a==='--output'){out.output=next;i++;}
    else if(a==='--scenario'){out.scenario=next;i++;}
    else if(a==='--seed'){out.seed=next;i++;}
    else if(a==='--count'){out.count=Number(next);i++;}
    else if(a==='--help'||a==='-h')out.help=true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}
function usage(){
  return `Usage:
  npm run pve:stress -- --mode smoke
  npm run pve:stress -- --mode balance
  npm run pve:stress -- --mode stress
  npm run pve:stress -- --scenario T14 --seed smoke-0000

Modes:
  smoke   10 deterministic seeds per available scenario
  balance 100 deterministic seeds per available scenario
  stress  500 deterministic seeds per available scenario

Reports are written to artifacts/pve-stress by default.
Hard invariant failures exit non-zero; BALANCE_WARNING and SKIP do not.
`;
}
function seedCount(opts){
  if(Number.isInteger(opts.count)&&opts.count>0)return opts.count;
  if(opts.seed)return 1;
  if(opts.mode==='smoke')return 10;
  if(opts.mode==='balance')return 100;
  if(opts.mode==='stress')return 500;
  throw new Error(`Unknown mode: ${opts.mode}`);
}
function commitHash(){
  if(process.env.GITHUB_SHA)return process.env.GITHUB_SHA;
  try{return execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}
  catch{return 'unknown';}
}
function seedsFor(opts,scenarioId){
  if(opts.seed)return [opts.seed];
  const n=seedCount(opts);
  return Array.from({length:n},(_,i)=>`${opts.mode}:${scenarioId}:${String(i).padStart(4,'0')}`);
}
function csvEscape(v){
  const s=typeof v==='string'?v:JSON.stringify(v??'');
  return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;
}
function writeCsv(file,rows){
  const headers=['scenarioId','seed','status','actionCount','caseCount','warnings','failureCode','replayCommand'];
  const lines=[headers.join(',')];
  for(const row of rows)lines.push(headers.map(h=>csvEscape(row[h]??'')).join(','));
  fs.writeFileSync(file,lines.join('\n')+'\n');
}
const avg=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
function mergeReferenceRows(summaries){
  const total={
    intentCount:0,totalIntentConflicts:0,resolvedIntentConflicts:0,unresolvedIntentConflicts:0,
    negotiationChangeCount:0,byPlayer:{},byCharacter:{}
  };
  const mergeBucket=(target,key,source)=>{
    const row=target[key]||(target[key]={
      intents:0,firstChoiceKept:0,yieldCount:0,actualCollisionCount:0,validAttackCount:0,
      availableNumberTotal:0,beforeConflictCount:0,afterConflictCount:0,damage:0,availableBuckets:{},availableSignatureBuckets:{}
    });
    for(const field of ['intents','firstChoiceKept','yieldCount','actualCollisionCount','validAttackCount','availableNumberTotal','beforeConflictCount','afterConflictCount','damage']){
      row[field]+=Number(source?.[field])||0;
    }
    for(const [count,bucket] of Object.entries(source?.availableBuckets||{})){
      const b=row.availableBuckets[count]||(row.availableBuckets[count]={intents:0,collisions:0});
      b.intents+=Number(bucket.intents)||0;b.collisions+=Number(bucket.collisions)||0;
    }
    for(const [signature,bucket] of Object.entries(source?.availableSignatureBuckets||{})){
      const b=row.availableSignatureBuckets[signature]||(row.availableSignatureBuckets[signature]={intents:0,collisions:0});
      b.intents+=Number(bucket.intents)||0;b.collisions+=Number(bucket.collisions)||0;
    }
  };
  for(const summary of summaries){
    total.intentCount+=Number(summary.intentCount)||0;
    total.totalIntentConflicts+=Number(summary.totalIntentConflicts)||0;
    total.resolvedIntentConflicts+=Number(summary.resolvedIntentConflicts)||0;
    total.unresolvedIntentConflicts+=Number(summary.unresolvedIntentConflicts)||0;
    total.negotiationChangeCount+=Number(summary.negotiationChangeCount)||0;
    for(const [key,row] of Object.entries(summary.byPlayer||{}))mergeBucket(total.byPlayer,key,row);
    for(const [key,row] of Object.entries(summary.byCharacter||{}))mergeBucket(total.byCharacter,key,row);
  }
  const decorate=bucket=>Object.fromEntries(Object.entries(bucket).map(([key,row])=>[key,{
    ...row,
    firstChoiceKeepRate:row.intents?row.firstChoiceKept/row.intents:0,
    yieldRate:row.intents?row.yieldCount/row.intents:0,
    collisionRate:row.intents?row.actualCollisionCount/row.intents:0,
    validAttackRate:row.intents?row.validAttackCount/row.intents:0,
    avgAvailableNumbers:row.intents?row.availableNumberTotal/row.intents:0
  }]));
  return {
    ...total,
    collisionRateBeforeNegotiation:total.intentCount?total.totalIntentConflicts/total.intentCount:0,
    collisionRateAfterNegotiation:total.intentCount?total.unresolvedIntentConflicts/total.intentCount:0,
    negotiationResolutionRate:total.totalIntentConflicts?total.resolvedIntentConflicts/total.totalIntentConflicts:1,
    byPlayer:decorate(total.byPlayer),byCharacter:decorate(total.byCharacter)
  };
}
function referenceFairnessWarnings(reference,characterDamageShare,seedCount){
  if(seedCount<100||!reference)return [];
  const warnings=[];
  const slots=Object.entries(reference.byPlayer||{}).filter(([,x])=>x.intents>0);
  if(slots.length>1){
    const sorted=[...slots].sort((a,b)=>a[1].yieldRate-b[1].yieldRate||a[0].localeCompare(b[0]));
    const low=sorted[0],high=sorted.at(-1);
    if(high[1].yieldRate>low[1].yieldRate&&high[1].yieldRate>=low[1].yieldRate*2){
      warnings.push({code:'REFERENCE_SLOT_YIELD_2X',highSlot:high[0],highRate:high[1].yieldRate,lowSlot:low[0],lowRate:low[1].yieldRate});
    }
  }
  let worst=null;
  const chars=Object.entries(reference.byCharacter||{});
  for(let i=0;i<chars.length;i++)for(let j=i+1;j<chars.length;j++){
    const [aId,a]=chars[i],[bId,b]=chars[j];
    for(const signature of [...new Set([...Object.keys(a.availableSignatureBuckets||{}),...Object.keys(b.availableSignatureBuckets||{})])]){
      const aa=a.availableSignatureBuckets?.[signature],bb=b.availableSignatureBuckets?.[signature];
      if(!aa?.intents||!bb?.intents)continue;
      const ar=aa.collisions/aa.intents,br=bb.collisions/bb.intents;
      const high=ar>=br?{id:aId,rate:ar}:{id:bId,rate:br};
      const low=ar>=br?{id:bId,rate:br}:{id:aId,rate:ar};
      const ratio=low.rate===0?(high.rate>0?Infinity:1):high.rate/low.rate;
      if(ratio>=2&&high.rate>low.rate&&(!worst||ratio>worst.ratio)){
        worst={ratio,availableNumbers:signature.split(',').filter(Boolean).map(Number),high,low};
      }
    }
  }
  if(worst)warnings.push({
    code:'REFERENCE_CLASS_COLLISION_2X_SAME_AVAILABILITY',
    availableNumbers:worst.availableNumbers,
    highCharacter:worst.high.id,highRate:worst.high.rate,
    lowCharacter:worst.low.id,lowRate:worst.low.rate
  });
  for(const [characterId,share] of Object.entries(characterDamageShare||{})){
    if(Number.isFinite(share)&&share<.05)warnings.push({code:'REFERENCE_DAMAGE_SHARE_UNDER_5_PERCENT',characterId,share});
  }
  return warnings;
}
function aggregateScenario(def,results,failures){
  const skip=results.find(x=>x.status==='SKIP');
  if(skip)return {
    scenarioId:def.id,name:def.name,status:'SKIP',seedCount:0,
    skipReasons:skip.skipReasons,warnings:[],failedSeeds:[]
  };
  const passed=results.filter(x=>x.status==='PASS');
  const warnings=passed.flatMap(x=>x.balanceWarnings||balanceWarnings(x));
  const combats=passed.flatMap(x=>x.combats||[]);
  const byRoom={};
  for(const roomType of [...new Set(combats.map(x=>x.roomType))]){
    const rows=combats.filter(x=>x.roomType===roomType);
    byRoom[roomType]=avg(rows.map(x=>x.turns));
  }
  const outcomes=passed.filter(x=>typeof x.outcome==='string');
  const clears=outcomes.filter(x=>!['RUN_FAILED','ABANDONED'].includes(x.outcome)).length;
  const effectTriggerCounts={};
  for(const result of passed)for(const [id,count] of Object.entries(result.effectTriggerCounts||{}))effectTriggerCounts[id]=(effectTriggerCounts[id]||0)+count;
  const shareKeys=[...new Set(passed.flatMap(x=>Object.keys(x.characterDamageShare||{})))];
  const avgCharacterDamageShare=Object.fromEntries(shareKeys.map(k=>[k,avg(passed.map(x=>x.characterDamageShare?.[k]).filter(Number.isFinite))]));
  const expKeys=[...new Set(passed.flatMap(x=>Object.keys(x.expGainByCharacter||{})))];
  const avgExpGainByCharacter=Object.fromEntries(expKeys.map(k=>[k,avg(passed.map(x=>x.expGainByCharacter?.[k]).filter(Number.isFinite))]));
  const referenceCommunication=def.id==='T00'
    ?mergeReferenceRows(passed.map(x=>x.referenceCommunication).filter(Boolean))
    :null;
  const mutationRows=passed.map(x=>x.mutationMetrics).filter(Boolean);
  const mutationMetrics=def.id==='T05'&&mutationRows.length?{
    avgSelfModificationsPerCombat:avg(mutationRows.map(x=>x.selfModifications/Math.max(1,x.combatCount||1))),
    avgSwapsPerCombat:avg(mutationRows.map(x=>x.swaps/Math.max(1,x.combatCount||1))),
    avgStealEventsPerCombat:avg(mutationRows.map(x=>x.stealEvents/Math.max(1,x.combatCount||1))),
    avgStolenAmountPerCombat:avg(mutationRows.map(x=>x.stolenAmount/Math.max(1,x.combatCount||1))),
    mutationCreatedCollisionCount:mutationRows.reduce((s,x)=>s+(x.mutationCreatedCollisionCount||0),0),
    mutationResolvedCollisionCount:mutationRows.reduce((s,x)=>s+(x.mutationResolvedCollisionCount||0),0),
    knightImmunityUses:mutationRows.reduce((s,x)=>s+(x.knightImmunityUses||0),0),
    invalidMutationAttempts:mutationRows.reduce((s,x)=>s+(x.invalidMutationAttempts||0),0),
    numberHistoryMismatchCount:mutationRows.reduce((s,x)=>s+(x.numberHistoryMismatchCount||0),0),
    deterministicReplayMismatchCount:mutationRows.reduce((s,x)=>s+(x.deterministicReplayMismatchCount||0),0)
  }:null;
  const resourceRows=passed.map(x=>x.resourceMetrics).filter(Boolean);
  const resourceMetrics=def.id==='T09'&&resourceRows.length?{
    invalidSkillRequestCount:resourceRows.reduce((s,x)=>s+(x.invalidSkillRequestCount||0),0),
    rejectedRequestCount:resourceRows.reduce((s,x)=>s+(x.rejectedRequestCount||0),0),
    rejectionReasonCount:resourceRows.reduce((out,row)=>{
      for(const [reason,count] of Object.entries(row.rejectionReasonCount||{}))out[reason]=(out[reason]||0)+(Number(count)||0);
      return out;
    },{}),
    negativeResourceOccurrence:resourceRows.reduce((s,x)=>s+(x.negativeResourceOccurrence||0),0),
    resourceOverCapOccurrence:resourceRows.reduce((s,x)=>s+(x.resourceOverCapOccurrence||0),0),
    emptyHandSoftlockCount:resourceRows.reduce((s,x)=>s+(x.emptyHandSoftlockCount||0),0),
    cycleResetCount:resourceRows.reduce((s,x)=>s+(x.cycleResetCount||0),0),
    recoveredCardCount:resourceRows.reduce((s,x)=>s+(x.recoveredCardCount||0),0),
    duplicateCardInvariantFailure:resourceRows.reduce((s,x)=>s+(x.duplicateCardInvariantFailure||0),0),
    fullBurstSuccess:resourceRows.reduce((s,x)=>s+(x.fullBurstSuccess||0),0),
    fullBurstFailure:resourceRows.reduce((s,x)=>s+(x.fullBurstFailure||0),0),
    revelationGain:resourceRows.reduce((s,x)=>s+(x.revelationGain||0),0),
    revelationSpend:resourceRows.reduce((s,x)=>s+(x.revelationSpend||0),0),
    revelationRegain:resourceRows.reduce((s,x)=>s+(x.revelationRegain||0),0),
    deterministicReplayMismatch:resourceRows.reduce((s,x)=>s+(x.deterministicReplayMismatch||0),0),
    resourceLeakAtCombatEnd:resourceRows.reduce((s,x)=>s+(x.resourceLeakAtCombatEnd||0),0)
  }:null;
  const collisionRows=passed.map(x=>x.collisionMetrics).filter(Boolean);
  const totalCollisionGroups=collisionRows.reduce((s,x)=>s+(x.collisionGroups||0),0);
  const collisionMetrics=def.id==='T04'&&collisionRows.length?{
    collisionGroups:totalCollisionGroups,
    intentionalCollisionAttempts:collisionRows.reduce((s,x)=>s+(x.intentionalCollisionAttempts||0),0),
    successfulIntentionalCollisions:collisionRows.reduce((s,x)=>s+(x.successfulIntentionalCollisions||0),0),
    collisionInvalidatedCards:collisionRows.reduce((s,x)=>s+(x.collisionInvalidatedCards||0),0),
    crushedCardCount:collisionRows.reduce((s,x)=>s+(x.crushedCardCount||0),0),
    knightCrushBonusDamage:collisionRows.reduce((s,x)=>s+(x.knightCrushBonusDamage||0),0),
    berserkerCollisionHeal:collisionRows.reduce((s,x)=>s+(x.berserkerCollisionHeal||0),0),
    berserkerRevengeGain:collisionRows.reduce((s,x)=>s+(x.berserkerRevengeGain||0),0),
    berserkerRevengeConsume:collisionRows.reduce((s,x)=>s+(x.berserkerRevengeConsume||0),0),
    impStolenAmount:collisionRows.reduce((s,x)=>s+(x.impStolenAmount||0),0),
    vampireSwapCount:collisionRows.reduce((s,x)=>s+(x.vampireSwapCount||0),0),
    generatedResourceValue:collisionRows.reduce((s,x)=>s+(x.generatedResourceValue||0),0),
    triggeredEffectCount:collisionRows.reduce((s,x)=>s+(x.triggeredEffectCount||0),0),
    avgExtraDamagePerCollision:totalCollisionGroups?collisionRows.reduce((s,x)=>s+(x.avgExtraDamagePerCollision||0)*(x.collisionGroups||0),0)/totalCollisionGroups:0,
    avgHealingPerCollision:totalCollisionGroups?collisionRows.reduce((s,x)=>s+(x.avgHealingPerCollision||0)*(x.collisionGroups||0),0)/totalCollisionGroups:0,
    avgGeneratedResourcePerCollision:totalCollisionGroups?collisionRows.reduce((s,x)=>s+(x.avgGeneratedResourcePerCollision||0)*(x.collisionGroups||0),0)/totalCollisionGroups:0,
    avgTriggeredEffectsPerCollision:totalCollisionGroups?collisionRows.reduce((s,x)=>s+(x.avgTriggeredEffectsPerCollision||0)*(x.collisionGroups||0),0)/totalCollisionGroups:0,
    recursiveCollisionTriggerCount:collisionRows.reduce((s,x)=>s+(x.recursiveCollisionTriggerCount||0),0)
  }:null;
  const sustainRows=passed.map(x=>x.sustainMetrics).filter(Boolean);
  const sustainMetrics=def.id==='T03'&&sustainRows.length?{
    rawIncomingDamage:sustainRows.reduce((n,x)=>n+(Number(x.rawIncomingDamage)||0),0),
    redirectedDamage:sustainRows.reduce((n,x)=>n+(Number(x.redirectedDamage)||0),0),
    preventedDamage:sustainRows.reduce((n,x)=>n+(Number(x.preventedDamage)||0),0),
    actualDamage:sustainRows.reduce((n,x)=>n+(Number(x.actualDamage)||0),0),
    healing:sustainRows.reduce((n,x)=>n+(Number(x.healing)||0),0),
    wastedHeal:sustainRows.reduce((n,x)=>n+(Number(x.wastedHeal)||0),0),
    healEvents:sustainRows.reduce((n,x)=>n+(Number(x.healEvents)||0),0),
    protectionEvents:sustainRows.reduce((n,x)=>n+(Number(x.protectionEvents)||0),0),
    redirectEvents:sustainRows.reduce((n,x)=>n+(Number(x.redirectEvents)||0),0),
    revengeGains:sustainRows.reduce((n,x)=>n+(Number(x.revengeGains)||0),0),
    collisionHeals:sustainRows.reduce((n,x)=>n+(Number(x.collisionHeals)||0),0),
    transfusions:sustainRows.reduce((n,x)=>n+(Number(x.transfusions)||0),0),
    whiteMagicHeals:sustainRows.reduce((n,x)=>n+(Number(x.whiteMagicHeals)||0),0),
    hp1Rescues:sustainRows.reduce((n,x)=>n+(Number(x.hp1Rescues)||0),0),
    pendingDownSaved:sustainRows.reduce((n,x)=>n+(Number(x.pendingDownSaved)||0),0),
    recursiveHealCount:sustainRows.reduce((n,x)=>n+(Number(x.recursiveHealCount)||0),0),
    recursiveRedirectCount:sustainRows.reduce((n,x)=>n+(Number(x.recursiveRedirectCount)||0),0),
    avgHealingRatio:avg(sustainRows.map(x=>x.healingRatio)),
    avgMitigationRatio:avg(sustainRows.map(x=>x.mitigationRatio)),
    avgEffectiveSustainValue:avg(sustainRows.map(x=>x.effectiveSustainValue)),
    avgFinalPartyHp:avg(sustainRows.map(x=>x.finalPartyHp))
  }:null;
  const burstRows=passed.map(x=>x.burstMetrics).filter(Boolean);
  const burstMetrics=def.id==='T02'&&burstRows.length?{
    maxSingleCardDamage:Math.max(...burstRows.map(x=>Number(x.maxSingleCardDamage)||0)),
    maxSinglePlayerTurnDamage:Math.max(...burstRows.map(x=>Number(x.maxSinglePlayerTurnDamage)||0)),
    maxPartyTurnDamage:Math.max(...burstRows.map(x=>Number(x.maxPartyTurnDamage)||0)),
    avgBurstTurnDamage:avg(burstRows.map(x=>x.averageBurstTurnDamage)),
    avgNonBurstTurnDamage:avg(burstRows.map(x=>x.averageNonBurstTurnDamage)),
    avgBurstNonBurstRatio:avg(burstRows.map(x=>x.burstNonBurstRatio).filter(Number.isFinite)),
    maxConsecutiveBurstTurns:Math.max(...burstRows.map(x=>Number(x.maxConsecutiveBurstTurns)||0)),
    fullBurstActivationCount:burstRows.reduce((n,x)=>n+(Number(x.fullBurstActivationCount)||0),0),
    fullBurstFollowUpCount:burstRows.reduce((n,x)=>n+(Number(x.fullBurstFollowUpCount)||0),0),
    fullBurstConsumedPhysicalCards:burstRows.reduce((n,x)=>n+(Number(x.fullBurstConsumedPhysicalCards)||0),0),
    fullBurstDamage:burstRows.reduce((n,x)=>n+(Number(x.fullBurstDamage)||0),0),
    transformationCount:burstRows.reduce((n,x)=>n+(Number(x.transformationCount)||0),0),
    transformedDemonTurns:burstRows.reduce((n,x)=>n+(Number(x.transformedDemonTurns)||0),0),
    demonTransformedDamage:burstRows.reduce((n,x)=>n+(Number(x.demonTransformedDamage)||0),0),
    devourTransformCost:burstRows.reduce((n,x)=>n+(Number(x.devourTransformCost)||0),0),
    oneHitKillUses:burstRows.reduce((n,x)=>n+(Number(x.oneHitKillUses)||0),0),
    oneHitKillDamage:burstRows.reduce((n,x)=>n+(Number(x.oneHitKillDamage)||0),0),
    bloodFrenzyBonusOccurrences:burstRows.reduce((n,x)=>n+(Number(x.bloodFrenzyBonusOccurrences)||0),0),
    bloodFrenzyBonusDamage:burstRows.reduce((n,x)=>n+(Number(x.bloodFrenzyBonusDamage)||0),0),
    bloodFrenzyAttackDamage:burstRows.reduce((n,x)=>n+(Number(x.bloodFrenzyAttackDamage)||0),0),
    berserkerHpCost:burstRows.reduce((n,x)=>n+(Number(x.berserkerHpCost)||0),0),
    comboConsumed:burstRows.reduce((n,x)=>n+(Number(x.comboConsumed)||0),0),
    devourGained:burstRows.reduce((n,x)=>n+(Number(x.devourGained)||0),0),
    resourcesConsumed:{
      gunslingerPhysicalCards:burstRows.reduce((n,x)=>n+(Number(x.resourcesConsumed?.gunslingerPhysicalCards)||0),0),
      demonDevourAtTransform:burstRows.reduce((n,x)=>n+(Number(x.resourcesConsumed?.demonDevourAtTransform)||0),0),
      martialCombo:burstRows.reduce((n,x)=>n+(Number(x.resourcesConsumed?.martialCombo)||0),0),
      berserkerHp:burstRows.reduce((n,x)=>n+(Number(x.resourcesConsumed?.berserkerHp)||0),0)
    },
    burstDamagePerResource:{
      gunslinger:(()=>{const c=burstRows.reduce((n,x)=>n+(Number(x.resourcesConsumed?.gunslingerPhysicalCards)||0),0);const d=burstRows.reduce((n,x)=>n+(Number(x.fullBurstDamage)||0),0);return c?d/c:null;})(),
      demonSwordsman:(()=>{const c=burstRows.reduce((n,x)=>n+(Number(x.resourcesConsumed?.demonDevourAtTransform)||0),0);const d=burstRows.reduce((n,x)=>n+(Number(x.demonTransformedDamage)||0),0);return c?d/c:null;})(),
      martialArtist:(()=>{const c=burstRows.reduce((n,x)=>n+(Number(x.resourcesConsumed?.martialCombo)||0),0);const d=burstRows.reduce((n,x)=>n+(Number(x.oneHitKillDamage)||0),0);return c?d/c:null;})(),
      berserker:(()=>{const c=burstRows.reduce((n,x)=>n+(Number(x.resourcesConsumed?.berserkerHp)||0),0);const d=burstRows.reduce((n,x)=>n+(Number(x.bloodFrenzyAttackDamage)||0),0);return c?d/c:null;})()
    },
    multiThresholdBurstCount:burstRows.reduce((n,x)=>n+(Number(x.multiThresholdBurstCount)||0),0),
    behaviorSkipMeasurable:burstRows.some(x=>x.behaviorSkipMeasurable===true),
    bossBehaviorSkipCount:null,
    recursiveFollowUpAttempts:burstRows.reduce((n,x)=>n+(Number(x.recursiveFollowUpAttempts)||0),0),
    duplicateDamagePacketCount:burstRows.reduce((n,x)=>n+(Number(x.duplicateDamagePacketCount)||0),0),
    duplicateModifierCount:burstRows.reduce((n,x)=>n+(Number(x.duplicateModifierCount)||0),0),
    bossMaxHp:Math.max(...burstRows.map(x=>Number(x.bossMaxHp)||0))
  }:null;
  const recoveryRows=passed.map(x=>x.recoveryMetrics).filter(Boolean);
  const recoveryMetrics=def.id==='T06'&&recoveryRows.length?{
    totalCardRecoveries:recoveryRows.reduce((n,x)=>n+(Number(x.totalCardRecoveries)||0),0),
    allyCardRecoveries:recoveryRows.reduce((n,x)=>n+(Number(x.allyCardRecoveries)||0),0),
    sameCardRecoveryCount:recoveryRows.reduce((n,x)=>n+(Number(x.sameCardRecoveryCount)||0),0),
    maxTimesOneCardRecovered:Math.max(...recoveryRows.map(x=>Number(x.maxTimesOneCardRecovered)||0)),
    cycleResets:recoveryRows.reduce((n,x)=>n+(Number(x.cycleResets)||0),0),
    fullBurstCycleResets:recoveryRows.reduce((n,x)=>n+(Number(x.fullBurstCycleResets)||0),0),
    acrobaticsCycleResets:recoveryRows.reduce((n,x)=>n+(Number(x.acrobaticsCycleResets)||0),0),
    ghostSlashReactivations:recoveryRows.reduce((n,x)=>n+(Number(x.ghostSlashReactivations)||0),0),
    cardsUsedAfterRecovery:recoveryRows.reduce((n,x)=>n+(Number(x.cardsUsedAfterRecovery)||0),0),
    duplicatePhysicalCardViolations:recoveryRows.reduce((n,x)=>n+(Number(x.duplicatePhysicalCardViolations)||0),0),
    invalidZoneTransitions:recoveryRows.reduce((n,x)=>n+(Number(x.invalidZoneTransitions)||0),0),
    maxRecoveryChainDepth:Math.max(...recoveryRows.map(x=>Number(x.maxRecoveryChainDepth)||0)),
    maxDerivedEventsPerRootAction:Math.max(...recoveryRows.map(x=>Number(x.maxDerivedEventsPerRootAction)||0)),
    actionCeilingHits:recoveryRows.reduce((n,x)=>n+(Number(x.actionCeilingHits)||0),0),
    recursiveRecoveryAttempts:recoveryRows.reduce((n,x)=>n+(Number(x.recursiveRecoveryAttempts)||0),0),
    recursiveCycleResetAttempts:recoveryRows.reduce((n,x)=>n+(Number(x.recursiveCycleResetAttempts)||0),0),
    recursiveSkillReactivationAttempts:recoveryRows.reduce((n,x)=>n+(Number(x.recursiveSkillReactivationAttempts)||0),0),
    deterministicReplayMismatch:recoveryRows.reduce((n,x)=>n+(Number(x.deterministicReplayMismatch)||0),0),
    totalPhysicalCardUses:recoveryRows.reduce((n,x)=>n+(Number(x.totalPhysicalCardUses)||0),0),
    uniquePhysicalCardsUsed:recoveryRows.reduce((n,x)=>n+(Number(x.uniquePhysicalCardsUsed)||0),0),
    avgCardReuseRatio:avg(recoveryRows.map(x=>x.cardReuseRatio)),
    skillCasts:recoveryRows.reduce((n,x)=>n+(Number(x.skillCasts)||0),0)
  }:null;
  const comparisonRows=passed.map(x=>x.comparison).filter(Boolean);
  const recoveryComparison=def.id==='T06'&&comparisonRows.length?{
    avgRecoveryDpt:avg(comparisonRows.map(x=>x.recoveryDpt)),
    avgSteadyDpt:avg(comparisonRows.map(x=>x.steadyDpt)),
    avgDptRatio:avg(comparisonRows.map(x=>x.dptRatio)),
    avgRecoveryTurns:avg(comparisonRows.map(x=>x.recoveryTurns)),
    avgSteadyTurns:avg(comparisonRows.map(x=>x.steadyTurns)),
    avgRecoveryFinalHp:avg(comparisonRows.map(x=>x.recoveryFinalHp)),
    avgSteadyFinalHp:avg(comparisonRows.map(x=>x.steadyFinalHp)),
    avgRecoveryFlameSpent:avg(comparisonRows.map(x=>x.recoveryFlameSpent)),
    avgSteadyFlameSpent:avg(comparisonRows.map(x=>x.steadyFlameSpent)),
    avgRecoveryCardReuseRatio:avg(comparisonRows.map(x=>x.recoveryCardReuseRatio)),
    avgSteadyCardReuseRatio:avg(comparisonRows.map(x=>x.steadyCardReuseRatio)),
    avgRecoveryCount:avg(comparisonRows.map(x=>x.recoveryCount)),
    avgSteadyRecoveryCount:avg(comparisonRows.map(x=>x.steadyRecoveryCount)),
    recoveryDominatesCount:comparisonRows.filter(x=>x.recoveryDominates).length,
    recoveryDominatesRate:comparisonRows.filter(x=>x.recoveryDominates).length/comparisonRows.length
  }:null;
  const burstComparison=def.id==='T02'&&comparisonRows.length?{
    avgBurstDpt:avg(comparisonRows.map(x=>x.burstDpt)),
    avgSteadyDpt:avg(comparisonRows.map(x=>x.steadyDpt)),
    avgDptRatio:avg(comparisonRows.map(x=>x.dptRatio)),
    avgBurstTurns:avg(comparisonRows.map(x=>x.burstTurns)),
    avgSteadyTurns:avg(comparisonRows.map(x=>x.steadyTurns)),
    avgBurstFinalHp:avg(comparisonRows.map(x=>x.burstFinalHp)),
    avgSteadyFinalHp:avg(comparisonRows.map(x=>x.steadyFinalHp)),
    avgBurstFlameSpent:avg(comparisonRows.map(x=>x.burstFlameSpent)),
    avgSteadyFlameSpent:avg(comparisonRows.map(x=>x.steadyFlameSpent)),
    burstDominatesCount:comparisonRows.filter(x=>x.burstDominates).length,
    burstDominatesRate:comparisonRows.filter(x=>x.burstDominates).length/comparisonRows.length
  }:null;
  const collisionComparison=def.id==='T04'&&comparisonRows.length?{
    avgFarmDpt:avg(comparisonRows.map(x=>x.farmDpt)),
    avgSafeDpt:avg(comparisonRows.map(x=>x.safeDpt)),
    avgDptRatio:avg(comparisonRows.map(x=>Number.isFinite(x.dptRatio)?x.dptRatio:null).filter(Number.isFinite)),
    avgFarmTurns:avg(comparisonRows.map(x=>x.farmTurns)),
    avgSafeTurns:avg(comparisonRows.map(x=>x.safeTurns)),
    avgFarmPartyHp:avg(comparisonRows.map(x=>x.farmPartyHp)),
    avgSafePartyHp:avg(comparisonRows.map(x=>x.safePartyHp)),
    avgFarmFinalFlame:avg(comparisonRows.map(x=>x.farmFinalFlame)),
    avgSafeFinalFlame:avg(comparisonRows.map(x=>x.safeFinalFlame)),
    farmDominatesCount:comparisonRows.filter(x=>x.farmDominates).length,
    farmDominatesRate:comparisonRows.filter(x=>x.farmDominates).length/comparisonRows.length
  }:null;
  const sustainComparison=def.id==='T03'&&comparisonRows.length?{
    avgSustainDpt:avg(comparisonRows.map(x=>x.sustainDpt)),
    avgNormalDpt:avg(comparisonRows.map(x=>x.normalDpt)),
    avgDptRatio:avg(comparisonRows.map(x=>x.dptRatio)),
    avgSustainTurns:avg(comparisonRows.map(x=>x.sustainTurns)),
    avgNormalTurns:avg(comparisonRows.map(x=>x.normalTurns)),
    avgSustainFinalPartyHp:avg(comparisonRows.map(x=>x.sustainFinalPartyHp)),
    avgNormalFinalPartyHp:avg(comparisonRows.map(x=>x.normalFinalPartyHp)),
    avgSustainFlameSpent:avg(comparisonRows.map(x=>x.sustainFlameSpent)),
    avgNormalFlameSpent:avg(comparisonRows.map(x=>x.normalFlameSpent)),
    avgSustainKo:avg(comparisonRows.map(x=>x.sustainKo)),
    avgNormalKo:avg(comparisonRows.map(x=>x.normalKo)),
    fortressDominatesCount:comparisonRows.filter(x=>x.fortressDominates).length,
    fortressDominatesRate:comparisonRows.filter(x=>x.fortressDominates).length/comparisonRows.length
  }:null;
  const fairnessWarnings=def.id==='T00'?referenceFairnessWarnings(referenceCommunication,avgCharacterDamageShare,passed.length):[];
  const allWarnings=[...warnings,...fairnessWarnings];
  return {
    scenarioId:def.id,name:def.name,
    status:failures.length?'FAIL':allWarnings.length?'BALANCE_WARNING':'PASS',
    seedCount:passed.length,
    clearRate:outcomes.length?clears/outcomes.length:null,
    avgTurnsByRoomType:byRoom,
    avgPartyDpt:avg(combats.map(x=>x.partyDpt)),
    avgKo:avg(combats.map(x=>x.ko)),
    avgFlameSpent:avg(combats.map(x=>x.flameSpent)),
    avgHpDamage:avg(combats.map(x=>Object.values(x.damageTaken||{}).reduce((a,b)=>a+b,0))),
    avgHealing:avg(combats.map(x=>Object.values(x.healingDone||{}).reduce((a,b)=>a+b,0))),
    effectTriggerCounts,avgCharacterDamageShare,avgExpGainByCharacter,
    referenceCommunication,
    mutationMetrics,
    resourceMetrics,
    collisionMetrics,
    collisionComparison,
    burstMetrics,
    burstComparison,
    sustainMetrics,
    sustainComparison,
    recoveryMetrics,
    recoveryComparison,
    fairnessWarnings,
    warnings:allWarnings,failedSeeds:failures.map(x=>x.seed)
  };
}
function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
function replayCommand(scenarioId,seed){
  return `npm run pve:stress -- --scenario ${scenarioId} --seed ${JSON.stringify(seed)}`;
}

export async function main(argv=process.argv.slice(2)){
  const opts=argsOf(argv);
  if(opts.help){console.log(usage());return 0;}
  const outDir=path.resolve(opts.output);ensureDir(outDir);ensureDir(path.join(outDir,'scenarios'));
  const selected=opts.scenario
    ? STRESS_SCENARIOS.filter(x=>x.id===opts.scenario)
    : STRESS_SCENARIOS;
  if(opts.scenario&&!selected.length)throw new Error(`Unknown scenario: ${opts.scenario}`);

  const allRows=[],failedSeeds=[],scenarioSummaries=[],referenceTurnRows=[],numberMutationTurnRows=[],resourceStarvationRows=[],collisionFarmRows=[],collisionSafeRows=[],sustainRows=[],normalSustainRows=[],burstTurnRows=[],steadyBurstRows=[],recoveryTurnRows=[],steadyRecoveryRows=[];
  let t02FixtureArtifact=null,t02GoldenArtifact=null,t03FixtureArtifact=null,t04FixtureArtifact=null,t05FixtureArtifact=null,t06FixtureArtifact=null,t06GoldenArtifact=null,t09FixtureArtifact=null;
  let hardFailures=0;
  for(const def of selected){
    const availability=scenarioAvailability(def);
    if(!availability.available){
      const result={scenarioId:def.id,seed:null,status:'SKIP',skipReasons:availability.reasons};
      scenarioSummaries.push(aggregateScenario(def,[result],[]));
      continue;
    }
    const rows=[],failures=[],results=[];
    for(const seed of seedsFor(opts,def.id)){
      try{
        const result=replayScenario(def.id,seed);
        const warnings=balanceWarnings(result);
        result.balanceWarnings=warnings;results.push(result);
        for(const turn of result.referenceTurns||[])referenceTurnRows.push({scenarioId:def.id,seed,...turn});
        for(const turn of result.numberMutationTurns||[])numberMutationTurnRows.push({scenarioId:def.id,seed,...turn});
        for(const turn of result.resourceTimeline||[])resourceStarvationRows.push({scenarioId:def.id,seed,...turn});
        for(const turn of result.collisionTurns||[])collisionFarmRows.push({scenarioId:def.id,seed,...turn});
        for(const turn of result.safePlayTurns||[])collisionSafeRows.push({scenarioId:def.id,seed,...turn});
        for(const turn of result.sustainTurns||[])sustainRows.push({scenarioId:def.id,seed,...turn});
        for(const turn of result.normalSustainTurns||[])normalSustainRows.push({scenarioId:def.id,seed,...turn});
        for(const turn of result.burstTurns||[])burstTurnRows.push({scenarioId:def.id,seed,...turn});
        for(const turn of result.steadyBurstTurns||[])steadyBurstRows.push({scenarioId:def.id,seed,...turn});
        for(const turn of result.recoveryTurns||[])recoveryTurnRows.push({scenarioId:def.id,seed,...turn});
        for(const turn of result.steadyRecoveryTurns||[])steadyRecoveryRows.push({scenarioId:def.id,seed,...turn});
        if(def.id==='T02'&&!t02FixtureArtifact&&result.fixtures)t02FixtureArtifact={scenarioId:'T02',seed,fixtures:result.fixtures};
        if(def.id==='T02'&&!t02GoldenArtifact)t02GoldenArtifact={seed,golden:t02GoldenComparable(result)};
        if(def.id==='T03'&&!t03FixtureArtifact&&result.fixtures)t03FixtureArtifact={scenarioId:'T03',seed,fixtures:result.fixtures};
        if(def.id==='T04'&&!t04FixtureArtifact&&result.fixtures)t04FixtureArtifact={scenarioId:'T04',seed,fixtures:result.fixtures};
        if(def.id==='T05'&&!t05FixtureArtifact&&result.fixtures)t05FixtureArtifact={scenarioId:'T05',seed,fixtures:result.fixtures};
        if(def.id==='T06'&&!t06FixtureArtifact&&result.fixtures)t06FixtureArtifact={scenarioId:'T06',seed,fixtures:result.fixtures};
        if(def.id==='T06'&&!t06GoldenArtifact)t06GoldenArtifact={seed,golden:t06GoldenComparable(result)};
        if(def.id==='T09'&&!t09FixtureArtifact&&result.fixtures)t09FixtureArtifact={scenarioId:'T09',seed,fixtures:result.fixtures};
        const row={
          scenarioId:def.id,seed,status:warnings.length?'BALANCE_WARNING':'PASS',
          actionCount:result.actionCount??result.actions??0,
          caseCount:result.cases?.length??0,
          warnings:warnings.map(x=>x.code),
          failureCode:'',
          replayCommand:replayCommand(def.id,seed)
        };
        rows.push(row);allRows.push(row);
      }catch(error){
        if(!(error instanceof StressHardFailure))throw error;
        hardFailures++;
        const failure={
          scenarioId:def.id,seed,failureCode:error.code,
          finalStateVersion:error.details?.finalStateVersion??null,
          lastActionId:error.details?.lastActionId??null,
          message:error.message,details:error.details,
          replayCommand:replayCommand(def.id,seed)
        };
        failures.push(failure);failedSeeds.push(failure);
        const row={
          scenarioId:def.id,seed,status:'FAIL',actionCount:0,caseCount:0,warnings:[],
          failureCode:error.code,replayCommand:failure.replayCommand
        };
        rows.push(row);allRows.push(row);
      }
    }
    writeCsv(path.join(outDir,'scenarios',`${def.id}.csv`),rows);
    scenarioSummaries.push(aggregateScenario(def,results,failures));
  }

  const skipped=skippedScenarioReport().filter(x=>selected.some(s=>s.id===x.scenarioId));
  const summary={
    schemaVersion:STRESS_SCHEMA_VERSION,
    build:{commit:commitHash()},
    mode:opts.seed?'replay':opts.mode,
    requestedSeedCount:seedCount(opts),
    hardFailCount:hardFailures,
    balanceWarningCount:allRows.filter(x=>x.status==='BALANCE_WARNING').length+
      scenarioSummaries.reduce((sum,x)=>sum+(x.fairnessWarnings?.length||0),0),
    scenarioCount:selected.length,
    scenarios:scenarioSummaries,
    skippedScenarios:skipped,
    canonicalRules:CANONICAL_RULES,
    specAmbiguities:SPEC_AMBIGUITIES
  };
  fs.writeFileSync(path.join(outDir,'pve_stress_summary.json'),JSON.stringify(summary,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'pve_failed_seeds.json'),JSON.stringify(failedSeeds,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'pve_skipped_scenarios.json'),JSON.stringify(skipped,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'pve_spec_ambiguities.json'),JSON.stringify(SPEC_AMBIGUITIES,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'pve_canonical_rules.json'),JSON.stringify(CANONICAL_RULES,null,2)+'\n');
  if(referenceTurnRows.length)fs.writeFileSync(path.join(outDir,'pve_reference_turns.jsonl'),referenceTurnRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  if(numberMutationTurnRows.length)fs.writeFileSync(path.join(outDir,'pve_number_mutation_turns.jsonl'),numberMutationTurnRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  if(resourceStarvationRows.length)fs.writeFileSync(path.join(outDir,'pve_resource_starvation_turns.jsonl'),resourceStarvationRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  if(collisionFarmRows.length)fs.writeFileSync(path.join(outDir,'pve_collision_farm_turns.jsonl'),collisionFarmRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  if(collisionSafeRows.length)fs.writeFileSync(path.join(outDir,'pve_collision_safe_turns.jsonl'),collisionSafeRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  if(sustainRows.length)fs.writeFileSync(path.join(outDir,'pve_sustain_turns.jsonl'),sustainRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  if(normalSustainRows.length)fs.writeFileSync(path.join(outDir,'pve_normal_sustain_turns.jsonl'),normalSustainRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  if(burstTurnRows.length)fs.writeFileSync(path.join(outDir,'pve_burst_turns.jsonl'),burstTurnRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  if(steadyBurstRows.length)fs.writeFileSync(path.join(outDir,'pve_steady_burst_turns.jsonl'),steadyBurstRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  if(recoveryTurnRows.length)fs.writeFileSync(path.join(outDir,'pve_recovery_turns.jsonl'),recoveryTurnRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  if(steadyRecoveryRows.length)fs.writeFileSync(path.join(outDir,'pve_steady_recovery_turns.jsonl'),steadyRecoveryRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  if(t02FixtureArtifact)fs.writeFileSync(path.join(outDir,'pve_t02_fixtures.json'),JSON.stringify(t02FixtureArtifact,null,2)+'\n');
  if(t02GoldenArtifact)fs.writeFileSync(path.join(outDir,'pve_t02_golden.json'),JSON.stringify(t02GoldenArtifact,null,2)+'\n');
  if(t03FixtureArtifact)fs.writeFileSync(path.join(outDir,'pve_t03_fixtures.json'),JSON.stringify(t03FixtureArtifact,null,2)+'\n');
  if(t04FixtureArtifact)fs.writeFileSync(path.join(outDir,'pve_t04_fixtures.json'),JSON.stringify(t04FixtureArtifact,null,2)+'\n');
  if(t05FixtureArtifact)fs.writeFileSync(path.join(outDir,'pve_t05_fixtures.json'),JSON.stringify(t05FixtureArtifact,null,2)+'\n');
  if(t06FixtureArtifact)fs.writeFileSync(path.join(outDir,'pve_t06_fixtures.json'),JSON.stringify(t06FixtureArtifact,null,2)+'\n');
  if(t06GoldenArtifact)fs.writeFileSync(path.join(outDir,'pve_t06_golden.json'),JSON.stringify(t06GoldenArtifact,null,2)+'\n');
  if(t09FixtureArtifact)fs.writeFileSync(path.join(outDir,'pve_t09_fixtures.json'),JSON.stringify(t09FixtureArtifact,null,2)+'\n');
  writeCsv(path.join(outDir,'pve_stress_seeds.csv'),allRows);

  console.log('[PVE_STRESS_SUMMARY]',JSON.stringify(summary));
  console.log(`PVE stress reports: ${outDir}`);
  return hardFailures?1:0;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().then(code=>{process.exitCode=code;}).catch(error=>{console.error(error);process.exitCode=1;});
}
