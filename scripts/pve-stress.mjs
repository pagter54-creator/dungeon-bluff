import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {
  STRESS_SCHEMA_VERSION,STRESS_SCENARIOS,SPEC_AMBIGUITIES,
  StressHardFailure,replayScenario,scenarioAvailability,skippedScenarioReport,balanceWarnings
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
function aggregateScenario(def,results,failures){
  const skip=results.find(x=>x.status==='SKIP');
  if(skip)return {
    scenarioId:def.id,name:def.name,status:'SKIP',seedCount:0,
    skipReasons:skip.skipReasons,warnings:[],failedSeeds:[]
  };
  const passed=results.filter(x=>x.status==='PASS');
  const warnings=passed.flatMap(balanceWarnings);
  return {
    scenarioId:def.id,name:def.name,
    status:failures.length?'FAIL':warnings.length?'BALANCE_WARNING':'PASS',
    seedCount:passed.length,
    clearRate:null,avgTurnsByRoomType:{},avgPartyDpt:null,avgKo:null,avgFlameSpent:null,
    warnings,failedSeeds:failures.map(x=>x.seed)
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

  const allRows=[],failedSeeds=[],scenarioSummaries=[];
  let hardFailures=0;
  for(const def of selected){
    const availability=scenarioAvailability(def);
    if(!availability.available){
      const result={scenarioId:def.id,seed:null,status:'SKIP',skipReasons:availability.reasons};
      scenarioSummaries.push(aggregateScenario(def,[result],[]));
      continue;
    }
    const rows=[],failures=[];
    for(const seed of seedsFor(opts,def.id)){
      try{
        const result=replayScenario(def.id,seed);
        const warnings=balanceWarnings(result);
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
    scenarioSummaries.push(aggregateScenario(def,rows.map(r=>({status:r.status==='BALANCE_WARNING'?'PASS':r.status})),failures));
  }

  const skipped=skippedScenarioReport().filter(x=>selected.some(s=>s.id===x.scenarioId));
  const summary={
    schemaVersion:STRESS_SCHEMA_VERSION,
    build:{commit:commitHash()},
    mode:opts.scenario?'replay':opts.mode,
    requestedSeedCount:seedCount(opts),
    hardFailCount:hardFailures,
    balanceWarningCount:allRows.filter(x=>x.status==='BALANCE_WARNING').length,
    scenarioCount:selected.length,
    scenarios:scenarioSummaries,
    skippedScenarios:skipped,
    specAmbiguities:SPEC_AMBIGUITIES
  };
  fs.writeFileSync(path.join(outDir,'pve_stress_summary.json'),JSON.stringify(summary,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'pve_failed_seeds.json'),JSON.stringify(failedSeeds,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'pve_skipped_scenarios.json'),JSON.stringify(skipped,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'pve_spec_ambiguities.json'),JSON.stringify(SPEC_AMBIGUITIES,null,2)+'\n');
  writeCsv(path.join(outDir,'pve_stress_seeds.csv'),allRows);

  console.log('[PVE_STRESS_SUMMARY]',JSON.stringify(summary));
  console.log(`PVE stress reports: ${outDir}`);
  return hardFailures?1:0;
}

if(import.meta.url===`file://${process.argv[1]}`){
  main().then(code=>{process.exitCode=code;}).catch(error=>{console.error(error);process.exitCode=1;});
}
