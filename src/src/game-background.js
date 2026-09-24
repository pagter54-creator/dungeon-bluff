// GitHub Pages cannot list a directory. Probe consecutive numbered files so
// adding background4.png (and later numbers) needs no JavaScript edit.
const backgroundUrl = number => new URL(`../background/background${number}.png`,import.meta.url).href;
let available;
let activeSession;

export async function discoverGameBackgrounds(request=fetch){
  const found=[];
  for(let number=1;number<=64;number++){
    try{
      const response=await request(backgroundUrl(number),{method:'HEAD'});
      if(!response.ok)break;
      found.push(backgroundUrl(number));
    }catch{break;}
  }
  return found;
}

export function backgroundForSession(sessionId,backgrounds){
  if(!backgrounds.length)return null;
  let hash=0;
  for(const character of String(sessionId))hash=(Math.imul(hash,31)+character.charCodeAt(0))>>>0;
  return backgrounds[hash%backgrounds.length];
}

export async function showGameBackground(sessionId){
  if(!sessionId||activeSession===sessionId)return;
  activeSession=sessionId;
  document.documentElement.style.removeProperty('--game-background-url');
  available ||= discoverGameBackgrounds();
  const backgrounds=await available;
  if(activeSession!==sessionId)return;
  if(!backgrounds.length){available=undefined;activeSession=undefined;return;}
  const chosen=backgroundForSession(sessionId,backgrounds);
  if(chosen)document.documentElement.style.setProperty('--game-background-url',`url("${chosen}")`);
}
