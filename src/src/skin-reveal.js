import { SKINS } from './skins.js';
import { getAudio } from './audio.js';

export async function revealSkin(id,showModal){
 const skin=SKINS[id];if(!skin)throw new Error('획득한 스킨은 인벤토리에서 확인할 수 있습니다.');
 // A missing image never blocks a receipt or hides the granted skin's name.
 let imageReady=false;
 await new Promise(resolve=>{
  const image=new Image(),timer=setTimeout(resolve,5000);
  image.onload=()=>{imageReady=true;clearTimeout(timer);resolve();};
  image.onerror=()=>{clearTimeout(timer);resolve();};image.src=skin.preview;
 });
 showModal(`<section class="skin-reveal" aria-label="획득한 스킨">
  <div class="summon-flash" aria-hidden="true"></div><div class="summon-rays" aria-hidden="true"></div>
  <div class="summon-ring ring-one" aria-hidden="true"></div><div class="summon-ring ring-two" aria-hidden="true"></div>
  <div class="summon-sparks" aria-hidden="true">${Array.from({length:20},(_,i)=>`<i style="--angle:${i*18}deg;--distance:${110+i%5*30}px"></i>`).join('')}</div>
  <div class="reveal-heading"><span class="eyebrow">NEW COLLECTION</span><h2>새로운 모습, 새로운 모험.</h2></div>
  ${imageReady?`<img class="summoned-skin" src="${skin.preview}" alt="${skin.name}" draggable="false">`:'<div class="summoned-skin missing-art">✦<p>일러스트를 불러오지 못했습니다.<br>스킨은 정상 지급되었습니다.</p></div>'}
  <div class="reveal-caption" role="status"><small>${skin.label} · NEW SKIN</small><h2>${skin.name}</h2><p>인벤토리에 추가되었습니다.</p>
   <div class="meta-actions"><button class="button primary" data-meta="equip" data-item="${skin.id}">바로 장착</button><button class="button secondary" data-meta="skin-inventory">인벤토리</button><button class="text-button" data-meta="gacha">뽑기 화면으로</button></div>
  </div>
 </section>`);
 const sound=getAudio();
 sound.tone(90,1.6,'sine',.15,880);
 // Use the existing master volume/mute controls for the reveal chord.
 setTimeout(()=>{if(document.querySelector('.skin-reveal'))[440,554,659,880].forEach(f=>sound.tone(f,1.2,'sine',.07,f*1.3));},1300);
}
