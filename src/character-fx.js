import { finishAnimation } from './animation-wait.js';
import { getAudio } from './audio.js';
import { projectileFlight } from './combat-impact.js';
const styles = {
  sword: { glyph:'╱', color:'#fff2db', duration:570, freq:850, type:'sawtooth' },
  spear: { glyph:'⟶', color:'#e8bd70', duration:590, freq:240, type:'triangle' },
  dagger: { glyph:'➤', color:'#9ce2c0', duration:470, freq:1350, type:'sawtooth' },
  magic: { glyph:'✺', color:'#bb91ff', duration:650, freq:480, type:'sine' },
  axe: { glyph:'⚒', color:'#ff776b', duration:640, freq:125, type:'sawtooth', spin:true },
  starlight: { glyph:'✧', color:'#9bdeff', duration:600, freq:1100, type:'sine' },
  imp_magic: { glyph:'♆', color:'#ee8dd6', duration:520, freq:640, type:'square' },
  dice: { glyph:'⚄', color:'#ffdc7d', duration:600, freq:350, type:'triangle', spin:true },
};
export function characterAttackOrigin(panel) {
  const art=panel?.querySelector('.player-art-stage .player-illustration');
  const rect=art?.getBoundingClientRect();
  return rect ? {x:rect.left+rect.width/2,y:rect.top+rect.height*.43} : null;
}
export async function characterAttack(effect, from, to, { burst, ring, tone, reduced }) {
  const style = styles[effect.attackFx] || styles.sword;
  const enhanced = effect.amplified || effect.empowered;
  getAudio().playSfx(effect.attackSfx || 'sfx_attack_adventurer', () => tone(style.freq, .22, style.type, .065, style.freq / 3));
  if (effect.amplified) getAudio().playSfx('sfx_skill_mage_amplify', () => tone(1250,.35,'sine',.07,1700));
  getAudio().combatCue('launch');
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
export async function animateCycle(effect) {
  const pool = document.querySelector(`[data-cycle-pool="${effect.memberId}"]`);
  if (!pool) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const audio=getAudio();
  if (effect.random) audio.playSfx('sfx_gambler_draw',()=>audio.tone(220,.25,'triangle',.07,780));
  const cards=[...pool.querySelectorAll('.pool-card')];
  // Keep the unplayed card in its original slot; animate only the consumed slot.
  const replacement=effect.continuous?effect.cards.find(c=>!effect.previousCards.some(old=>old.id===c.id)):null;
  const targets=effect.continuous?cards.filter(el=>effect.previousCards.find(c=>c.id===el.dataset.cardInstance)?.used):cards;
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
  if(effect.random && effect.cards.some(c=>c.value===7)) audio.playSfx('sfx_gambler_lucky',()=>audio.tone(1000,.3,'sine',.06,1500));
  await Promise.allSettled(animations);
}
