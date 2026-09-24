import {assetLoader} from './asset-loader.js';
// File stems intentionally match the supplied artwork (travler, warrior).
const groups=[
['vampire','vampire','흡혈귀',['흡혈귀 기본 스킨','가면 무도회']],
['demonsword','demonsword','귀검사',['귀검사 기본 스킨','천명 집행자']],
['gunner','gunner','총잡이',['총잡이 기본 스킨','황야의 무법자','유령선의 포격수']],
['fighter','fighter','무투가',['무투가 기본 스킨','뇌격투희','염화난무']],
['gambler','gambler','도박사',['도박사 기본 스킨','부르주아','가면 무도회','선상 도박꾼']],
['berserker','berserker','광전사',['광전사 기본 스킨','혹한의 야만족','지옥불 광전사','흑철 기사']],
['imp','imp','임프',['임프 기본 스킨','트릭 오어 트릿!','지옥불 요정','깜짝 선물']],
['mage','mage','마법사',['마법사 기본 스킨','눈꽃 마녀','신의 사도','꼭두각시 마녀']],
['prophet','seer','예언가',['예언가 기본 스킨','붉은 달의 예언가','점성술사','거울 세계']],
['thief','rogue','도적',['도적 기본 스킨','신출귀몰의 괴도','무도회의 불청객','사냥개']],
['travler','adventurer','모험가',['모험가 기본 스킨','설산의 탐험가','신참 항해사','유적 발굴단']],
['warrior','warrior','기사',['기사','성지 수호자','북부의 병사','용기사']],
];
export const pendingSkinImage = url => /\/(?:gunner0|fighter0)(?:_crop|_A|_D)?\.png(?:\?.*)?$/.test(url) || /\/vampire1_(?:A|D)\.png(?:\?.*)?$/.test(url);
// Missing future artwork must never prevent joining a room. Retry real filenames
// on the next render, so adding the PNGs requires no catalog change.
if (typeof document !== 'undefined') document.addEventListener('error', event => {
 const img=event.target;
 if(img?.tagName !== 'IMG' || !pendingSkinImage(img.src))return;
 const look=img.src.includes('gunner')?['⌖','총잡이']:img.src.includes('fighter')?['✊','무투가']:img.src.includes('vampire')?['♜','흡혈귀']:['⚔','귀검사'];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><path d="M200 30 365 145 325 385 200 465 75 385 35 145Z" fill="#211a30" stroke="#d6b77a" stroke-width="3"/><text x="200" y="240" text-anchor="middle" font-size="110" fill="#ffd08a">${look[0]}</text><text x="200" y="330" text-anchor="middle" font-size="30" fill="#eee3d0">${look[1]}</text></svg>`;
 img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
},true);
export const SKINS=Object.fromEntries(groups.flatMap(([stem,character,label,names])=>names.map((name,index)=>{
 const id=stem+index;
 return [id,{id,name,character,label,isDefault:index===0,type:'character_skin',
  preview:new URL(`../skin image/${id}.png`,import.meta.url).href,
  portrait:new URL(`../skin image/${id}${index===0?'_crop':''}.png`,import.meta.url).href,
  attack:new URL(`../skin image/${id}_A.png`,import.meta.url).href,
  damage:new URL(`../skin image/${id}_D.png`,import.meta.url).href}];
})));
export const DEFAULT_SKINS=Object.fromEntries(Object.values(SKINS).filter(s=>s.isDefault).map(s=>[s.character,s.id]));
// Tune individual silhouettes here as new poses arrive. Values are applied to
// the whole contained image, including its attack and damage variants.
export const SKIN_ART_LAYOUT={
 gambler0:{scale:1.06,offsetX:0,offsetY:0},
 berserker0:{scale:1.04,offsetX:0,offsetY:0},
};
// Some supplied pose canvases are shorter than the standing art. Lift only
// those files so their face and weapon sit at the same visual height.
export const SKIN_POSE_LIFT={
 prophet0_A:42,prophet0_D:42,prophet1_A:38,
 prophet2:36,prophet2_A:38,prophet2_D:38,
 prophet3_A:40,prophet3_D:40,thief3_D:34,
};
// These are preloaded because the files currently exist. Future pose files still
// work automatically on first use without adding them to this list.
export const AVAILABLE_POSES=Object.values(SKINS).filter(s=>s.id.startsWith('berserker')).flatMap(s=>[s.attack,s.damage]);
export function skinFor(character,loadout){
 const candidate=SKINS[loadout?.equipped_character_skins?.[character]];
 return candidate?.character===character?candidate:SKINS[DEFAULT_SKINS[character]||'travler0'];
}
export function skinPortrait(character,loadout){
 const skin=skinFor(character,loadout);
 return `<img class="skin-portrait" src="${skin.portrait}" alt="${skin.name}" draggable="false">`;
}
export function skinIllustration(character,loadout,knockedOut=false){
 const skin=skinFor(character,loadout);
 const {scale=1,offsetX=0,offsetY=0,positionX=50,positionY=100}=SKIN_ART_LAYOUT[skin.id]||{};
 return `<div class="player-illustration" data-standing-src="${skin.preview}" data-knocked-out="${Boolean(knockedOut)}" data-attack-src="${skin.attack}" data-damage-src="${skin.damage}" data-attack-lift="${SKIN_POSE_LIFT[skin.id+'_A']||0}" data-damage-lift="${SKIN_POSE_LIFT[skin.id+'_D']||0}" style="--art-scale:${scale};--art-offset-x:${offsetX}px;--art-offset-y:${offsetY}px;--art-position-x:${positionX}%;--art-position-y:${positionY}%;--base-lift:${SKIN_POSE_LIFT[skin.id]||0}px"><img class="player-illustration-base" src="${knockedOut&&assetLoader.ready.has(skin.damage)?skin.damage:skin.preview}" alt="${skin.name}" draggable="false" decoding="async"></div>`;
}
