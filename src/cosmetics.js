const names=['gold','stars','jade'];
export const COSMETIC_ASSETS={
 default_card_front:{type:'card_front',name:'기본 앞면',className:'cosmetic-front-default'},
 default_card_back:{type:'card_back',name:'기본 뒷면',className:'cosmetic-back-default'},
};
for(const side of ['front','back'])names.forEach((name,i)=>{
 const id=`card_${side}_0${i+1}`;
 COSMETIC_ASSETS[id]={type:`card_${side}`,className:`cosmetic-${side}-${name}`,preview:new URL(`../assets/cosmetics/cards/${side}/${id}.svg`,import.meta.url).href};
});
export function cosmeticClass(loadout,side){
 const id=loadout?.[`equipped_card_${side}`], entry=COSMETIC_ASSETS[id];
 return entry?.type===`card_${side}`?entry.className:COSMETIC_ASSETS[`default_card_${side}`].className;
}
const loaded=new Map();
function loadImage(url){
 if(!url)return Promise.resolve();
 if(!loaded.has(url))loaded.set(url,new Promise(resolve=>{
  const img=new Image();const timer=setTimeout(resolve,5000);
  img.onload=img.onerror=()=>{clearTimeout(timer);resolve();};img.src=url;
 }));
 return loaded.get(url);
}
export function preloadEssentials(){return loadImage(new URL('../assets/emblem.svg',import.meta.url).href);}
export function preloadCosmetics(ids=Object.keys(COSMETIC_ASSETS)){return Promise.all(ids.map(id=>loadImage(COSMETIC_ASSETS[id]?.preview)));}
export function preloadSession(session){return preloadCosmetics(Object.values(session?.state.players||{}).flatMap(p=>Object.values(p.loadout||{})));}
