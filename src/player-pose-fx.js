import { finishAnimation } from './animation-wait.js';
import { assetLoader } from './asset-loader.js';
import { motionPreference } from './motion.js';

const active=new WeakMap();
const knockoutRequests=new WeakMap();
export function activeArtFrame(panel){return panel?.querySelector('.twins-art .twin-active')||panel?.querySelector('.player-illustration');}

export function animateTwinHandoff(panel){
  const front=activeArtFrame(panel),back=panel?.querySelector('.twin-resting');
  if(!front||!back||reducedMotion())return;
  void finishAnimation(front.animate([{opacity:.5,filter:'brightness(.55)',translate:'0 10px'},{opacity:1,filter:'brightness(1.12)',translate:'0 0'}],{duration:300,easing:'ease-out'}));
  void finishAnimation(back.animate([{filter:'brightness(1)'},{filter:'brightness(.42)'}],{duration:300,easing:'ease-out'}));
}

export function poseUrl(base,pose){
  return base.replace(/\.png(?:[?#].*)?$/i,`_${pose}.png`);
}

function canLoad(url){
  if(!url)return Promise.resolve(false);
  return assetLoader.load(url).then(()=>true,()=>false);
}

function reducedMotion(){return motionPreference.matches;}

function replacePose(frame,base,url) {
  base.src=url;
  base.style.opacity='';
  if(frame.classList?.contains?.('twin-active'))frame.classList.toggle('twin-wide-damage',url===frame.dataset.damageSrc);
}
export async function setKnockoutPose(panel,knockedOut){
  const frame=activeArtFrame(panel);
  const base=frame?.querySelector('.player-illustration-base');
  if(!base)return;
  frame.dataset.standingSrc ||= base.src;
  frame.dataset.knockedOut=String(knockedOut);
  const request=(knockoutRequests.get(frame)||0)+1;knockoutRequests.set(frame,request);
  if(!knockedOut){replacePose(frame,base,frame.dataset.standingSrc);return;}
  if(base.src===frame.dataset.damageSrc)return;
  if(await canLoad(frame.dataset.damageSrc) && knockoutRequests.get(frame)===request && frame.isConnected)
    replacePose(frame,base,frame.dataset.damageSrc);
}
async function damagePose(frame,base){
  const request=(knockoutRequests.get(frame)||0)+1;knockoutRequests.set(frame,request);
  frame.dataset.standingSrc ||= base.src;
  if(!await canLoad(frame.dataset.damageSrc)||knockoutRequests.get(frame)!==request||!frame.isConnected)return async()=>{};
  replacePose(frame,base,frame.dataset.damageSrc);
  if(!reducedMotion())void finishAnimation(base.animate([{filter:'brightness(1.6)'},{filter:'brightness(1)'}],{duration:180}));
  return async()=>{
    if(knockoutRequests.get(frame)!==request||frame.dataset.knockedOut==='true')return;
    replacePose(frame,base,frame.dataset.standingSrc);
  };
}

export async function showPlayerPose(panel,kind){
  const frame=activeArtFrame(panel);
  const base=frame?.querySelector('.player-illustration-base');
  const url=kind==='attack'?frame?.dataset.attackSrc:frame?.dataset.damageSrc;
  if(!frame||!base)return async()=>{};
  if(kind==='damage')return damagePose(frame,base);
  if(!await canLoad(url))return async()=>{};

  const previous=active.get(frame);
  if(previous)await previous();
  let closed=false;
  const layer=document.createElement('img');
  layer.className=`player-pose-layer pose-${kind}`;
  layer.src=url;layer.alt='';layer.draggable=false;
  layer.style?.setProperty('--pose-lift',`${Number(kind==='attack'?frame.dataset.attackLift:frame.dataset.damageLift)||0}px`);
  const poseParent=kind==='attack'&&frame.closest?.('.twins-art')||frame;
  poseParent.append(layer);frame.classList.add(`showing-${kind}`);
  if(!reducedMotion()){
    base.animate([{opacity:1,filter:'brightness(1)'},{opacity:.22,filter:'brightness(2.4)'},{opacity:.5,filter:'brightness(.75)'}],{duration:220,fill:'forwards'});
    await finishAnimation(layer.animate([
      {opacity:0,transform:kind==='attack'?'translateY(18px) scale(.96)':'translateY(-12px) scale(1.035)',filter:'brightness(2.8)'},
      {opacity:1,transform:'translateY(0) scale(1)',filter:'brightness(1)',offset:.72},
      {opacity:1,transform:'translateY(0) scale(1)',filter:'brightness(1)'},
    ],{duration:280,easing:'cubic-bezier(.2,.75,.2,1)',fill:'forwards'}));
  }else{
    base.style.opacity='.35';
    await finishAnimation(layer.animate([{opacity:0},{opacity:1}],{duration:280,fill:'forwards'}));
  }

  const restore=async()=>{
    if(closed)return;closed=true;
    if(active.get(frame)===restore)active.delete(frame);
    if(!reducedMotion())await Promise.allSettled([
      finishAnimation(layer.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:kind==='attack'?'translateY(-14px)':'translateY(18px)',filter:'brightness(1.8)'}],{duration:240,easing:'ease-in',fill:'forwards'})),
      finishAnimation(base.animate([{opacity:.5,filter:'brightness(.75)'},{opacity:1,filter:'brightness(1)'}],{duration:260,fill:'forwards'})),
    ]);
    else await finishAnimation(layer.animate([{opacity:1},{opacity:0}],{duration:240,fill:'forwards'}));
    base.getAnimations().forEach(animation=>animation.cancel());
    base.style.opacity='';layer.remove();frame.classList.remove(`showing-${kind}`);
  };
  active.set(frame,restore);
  return restore;
}
