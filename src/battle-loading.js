import {assetLoader} from './asset-loader.js';
import {skinFor,pendingSkinImage,skinStandingAssets,skinPoseAssets} from './skins.js';
import {MONSTER_IMAGES} from './monster-assets.js';
import {EVENT_IMAGES} from './event-assets.js';

const shapes={armored_boar:'boar',echo_bat:'bat',coward_hunter:'hunter',execution_golem:'golem',cursed_seer:'seer',hungry_slime:'slime',chaos_goblin:'goblin',greed_mimic:'mimic'};
const absent=new Set();let generation=0,lastLobbyKey='';
export function entryAssetPlan(session){
 const skins=Object.values(session.state.players).map(p=>skinFor(p.characterId,p.loadout));
 const ids=session.state.entryAssets||session.state.stageOrder.map(s=>s.contentId);
 return {required:[...new Set([...skins.flatMap(skinStandingAssets),...ids.map(id=>EVENT_IMAGES[id]||MONSTER_IMAGES[shapes[id]])].filter(Boolean))],poses:[...new Set(skins.flatMap(skinPoseAssets))]};
}
async function load(url,optional=false){
 if(optional&&absent.has(url))return;
 try{await assetLoader.load(url);}catch(error){
  // A genuinely absent future pose uses standing art. Network failures are
  // never reported as successful loading and remain retryable.
  if(optional||pendingSkinImage(url)){
   const response=await fetch(url,{method:'HEAD',cache:'force-cache',signal:AbortSignal.timeout(8000)});
   if(response.status===404){absent.add(url);return;}
  }
  throw error;
 }
}
export function warmLobbyAssets(members){
 const skins=members.map(m=>skinFor(m.character_id,m.loadout));
 const key=skins.map(s=>s.id).sort().join('|');if(lastLobbyKey===key)return;
 lastLobbyKey=key;const token=++generation;
 const work=[...skins.flatMap(s=>[...skinStandingAssets(s).map(url=>[url,false]),...skinPoseAssets(s).map(url=>[url,true])]),...Object.values(MONSTER_IMAGES).concat(Object.values(EVENT_IMAGES)).map(url=>[url,false])];
 void(async()=>{for(let i=0;i<work.length&&token===generation;i+=2){await Promise.allSettled(work.slice(i,i+2).map(([url,optional])=>load(url,optional)));await new Promise(resolve=>setTimeout(resolve,80));}})();
}
export function stopLobbyLoading(){generation++;lastLobbyKey='';}
export async function loadEntryAssets(session,onProgress=()=>{}){
 stopLobbyLoading();const plan=entryAssetPlan(session),work=[...plan.required.map(url=>[url,false]),...plan.poses.map(url=>[url,true])];
 let next=0,done=0;const failures=[];onProgress(0,work.length);
 await Promise.all([0,1].map(async()=>{while(next<work.length){const [url,optional]=work[next++];try{await load(url,optional);}catch{failures.push(url);}onProgress(++done,work.length);}}));
 if(failures.length)throw new Error(`${failures.length}개 이미지를 불러오지 못했습니다. 다시 시도해 주세요.`);
}
