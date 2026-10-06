import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {instrumentCombatSource,instrumentFlameSource,instrumentMonsterSource} from './pve-rebalance-measurement.mjs';
const [candidateArg,outputArg]=process.argv.slice(2);
if(!candidateArg||!outputArg)throw new Error('Usage: node scripts/pve-rebalance-004-prepare.mjs <candidate-checkout> <isolated-output>');
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
const combatFile=path.join(pve,'combat.js');let combat=await fs.readFile(combatFile,'utf8');const cardSite='  applyMonsterCardRules(run,cards,events);';if(!combat.includes(cardSite))throw new Error('REWORK_PROBE_SITE_MISSING');combat=combat.replace(cardSite,'  globalThis.__reworkProbe?.(run,cards);'+cardSite+'globalThis.__reworkProbe?.(run,cards,true);');await fs.writeFile(combatFile,combat);
// Attribute old F2_FLAME damage in the isolated baseline copy only. Candidate
// carries an authoritative event tag; neither intervention changes damage.
const f2File=path.join(pve,'monster-behavior-f2.js');let f2=(await fs.readFile(f2File,'utf8')).replace(/\r\n/g,'\n');if(!f2.includes('monsterPatternSource')){const old="  for(const id of s.pendingHits||[]){\n    const target=run.players.find(p=>p.playerId===id);\n    if(target)events.push(...applyDamage(run,target,1,'DIRECT'));\n  }";if(!f2.includes(old))throw new Error('OLD_PATTERN_DAMAGE_SITE_MISSING');f2=f2.replace(old,"  for(const id of s.pendingHits||[]){const target=run.players.find(p=>p.playerId===id);if(target){const es=applyDamage(run,target,1,'DIRECT');if(type==='F2_FLAME')for(const e of es)if(e.type==='PLAYER_DAMAGED')e.monsterPatternSource='F2_FLAME';events.push(...es);}}");await fs.writeFile(f2File,f2);}
combat=await fs.readFile(combatFile,'utf8');
if(!combat.includes('const damageBeforeBell=')){
 const ordinary='    const ordinaryAmount=Math.max(0,baseDamageForCharacter(player,rc)+engraving+martial.bonus+(Number(rc.vampireBonus)||0)+(Number(rc.ghostBonus)||0)-Math.max(0,martial.defense-armorPenetration)-(rc.monsterDamagePenalty||0));';
 if(!combat.includes(ordinary))throw new Error('BASELINE_BELL_DAMAGE_SITE_MISSING');
 combat=combat.replace(ordinary,ordinary+"if(c.monster.mechanic?.type==='PARITY_BELL'&&Math.abs(rc.finalNumber%2)!==(c.monster.behaviorState.phase==='ODD'?1:0)){rc.parityBellDamageBefore=Math.max(0,baseDamageForCharacter(player,rc)+engraving+martial.bonus+(Number(rc.vampireBonus)||0)+(Number(rc.ghostBonus)||0)-Math.max(0,martial.defense-armorPenetration)-Math.max(0,(rc.monsterDamagePenalty||0)-1));}");
 await fs.writeFile(combatFile,combat);
}
combat=await fs.readFile(combatFile,'utf8');combat=combat.replace('  const totalDamage=packets.reduce((s,p)=>s+p.amount,0);','  const totalDamage=packets.reduce((s,p)=>s+p.amount,0);if(globalThis.__auditPacketsOnly)return {cards,damagePackets:packets,totalDamage};');await fs.writeFile(combatFile,combat);
// Wrap only the existing F2 penalty damage callback in the isolated copy.
let f2combat=await fs.readFile(combatFile,'utf8');f2combat=f2combat.replace('resolveF2AfterDamage(run,events,applyMonsterDamage)',"resolveF2AfterDamage(run,events,(r,p,n,t)=>applyMonsterDamage(r,p,n,t).map(e=>e.type==='PLAYER_DAMAGED'?{...e,auditPatternSource:r.combat.monster.mechanic.type}:e))");await fs.writeFile(combatFile,f2combat);
await fs.appendFile(path.join(pve,'events.js'),'\nexport {availableCards as simulationAvailableCards};\n');
await fs.writeFile(path.join(runtime,'package.json'),JSON.stringify({type:'module'}));
await fs.copyFile(path.join(scripts,'pve-rebalance-measurement.mjs'),path.join(output,'pve-rebalance-measurement.mjs'));
await fs.copyFile(path.join(scripts,'pve-rebalance-005-sim.mjs'),path.join(output,'policy.mjs'));
await fs.writeFile(path.join(output,'simulate.mjs'),`import {fileURLToPath} from 'node:url';\nprocess.env.PVE_SIM_RUNTIME=fileURLToPath(new URL('./runtime/',import.meta.url));\nprocess.env.PVE_SIM_OUTPUT=fileURLToPath(new URL('./',import.meta.url));\nprocess.env.PVE_SIM_CONDITION=process.env.PVE_ARM||'BOTH';\nprocess.env.PVE_SOURCE_SHA='CANDIDATE_RUNTIME_HASH:${sourceRuntimeHash}';\nawait import(new URL('./policy.mjs',import.meta.url).href);\n`);
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({baselineSHA:'378549e935be04925114ae032fc04655f185b64e',sourceRuntimeHash,productionModulesInstrumented:false,networkCalls:0}));
console.log(JSON.stringify({output,sourceRuntimeHash}));
