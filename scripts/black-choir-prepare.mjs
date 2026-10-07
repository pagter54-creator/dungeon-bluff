import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {instrumentCombatSource} from './pve-rebalance-measurement.mjs';
export async function prepare(source,output){
  source=path.resolve(source);output=path.resolve(output);
  if(output===source||output.startsWith(source+path.sep))throw new Error('ISOLATED_OUTPUT_REQUIRED');
  const target=path.join(output,'runtime/supabase/functions/game-api');
  await fs.mkdir(target,{recursive:true});await fs.cp(path.join(source,'supabase/functions/game-api'),target,{recursive:true});
  const pve=path.join(target,'pve'),hash=crypto.createHash('sha256');
  for(const file of (await fs.readdir(pve)).filter(x=>x.endsWith('.js')).sort()){hash.update(file);hash.update(await fs.readFile(path.join(pve,file)));}
  const runtimeHash=hash.digest('hex');
  const filename=path.join(pve,'combat.js');let text=await fs.readFile(filename,'utf8');
  function replaceOnce(a,b){if(text.split(a).length!==2)throw new Error('INSTRUMENTATION_SITE:'+a);text=text.replace(a,b);}
  replaceOnce('autoSubmitStunned(run);autoSubmitAi(run);','autoSubmitStunned(run); // AI decisions are invoked explicitly by the offline lab.');
  replaceOnce('  const totalDamage=packets.reduce((s,p)=>s+p.amount,0);','  const totalDamage=packets.reduce((s,p)=>s+p.amount,0);if(globalThis.__choirOracle)return {cards,damagePackets:packets,totalDamage};');
  replaceOnce('resolveF3AfterDamage(run,events,applyMonsterDamage)',"resolveF3AfterDamage(run,events,(r,p,n,t)=>applyMonsterDamage(r,p,n,t).map(e=>e.type==='PLAYER_DAMAGED'?{...e,auditPatternSource:r.combat.monster.mechanic.type}:e))");
  text=instrumentCombatSource(text)+'\nexport {autoSubmitAi as diagnosticCurrentAi,aiPlan as diagnosticAiPlan,selectableIds as diagnosticSelectableIds};\n';
  await fs.writeFile(filename,text);await fs.writeFile(path.join(output,'runtime/package.json'),'{"type":"module"}');
  const rngPath=path.join(pve,'rng.js'),rng=await fs.readFile(rngPath,'utf8');
  if(!rng.includes('export function drawIndex(run,length,contextKey){'))throw Error('RNG_SITE_MISSING');
  await fs.writeFile(rngPath,rng.replace('export function drawIndex(run,length,contextKey){',"export function drawIndex(run,length,contextKey){if(globalThis.__choirOracle)throw new Error('ORACLE_RANDOM_BRANCH');"));
  return {runtimeHash,runtime:path.join(output,'runtime')};
}
