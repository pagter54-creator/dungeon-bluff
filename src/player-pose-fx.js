import { finishAnimation } from './animation-wait.js';
import { assetLoader } from './asset-loader.js';

const active=new WeakMap();
const knockoutRequests=new WeakMap();

export function poseUrl(base,pose){
  return base.replace(/\.png(?:[?#].*)?$/i,`_${pose}.png`);
}

function canLoad(url){
  if(!url)return Promise.resolve(false);
  return assetLoader.load(url).then(()=>true,()=>false);
}

function reducedMotion(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}

export async function setKnockoutPose(panel,knockedOut){
  const frame=panel?.querySelector('.player-illustration');
  if(!frame)return;
  const request=(knockoutRequests.get(frame)||0)+1;
  knockoutRequests.set(frame,request);
  if(!knockedOut){
    frame.classList.remove('knockout-art');
    for(const layer of frame.querySelectorAll('.knockout-pose')){
      layer.removeTimer=setTimeout(()=>layer.remove(),reducedMotion()?0:280);
    }
    return;
  }
  const current=frame.querySelector('.knockout-pose');
  if(current){
    clearTimeout(current.removeTimer);
    frame.classList.add('knockout-art');return;
  }
  const url=frame.dataset.damageSrc;
  if(!await canLoad(url)||knockoutRequests.get(frame)!==request||!frame.isConnected)return;
  const layer=document.createElement('img');
  layer.className='player-pose-layer knockout-pose';
  layer.src=url;layer.alt='';layer.draggable=false;
  layer.style?.setProperty('--pose-lift',`${Number(frame.dataset.damageLift)||0}px`);
  frame.append(layer);
  requestAnimationFrame(()=>{
    if(knockoutRequests.get(frame)===request)frame.classList.add('knockout-art');
  });
}

export async function showPlayerPose(panel,kind){
  const frame=panel?.querySelector('.player-illustration');
  const base=frame?.querySelector('.player-illustration-base');
  const url=kind==='attack'?frame?.dataset.attackSrc:frame?.dataset.damageSrc;
  if(!frame||!base||!await canLoad(url))return async()=>{};

  const previous=active.get(frame);
  if(previous)await previous();
  let closed=false;
  const layer=document.createElement('img');
  layer.className=`player-pose-layer pose-${kind}`;
  layer.src=url;layer.alt='';layer.draggable=false;
  layer.style?.setProperty('--pose-lift',`${Number(kind==='attack'?frame.dataset.attackLift:frame.dataset.damageLift)||0}px`);
  frame.append(layer);frame.classList.add(`showing-${kind}`);
  if(!reducedMotion()){
    base.animate([{opacity:1,filter:'brightness(1)'},{opacity:.22,filter:'brightness(2.4)'},{opacity:.5,filter:'brightness(.75)'}],{duration:220,fill:'forwards'});
    await finishAnimation(layer.animate([
      {opacity:0,transform:kind==='attack'?'translateY(18px) scale(.96)':'translateY(-12px) scale(1.035)',filter:'brightness(2.8)'},
      {opacity:1,transform:'translateY(0) scale(1)',filter:'brightness(1)',offset:.72},
      {opacity:1,transform:'translateY(0) scale(1)',filter:'brightness(1)'},
    ],{duration:280,easing:'cubic-bezier(.2,.75,.2,1)',fill:'forwards'}));
  }else{layer.style.opacity='1';base.style.opacity='.35';}

  const restore=async()=>{
    if(closed)return;closed=true;
    if(active.get(frame)===restore)active.delete(frame);
    if(!reducedMotion())await Promise.allSettled([
      finishAnimation(layer.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:kind==='attack'?'translateY(-14px)':'translateY(18px)',filter:'brightness(1.8)'}],{duration:240,easing:'ease-in',fill:'forwards'})),
      finishAnimation(base.animate([{opacity:.5,filter:'brightness(.75)'},{opacity:1,filter:'brightness(1)'}],{duration:260,fill:'forwards'})),
    ]);
    base.getAnimations().forEach(animation=>animation.cancel());
    base.style.opacity='';layer.remove();frame.classList.remove(`showing-${kind}`);
  };
  active.set(frame,restore);
  return restore;
}
