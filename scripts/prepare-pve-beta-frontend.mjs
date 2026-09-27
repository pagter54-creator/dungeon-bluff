import {cp,mkdir,readFile,rm,readdir,stat,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {assertBetaTarget,assertPublishableKey,currentGitBranch,currentGitHead,productionUrlFromConfig,REPO_ROOT} from './pve-beta-preflight.mjs';

const copyNames=['index.html','styles.css','.nojekyll','src','assets','skin image','monster','background'];
async function maybeCopy(src,dst){
  try{const info=await stat(src);await cp(src,dst,{recursive:info.isDirectory()});return true;}catch(error){if(error?.code==='ENOENT')return false;throw error;}
}
function arg(name,defaultValue=null){const at=process.argv.indexOf(name);return at>=0?process.argv[at+1]:defaultValue;}
async function main(){
  const targetRef=arg('--project-ref')||process.env.PVE_BETA_PROJECT_REF;
  const targetUrl=arg('--url')||process.env.PVE_BETA_SUPABASE_URL;
  const publishableKey=process.env.PVE_BETA_PUBLISHABLE_KEY;
  const configSource=await readFile(path.join(REPO_ROOT,'config.js'),'utf8');
  const productionUrl=productionUrlFromConfig(configSource);
  assertBetaTarget({targetRef,productionUrl,targetUrl});
  assertPublishableKey(publishableKey);
  const branch=currentGitBranch();
  if(branch==='main')throw new Error('중단: beta frontend package는 main 브랜치에서 만들지 않습니다.');

  const out=path.resolve(REPO_ROOT,arg('--out','artifacts/pve-beta-frontend'));
  await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
  for(const name of copyNames)await maybeCopy(path.join(REPO_ROOT,name),path.join(out,name));

  for(const item of await readdir(REPO_ROOT)){
    if(/^sfx_[a-z_]+\.mp3$/.test(item)||item==='bgm_lobby.mp3'||item==='bgm_dungeon.mp3'){
      await maybeCopy(path.join(REPO_ROOT,item),path.join(out,item));
    }
  }
  const generatedConfig=[
    '// Generated PVE BETA test config. Do not commit generated credentials.',
    'export const SUPABASE_URL = '+JSON.stringify(String(targetUrl))+';',
    'export const SUPABASE_PUBLISHABLE_KEY = '+JSON.stringify(String(publishableKey))+';',
    ''
  ].join('\n');
  await writeFile(path.join(out,'config.js'),generatedConfig,'utf8');
  await writeFile(path.join(out,'PVE_BETA_BUILD_INFO.json'),JSON.stringify({
    label:'PVE BETA-001 TEST',
    branch:branch||'UNKNOWN',
    head:currentGitHead()||'UNKNOWN',
    projectRef:String(targetRef).toLowerCase(),
    productionDeploy:false,
    generatedAt:new Date().toISOString()
  },null,2)+'\n','utf8');
  console.log('PVE BETA frontend package: '+out);
  console.log('Target project ref: '+String(targetRef).toLowerCase());
  console.log('Publishable key: [not printed]');
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct)main().catch(error=>{console.error('[PVE BETA FRONTEND] '+error.message);process.exitCode=1;});
