import { finishAnimation } from './animation-wait.js';
import { getAudio, playTone } from './audio.js';
import { projectileFlight, impactAt, recoil } from './combat-impact.js';
import { motionPreference } from './motion.js';
import {crimsonAttack} from './crimson-fx.js';
import {twinThrust} from './twins-fx.js';
function combatCue(name) {
  try { getAudio().combatCue?.(name); } catch (error) { console.warn('Combat sound unavailable:', name, error); }
}
function soundEffect(name, fallback) {
  try { getAudio().playSfx?.(name, fallback); }
  catch (error) { console.warn('Combat sound unavailable:', name, error); fallback?.(); }
}
const styles = {
  bullet: { glyph:'━', color:'#ffd08a', duration:300, freq:180, type:'sawtooth' },
  sword: { glyph:'╱', color:'#fff2db', duration:570, freq:850, type:'sawtooth' },
  spear: { glyph:'⟶', color:'#e8bd70', duration:590, freq:240, type:'triangle' },
  dagger: { glyph:'➤', color:'#9ce2c0', duration:470, freq:1350, type:'sawtooth' },
  magic: { glyph:'✺', color:'#bb91ff', duration:650, freq:480, type:'sine' },
  axe: { glyph:'⚒', color:'#ff776b', duration:640, freq:125, type:'sawtooth', spin:true },
  starlight: { glyph:'✧', color:'#9bdeff', duration:600, freq:1100, type:'sine' },
  imp_magic: { glyph:'♆', color:'#ee8dd6', duration:520, freq:640, type:'square' },
  dice: { glyph:'⚄', color:'#ffdc7d', duration:600, freq:350, type:'triangle', spin:true },
  vampire_bite: { glyph:'牙', color:'#ef3857', duration:490, freq:230, type:'sawtooth' },
  demon_sword: { glyph:'╳', color:'#dd304e', duration:490, freq:180, type:'sawtooth' },
};
export function characterAttackOrigin(panel) {
  const art=panel?.querySelector('.twins-art .twin-active')||panel?.querySelector('.player-art-stage .player-illustration');
  const rect=art?.getBoundingClientRect();
  return rect ? {x:rect.left+rect.width/2,y:rect.top+rect.height*.43} : null;
}
export async function showSkillEffect(panel,skillId,label){
  const point=characterAttackOrigin(panel);if(!point)return;
  const looks={gold_bonus:['✦','#e9cd8e'],toughness:['◇','#f3d486'],low_card_gold:['◆','#8de0b4'],amplify:['✺','#c4a0ff'],blood_heat:['✹','#ff8b85'],revelation:['✧','#91dbff'],number_steal:['♆','#f2a2df'],random_hand:['⚄','#ffe18c']};
  looks.full_burst=['⌖','#ffd08a']; looks.combo=['⋔','#ffac78'];
  looks.blood_command=['♜','#ef3857'];looks.predation=['◆','#a82d43'];looks.soul_slash=['╳','#dd304e'];
  looks.acrobatics=['♊','#f0c184'];
  const [glyph,color]=looks[skillId]||['✦','#dbc5ee'];
  const el=document.createElement('div');el.className='skill-proc';
  el.style.cssText=`left:${point.x}px;top:${point.y}px;--skill-color:${color}`;
  const icon=document.createElement('b'),text=document.createElement('span');icon.textContent=glyph;text.textContent=label;el.append(icon,text);
  document.querySelector('#fx-overlay').append(el);combatCue(`skill_${skillId}`);
  const reduced=motionPreference.matches;
  try{await finishAnimation(el.animate(reduced?[{opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.8},{opacity:0}]:[
    {transform:'translate(-50%,-30%) scale(.7)',opacity:0},
    {transform:'translate(-50%,-50%) scale(1.08)',opacity:1,offset:.22},
    {transform:'translate(-50%,-60%) scale(1)',opacity:1,offset:.72},
    {transform:'translate(-50%,-85%) scale(.95)',opacity:0},
  ],{duration:720,easing:'ease-out'}));}finally{el.remove();}
}
export async function characterAttack(effect, from, to, { burst, ring, tone, reduced }) {
  if(effect.attackFx==='twin_thrust'){await twinThrust(from,to,{burst,ring,reduced});return;}
  if(['demon_sword','vampire_bite'].includes(effect.attackFx)){await crimsonAttack(effect.attackFx,from,to,{burst,ring,reduced});return;}
  if(effect.attackFx==='fist') {
    await martialAttack(effect,from,to,{burst,ring,reduced});
    return;
  }
  if ((effect.attackFx==='bullet'||effect.attackFx==='fist') && effect.hits>1) {
    for(let i=0;i<Math.min(4,effect.hits);i++) await characterAttack({...effect,hits:1},from,{x:to.x+(i%2?12:-12),y:to.y+(i%2?-8:8)},{burst,ring,tone,reduced});
    return;
  }
  if(effect.attackFx==='bullet')combatCue('gunshot');
  if(effect.attackFx==='vampire_bite')combatCue('vampire_bite');
  if(effect.attackFx==='demon_sword')combatCue('demon_sword');
  const style = styles[effect.attackFx] || styles.sword;
  const enhanced = effect.amplified || effect.empowered;
  soundEffect(effect.attackSfx || 'sfx_attack_adventurer', () => tone(style.freq, .22, style.type, .065, style.freq / 3));
  if (effect.amplified) soundEffect('sfx_skill_mage_amplify', () => tone(1250,.35,'sine',.07,1700));
  combatCue('launch');
  ring(from,style.color); burst(from,style.color,enhanced?65:24,enhanced?6:4);
  const el = document.createElement('div'); el.className=`character-projectile projectile-${effect.attackFx || 'sword'} ${enhanced?'enhanced':''}`;
  el.textContent=style.glyph; el.style.color=style.color; el.style.left=`${from.x}px`; el.style.top=`${from.y}px`;
  document.querySelector('#fx-overlay').append(el);
  const angle=Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI;
  const dx=to.x-from.x,dy=to.y-from.y;
  const travel=(portion)=>`translate(calc(-50% + ${dx*portion}px),calc(-50% + ${dy*portion}px))`;
  const frames = reduced.matches ? [{opacity:0},{opacity:1},{opacity:0}] : [
    {transform:`translate(-50%,-50%) rotate(${angle}deg) scale(.75)`,opacity:.95},
    {transform:`${travel(.52)} rotate(${angle+(style.spin?360:0)}deg) scale(${enhanced?1.45:1.15})`,opacity:1,offset:.52},
    {transform:`${travel(1)} rotate(${angle+(style.spin?(enhanced?1080:720):0)}deg) scale(${enhanced?1.8:1.1})`,opacity:1},
  ];
  if(reduced.matches) { el.style.left=`${to.x}px`; el.style.top=`${to.y}px`; }
  try { await projectileFlight(el,frames,{duration:Math.round(style.duration*.92),easing:'cubic-bezier(.5,.05,.8,.5)'},reduced.matches); }
  finally { el.remove(); }
  burst(to,style.color,enhanced?120:65,enhanced?12:8,style.spin); ring(to,style.color);
  tone(style.freq / 2,.16,'triangle',enhanced?.08:.045,45);
}
// Vector silhouettes keep martial strikes consistent across platforms, without
// OS-dependent emoji. Each combo hit rolls its own punch or sweeping kick.
async function martialAttack(effect,from,to,{burst,ring,reduced}) {
  const hits=Math.max(1,Math.min(4,effect.hits||1));
  for(let i=0;i<hits;i++) {
    const kick=Math.random()<.5,side=Math.random()<.5?-1:1;
    const color=kick?'#ffe2b0':'#ffad78';
    const el=document.createElement('div');
    el.className=`martial-strike ${kick?'martial-kick':'martial-punch'}`;
    el.style.cssText=`left:${from.x}px;top:${from.y}px;color:${color}`;
    const silhouette=kick
      ? 'M55 31 L76 22 L102 50 L118 66 L151 68 Q165 71 160 82 L113 87 Q101 87 96 76 L84 58 Z'
      : 'M44 57 L91 51 L98 38 L110 33 L118 37 L128 33 L136 38 L145 37 L153 45 L160 48 L162 64 L151 77 L126 82 L99 73 L46 76 Z';
    const trail=kick?'M16 87 Q42 6 119 27 M26 97 Q65 14 152 45':'M8 50 L93 56 M0 68 L88 64 M18 83 L96 73';
    el.innerHTML=`<svg viewBox="0 0 180 110" aria-hidden="true"><path class="martial-trail" d="${trail}"/><path class="martial-limb" d="${silhouette}"/><path class="martial-detail" d="${kick?'M90 55 L105 50 M99 68 L114 61':'M103 47 L106 62 M118 43 L121 61 M133 44 L136 60'}"/></svg>`;
    document.querySelector('#fx-overlay').append(el);
    const dx=to.x-from.x,dy=to.y-from.y,angle=Math.atan2(dy,dx)*180/Math.PI;
    const pose=(p,bend,rotation,scale)=>`translate(calc(-50% + ${dx*p-dy/Math.max(1,Math.hypot(dx,dy))*bend}px),calc(-50% + ${dy*p+dx/Math.max(1,Math.hypot(dx,dy))*bend}px)) rotate(${angle+rotation}deg) scale(${scale})`;
    const frames=reduced.matches?[{opacity:0},{opacity:.9,offset:.4},{opacity:0}]:[
      {transform:pose(0,0,kick?-side*38:0,.5),opacity:0},
      {transform:pose(.35,kick?side*65:0,kick?-side*18:0,.95),opacity:.85,offset:.4},
      {transform:pose(1,0,kick?side*15:0,kick?1.3:1.1),opacity:1},
    ];
    if(reduced.matches){el.style.left=`${to.x}px`;el.style.top=`${to.y}px`;}
    combatCue(kick?'kick_whoosh':'punch_whoosh');
    try{await projectileFlight(el,frames,{duration:kick?300:230,easing:'cubic-bezier(.5,.05,.85,.4)'},reduced.matches);}
    finally{el.remove();}
    combatCue(kick?'kick':'punch');
    impactAt(to,color,kick&&!reduced.matches,reduced.matches);
    recoil(document.querySelector('#enemy-art img, #enemy-art svg'),from,to,kick,reduced.matches);
    burst(to,color,reduced.matches?8:kick?48:32,kick?9:6);
    if(i===hits-1)ring(to,color);
  }
}
export async function animateCycle(effect) {
  const pool = document.querySelector(`[data-cycle-pool="${effect.memberId}"]`);
  if (!pool) return;
  const reduce = motionPreference.matches;
  if (effect.random) soundEffect('sfx_gambler_draw',()=>playTone(220,.25,'triangle',.07,780));
  const cards=[...pool.querySelectorAll('.pool-card')];
  // Keep the unplayed card in its original slot; animate only the consumed slot.
  const replacement=effect.continuous&&!effect.replaceAll?effect.cards.find(c=>!effect.previousCards.some(old=>old.id===c.id)):null;
  const targets=effect.continuous&&!effect.replaceAll?cards.filter(el=>effect.previousCards.find(c=>c.id===el.dataset.cardInstance)?.used):cards;
  for(const el of targets) { el.classList.add('face-down'); el.querySelector('b').textContent='◇'; el.querySelector('small').textContent=''; }
  const dice=document.createElement('span'); dice.className='cycle-dice'; dice.textContent=effect.random?'⚄':'↻'; pool.append(dice);
  try { await finishAnimation(dice.animate(reduce?[{opacity:0},{opacity:1}]:[{transform:'rotate(0) scale(.4)',opacity:0},{transform:'rotate(540deg) scale(1.2)',opacity:1}],{duration:effect.random?280:160})); }
  finally { dice.remove(); }
  const animations=targets.map((el,i)=> {
    const card=replacement||effect.cards[i];
    el.dataset.cardInstance=card.id;if(el.dataset.cardId)el.dataset.cardId=card.id;
    el.classList.remove('spent','chosen','face-down'); el.classList.toggle('lucky-seven',card.value===7);
    el.querySelector('b').textContent=card.value; el.querySelector('small').textContent='◆';
    return finishAnimation(el.animate(reduce?[{opacity:.3},{opacity:1}]:[{transform:'rotateY(90deg)',opacity:0},{transform:'rotateY(0deg)',opacity:1}],{duration:240,delay:i*35,fill:'both'}));
  });
  if(effect.random && effect.cards.some(c=>c.value===7)) soundEffect('sfx_gambler_lucky',()=>playTone(1000,.3,'sine',.06,1500));
  await Promise.allSettled(animations);
}
