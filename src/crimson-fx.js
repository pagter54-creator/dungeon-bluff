import {finishAnimation} from './animation-wait.js';
import {projectileFlight} from './combat-impact.js';
import {getAudio} from './audio.js';
const cue=name=>{try{getAudio().combatCue(name);}catch{/* Audio must not interrupt the attack. */}};
export async function crimsonAttack(kind,from,to,{burst,ring,reduced}){
 const overlay=document.querySelector('#fx-overlay'),trail=document.createElement('div');
 trail.className='crimson-flight';trail.style.cssText=`left:${from.x}px;top:${from.y}px`;
 overlay.append(trail);cue('crimson_rush');
 if(reduced.matches)trail.style.cssText=`left:${to.x}px;top:${to.y}px`;
 try{await projectileFlight(trail,reduced.matches?[{opacity:0},{opacity:1}]:[{transform:'translate(-50%,-50%) scale(.6)',opacity:.2},{transform:`translate(calc(-50% + ${to.x-from.x}px),calc(-50% + ${to.y-from.y}px)) scale(1.3)`,opacity:1}],{duration:170,easing:'ease-in'},reduced.matches);}finally{trail.remove();}
 const el=document.createElement('div');el.className=kind==='demon_sword'?'crimson-slashes':'crimson-jaws';el.style.cssText=`left:${to.x}px;top:${to.y}px`;
 overlay.append(el);
 try{
  if(kind==='demon_sword'){
   for(const [index,path] of ['M18 132 Q92 104 207 16','M17 16 Q102 58 204 134'].entries()){
    const cut=document.createElement('div');cut.innerHTML=`<svg viewBox="0 0 220 150" aria-hidden="true"><path d="${path}"/><path class="core" d="${path}"/></svg>`;el.append(cut);
    cue(index?'crimson_cut_low':'crimson_cut_high');
    await finishAnimation(cut.animate(reduced.matches?[{opacity:0},{opacity:1}]:[{clipPath:index?'inset(0 100% 100% 0)':'inset(100% 100% 0 0)',opacity:.2},{clipPath:'inset(0 0 0 0)',opacity:1}],{duration:165,easing:'ease-out'}));
    burst(to,'#ec3658',index?65:35,index?9:6,true);
    void finishAnimation(cut.animate([{opacity:1},{opacity:.2}],{duration:220,fill:'forwards'}));
    if(!index)await new Promise(resolve=>setTimeout(resolve,65));
   }
   ring(to,'#f66b83');await finishAnimation(el.animate([{opacity:1},{opacity:0}],{duration:100}));
  }else{
   el.innerHTML='<svg viewBox="0 0 200 170" aria-hidden="true"><g class="upper"><path d="M15 22 Q100 -8 185 22 L164 68 139 34 122 91 100 40 78 91 61 34 36 68Z"/></g><g class="lower"><path d="M15 148 Q100 178 185 148 L164 102 139 136 122 79 100 130 78 79 61 136 36 102Z"/></g></svg>';
   cue('vampire_open');
   const jaws=[...el.querySelectorAll('g')].map((jaw,i)=>finishAnimation(jaw.animate(reduced.matches?[{opacity:0},{opacity:1}]:[{transform:`translateY(${i?85:-85}px)`,opacity:.1},{transform:'translateY(0)',opacity:1}],{duration:260,easing:'cubic-bezier(.7,0,.9,.5)',fill:'forwards'})));
   void finishAnimation(el.animate(reduced.matches?[{opacity:.3},{opacity:1}]:[{transform:'translate(-50%,-50%) scale(.6)'},{transform:'translate(-50%,-50%) scale(1.35)'}],{duration:260,fill:'forwards'}));
   await Promise.all(jaws);cue('vampire_crunch');burst(to,'#ff3157',100,11,true);ring(to,'#ff7690');
   await finishAnimation(el.animate([{opacity:1,filter:'brightness(2)'},{opacity:0,filter:'brightness(1)'}],{duration:190}));
  }
 }finally{el.remove();}
}
