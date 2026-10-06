import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {instrumentCombatSource,instrumentFlameSource,instrumentMonsterSource} from './pve-rebalance-measurement.mjs';
const [candidateArg,outputArg]=process.argv.slice(2);
if(!candidateArg||!outputArg)throw new Error('Usage: node scripts/pve-rebalance-002-prepare.mjs <candidate-checkout> <isolated-output>');
const candidate=path.resolve(candidateArg),output=path.resolve(outputArg),scripts=path.dirname(fileURLToPath(import.meta.url));
if(output===candidate||output.startsWith(candidate+path.sep))throw new Error('Output must be outside the source checkout.');
await fs.mkdir(output,{recursive:true});
const runtime=path.join(output,'runtime');
await fs.cp(path.join(candidate,'supabase/functions/game-api'),path.join(runtime,'supabase/functions/game-api'),{recursive:true});
const pve=path.join(runtime,'supabase/functions/game-api/pve'),hash=crypto.createHash('sha256');
for(const file of (await fs.readdir(pve)).filter(f=>f.endsWith('.js')).sort()){hash.update(file);hash.update(await fs.readFile(path.join(pve,file)));}
const sourceRuntimeHash=hash.digest('hex');
for(const [name,instrument] of [['combat.js',instrumentCombatSource],['monster.js',instrumentMonsterSource]]){
 const file=path.join(pve,name);await fs.writeFile(file,instrument(await fs.readFile(file,'utf8')));
}
for(const name of ['combat.js','rooms.js','event-resolution.js']){const file=path.join(pve,name);await fs.writeFile(file,instrumentFlameSource(await fs.readFile(file,'utf8')));}
await fs.appendFile(path.join(pve,'events.js'),'\nexport {availableCards as simulationAvailableCards};\n');
await fs.writeFile(path.join(runtime,'package.json'),JSON.stringify({type:'module'}));
await fs.copyFile(path.join(scripts,'pve-rebalance-measurement.mjs'),path.join(output,'pve-rebalance-measurement.mjs'));
await fs.copyFile(path.join(scripts,'pve-rebalance-002-sim.mjs'),path.join(output,'policy.mjs'));
await fs.writeFile(path.join(output,'simulate.mjs'),`import {fileURLToPath} from 'node:url';\nprocess.env.PVE_SIM_RUNTIME=fileURLToPath(new URL('./runtime/',import.meta.url));\nprocess.env.PVE_SIM_OUTPUT=fileURLToPath(new URL('./',import.meta.url));\nprocess.env.PVE_SIM_CONDITION='REWORK_002';\nprocess.env.PVE_SOURCE_SHA='CANDIDATE_RUNTIME_HASH:${sourceRuntimeHash}';\nawait import(new URL('./policy.mjs',import.meta.url).href);\n`);
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({baselineSHA:'009b496867cb7e3343be013dd2cf05c1bca35fdc',sourceRuntimeHash,productionModulesInstrumented:false,networkCalls:0}));
console.log(JSON.stringify({output,sourceRuntimeHash}));
