import { finishAnimation } from './animation-wait.js';

export async function projectileFlight(element,frames,options,reduced=false){
 const ghosts=[];
 try{
  if(!reduced)for(let i=3;i>=1;i--){
   const ghost=element.cloneNode(true);ghost.classList.add('projectile-echo');
   element.parentNode.insertBefore(ghost,element);ghosts.push(ghost);
   void finishAnimation(ghost.animate(frames.map(frame=>({...frame,opacity:(frame.opacity??1)*(.3/i)})),{...options,delay:i*28}));
  }
  await finishAnimation(element.animate(frames,options));
 }finally{for(const ghost of ghosts){ghost.getAnimations().forEach(a=>a.cancel());ghost.remove();}}
}

export function impactAt(point,color,heavy=false,reduced=false){
 const el=document.createElement('div');el.className='combat-impact';
 el.style.cssText=`left:${point.x}px;top:${point.y}px;--impact-color:${color}`;
 el.innerHTML='<i></i><i></i><b></b>';document.querySelector('#fx-overlay').append(el);
 const size=heavy?1.6:1;
 void finishAnimation(el.animate(reduced?[{opacity:.5},{opacity:0}]:[
  {transform:'translate(-50%,-50%) scale(.15)',opacity:0},
  {transform:`translate(-50%,-50%) scale(${size})`,opacity:1,offset:.16},
  {transform:`translate(-50%,-50%) scale(${size*1.3})`,opacity:.65,offset:.4},
  {transform:`translate(-50%,-50%) scale(${size*1.7})`,opacity:0},
 ],{duration:heavy?560:400,easing:'ease-out'})).finally(()=>el.remove());
}

export function recoil(element,from,to,heavy=false,reduced=false){
 if(!element)return;
 const length=Math.hypot(to.x-from.x,to.y-from.y)||1,force=heavy?20:11;
 const x=(to.x-from.x)/length*force,y=(to.y-from.y)/length*force;
 void finishAnimation(element.animate(reduced?[{opacity:.65},{opacity:1}]:[
  {translate:'0px 0px',filter:'brightness(1)'},
  {translate:`${x}px ${y}px`,filter:'brightness(2.6)',offset:.13},
  {translate:`${x}px ${y}px`,filter:'brightness(1.8)',offset:.3},
  {translate:`${-x*.25}px ${-y*.25}px`,filter:'brightness(1)',offset:.62},
  {translate:'0px 0px',filter:'brightness(1)'},
 ],{duration:heavy?480:340,easing:'ease-out'}));
}

export function revealShowcase(cards,cardFor,playerFor){
 const row=document.createElement('div');row.className='combat-showcase';
 const copies=new Map();
 for(const result of cards){
  const source=cardFor(result.memberId);if(!source)continue;
  const slot=document.createElement('div');slot.className='showcase-slot';
  const label=document.createElement('span');label.textContent=playerFor(result.memberId)?.querySelector('h3')?.textContent.trim()||'플레이어';
  const card=source.cloneNode(true);card.removeAttribute('data-reveal');
  slot.append(label,card);row.append(slot);copies.set(result.memberId,card);
 }
 document.querySelector('#fx-overlay').append(row);
 return {cardFor:id=>copies.get(id),remove:()=>row.remove()};
}

export async function shatterCard(card,reduced=false){
 if(!card)return;
 const rect=card.getBoundingClientRect(),pieces=[];
 try{
  if(!reduced)for(let i=0;i<6;i++){
   const piece=card.cloneNode(true);piece.removeAttribute('data-reveal');piece.classList.add('card-fragment');
   piece.style.cssText=`left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;clip-path:inset(${Math.floor(i/2)*33.33}% ${i%2?0:50}% ${66.67-Math.floor(i/2)*33.33}% ${i%2?50:0}%);`;
   document.querySelector('#fx-overlay').append(piece);pieces.push(piece);
   void finishAnimation(piece.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${(i%2?1:-1)*(55+i*10)}px,${-50+Math.floor(i/2)*65}px) rotate(${(i%2?1:-1)*(18+i*5)}deg)`,opacity:0}],{duration:600,easing:'cubic-bezier(.15,.7,.3,1)'}));
  }
  card.classList.add('shattered');
  await finishAnimation(card.animate([{opacity:1,filter:'brightness(2)'},{opacity:.15,filter:'grayscale(1)'}],{duration:600}));
 }finally{for(const piece of pieces){piece.getAnimations().forEach(a=>a.cancel());piece.remove();}}
}
