import { MONSTERS } from './content.js';

export const activeBossEffect=session=>session?.state.currentStage.category==='boss' && session.state.monster?.pending?.turn===session.turn_index?session.state.monster.pending:null;
export const needsTwoCards=session=>activeBossEffect(session)?.kind==='shuffle';
export function bossPublicTargets(session){return activeBossEffect(session)?.kind==='mark'?session.state.monster.pending.targets:[];}

export function updateMonsterIntent(session){
 const monster=session.state.monster;if(!monster)return;
 const def=MONSTERS[monster.id];
 if(session.state.currentStage.category!=='boss'){monster.intent=def.tell;return;}
 monster.nextAction ||= 'normal';
 monster.intent=monster.nextAction==='normal'?`일반 공격 · ${def.tell}`:`특수 패턴 · ${def.specialName} — ${def.bossTell}`;
 const pending=monster.pending;
 monster.statusText='';
 if(pending?.turn===session.turn_index){
  const labels={charge:'돌진 준비 · 이번 턴 피해 합계 8 이상으로 장갑을 저지하세요.',echo:`잔향 · ${pending.numbers?.join(', ')||'해당 없음'} 카드 효과값 -1`,mark:'표적 지정 · 표식 대상은 제출 즉시 숫자가 모두에게 공개됩니다.',seal:`봉인 명령 · 숫자 ${pending.number} 효과 0(중복 판정·소비 유지)`,curse:`뒤틀린 예언 · ${pending.parity===1?'홀수':'짝수'} 유효 카드 효과값 -1`,devour:'포식 · 가장 낮은 유효 카드 무효화 · 보스 최대 HP 3 회복',shuffle:'뒤죽박죽 · 카드 2장 중 무작위 1장 제출·소비(남은 카드가 1장이면 1장)',bait:'황금 미끼 · 가장 높은 유효 카드 골드 +3 · 다음 기본 공격 우선 대상'};
  monster.statusText=labels[pending.kind]||'';
 }
 if(monster.armorTurn===session.turn_index)monster.statusText='장갑 1회 · 이번 턴 첫 유효 공격을 차단합니다.';
 if(monster.greedTargets?.length)monster.statusText+=(monster.statusText?' / ':'')+'탐욕 표식 · 다음 일반 공격 우선 대상';
}

// Skill bonuses are already applied; raw card values still drive collision/targeting.
export function applyBossCardEffects(session,cards,effects){
 const monster=session.state.monster,pending=activeBossEffect(session);
 if(!monster||session.state.currentStage.category!=='boss')return;
 if(pending){
  for(const card of cards){
   const reduce=pending.kind==='echo'&&pending.numbers.includes(card.value)||pending.kind==='curse'&&card.valid&&card.value%2===pending.parity;
   if(reduce){card.effectValue=Math.max(0,card.effectValue-1);card.damageValue=Math.max(0,card.damageValue-1);card.bossModifier='효과 -1';effects.push({type:'boss_card',memberId:card.memberId,label:'효과 -1'});}
   if(pending.kind==='seal'&&card.value===pending.number){card.effectValue=0;card.damageValue=0;card.bossModifier='봉인';effects.push({type:'boss_card',memberId:card.memberId,label:'봉인 · 효과 0'});}
  }
  if(pending.kind==='devour'){
   const lowest=cards.filter(c=>c.valid).sort((a,b)=>a.value-b.value)[0];
   if(lowest){
    lowest.effectValue=0;lowest.damageValue=0;lowest.bossModifier='포식';
    const amount=Math.min(3,lowest.value,monster.maxHp-monster.hp);monster.hp+=amount;
    effects.push({type:'boss_card',memberId:lowest.memberId,label:'포식 · 효과 0'},{type:'monster_heal',amount});
   }
  }
 }
 if(monster.armorTurn===session.turn_index){
  const first=cards.filter(c=>c.valid).sort((a,b)=>a.value-b.value)[0];
  if(first){first.damageValue=0;first.effectValue=0;first.bossModifier='장갑';effects.push({type:'boss_card',memberId:first.memberId,label:'장갑 · 공격 차단'});}
  delete monster.armorTurn;
 }
}

export function finishBossCardEffects(session,cards,totalDamage,effects,grantGold){
 const monster=session.state.monster,pending=activeBossEffect(session);
 if(!pending)return;
 if(pending.kind==='charge'&&totalDamage<8&&monster.hp>0){
  monster.armorTurn=session.turn_index+1;effects.push({type:'boss_status',label:'장갑 획득',detail:'다음 턴 첫 유효 공격을 차단합니다.'});
 }
 if(pending.kind==='bait'){
  const highest=cards.filter(c=>c.valid).sort((a,b)=>b.value-a.value)[0];
  if(highest){grantGold(highest.memberId,3,'golden_bait');monster.greedTargets=[highest.memberId];effects.push({type:'boss_mark',memberId:highest.memberId,label:'탐욕 표식'});}
 }
 delete monster.pending;
}

export function castBossSpecial(session,cards,effects,rng){
 const monster=session.state.monster,def=MONSTERS[monster.id];
 const pending={kind:def.special,turn:session.turn_index+1};
 if(def.special==='echo')pending.numbers=[...(monster.previousDuplicates||[])];
 if(def.special==='mark'){
  const max=Math.max(...Object.values(session.state.players).map(p=>p.score));
  pending.targets=Object.values(session.state.players).filter(p=>p.score===max).map(p=>p.memberId);
  pending.targets.forEach(memberId=>effects.push({type:'boss_mark',memberId,label:'표적 지정'}));
 }
 if(def.special==='seal'){
  const numbers=[...new Set(Object.values(session.state.players).flatMap(p=>p.character?.deck?.length?p.character.deck:[1,2,3,4,5,6,7]))].sort((a,b)=>a-b);
  pending.number=numbers[Math.floor(rng()*numbers.length)];
 }
 if(def.special==='curse')pending.parity=rng()<.5?1:0;
 monster.pending=pending;
 const detail=def.special==='seal'?`다음 턴 숫자 ${pending.number} 봉인`:def.special==='curse'?`다음 턴 ${pending.parity===1?'홀수':'짝수'} 저주`:def.special==='echo'?`다음 턴 ${pending.numbers.join(', ')||'해당 없음'} 효과 -1`:def.bossTell;
 effects.push({type:'boss_special',label:def.specialName,detail});
}
