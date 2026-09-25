import {finishAnimation} from './animation-wait.js';
import {projectileFlight,impactAt,recoil} from './combat-impact.js';
import {getAudio} from './audio.js';

const cue=name=>{try{getAudio().combatCue(name);}catch{/* Sound must not stop combat. */}};
// A light thrust followed by a second partner's pinpoint strike. Durations are
// in milliseconds and independent of display refresh rate.
export async function twinThrust(from,to,{burst,ring,reduced}){
  const overlay=document.querySelector('#fx-overlay');if(!overlay)return;
  const dx=to.x-from.x,dy=to.y-from.y,angle=Math.atan2(dy,dx)*180/Math.PI;
  ring(from,'#ffe0a6');
  const strike=async(index)=>{
    const color=index?'#f5a4cc':'#ffe5a6',shift=index?9:-9;
    const el=document.createElement('div');el.className='twins-thrust';
    el.style.cssText=`position:fixed;pointer-events:none;left:${from.x}px;top:${from.y+shift}px;width:150px;height:34px;color:${color};filter:drop-shadow(0 0 9px ${color})`;
    el.innerHTML='<svg viewBox="0 0 180 40" width="100%" height="100%" aria-hidden="true"><path d="M5 20 125 16 177 20 125 24Z" fill="currentColor"/><path d="M35 10 124 16M15 29 125 24" stroke="currentColor" stroke-width="2" opacity=".65"/><path d="M65 20H175" stroke="white" stroke-width="2"/></svg>';
    overlay.append(el);cue('twins_thrust');
    const pose=p=>`translate(calc(-50% + ${dx*p}px),calc(-50% + ${dy*p-shift*p}px)) rotate(${angle}deg)`;
    if(reduced.matches){el.style.left=`${to.x}px`;el.style.top=`${to.y}px`;}
    try{await projectileFlight(el,reduced.matches?[{opacity:0},{opacity:1},{opacity:0}]:[
      {transform:pose(0)+' scaleX(.4)',opacity:0},
      {transform:pose(.3)+' scaleX(1)',opacity:1,offset:.45},
      {transform:pose(1)+' scaleX(1.35)',opacity:1},
    ],{duration:300,easing:'cubic-bezier(.5,.08,.85,.35)',fill:'forwards'},reduced.matches);
    cue('twins_pierce');impactAt(to,color,false,reduced.matches);burst(to,color,30,5);
    recoil(document.querySelector('#enemy-art img, #enemy-art svg'),from,to,false,reduced.matches);
    await finishAnimation(el.animate([{opacity:1},{opacity:0}],{duration:90}));
    }finally{el.remove();}
  };
  await Promise.all([strike(0),(async()=>{await new Promise(resolve=>setTimeout(resolve,110));await strike(1);})()]);
  ring(to,'#ffdfb0');
}
