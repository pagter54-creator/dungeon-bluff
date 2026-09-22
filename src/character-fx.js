import { finishAnimation } from './animation-wait.js';
import { getAudio } from './audio.js';
const styles = {
  sword: { glyph:'╱', color:'#fff2db', duration:240, freq:850, type:'sawtooth' },
  spear: { glyph:'⟶', color:'#e8bd70', duration:270, freq:240, type:'triangle' },
  dagger: { glyph:'➤', color:'#9ce2c0', duration:150, freq:1350, type:'sawtooth' },
  magic: { glyph:'✺', color:'#bb91ff', duration:380, freq:480, type:'sine' },
  axe: { glyph:'⚒', color:'#ff776b', duration:390, freq:125, type:'sawtooth', spin:true },
  starlight: { glyph:'✧', color:'#9bdeff', duration:310, freq:1100, type:'sine' },
  imp_magic: { glyph:'♆', color:'#ee8dd6', duration:230, freq:640, type:'square' },
  dice: { glyph:'⚄', color:'#ffdc7d', duration:340, freq:350, type:'triangle', spin:true },
};
export async function characterAttack(effect, from, to, { burst, ring, tone, reduced }) {
  const style = styles[effect.attackFx] || styles.sword;
  const enhanced = effect.amplified || effect.empowered;
  getAudio().playSfx(effect.attackSfx || 'sfx_attack_adventurer', () => tone(style.freq, .22, style.type, .065, style.freq / 3));
  if (effect.amplified) getAudio().playSfx('sfx_skill_mage_amplify', () => tone(1250,.35,'sine',.07,1700));
  if (effect.attackFx === 'magic' || effect.attackFx === 'starlight') {
    ring(from,style.color); if(enhanced) burst(from,style.color,65,5);
  }
  const el = document.createElement('div'); el.className=`character-projectile projectile-${effect.attackFx || 'sword'} ${enhanced?'enhanced':''}`;
  el.textContent=style.glyph; el.style.color=style.color; el.style.left=`${from.x}px`; el.style.top=`${from.y}px`;
  document.querySelector('#fx-overlay').append(el);
  const angle=Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI;
  const travel=`translate(${to.x-from.x}px,${to.y-from.y}px)`;
  const frames = reduced.matches ? [{opacity:0},{opacity:1},{opacity:0}] : [
    {transform:`translate(-50%,-50%) rotate(${angle}deg) scale(.7)`,opacity:0},
    {opacity:1,offset:.15},
    {transform:`${travel} rotate(${angle+(style.spin?(enhanced?1080:720):0)}deg) scale(${enhanced?1.8:1.1})`,opacity:1},
  ];
  if(reduced.matches) { el.style.left=`${to.x}px`; el.style.top=`${to.y}px`; }
  try { await finishAnimation(el.animate(frames,{duration:reduced.matches?80:style.duration,easing:'ease-in'})); }
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
  try { await finishAnimation(dice.animate(reduce?[{opacity:0},{opacity:1}]:[{transform:'rotate(0) scale(.4)',opacity:0},{transform:'rotate(540deg) scale(1.2)',opacity:1}],{duration:reduce?60:effect.random?280:160})); }
  finally { dice.remove(); }
  const animations=targets.map((el,i)=> {
    const card=replacement||effect.cards[i];
    el.dataset.cardInstance=card.id;if(el.dataset.cardId)el.dataset.cardId=card.id;
    el.classList.remove('spent','chosen','face-down'); el.classList.toggle('lucky-seven',card.value===7);
    el.querySelector('b').textContent=card.value; el.querySelector('small').textContent='◆';
    return finishAnimation(el.animate(reduce?[{opacity:.3},{opacity:1}]:[{transform:'rotateY(90deg)',opacity:0},{transform:'rotateY(0deg)',opacity:1}],{duration:reduce?60:240,delay:reduce?0:i*35,fill:'both'}));
  });
  if(effect.random && effect.cards.some(c=>c.value===7)) audio.playSfx('sfx_gambler_lucky',()=>audio.tone(1000,.3,'sine',.06,1500));
  await Promise.allSettled(animations);
}
