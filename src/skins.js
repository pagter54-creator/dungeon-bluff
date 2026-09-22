// File stems intentionally match the supplied artwork (travler, warrior).
const groups=[
['gambler','gambler','도박사',['도박사 기본 스킨','부르주아','가면 무도회','선상 도박꾼']],
['berserker','berserker','광전사',['광전사 기본 스킨','혹한의 야만족','지옥불 광전사','흑철 기사']],
['imp','imp','임프',['임프 기본 스킨','트릭 오어 트릿!','지옥불 요정','깜짝 선물']],
['mage','mage','마법사',['마법사 기본 스킨','눈꽃 마녀','신의 사도','꼭두각시 마녀']],
['prophet','seer','예언가',['예언가 기본 스킨','붉은 달의 예언가','점성술사','거울 세계']],
['thief','rogue','도적',['도적 기본 스킨','신출귀몰의 괴도','무도회의 불청객','사냥개']],
['travler','adventurer','모험가',['모험가 기본 스킨','설산의 탐험가','신참 항해사','유적 발굴단']],
['warrior','warrior','기사',['기사','성지 수호자','북부의 병사','용기사']],
];
export const SKINS=Object.fromEntries(groups.flatMap(([stem,character,label,names])=>names.map((name,index)=>{
 const id=stem+index;
 return [id,{id,name,character,label,isDefault:index===0,type:'character_skin',
  preview:new URL(`../skin image/${id}.png`,import.meta.url).href,
  portrait:new URL(`../skin image/${id}${index===0?'_crop':''}.png`,import.meta.url).href,
  attack:new URL(`../skin image/${id}_A.png`,import.meta.url).href,
  damage:new URL(`../skin image/${id}_D.png`,import.meta.url).href}];
})));
export const DEFAULT_SKINS=Object.fromEntries(Object.values(SKINS).filter(s=>s.isDefault).map(s=>[s.character,s.id]));
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
export function skinIllustration(character,loadout){
 const skin=skinFor(character,loadout);
 return `<div class="player-illustration" data-attack-src="${skin.attack}" data-damage-src="${skin.damage}"><img class="player-illustration-base" src="${skin.preview}" alt="${skin.name}" draggable="false" decoding="async"></div>`;
}
