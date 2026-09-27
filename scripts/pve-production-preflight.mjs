import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {productionUrlFromConfig,projectRefFromSupabaseUrl} from './pve-beta-preflight.mjs';

export const REPO_ROOT=fileURLToPath(new URL('../',import.meta.url));
export const MANIFEST_PATH='deploy/pve-beta-production-release.json';

export function parseDryRunMigrations(output){
  const value=String(output||'');
  const marker=value.indexOf('Would push these migrations:');
  if(marker<0)return [];
  return [...value.slice(marker).matchAll(/[•*+-]\s+(20\d{10}_[A-Za-z0-9_-]+\.sql)/g)].map(m=>m[1]);
}
export function parseRemoteMigrationVersions(output){
  const versions=new Set();
  for(const line of String(output||'').split(/\r?\n/)){
    const cells=line.split('|').map(x=>x.replace(/[`\s]/g,''));
    if(cells.length>=2&&/^20\d{10}$/.test(cells[1]))versions.add(cells[1]);
  }
  return versions;
}
export function destructiveFindings(sql){
  const clean=String(sql||'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/--.*$/gm,'');
  const findings=[];
  if(/\bdrop\s+table\b/i.test(clean))findings.push('DROP TABLE');
  if(/\bdrop\s+column\b/i.test(clean))findings.push('DROP COLUMN');
  if(/\btruncate\b/i.test(clean))findings.push('TRUNCATE');
  if(/\balter\s+table[\s\S]*?\balter\s+column[\s\S]*?\btype\b/i.test(clean))findings.push('ALTER COLUMN TYPE');
  for(const statement of clean.split(';')){
    if(/\bdelete\s+from\b/i.test(statement)&&!/\bwhere\b/i.test(statement))findings.push('DELETE WITHOUT WHERE');
  }
  return [...new Set(findings)];
}
export function assertReleaseState(expectedFiles,pendingFiles,remoteVersions){
  const expectedVersions=expectedFiles.map(x=>x.split('_')[0]);
  if(JSON.stringify(pendingFiles)===JSON.stringify(expectedFiles))return 'READY_TO_APPLY';
  if(pendingFiles.length===0&&expectedVersions.every(v=>remoteVersions.has(v)))return 'ALREADY_APPLIED';
  throw new Error('Production pending migration set mismatch. expected='+JSON.stringify(expectedFiles)+' actual='+JSON.stringify(pendingFiles));
}
function runSupabase(args){
  const result=spawnSync('supabase',args,{cwd:REPO_ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const output=(result.stdout||'')+(result.stderr||'');
  if(result.status!==0)throw new Error('Supabase CLI failed: '+output.trim());
  return output;
}
export async function inspectProductionRelease(root=REPO_ROOT){
  const manifest=JSON.parse(await readFile(path.join(root,MANIFEST_PATH),'utf8'));
  if(manifest.release!=='PVE_BETA_001')throw new Error('Unexpected production release manifest.');
  const findings={};
  for(const file of manifest.requiredMigrations){
    const sql=await readFile(path.join(root,'supabase/migrations',file),'utf8');
    const unsafe=destructiveFindings(sql);
    if(unsafe.length)findings[file]=unsafe;
  }
  if(Object.keys(findings).length)throw new Error('Destructive production migration detected: '+JSON.stringify(findings));
  return manifest;
}
async function main(){
  const dbUrl=String(process.env.SUPABASE_DB_URL||'').trim();
  const projectId=String(process.env.SUPABASE_PROJECT_ID||'').trim();
  if(!dbUrl)throw new Error('SUPABASE_DB_URL is required.');
  if(!projectId)throw new Error('SUPABASE_PROJECT_ID is required.');
  const config=await readFile(path.join(REPO_ROOT,'config.js'),'utf8');
  const productionRef=projectRefFromSupabaseUrl(productionUrlFromConfig(config));
  if(!productionRef||productionRef!==projectId)throw new Error('Production project ref mismatch.');
  const manifest=await inspectProductionRelease();
  const migrationList=runSupabase(['migration','list','--db-url',dbUrl]);
  const dryRun=runSupabase(['db','push','--dry-run','--db-url',dbUrl]);
  const pending=parseDryRunMigrations(dryRun);
  const remote=parseRemoteMigrationVersions(migrationList);
  const state=assertReleaseState(manifest.requiredMigrations,pending,remote);
  console.log(migrationList.trim());
  console.log(dryRun.trim());
  console.log(JSON.stringify({ok:true,release:manifest.release,productionProjectRef:productionRef,state,pending},null,2));
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct)main().catch(error=>{console.error('[PVE PRODUCTION PREFLIGHT] '+error.message);process.exitCode=1;});
