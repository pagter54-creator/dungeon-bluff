import { monsterAttack } from './monster-fx.js';
import { advanceParticle } from './particle-time.js';
import { finishAnimation } from './animation-wait.js';
import { playTone as tone, getAudio } from './audio.js';
import { characterAttack, characterAttackOrigin, animateCycle, showSkillEffect } from './character-fx.js';
import { showPlayerPose,setKnockoutPose } from './player-pose-fx.js';
import { flipRevealCard } from './card-reveal-fx.js';
import { impactAt, recoil, revealShowcase, shatterCard, projectileFlight } from './combat-impact.js';
import { motionPreference } from './motion.js';

const canvas = document.querySelector('#fx-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.querySelector('#fx-overlay');
const reduced = motionPreference;
let particles = [];
let raf = 0;
let previous = 0;
let cameraShake;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// Sound is optional. A blocked or partially supported Web Audio device must
// never cancel the card reveal and every combat animation after it.
function combatCue(name) {
  try { getAudio().combatCue?.(name); } catch (error) { console.warn('Combat sound unavailable:', name, error); }
}
function soundEffect(name, fallback) {
  try { getAudio().playSfx?.(name, fallback); }
  catch (error) { console.warn('Combat sound unavailable:', name, error); fallback?.(); }
}
function resize() { const dpr = Math.min(devicePixelRatio, 2); canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
addEventListener('resize', resize); resize();
const center = element => { const r = element?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 }; };
function frame(now) {
  const elapsedMs = Math.max(0,now - previous); previous = now;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of particles) {
    advanceParticle(p,elapsedMs);
    ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * .08);
    if (p.shard) ctx.fillRect(-p.size, -p.size / 3, p.size * 2, p.size / 1.5);
    else { ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1; particles = particles.filter(p => p.life > 0);
  if (particles.length) raf = requestAnimationFrame(frame); else { raf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
}
function burst(point, color, count = 65, force = 8, shard = false) {
  if (reduced.matches) count = Math.min(count, 8);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, speed = Math.random() * force + 1;
    const life = 22 + Math.random() * 26;
    particles.push({ x: point.x, y: point.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, gravity: shard ? .13 : .035, size: Math.random() * 3 + 1, life, max: life, color, shard });
  }
  if (!raf) { previous = performance.now(); raf = requestAnimationFrame(frame); }
}
function textAt(point, text, kind = '') {
  const el = document.createElement('div'); el.className = `floating-number ${kind}`; el.textContent = text;
  el.style.left = `${point.x}px`; el.style.top = `${point.y}px`; overlay.append(el);
  setTimeout(() => el.remove(), 1500);
}
function banner(text, sub, kind = '') {
  const el = document.createElement('div'); el.className = `battle-banner ${kind}`;
  const strong = document.createElement('strong'), small = document.createElement('small'); strong.textContent = text; small.textContent = sub;
  el.append(strong, small); overlay.append(el); setTimeout(() => el.remove(), 1800);
  return el;
}
function ring(point, color) {
  const el = document.createElement('div'); el.className = 'impact-ring'; el.style.left = `${point.x}px`; el.style.top = `${point.y}px`; el.style.borderColor = color;
  overlay.append(el); setTimeout(() => el.remove(), 700);
}
function shake(strong = false) {
  if (reduced.matches) return;
  cameraShake?.cancel();
  const force=strong?21:11;
  cameraShake=document.querySelector('#app')?.animate([0,-1,.8,-.65,.45,-.25,0].map((v,i)=>({transform:`translate(${v*force}px,${i%2?v*force*.45:-v*force*.55}px)`})),{duration:strong?420:310,easing:'ease-out'});
}
async function bolt(from, to, color) {
  const el = document.createElement('div'); el.className = 'magic-bolt'; el.style.background = color; el.style.boxShadow = `0 0 14px 6px ${color}, 0 0 45px 10px ${color}`;
  el.style.left = `${from.x}px`; el.style.top = `${from.y}px`; overlay.append(el);
  try{await projectileFlight(el,[{ transform: 'translate(-50%,-50%) scale(.5)', opacity: .8 }, { opacity: 1, offset: .2 }, { transform: `translate(calc(-50% + ${to.x-from.x}px),calc(-50% + ${to.y-from.y}px)) scale(1.5)`, opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.6,0,.9,.6)' },reduced.matches);}
  finally{el.remove();} burst(to, color, 65, 9); ring(to, color);
}
export async function reveal(result) {
  const cardFor = id => document.querySelector(`[data-reveal="${id}"]`);
  const playerFor = id => document.querySelector(`[data-player="${id}"]`);
  const target = () => center(document.querySelector('#enemy-art'));
  const playedSkills=new Set();
  const skill=(id,skillId,label,phase='turn')=>{
    const key=`${id}:${skillId}:${phase}`;if(playedSkills.has(key))return;playedSkills.add(key);
    void showSkillEffect(playerFor(id),skillId,label);
  };
  const skillPhase=(phase,id)=>{
    for(const e of result.effects.filter(e=>e.type==='skill'&&e.skillId!=='predation'&&e.phase===phase&&(!id||e.memberId===id))){
      skill(e.memberId,e.skillId,e.label,phase);
      if (Number.isInteger(e.stacks)) {
        const gauge = playerFor(e.memberId)?.querySelector('.revelation-gauge');
        gauge?.setAttribute('aria-valuenow', String(e.stacks));
        gauge?.querySelectorAll('.revelation-pip').forEach((pip,i)=>pip.classList.toggle('filled',i<e.stacks));
      }
      if(Number.isFinite(e.hp)){
        const panel=playerFor(e.memberId),hearts=[...(panel?.querySelectorAll('.heart')||[])];
        hearts.forEach((heart,i)=>heart.classList.toggle('filled',i<e.hp));
        panel?.querySelector('.hearts')?.setAttribute('aria-label',`HP ${e.hp}/${hearts.length}`);
      }
    }
  };
  const introduction=banner('운명을 펼쳐라', `TURN ${result.turnIndex} · 동시 공개`);
  tone(160, .6, 'triangle', .08, 440);
  await sleep(560);
  introduction.remove();
  const showcase=revealShowcase(result.cards,cardFor,playerFor);
  try{
  combatCue('flip');
  await Promise.all(result.cards.flatMap(c=>{const initial=c.exchangeFrom==null&&c.impFrom==null?c:{...c,value:c.exchangeFrom??c.impFrom,amplified:false};return [flipRevealCard(cardFor(c.memberId),initial,reduced.matches),flipRevealCard(showcase.cardFor(c.memberId),initial,reduced.matches)];}));
  combatCue('reveal');
  await sleep(360);
  for(const exchange of result.effects.filter(e=>e.type==='vampire_swap')){
    const source=showcase.cardFor(exchange.sourceId)||cardFor(exchange.sourceId),targetCard=showcase.cardFor(exchange.targetId)||cardFor(exchange.targetId);
    const a=center(source),b=center(targetCard),line=document.createElement('div');
    line.className='blood-thread';line.style.cssText=`left:${a.x}px;top:${a.y}px;width:${Math.hypot(b.x-a.x,b.y-a.y)}px;transform:rotate(${Math.atan2(b.y-a.y,b.x-a.x)}rad)`;overlay.append(line);
    combatCue('skill_blood_command');ring(a,'#ff3755');ring(b,'#ff3755');burst(a,'#ea3154',50,6);burst(b,'#ea3154',50,6);
    await finishAnimation(line.animate([{opacity:0,scale:'0 1'},{opacity:1,scale:'1 1',offset:.35},{opacity:1,offset:.75},{opacity:0}],{duration:440,easing:'ease-out'}));line.remove();
    for(const [id,value] of [[exchange.sourceId,exchange.targetValue],[exchange.targetId,exchange.sourceValue]])for(const el of [cardFor(id),showcase.cardFor(id)]){
      const number=el?.querySelector('.reveal-value');if(number)number.textContent=value;
      if(el)void finishAnimation(el.animate([{filter:'brightness(1)'},{filter:'brightness(3) drop-shadow(0 0 15px #fb325a)',offset:.45},{filter:'brightness(1)'}],{duration:320}));
    }
  }
  const impSteals=result.effects.filter(e=>e.type==='imp_number_steal');
  if(impSteals.length){
    const numbers=new Map(result.cards.filter(c=>c.impFrom!=null).map(c=>[c.memberId,c.impFrom]));
    const flies=impSteals.map(e=>{
      const source=showcase.cardFor(e.targetId)||cardFor(e.targetId);
      const destination=showcase.cardFor(e.memberId)||cardFor(e.memberId);
      const from=center(source),to=center(destination);
      source?.classList.add('imp-drained');destination?.classList.add('imp-charged');
      ring(from,'#f3a5e9');burst(from,'#db8edb',24,4,true);
      const fragment=document.createElement('div');fragment.className='imp-number-fragment';fragment.textContent='1';
      fragment.style.left=`${from.x}px`;fragment.style.top=`${from.y}px`;overlay.append(fragment);
      return finishAnimation(fragment.animate([{transform:'translate(-50%,-50%) scale(.8)',opacity:0},{transform:'translate(-50%,-50%) scale(1.4)',opacity:1,offset:.2},{transform:`translate(calc(-50% + ${to.x-from.x}px),calc(-50% + ${to.y-from.y}px)) scale(.7)`,opacity:0}],{duration:380,easing:'ease-in-out'})).finally(()=>fragment.remove());
    });
    soundEffect('sfx_skill_imp_steal',()=>tone(800,.22,'triangle',.07,1280));
    await Promise.all(flies);
    for(const e of impSteals){numbers.set(e.targetId,(numbers.get(e.targetId)??e.targetValue)-1);numbers.set(e.memberId,(numbers.get(e.memberId)??e.sourceValue)+1);}
    for(const [id,value] of numbers)for(const el of [cardFor(id),showcase.cardFor(id)]){
      const number=el?.querySelector('.reveal-value');if(number)number.textContent=value;
      if(el)void finishAnimation(el.animate([{filter:'brightness(1)'},{filter:'brightness(2.4) drop-shadow(0 0 12px #e695df)',offset:.5},{filter:'brightness(1)'}],{duration:300}));
    }
    for(const e of impSteals)skill(e.memberId,'number_steal','슬쩍 · 숫자 강탈','imp');
  }
  const duplicates = result.cards.filter(c => !c.valid);
  const resisted = result.cards.filter(c => c.resisted);
  const resistanceAnimations = [];
  for (const c of resisted) {
    const el = showcase.cardFor(c.memberId) || cardFor(c.memberId);
    el?.classList.add('clash-resisted'); cardFor(c.memberId)?.classList.add('clash-resisted');
    ring(center(el), '#ffe1a0'); burst(center(el), '#ffe1a0', 65, 7);
    textAt(center(el), '강인함 · 소멸 저항', 'gold'); combatCue('skill_toughness');
    if (el) resistanceAnimations.push(finishAnimation(el.animate(reduced.matches?[{opacity:.6},{opacity:1}]:[{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(.92)',filter:'brightness(2.8)',offset:.3},{transform:'scale(1.14)',filter:'brightness(1.8)',offset:.6},{transform:'scale(1)',filter:'brightness(1)'}],{duration:650,easing:'ease-out'})));
  }
  if (duplicates.length) {
    const conflicting=duplicates.map(c=>showcase.cardFor(c.memberId)||cardFor(c.memberId));
    await Promise.all(conflicting.map(el=>el?finishAnimation(el.animate(reduced.matches?[{opacity:.7},{opacity:1}]:[{translate:'0px 0px',filter:'brightness(1)'},{translate:'-5px 0px',filter:'brightness(2)',offset:.3},{translate:'5px 0px',filter:'brightness(1.5)',offset:.6},{translate:'0px 0px',filter:'brightness(2.5)'}],{duration:300})):Promise.resolve()));
    const breaks=duplicates.map(c=>{
      const el=showcase.cardFor(c.memberId)||cardFor(c.memberId),point=center(el);
      cardFor(c.memberId)?.classList.add('shattered');
      burst(point,'#f286b9',95,11,true);impactAt(point,'#f286b9',false,reduced.matches);textAt(point,`${c.value} 중복 · 소멸`,'cancel');
      return shatterCard(el,reduced.matches);
    });
    shake(); combatCue('crack');
    await Promise.all(breaks);
  }
  await Promise.allSettled(resistanceAnimations);
  await sleep(170);
  }finally{showcase.remove();}
  skillPhase('clash');
  for(const c of result.cards.filter(c=>c.skillUsed))skill(c.memberId,c.skillId||'amplify',c.skillId==='blood_command'?'피의 명령 · 카드 교환':c.skillId==='soul_slash'?(c.valid?'귀참 · 강화 공격':'귀참 · 중복 무효'):c.skillId==='full_burst'?(c.valid?'전탄발사 · 손패 전체 사용':'전탄발사 · 중복 무효'):c.skillId==='toughness'?'강인함 · 행동 유지':c.valid?`증폭 · ${c.legacyAmplify?'효과':'숫자'} +${c.amplifyLevel||1}`:'증폭 · 중복 무효');
  if (result.monsterBefore) {
    let remainingHp = result.monsterBefore.hp;
    for(const effect of result.effects.filter(e=>e.type==='boss_card')){
      const point=center(cardFor(effect.memberId));cardFor(effect.memberId)?.classList.add('boss-afflicted');
      textAt(point,effect.label,'cancel');burst(point,'#c797ff',65,8);ring(point,'#ddc1ff');
    }
    for(const effect of result.effects.filter(e=>e.type==='monster_heal'&&e.amount>0)){
      remainingHp=Math.min(result.monsterBefore.maxHp,remainingHp+effect.amount);
      textAt(target(),`포식 · +${effect.amount} HP`,'heal');burst(target(),'#a5ef76',90,9);ring(target(),'#b6fa82');
    }
    for (const effect of result.effects.filter(e => e.type === 'attack' && e.amount > 0)) {
      skillPhase('attack',effect.memberId);
      cardFor(effect.memberId)?.classList.add('empowered');
      const restorePose=await showPlayerPose(playerFor(effect.memberId),'attack');
      const origin=characterAttackOrigin(playerFor(effect.memberId))||center(cardFor(effect.memberId));
      await characterAttack(effect,origin,target(),{burst,ring,tone,reduced});
      impactAt(target(),effect.amount>=4?'#ffe5a3':'#f8deff',effect.amount>=4,reduced.matches);
      recoil(document.querySelector('#enemy-art img, #enemy-art svg'),origin,target(),effect.amount>=4,reduced.matches);
      shake(effect.amount >= 4); combatCue(effect.amount>=4?'heavy':'hit'); textAt(target(), `−${effect.amount}`, 'critical');
      remainingHp = Math.max(0, remainingHp - effect.amount);
      const hpText = document.querySelector('.enemy-health b');
      const hpBar = document.querySelector('.enemy-health .health-track i');
      if (hpText) hpText.innerHTML = `${remainingHp} <small>/ ${result.monsterBefore.maxHp}</small>`;
      if (hpBar) hpBar.style.width = `${remainingHp / result.monsterBefore.maxHp * 100}%`;
      await sleep(150);
      await restorePose();
    }
    await Promise.all(result.effects.filter(e=>e.type==='skill'&&e.skillId==='predation').map(async e=>{
      const panel=playerFor(e.memberId),point=characterAttackOrigin(panel)||center(panel),major=e.gain>=5,kill=e.gain>=3;
      if(kill)await bolt(target(),point,major?'#ff385a':'#aa304c');
      burst(point,major?'#ff385a':'#ac4257',major?140:kill?65:18,major?12:kill?6:3,major);
      if(kill)ring(point,major?'#ff7c94':'#c85d74');
      textAt(point,`포식 +${e.gain}`,major?'critical':'damage');
      combatCue(major?'predation_major':kill?'predation_kill':'skill_predation');
      if(kill)shake(major);
      const gauge=panel?.querySelector('.predation-gauge');
      for(let stacks=e.previousStacks??e.stacks-e.gain;stacks<e.stacks;){
        stacks++;const progress=stacks%8,level=Math.floor(stacks/8);
        gauge?.setAttribute('aria-valuenow',String(progress));gauge?.querySelectorAll('.revelation-pip').forEach((pip,i)=>pip.classList.toggle('filled',i<progress));
        const label=panel?.querySelector('.predation-count'),button=panel?.querySelector('.soul-slash-level');
        if(label)label.textContent=`포식 ${stacks} · 귀참 Lv.${level} +${level+1}`;
        if(button)button.textContent=`⚔ 귀참 Lv.${level} +${level+1}`;
        if(progress===0){ring(point,'#ffc0d2');textAt(point,`귀참 Lv.${level}`,'heal');}
        await sleep(50);
      }
    }));
    const finalHp=result.monsterAfter?.hp??remainingHp;
    const hpText=document.querySelector('.enemy-health b'),hpBar=document.querySelector('.enemy-health .health-track i');
    if(hpText)hpText.innerHTML=`${finalHp} <small>/ ${result.monsterBefore.maxHp}</small>`;
    if(hpBar)hpBar.style.width=`${finalHp/result.monsterBefore.maxHp*100}%`;
  } else {
    for (const c of result.cards.filter(c => c.valid)) await bolt(center(cardFor(c.memberId)), target(), result.success ? '#89e0ba' : '#b39af3');
    banner(result.success ? '이벤트 성공' : '조건 미달', result.stage.name, result.success ? 'success' : 'danger');
    impactAt(target(),result.success?'#99f0cb':'#fd8c91',true,reduced.matches);
    burst(target(), result.success ? '#99f0cb' : '#fd8c91', 120, 12); tone(result.success ? 660 : 110, .4, 'triangle', .1, result.success ? 880 : 40);
    await sleep(560);
    for(const e of result.effects.filter(e=>e.type==='skill'&&e.skillId==='predation')){
      const panel=playerFor(e.memberId),point=characterAttackOrigin(panel)||center(panel),progress=e.stacks%8,level=Math.floor(e.stacks/8);
      burst(point,'#ac4257',18,3);textAt(point,'포식 +1','damage');combatCue('skill_predation');
      const gauge=panel?.querySelector('.predation-gauge');
      gauge?.setAttribute('aria-valuenow',String(progress));gauge?.querySelectorAll('.revelation-pip').forEach((pip,i)=>pip.classList.toggle('filled',i<progress));
      const label=panel?.querySelector('.predation-count'),button=panel?.querySelector('.soul-slash-level');
      if(label)label.textContent=`포식 ${e.stacks} · 귀참 Lv.${level} +${level+1}`;
      if(button)button.textContent=`⚔ 귀참 Lv.${level} +${level+1}`;
      if(progress===0){ring(point,'#ffc0d2');textAt(point,`귀참 Lv.${level}`,'heal');}
    }
  }
  for(const effect of result.effects.filter(e=>['boss_special','boss_status','boss_mark'].includes(e.type))){
    const point=effect.memberId?center(playerFor(effect.memberId)):target();
    ring(point,'#e5afff');burst(point,'#c586ff',140,13,true);textAt(point,effect.label,'critical');
    if(effect.type==='boss_special'){banner(effect.label,effect.detail,'danger');shake(true);tone(90,.7,'sawtooth',.09,480);}
    if(effect.memberId)playerFor(effect.memberId)?.classList.add('boss-mark-flash');
    await sleep(300);
  }
  for (const effect of result.effects.filter(e => ['revelation','shield'].includes(e.type))) {
    const point=center(playerFor(effect.memberId));
    if(effect.type==='shield') { skill(effect.memberId,'toughness',effect.label||'강인함 · 피해 무효');ring(point,'#f7d484'); textAt(point,effect.label||'강인함 · 방어','gold'); }
    else { skill(effect.memberId,'revelation','계시 · 다음 턴 공개');soundEffect('sfx_skill_seer_reveal',()=>tone(1300,.4,'sine',.06,1700)); textAt(point,'계시','heal'); }
  }
  for (const effect of result.effects.filter(e => ['damage', 'heal', 'revive', 'knockout', 'penalty'].includes(e.type))) {
    const el = playerFor(effect.memberId), point = characterAttackOrigin(el)||center(el);
    if (effect.type === 'penalty') { textAt(point, `${effect.score}점 · ${effect.gold} G`, 'penalty'); continue; }
    const hearts = [...(el?.querySelectorAll('.heart') || [])];
    const oldHp = hearts.filter(heart => heart.classList.contains('filled')).length;
    const hp = effect.type === 'damage' ? Math.max(0, oldHp - effect.amount) : effect.type === 'heal' ? Math.min(hearts.length, oldHp + effect.amount) : effect.type === 'revive' ? (effect.hp ?? hearts.length) : 0;
    if (effect.type === 'damage') {
      if(effect.reason==='burst_misfire'){burst(point,'#ffba72',85,8,true);ring(point,'#ffda9c');combatCue('skill_full_burst');}
      else if(result.monsterBefore) await monsterAttack(result.stage.shape,target(),point,{burst,ring,tone,reduced});
      else await bolt(target(), point, '#ff687e'); el?.classList.add('hit'); shake(true); textAt(point, `−${effect.amount} HP`, 'damage'); combatCue('hurt');
      impactAt(point,'#ff6985',true,reduced.matches);
      recoil(el?.querySelector('.player-art-stage'),target(),point,true,reduced.matches);
      const pose=showPlayerPose(el,'damage');
      const info=el?.querySelector('.player-info');
      if(info)void finishAnimation(info.animate([{boxShadow:'inset 0 0 45px #ff486aaa,0 0 25px #ff486a88'},{boxShadow:'inset 0 0 0 transparent,0 0 0 transparent'}],{duration:550}));
      const restorePose=await pose;
      // Keep the replaced damage illustration visible long enough to read the hit.
      await sleep(420);if(hp===0)await setKnockoutPose(el,true);await restorePose();
    } else if (effect.type === 'knockout') { textAt(point, 'KNOCKOUT', 'damage'); burst(point, '#ff5676', 100, 12, true); el?.classList.add('knocked-out');await setKnockoutPose(el,true); }
    else { burst(point, '#7ee6b6', 60, 4); ring(point, '#7ee6b6'); textAt(point, effect.type === 'revive' ? `부활 · HP ${hp}` : `+${effect.amount} HP`, 'heal'); tone(520, .3, 'sine', .07, 880); }
    hearts.forEach((heart, i) => heart.classList.toggle('filled', i < hp));
    el?.querySelector('.hearts')?.setAttribute('aria-label', `HP ${hp}/${hearts.length}`);
    if (effect.type === 'revive') { el?.classList.remove('knocked-out');await setKnockoutPose(el,false); }
    await sleep(190);
  }
  for (const effect of result.effects.filter(e => e.type === 'reward' && e.gold)) textAt(center(playerFor(effect.memberId)), `+${effect.gold} G`, 'gold');
  for(const e of result.effects.filter(e=>e.type==='reward')){
    if(e.bonus>0)skill(e.memberId,'gold_bonus',`노련한 수완 · 보너스 골드`);
    if(e.reason==='low_card_gold')skill(e.memberId,'low_card_gold','손버릇 · +2G / +5점');
  }
  if (result.monsterBefore && result.stageCleared) {
    impactAt(target(),'#ffe4a0',true,reduced.matches);
    burst(target(), '#e6c487', 200, 16, true); ring(target(), '#fff0ba'); shake(true);
    document.querySelector('#enemy-art')?.classList.add('defeated');
    const winner = result.effects.find(e => e.type === 'kill_bonus');
    const clearLabel = result.stage.category === 'boss' ? 'BOSS DEFEATED' : 'STAGE CLEAR';
    if (winner) {
      const name = result.effects.filter(e=>e.type==='kill_bonus').map(e=>playerFor(e.memberId)?.querySelector('h3')?.textContent.trim() || '최고 피해자').join(' · ');
      banner(`+${winner.score}`, `${name} · 최고 피해 · ${clearLabel}`, 'winner-banner');
    } else banner(clearLabel, result.stage.name, 'success');
    tone(260, .7, 'triangle', .12, 1040);
    for (const effect of result.effects.filter(e => e.type === 'kill_bonus')) {
      const panel = playerFor(effect.memberId), point = center(panel);
      panel?.classList.add('kill-winner');
      const label = document.createElement('span'); label.className = 'winner-label'; label.textContent = `최고 피해 · +${effect.score}점`; panel?.append(label);
      textAt(point, `+${effect.score}`, 'winner'); burst(point, '#63ff9c', 110, 8); ring(point, '#63ff9c');
    }
  }
  for (const card of result.cards) {
    document.querySelectorAll('[data-card-instance]').forEach(el=> {
      if(el.dataset.cardInstance===card.cardId) { el.classList.add('spent'); const small=el.querySelector('small'); if(small) small.textContent='OFF'; }
    });
  }
  skillPhase('refill');
  await Promise.allSettled(result.effects.filter(e=>e.type==='refill' && e.cards).map(e=>{
    if(e.random)skill(e.memberId,'random_hand','운명의 패 · 새 카드');
    return animateCycle(e);
  }));
  await sleep(result.winnerMemberId ? 1550 : 950);
}
export function finale(success) {
  banner(success ? '원정 완료' : '원정 실패', success ? '네 장의 카드가 운명을 바꿨다' : '던전은 다음 도전자를 기다린다', success ? 'success' : 'danger');
  burst({ x: innerWidth / 2, y: innerHeight * .4 }, success ? '#e9c985' : '#fb6788', 220, 14, true);
  tone(success ? 330 : 130, 1, 'triangle', .12, success ? 990 : 25);
}
