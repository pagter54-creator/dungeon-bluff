import {assetLoader} from './asset-loader.js';
import {SKINS} from './skins.js';
import {MONSTER_IMAGES} from './monster-assets.js';
import {COSMETIC_ASSETS} from './cosmetics.js';

const basics=Object.values(SKINS).filter(s=>s.isDefault).map(s=>s.preview);
const images=[...new Set([...Object.values(SKINS).flatMap(s=>[s.preview,s.portrait]),...Object.values(MONSTER_IMAGES),...Object.values(COSMETIC_ASSETS).map(s=>s.preview).filter(Boolean),new URL('../assets/emblem.svg',import.meta.url).href])];
const music=['bgm_lobby.mp3','bgm_dungeon.mp3'].map(name=>new URL(`../${name}`,import.meta.url).href);
let foreground=null;
function showLoading(urls,title,extra=Promise.resolve()) {
  if(foreground)return foreground;
  foreground=(async()=>{
    const dialog=document.createElement('dialog');dialog.className='asset-loading';
    dialog.setAttribute('aria-label',title);
    dialog.innerHTML='<div class="loading-sigil" aria-hidden="true">◇</div><div class="eyebrow">DUNGEON BLUFF</div><h2></h2><p role="status"></p><progress max="100" value="0"></progress><div class="loading-actions"></div>';
    dialog.querySelector('h2').textContent=title;document.body.append(dialog);dialog.showModal();
    const status=dialog.querySelector('p'),progress=dialog.querySelector('progress');
    const prevent=event=>event.preventDefault();dialog.addEventListener('cancel',prevent);
    try{
      for(;;){
        const failed=await assetLoader.batch(urls,{onProgress:(done,total)=>{progress.value=total?done/total*100:100;status.textContent=`원정에 필요한 일러스트를 준비하고 있어요 · ${done} / ${total}`;}});
        if(!failed.length){status.textContent='음악과 원정 준비를 마무리하고 있어요';await extra;return;}
        status.textContent=`${failed.length}개 이미지를 불러오지 못했습니다. 연결과 배포된 이미지 파일을 확인해 주세요.`;
        const actions=dialog.querySelector('.loading-actions');
        actions.innerHTML='<button class="button primary">다시 시도</button><button class="button secondary">돌아가기</button>';
        const retry=await new Promise(resolve=>{const buttons=actions.querySelectorAll('button');buttons[0].onclick=()=>resolve(true);buttons[1].onclick=()=>resolve(false);});
        actions.replaceChildren();if(!retry)throw new Error('이미지 준비가 취소되었습니다. 다시 입장하면 이어서 불러옵니다.');
      }
    }finally{dialog.close();dialog.remove();}
  })().finally(()=>{foreground=null;});
  return foreground;
}
export async function loadInitialAssets() {
  // Audio errors must not prevent entering a game; playback remains gesture-driven.
  const audio=assetLoader.batch(music,{audio:true});
  try{await showLoading(basics,'당신의 원정을 준비합니다',audio);}finally{await audio;}
}
export function loadBackgroundAssets(){return assetLoader.batch(images,{delay:180});}
export function ensureGameAssets(){return images.every(url=>assetLoader.ready.has(url))?Promise.resolve():showLoading(images,'동료를 만나기 전, 잠시만요');}
