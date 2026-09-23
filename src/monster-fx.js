import { finishAnimation } from './animation-wait.js';

// Telegraph, trajectory and impact are deliberately different for every monster.
export const MONSTER_ATTACKS = {
  boar: {color:'#edc38b',glyph:'❯',kind:'charge'},
  bat: {color:'#c39aff',glyph:'◎',kind:'echo'},
  hunter: {color:'#f7bd77',glyph:'➶',kind:'arrow'},
  golem: {color:'#ff697c',glyph:'◆',kind:'slam'},
  seer: {color:'#bd91ff',glyph:'✧',kind:'curse'},
  slime: {color:'#9cf47e',glyph:'●',kind:'splash'},
  goblin: {color:'#ffb84d',glyph:'✹',kind:'bomb'},
  mimic: {color:'#ffd875',glyph:'◈',kind:'bite'},
};
export async function monsterAttack(shape, from, to, {burst,ring,tone,reduced}) {
  const style=MONSTER_ATTACKS[shape] || MONSTER_ATTACKS.seer;
  const reducedMotion=reduced.matches;
  const enemy=document.querySelector('#enemy-art img');
  const overlay=document.querySelector('#fx-overlay');
  const nodes=[];
  try {
    if(enemy) void finishAnimation(enemy.animate(reducedMotion?[{opacity:.6},{opacity:1}]:[
      {transform:'translateY(0) scale(1)'},
      {transform:shape==='boar'?'translateX(-24px) scale(.95)':'translateY(-12px) scale(1.08)',offset:.4},
      {transform:shape==='golem'?'translateY(18px) scale(1.05)':'translateY(8px) scale(1.15)',offset:.65},
      {transform:'translateY(0) scale(1)'},
    ],{duration:600}));
    tone(shape==='bat'?780:shape==='golem'?55:180,.3,'sawtooth',.07,shape==='seer'?600:45);
    if(!reducedMotion) ring(from,style.color);
    const count=reducedMotion?1:shape==='bat'?3:shape==='slime'?5:shape==='mimic'?2:1;
    await Promise.all(Array.from({length:count},async(_,i)=>{
      const el=document.createElement('div');nodes.push(el);
      el.className=`monster-projectile monster-${style.kind}`;el.textContent=style.glyph;
      el.style.color=style.color;overlay?.append(el);
      const stationary=['golem','seer','mimic'].includes(shape)||reducedMotion;
      el.style.left=`${stationary?to.x:from.x}px`;el.style.top=`${stationary?to.y:from.y}px`;
      const dx=to.x-from.x,dy=to.y-from.y,angle=Math.atan2(dy,dx)*180/Math.PI;
      const travel=shape==='bat'?[{transform:'scale(.3)',opacity:0},{opacity:1,offset:.2},{transform:`translate(${dx}px,${dy}px) scale(3)`,opacity:0}]:
        shape==='golem'?[{transform:'translateY(-150px) scale(2)',opacity:0},{opacity:1,offset:.2},{transform:'translateY(0) scale(1.3)',opacity:1}]:
        shape==='seer'?[{transform:'rotate(0) scale(.1)',opacity:0},{transform:'rotate(180deg) scale(2.5)',opacity:1},{transform:'rotate(240deg) scale(1)',opacity:0}]:
        shape==='mimic'?[{transform:`translateY(${i?-85:85}px) rotate(${i?180:0}deg) scale(2)`,opacity:0},{transform:`rotate(${i?180:0}deg) scale(1.2)`,opacity:1}]:
        [{transform:`rotate(${angle}deg) scale(.6)`,opacity:0},{transform:`translate(${dx*.5+(i-2)*12}px,${dy*.5-(shape==='slime'||shape==='goblin'?90:0)}px) rotate(${angle+(shape==='goblin'?180:0)}deg)`,opacity:1,offset:.5},{transform:`translate(${dx}px,${dy}px) rotate(${angle+(shape==='goblin'?540:0)}deg) scale(${shape==='boar'?2:1.2})`,opacity:1}];
      await finishAnimation(el.animate(reducedMotion?[{opacity:0},{opacity:.7},{opacity:0}]:travel,{duration:520,delay:i*65,easing:'ease-in'}));
    }));
    burst(to,style.color,reducedMotion?12:shape==='golem'?150:100,shape==='golem'?15:9,shape==='goblin');
    if(!reducedMotion) {ring(to,style.color);if(shape==='bat'||shape==='golem')ring(to,'#fff1dc');}
  } finally { for(const node of nodes)node.remove(); }
}
