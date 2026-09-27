import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

export const REPO_ROOT=fileURLToPath(new URL('../',import.meta.url));
export const REQUIRED_BETA_FILES=Object.freeze([
  'supabase/migrations/202609280001_game_modes_pve_beta.sql',
  'supabase/migrations/202609280002_pve_beta_reward_canonical.sql',
  'supabase/functions/game-api/index.ts',
  'supabase/functions/game-api/game-mode.js',
  'supabase/functions/game-api/pve/api.js',
  'src/game-mode.js',
  'src/pve-beta-ui.js',
  'src/pve-beta.css',
  'src/app.js',
  'index.html'
]);

export function projectRefFromSupabaseUrl(value){
  let url;
  try{url=new URL(String(value||''));}catch{return null;}
  const match=url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
  return match?match[1].toLowerCase():null;
}
export function productionUrlFromConfig(source){
  return source.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/)?.[1]||null;
}
export function assertPublishableKey(value){
  const key=String(value||'').trim();
  if(!key)throw new Error('PVE_BETA_PUBLISHABLE_KEY가 필요합니다.');
  if(/^sb_secret_/i.test(key)||/service[_-]?role/i.test(key))throw new Error('브라우저/테스트 프런트에는 secret/service-role key를 사용할 수 없습니다.');
  if(!(/^sb_publishable_/i.test(key)||/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)))throw new Error('publishable key 또는 legacy anon JWT 형식이 아닙니다.');
  return true;
}
export function assertBetaTarget({targetRef,productionUrl,targetUrl=null}){
  const ref=String(targetRef||'').trim().toLowerCase();
  if(!/^[a-z0-9]{20}$/.test(ref))throw new Error('테스트 Supabase project ref는 20자의 영소문자/숫자 값이어야 합니다.');
  const productionRef=projectRefFromSupabaseUrl(productionUrl);
  if(!productionRef)throw new Error('config.js에서 production Supabase project ref를 확인할 수 없습니다.');
  if(ref===productionRef)throw new Error('중단: 테스트 target이 현재 production Supabase project ref와 같습니다.');
  if(targetUrl){
    const urlRef=projectRefFromSupabaseUrl(targetUrl);
    if(!urlRef)throw new Error('PVE_BETA_SUPABASE_URL은 *.supabase.co 테스트 URL이어야 합니다.');
    if(urlRef!==ref)throw new Error('PVE_BETA_PROJECT_REF와 PVE_BETA_SUPABASE_URL의 project ref가 다릅니다.');
  }
  return {targetRef:ref,productionRef};
}
async function exists(filename){try{await access(filename);return true;}catch{return false;}}
export async function inspectBetaRepo(root=REPO_ROOT){
  const missing=[];
  for(const rel of REQUIRED_BETA_FILES)if(!await exists(path.join(root,rel)))missing.push(rel);
  if(missing.length)throw new Error('PVE BETA 필수 파일 누락: '+missing.join(', '));
  const modeMigration=await readFile(path.join(root,'supabase/migrations/202609280001_game_modes_pve_beta.sql'),'utf8');
  const rewardMigration=await readFile(path.join(root,'supabase/migrations/202609280002_pve_beta_reward_canonical.sql'),'utf8');
  const modeTokens=[
    "game_mode text not null default 'COMPETITIVE'",
    "check(game_mode in ('COMPETITIVE','COOP_PVE'))",
    "check(rating_delta=0)",
    'create or replace function public.pve_start_room',
    'create or replace function public.pve_settle_rewards'
  ];
  const rewardTokens=[
    "'RUN_CLEAR','RUN_FAILED','ABANDONED'",
    'RULE-PVE-REWARD-01',
    'RULE-PVE-REWARD-04',
    'rewards_committed=true',
    "terminal_phase='RUN_CLEAR'"
  ];
  const missingSql=[
    ...modeTokens.filter(token=>!modeMigration.includes(token)).map(token=>'0001:'+token),
    ...rewardTokens.filter(token=>!rewardMigration.includes(token)).map(token=>'0002:'+token)
  ];
  if(missingSql.length)throw new Error('PVE BETA migration contract 누락: '+missingSql.join(' | '));
  return {migrations:['202609280001_game_modes_pve_beta.sql','202609280002_pve_beta_reward_canonical.sql'],requiredFiles:REQUIRED_BETA_FILES.length};
}
export function currentGitBranch(root=REPO_ROOT){
  try{return execFileSync('git',['rev-parse','--abbrev-ref','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{return null;}
}
export function currentGitHead(root=REPO_ROOT){
  try{return execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{return null;}
}
function parseArg(name){
  const at=process.argv.indexOf(name);return at>=0?process.argv[at+1]:null;
}
async function main(){
  const config=await readFile(path.join(REPO_ROOT,'config.js'),'utf8');
  const productionUrl=productionUrlFromConfig(config);
  const targetRef=parseArg('--project-ref')||process.env.PVE_BETA_PROJECT_REF;
  const targetUrl=parseArg('--url')||process.env.PVE_BETA_SUPABASE_URL||null;
  const {productionRef}=assertBetaTarget({targetRef,productionUrl,targetUrl});
  const branch=currentGitBranch();
  if(branch==='main')throw new Error('중단: PVE BETA preflight는 main 브랜치에서 실행하지 않습니다.');
  const repo=await inspectBetaRepo();
  if(process.env.PVE_BETA_PUBLISHABLE_KEY)assertPublishableKey(process.env.PVE_BETA_PUBLISHABLE_KEY);
  console.log(JSON.stringify({
    ok:true,
    branch:branch||'UNKNOWN',
    head:currentGitHead()||'UNKNOWN',
    targetProjectRef:String(targetRef).toLowerCase(),
    productionProjectRef:productionRef,
    migrations:repo.migrations,
    requiredFiles:repo.requiredFiles,
    productionDeploy:false
  },null,2));
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct)main().catch(error=>{console.error('[PVE BETA PREFLIGHT] '+error.message);process.exitCode=1;});
