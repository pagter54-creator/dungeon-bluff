import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';
import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import dgram from 'node:dgram';
import {prepare} from './black-choir-prepare.mjs';import {jointSearch,selectCoop,TEST_VERSION} from './black-choir-policy.mjs';
import {snapshotAdaptiveRequirement} from './pve-rebalance-measurement.mjs';
import {gunzipSync} from 'node:zlib';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
const samples=Number(args.samples||200),cohort=args.cohort||'expedition_like',seedSet=args.seed_set||'rebalance006';
if(!Number.isInteger(samples)||samples<1||samples>2000)throw Error('INVALID_SAMPLE_COUNT');
if(cohort!=='expedition_like'||seedSet!=='rebalance006')throw Error('FIRST_STAGE_ONLY_EXPEDITION_LIKE_REBALANCE006');
let networkAttempts=0;const deny=()=>{networkAttempts++;throw Error('OFFLINE_NETWORK_FORBIDDEN');};globalThis.fetch=deny;
http.request=http.get=https.request=https.get=net.connect=net.createConnection=tls.connect=dgram.createSocket=deny;
globalThis.WebSocket=class{constructor(){deny();}};globalThis.XMLHttpRequest=class{constructor(){deny();}};
const output=path.resolve(args.output||process.env.RUNNER_TEMP&&path.join(process.env.RUNNER_TEMP,'choir-lab')||'../choir-lab');
const manifest=await prepare(process.cwd(),output),base=pathToFileURL(manifest.runtime+'/supabase/functions/game-api/pve/');
const mod=n=>import(new URL(n+'.js',base));
const [combat,characters,projection,cycle,model,content,adaptive,rework]=await Promise.all(['combat','characters','projection','card-cycle','model','content-f3','adaptive-pattern','prophet-vampire-rework'].map(mod));
const fixtureRaw=gunzipSync(await fs.readFile(new URL('./fixtures/rebalance006-f3-entries.json.gz',import.meta.url)));const fixture=JSON.parse(fixtureRaw);
if(fixture.entries.length!==25||fixture.runtimeHash!==manifest.runtimeHash)throw Error('SNAPSHOT_RUNTIME_PROVENANCE_MISMATCH');
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const encounters=[],turns=[],failures=[];let observed=[];
globalThis.__balanceObserve=(run,result,submissions,adaptive)=>{if(!globalThis.__choirOracle)observed.push({...structuredClone(result),diagnosticAdaptive:structuredClone(adaptive)});};
globalThis.__balanceAdaptive=snapshotAdaptiveRequirement;
function candidates(run,p){
  const priv=run.combat.privateByPlayer[p.playerId],ids=combat.diagnosticSelectableIds(run,p).filter(id=>rework.fragmentRandomEligible(run,p,id)),out=[];
  for(const id of ids){const card=p.cardPool.find(c=>c.id===id),plans=[{skillIntent:false,skillData:null}];
    const existing=combat.diagnosticAiPlan(run,p,priv,id);plans.push(existing);
    if(p.characterId==='mage')for(const manaSpend of p.augments.includes('aug-111')?[2,4]:[2,4,6,7])for(const direction of p.augments.includes('aug-111')?[-1,1]:[1])plans.push({skillIntent:true,skillData:{manaSpend,direction}});
    // All deterministic submission-time skill toggles (Vampire swap included)
    // are validated by the real server. Random branches are excluded by replay.
    plans.push({skillIntent:true,skillData:null});
    const seen=new Set();for(const plan of plans){try{
      characters.validateCharacterSkillIntent(p,priv,!!plan.skillIntent,card,plan.skillData);
      const trial=structuredClone(run);combat.submitCard(trial,p.playerId,id,!!plan.skillIntent,plan.skillData);
      const key=JSON.stringify([id,!!plan.skillIntent,plan.skillData]);if(seen.has(key))continue;seen.add(key);
      const rc={workingNumber:card.baseNumber,finalNumber:card.baseNumber};characters.selfModifyCard(structuredClone(p),rc,plan);
      const view=projection.projectRun(run,p.playerId);if(p.characterId==='prophet'&&card.slotRole==='PROPHECY_SLOT'&&view.privateProphetState?.fragment)rc.finalNumber=view.privateProphetState.fragment.value;
      out.push({playerId:p.playerId,cardId:id,skillIntent:!!plan.skillIntent,skillData:plan.skillData??null,finalNumber:rc.finalNumber,cost:rc.resourceSpent||Number(plan.skillIntent),expectedDamage:Math.max(0,rc.finalNumber),collisionProtected:p.characterId==='warrior'&&plan.skillIntent&&!p.augments.includes('aug-041'),unknownSwap:p.characterId==='vampire'&&plan.skillIntent});
    }catch{}}
  }
  return out.sort((a,b)=>a.cardId.localeCompare(b.cardId)||Number(a.skillIntent)-Number(b.skillIntent)||JSON.stringify(a.skillData).localeCompare(JSON.stringify(b.skillData)));
}
function submitPlans(run,plans){for(const p of plans)combat.submitCard(run,p.playerId,p.cardId,p.skillIntent,p.skillData);}
function oracle(run,required){
  const options=run.players.filter(p=>p.status!=='DOWNED'&&!run.combat.turnSubmissions[p.playerId]).sort((a,b)=>a.seat-b.seat).map(p=>candidates(run,p));
  return jointSearch(options,plans=>{
    const copy=structuredClone(run);globalThis.__choirOracle=true;
    try{submitPlans(copy,plans);const counter=copy.rngCounter,r=combat.resolveBasicTurn(copy);
      if(!r)throw Error('ORACLE_RESOLUTION_STUCK');
      return {rngDependent:copy.rngCounter!==counter,distinct:new Set(r.cards.filter(c=>c.valid).map(c=>c.finalNumber)).size,valid:r.cards.filter(c=>c.valid).length,damage:r.totalDamage,cost:plans.reduce((n,p)=>n+p.cost,0)};
    }catch(e){if(e.message==='ORACLE_RANDOM_BRANCH')return {rngDependent:true};throw e;}finally{globalThis.__choirOracle=false;}
  },required,512);
}
function current(run){const types=run.players.map(p=>p.memberType);try{for(const p of run.players)p.memberType='ai';combat.diagnosticCurrentAi(run);}finally{run.players.forEach((p,i)=>p.memberType=types[i]);}}
function coop(run,required){
  const intents=[],selected=[],stats={CoordinationDecisionCount:0,ReservedDistinctTargets:0,ReservationConflicts:0,DistinctPlanFailedByHand:0};
  // Each seat receives only its owner projection and public prior bucket intent.
  // Other players' remaining pools, selections and private revelations are omitted.
  for(const p of run.players.filter(x=>x.status!=='DOWNED').sort((a,b)=>a.seat-b.seat)){
    if(run.combat.turnSubmissions[p.playerId])continue;
    const view=projection.projectRun(run,p.playerId),owner=view.players.find(x=>x.playerId===p.playerId);
    const input={pattern:view.combat.monster.id==='f3_black_choir'?'F3_CHOIR':'OTHER',required,ownerSeat:owner.seat,otherPoolCompositions:view.players.filter(x=>x.playerId!==p.playerId&&x.status!=='DOWNED').map(x=>x.cardPool.map(c=>c.baseNumber))};
    const legal=candidates(run,p).filter(x=>!x.unknownSwap),chosen=selectCoop(input,legal,intents);
    if(!chosen)throw Error('COOP_NO_LEGAL_CANDIDATE');
    stats.CoordinationDecisionCount++;if(intents.some(x=>x.bucket===chosen.finalNumber))stats.ReservationConflicts++;
    else stats.ReservedDistinctTargets++;
    if(!legal.some(c=>!intents.some(x=>x.bucket===c.finalNumber)))stats.DistinctPlanFailedByHand++;
    intents.push({seat:p.seat,bucket:chosen.finalNumber});selected.push(chosen);
  }
  submitPlans(run,selected);return stats;
}
function csv(rows){const keys=[...new Set(rows.flatMap(x=>Object.keys(x)))];const esc=v=>'"'+String(v==null?'':typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';return keys.join(',')+'\n'+rows.map(r=>keys.map(k=>esc(r[k])).join(',')).join('\n')+'\n';}
const arms=['CURRENT_AI','COOP_PATTERN_AI','JOINT_ACTION_ORACLE'];
for(let i=0;i<samples;i++)for(const arm of arms){
  const entry=fixture.entries[i%25],run=structuredClone(entry.run),seed='f3-target:f3_black_choir:E:'+i,monster=content.F3_MONSTER_DEFINITIONS.f3_black_choir;
  Object.assign(run,{id:'target:'+hash(['choir007',i]).slice(0,32),seed,rngCounter:0,phase:'COMBAT',roomId:run.roomId||'IN_MEMORY_ONLY'});
  for(const p of run.players)p.memberType='human';
  const node=run.map.nodes.find(n=>n.type==='NORMAL_COMBAT');if(!node)throw Error('MISSING_ROOM_CONTEXT');run.currentRoomNodeId=node.id;run.map.currentNodeId=node.id;run.depth=node.depth;
  run.combat=model.newCombatState(run.players,monster.baseHp,'NORMAL_COMBAT',monster);run.combat.id='combat:'+hash(['choir007',i]).slice(0,32);
  run.combat.privateByPlayer=Object.fromEntries(run.players.map(p=>[p.playerId,cycle.restoreCardCycle(run,p)]));
  const initialHash=hash(run),flameStart=run.flame;let flameSpent=0,error='',turnCount=0;const start=turns.length;
  observed=[];
  try{combat.beginTurn(run);
    while(run.phase==='COMBAT'&&turnCount<100){
      const pre=structuredClone(run),required=adaptive.patternRequirement(run,'requiredDistinct'),search=oracle(pre,required);let stats={};
      if(arm==='CURRENT_AI')current(run);else if(arm==='COOP_PATTERN_AI')stats=coop(run,required);else if(search.best)submitPlans(run,search.best.plans);else current(run);
      const beforeFlame=run.flame;const result=combat.resolveBasicTurn(run);if(!result)throw Error('RESOLUTION_STUCK');
      flameSpent+=Math.max(0,beforeFlame-run.flame);
      const batch=observed.splice(0);if(!batch.length)throw Error('OBSERVATION_MISSING');
      for(const r of batch){turnCount++;const distinct=new Set(r.cards.filter(c=>c.valid).map(c=>c.finalNumber)).size,opportunity=r.diagnosticAdaptive?.opportunity??!r.events.some(e=>e.type==='MONSTER_KILLED'),turnRequired=r.diagnosticAdaptive?.effectiveRequirement??required,pass=distinct>=turnRequired;
        const damage=r.events.filter(e=>e.type==='PLAYER_DAMAGED'),patternDamage=damage.filter(e=>e.auditPatternSource==='F3_CHOIR').reduce((n,e)=>n+Number(e.amount||0),0),baseDamage=damage.filter(e=>!e.auditPatternSource).reduce((n,e)=>n+Number(e.amount||0),0),collision=r.cards.some(c=>c.invalidReason==='COLLISION');
        const collisionCausedFailure=!pass&&new Set(r.cards.filter(c=>c.valid||c.invalidReason==='COLLISION').map(c=>c.finalNumber)).size>=turnRequired;
        const sameDecisionTurn=r.turn===pre.combat.turn,classification=sameDecisionTurn?search.classification:'SEARCH_INCOMPLETE';
        const row={sample:i,arm,seed,snapshotIndex:i%25,turn:r.turn,required:turnRequired,distinct,shortfall:Math.max(0,turnRequired-distinct),opportunity,pass,collision,collisionCausedFailure,partyDamage:r.totalDamage,patternDamage,baseDamage,damageTaken:patternDamage+baseDamage,downs:r.events.filter(e=>e.type==='PLAYER_DOWNED').length,classification,AI_MISPLAY:opportunity&&!pass&&classification==='LEGAL_SOLUTION_EXISTS',searchChecked:sameDecisionTurn?search.checked:0,searchIncomplete:!sameDecisionTurn||search.incomplete,...(sameDecisionTurn?stats:{}),DistinctPlanSuccess:arm==='COOP_PATTERN_AI'&&sameDecisionTurn&&pass,DistinctPlanFailedByCollision:arm==='COOP_PATTERN_AI'&&sameDecisionTurn&&collisionCausedFailure};
        turns.push(row);if(opportunity&&!pass)failures.push(row);
      }
      if(run.augmentFramework?.telemetry)run.augmentFramework.telemetry=[];run._telemetryPending=[];
    }
  }catch(e){error=e.stack||String(e);console.error(JSON.stringify({sample:i,arm,error}));}
  const rows=turns.slice(start),sum=k=>rows.reduce((n,r)=>n+Number(r[k]||0),0);
  encounters.push({sample:i,arm,seed,snapshotIndex:i%25,empiricalSeed:entry.seed,initialHash,clear:!error&&run.combat.monster.hp===0&&run.phase!=='RUN_FAILED',wipe:!error&&run.phase==='RUN_FAILED',turns:turnCount,partyDamage:sum('partyDamage'),damageTaken:sum('damageTaken'),patternDamage:sum('patternDamage'),baseDamage:sum('baseDamage'),downs:sum('downs'),flameSpent,turnCap:run.phase==='COMBAT'&&turnCount>=100,error});
  if(encounters.length%25===0)console.log(JSON.stringify({completed:encounters.length,total:samples*3,exceptions:encounters.filter(r=>r.error).length}));
}
const summary={sourceHead:process.env.PVE_SOURCE_HEAD||'LOCAL',experiment:'black_choir_ai_limit',samplesPerArm:samples,cohort:'EXPEDITION_LIKE_F3',arms:{},classification:{AI_LIMITATION_DOMINANT:false,MONSTER_DIFFICULTY_DOMINANT:false,MIXED_CAUSE:false}};
for(const arm of arms){const es=encounters.filter(x=>x.arm===arm&&!x.error&&!x.turnCap),ts=turns.filter(x=>x.arm===arm&&es.some(e=>e.sample===x.sample)),ps=ts.filter(x=>x.opportunity),failed=ps.filter(x=>!x.pass),knownMiss=failed.filter(x=>x.AI_MISPLAY).length,exhaustive=failed.filter(x=>['LEGAL_SOLUTION_EXISTS','NO_LEGAL_SOLUTION'].includes(x.classification)).length;
  const sum=k=>es.reduce((n,e)=>n+Number(e[k]||0),0),avg=k=>sum(k)/Math.max(1,es.length),turnTotal=sum('turns');
  summary.arms[arm]={Samples:es.length,RequestedSamples:samples,ClearRate:es.filter(x=>x.clear).length/Math.max(1,es.length),WipeRate:es.filter(x=>x.wipe).length/Math.max(1,es.length),AvgTurns:avg('turns'),AvgPartyDamage:avg('partyDamage'),AvgDamageTaken:avg('damageTaken'),PatternDamage:sum('patternDamage'),BaseDamage:sum('baseDamage'),AvgDowns:avg('downs'),AvgFlameSpent:avg('flameSpent'),DamagePer10Turns:sum('damageTaken')*10/Math.max(1,turnTotal),DownsPer10Turns:sum('downs')*10/Math.max(1,turnTotal),Exceptions:encounters.filter(x=>x.arm===arm&&x.error).length,TurnCaps:encounters.filter(x=>x.arm===arm&&x.turnCap).length,PatternOpportunities:ps.length,PatternPass:ps.filter(x=>x.pass).length,PatternFail:failed.length,PatternPassRate:ps.filter(x=>x.pass).length/Math.max(1,ps.length),RequiredDistinctAverage:ps.reduce((n,x)=>n+x.required,0)/Math.max(1,ps.length),ActualValidDistinctAverage:ps.reduce((n,x)=>n+x.distinct,0)/Math.max(1,ps.length),DistinctShortfallAverage:ps.reduce((n,x)=>n+x.shortfall,0)/Math.max(1,ps.length),CollisionCausedFailures:failed.filter(x=>x.collisionCausedFailure).length,LegalSolutionMissRate:knownMiss/Math.max(1,exhaustive),LegalSolutionMissRateDenominator:exhaustive,UnknownFailedTurns:failed.length-exhaustive,solutionDiagnostics:Object.fromEntries(['LEGAL_SOLUTION_EXISTS','NO_LEGAL_SOLUTION','SEARCH_INCOMPLETE','RNG_DEPENDENT','AI_MISPLAY'].map(k=>[k,failed.filter(x=>k==='AI_MISPLAY'?x.AI_MISPLAY:x.classification===k).length])),...Object.fromEntries(['CoordinationDecisionCount','ReservedDistinctTargets','ReservationConflicts','DistinctPlanSuccess','DistinctPlanFailedByCollision','DistinctPlanFailedByHand'].map(k=>[k,ts.reduce((n,x)=>n+Number(x[k]||0),0)]))};
}
const a=summary.arms.CURRENT_AI,b=summary.arms.COOP_PATTERN_AI,c=summary.arms.JOINT_ACTION_ORACLE;
for(let i=0;i<samples;i++)if(new Set(encounters.filter(e=>e.sample===i).map(e=>e.initialHash)).size!==1)throw Error('UNMATCHED_INITIAL_STATE');
summary.deltas={ClearRateDelta:b.ClearRate-a.ClearRate,PatternPassDelta:b.PatternPassRate-a.PatternPassRate,PatternDamageDelta:b.PatternDamage-a.PatternDamage,WipeDelta:b.WipeRate-a.WipeRate,OracleClearRateGap:c.ClearRate-a.ClearRate,OraclePatternPassGap:c.PatternPassRate-a.PatternPassRate,RemainingPolicyGap:c.PatternPassRate-b.PatternPassRate};
summary.exceptions=encounters.filter(x=>x.error).length;summary.DATA_VALID=summary.exceptions===0&&!encounters.some(x=>x.turnCap)&&networkAttempts===0;
summary.classificationScope='CAPPED_DETERMINISTIC_SUBMISSION_SKILLS_ONLY; unknown searches cannot establish global impossibility';
summary.classification.MONSTER_DIFFICULTY_DOMINANT=summary.DATA_VALID&&c.WipeRate>=.25;
summary.classification.AI_LIMITATION_DOMINANT=summary.DATA_VALID&&summary.deltas.ClearRateDelta>=.15&&summary.deltas.PatternPassDelta>=.15&&Math.abs(c.ClearRate-b.ClearRate)<=.1&&Math.abs(c.PatternPassRate-b.PatternPassRate)<=.1;
summary.classification.MIXED_CAUSE=summary.DATA_VALID&&b.ClearRate>a.ClearRate&&c.WipeRate>=.25;
const metadata={sourceCommit:summary.sourceHead,workflowRunId:process.env.GITHUB_RUN_ID||null,runtimeHash:manifest.runtimeHash,seedSet,snapshotCount:25,resamplingCount:samples,snapshotUsage:Array.from({length:25},(_,i)=>encounters.filter(e=>e.arm===arms[0]&&e.snapshotIndex===i).length),fixtureSha256:hash(fixtureRaw),sourceArtifactSha256:fixture.sourceArtifactSha256,oracleSearchCap:512,unknownTurns:turns.filter(t=>['SEARCH_INCOMPLETE','RNG_DEPENDENT'].includes(t.classification)).length,testVersion:TEST_VERSION,networkAttempts,SUPABASE_CALLS:0,PRODUCTION_MUTATION:0,MIGRATIONS:0,READY_FOR_PRODUCTION:false,NO_GAMEPLAY_NUMERIC_CHANGES:true,limitations:['25 correlated empirical snapshots resampled; not 200 independent parties','Current production AI differs from REBALANCE006 profile policy; absolute 58% not a directly matched baseline','Oracle deterministic submission-time skills only; immediate/draw random skill branches excluded','512-cap early witness is feasible but not globally optimal; unknown failure never means no legal solution']};
const outputs={'black_choir_ai_limit_summary.json':JSON.stringify(summary,null,2),'black_choir_ai_limit_encounters.csv':csv(encounters),'black_choir_ai_limit_turns.csv':csv(turns),'black_choir_ai_limit_failures.csv':csv(failures),'black_choir_ai_limit_metadata.json':JSON.stringify(metadata,null,2)};
for(const [name,value]of Object.entries(outputs))await fs.writeFile(path.join(output,name),value);
console.log(JSON.stringify(summary));if(!summary.DATA_VALID)process.exitCode=1;
