import {motionPreference} from './motion.js';
import {cueWaves} from './pve-combat-presentation.js';
// Each reveal owns a controller; disconnect/visibility changes cancel its pending waits.
export function createPveCuePlayer(root=globalThis.document?.querySelector('#app')){
 const originalParty=root?.querySelector('.party-grid');
 let cancelled=false;const pending=new Set(),owned=new Set(),animations=new Set();
 const alive=()=>!cancelled&&root?.isConnected!==false&&!globalThis.document?.hidden;
 const nodesFor=id=>[...(root?.querySelectorAll('[data-player]')||[])].filter(n=>n.dataset.player===id);
 const wait=ms=>new Promise(resolve=>{const job={resolve,timer:setTimeout(()=>{pending.delete(job);resolve();},ms)};pending.add(job);});
 const cancel=()=>{cancelled=true;for(const job of pending){clearTimeout(job.timer);job.resolve();}pending.clear();
  for(const a of animations)a.cancel();animations.clear();for(const n of owned)n.remove();owned.clear();
  root?.querySelectorAll('.pve-cue-actor,.pve-cue-target').forEach(n=>n.classList.remove('pve-cue-actor','pve-cue-target'));
 };
 const onVisibility=()=>{if(globalThis.document?.hidden)cancel();};
 globalThis.document?.addEventListener('visibilitychange',onVisibility);
 const observe=globalThis.MutationObserver?new MutationObserver(()=>{if(!alive()||root.querySelector('.party-grid')!==originalParty)cancel();}):null;
 observe?.observe(root,{childList:true});
 const animate=(node,frames,duration)=>{
  if(motionPreference.matches||!node?.animate)return;
  const a=node.animate(frames,{duration,easing:'ease-out'});animations.add(a);
  Promise.resolve(a.finished).catch(()=>{}).finally(()=>animations.delete(a));
 };
 async function skill(cue,context={}){
  if(!alive())return;
  const actor=nodesFor(cue.actorId)[0],target=nodesFor(cue.targetId)[0]||actor;if(!actor)return;
  const targets=[...new Set((cue.targetIds||[cue.targetId]).flatMap(nodesFor))];if(!targets.length)targets.push(target);
  actor.style.setProperty('--cue-color',cue.theme.color);actor.classList.add('pve-cue-actor');
  const badge=document.createElement('div');owned.add(badge);badge.className='pve-skill-cue pve-cue-'+cue.kind;
  badge.style.setProperty('--cue-color',cue.theme.color);badge.setAttribute('role','status');
  // Render the complete badge at once; phase changes affect emphasis only.
  badge.textContent=cue.theme.glyph+' '+cue.label+' · '+(cue.value||'완료')+(cue.count>1?' ×'+cue.count:'');actor.append(badge);
  try{
   if(!motionPreference.matches)await wait(100);if(!alive())return;
   for(const n of targets){n.style.setProperty('--cue-color',cue.theme.color);n.classList.add('pve-cue-target');}
   badge.dataset.step='target';
   if(!motionPreference.matches)await wait(100);if(!alive())return;
   badge.dataset.step='change';
   if(cue.kind==='number'&&Number.isFinite(cue.afterValue))for(const el of [context.cardFor?.(cue.actorId),context.showcaseCardFor?.(cue.actorId)]){const value=el?.querySelector('.reveal-value');if(value)value.textContent=String(cue.afterValue);}
   const card=['number','swap','steal','protect'].includes(cue.kind)?target.querySelector('[data-reveal]'):target.querySelector('.player-portrait, .portrait')||target;
   const frames=cue.kind==='recover'?[{opacity:.4,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}]:
    cue.kind==='number'?[{filter:'brightness(1)'},{filter:'brightness(1.8)',offset:.5},{filter:'brightness(1)'}]:
    cue.kind==='swap'||cue.kind==='parity'?[{translate:'-8px 0'},{translate:'8px 0',offset:.5},{translate:'0 0'}]:
    cue.kind==='burst'||cue.kind==='slash'?[{translate:'0 0'},{translate:'-5px 0',offset:.4},{translate:'0 0'}]:
    [{filter:'drop-shadow(0 0 0 transparent)'},{filter:'drop-shadow(0 0 10px '+cue.theme.color+')',offset:.5},{filter:'drop-shadow(0 0 0 transparent)'}];
   animate(card,frames,300);
   if(!motionPreference.matches)await wait(300);if(!alive())return;
   badge.dataset.step='result';badge.classList.toggle('cue-failed',!cue.success);
   await wait(motionPreference.matches?400:180);
  }finally{actor.classList.remove('pve-cue-actor');for(const n of targets)n.classList.remove('pve-cue-target');badge.remove();owned.delete(badge);}
 }
 async function phase(cues,name,context={}){for(const wave of cueWaves(cues.filter(c=>c.phase===name))){if(!alive())return;await Promise.all(wave.map(cue=>skill(cue,context)));}}
 async function monster(cue){
  if(!cue||!alive())return;
  const panel=root.querySelector('.pve-pattern-panel'),enemy=root.querySelector('#enemy-art');
  if(!panel)return;
  const result=panel.querySelector('[data-pattern-result]'),progress=panel.querySelector('[data-pattern-progress]');
  panel.dataset.outcome='JUDGING';if(result)result.textContent='판정';
  if(!motionPreference.matches)await wait(220);if(!alive())return;
  panel.dataset.outcome=cue.outcome;if(result){const status={ACTIVE:'패턴 발동',BLOCKED:'저지 성공',PARTIAL:'부분 결과',WAIT:'준비 중'}[cue.outcome];result.textContent=cue.label===status?status:status+' · '+cue.label;}
  if(progress)progress.textContent=cue.detail;
  // Monster motif rotates its own seal; blocked seals contract, activated seals radiate.
  const seal=document.createElement('span');owned.add(seal);seal.className='pve-pattern-seal';
  seal.textContent=cue.outcome==='BLOCKED'?cue.theme.suppressionGlyph||'✓':cue.theme.glyph;seal.dataset.shape=cue.theme.sealShape;seal.style.setProperty('--seal-angle',(cue.theme.activationAngle||0)+'deg');seal.style.setProperty('--cue-color',cue.theme.color);enemy?.append(seal);
  const blocked=cue.outcome==='BLOCKED',partial=cue.outcome==='PARTIAL';
  seal.dataset.outcome=cue.outcome;seal.dataset.motif=cue.theme.motif;
  animate(seal,cue.outcome==='WAIT'?[{opacity:.3,transform:'scale(.8)'},{opacity:.7,transform:'scale(.9)'},{opacity:.3,transform:'scale(.8)'}]:blocked?[{transform:'scale(1.5)',opacity:1},{transform:'scale(.4)',opacity:0}]:
   partial?[{transform:'rotate(-20deg) scale(.6)',opacity:0},{transform:'rotate(20deg) scale(1.1)',opacity:1},{opacity:0}]:
   [{transform:'scale(.5)',opacity:0},{transform:'scale(1.4)',opacity:1,offset:.5},{transform:'scale(1.8)',opacity:0}],cue.theme.boss?800:600);
  const targets=cue.targetIds.flatMap(nodesFor);for(const n of targets)n.classList.add('pve-cue-target');
  try{await wait(motionPreference.matches?450:cue.theme.boss?850:650);}
  finally{seal.remove();owned.delete(seal);for(const n of targets)n.classList.remove('pve-cue-target');}
 }
 return {phase,monster,cancel,dispose(){cancel();observe?.disconnect();globalThis.document?.removeEventListener('visibilitychange',onVisibility);}};
}
