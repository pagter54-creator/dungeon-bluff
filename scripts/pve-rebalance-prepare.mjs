import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {instrumentCombatSource,instrumentFlameSource,instrumentMonsterSource} from './pve-rebalance-measurement.mjs';
const [baselineArg,candidateArg,outputArg]=process.argv.slice(2);
if(!baselineArg||!candidateArg||!outputArg)throw new Error('Usage: node scripts/pve-rebalance-prepare.mjs <baseline-checkout> <candidate-checkout> <output-folder>');
const baseline=path.resolve(baselineArg),candidate=path.resolve(candidateArg),output=path.resolve(outputArg),scripts=path.dirname(fileURLToPath(import.meta.url));
for(const source of [baseline,candidate])if(output===source||output.startsWith(source+path.sep))throw new Error('Output must be outside both source checkouts.');
const conditions=['CONTROL','ADAPTIVE_ONLY','EXP_ONLY','CADENCE_ONLY','ALL_THREE'];
for(const condition of conditions){
 const dir=path.join(output,condition),runtime=path.join(dir,'runtime'),kernel=path.join(runtime,'supabase/functions/game-api');
 await fs.mkdir(dir,{recursive:true});
 await fs.cp(path.join(condition==='CONTROL'?baseline:candidate,'supabase/functions/game-api'),kernel,{recursive:true});
 const pve=path.join(kernel,'pve');
 if(condition!=='CONTROL'&&condition!=='ALL_THREE'){
  if(condition!=='EXP_ONLY')await fs.copyFile(path.join(baseline,'supabase/functions/game-api/pve/augments.js'),path.join(pve,'augments.js'));
  for(let floor=1;floor<=3;floor++){
   const file=path.join(pve,`content-f${floor}.js`);let s=await fs.readFile(file,'utf8');
   if(condition!=='CADENCE_ONLY')s=s.replace('monster.actionCadenceDelay=1','monster.actionCadenceDelay=0');
   if(condition!=='ADAPTIVE_ONLY')s=s.replace(/^F[123]_MONSTER_DEFINITIONS\.[^\n]+\.mechanic\.adaptiveRequirement=.*?;\n/gm,'');
   await fs.writeFile(file,s);
  }
 }
 const hash=crypto.createHash('sha256');
 for(const file of (await fs.readdir(pve)).filter(f=>f.endsWith('.js')).sort()){hash.update(file);hash.update(await fs.readFile(path.join(pve,file)));}
 const sourceRuntimeHash=hash.digest('hex');
 const combat=path.join(pve,'combat.js');await fs.writeFile(combat,instrumentCombatSource(await fs.readFile(combat,'utf8')));
 const monster=path.join(pve,'monster.js');await fs.writeFile(monster,instrumentMonsterSource(await fs.readFile(monster,'utf8')));
 for(const name of ['combat.js','rooms.js','event-resolution.js']){const file=path.join(pve,name);await fs.writeFile(file,instrumentFlameSource(await fs.readFile(file,'utf8')));}
 const eventFile=path.join(pve,'events.js');await fs.appendFile(eventFile,'\nexport {availableCards as simulationAvailableCards};\n');
 await fs.writeFile(path.join(runtime,'package.json'),JSON.stringify({type:'module'}));
 await fs.copyFile(path.join(scripts,'pve-rebalance-measurement.mjs'),path.join(dir,'pve-rebalance-measurement.mjs'));
 await fs.copyFile(path.join(scripts,'pve-rebalance-sim.mjs'),path.join(dir,'policy.mjs'));
 await fs.writeFile(path.join(dir,'simulate.mjs'),`import {fileURLToPath} from 'node:url';\nprocess.env.PVE_SIM_RUNTIME=fileURLToPath(new URL('./runtime/',import.meta.url));\nprocess.env.PVE_SIM_OUTPUT=fileURLToPath(new URL('./',import.meta.url));\nprocess.env.PVE_SIM_CONDITION=${JSON.stringify(condition)};\nprocess.env.PVE_SOURCE_SHA=${JSON.stringify(condition==='CONTROL'?'67fa8e6b0cee1524749151b07c382934bfbe6e04':'CANDIDATE_RUNTIME_HASH:'+sourceRuntimeHash)};\nawait import(new URL('./policy.mjs',import.meta.url).href);\n`);
 await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({condition,sourceRuntimeHash,baselineSHA:'67fa8e6b0cee1524749151b07c382934bfbe6e04',commonOrderingFix:condition!=='CONTROL',productionModulesInstrumented:false}));
}
console.log(JSON.stringify({conditions,output,networkCalls:0}));
