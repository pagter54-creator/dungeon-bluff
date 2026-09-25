import { skinPortrait,skinIllustration } from './skins.js';
import { isShuffleTurn,selectionInfo } from './battle-rules.js';
import { cardComponent } from './card-component.js';
import {pileButton,gamblerCharges} from './gambler-ui.js';
import {cardAllowed} from './battle-rules.js';
export const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
export function characterFor(bundle, id) {
  return bundle?.session?.state.characterDefinitions?.[id] || bundle?.characters?.find(c => c.id === id) || { id, display_name: '모험가', deck: [], definition: { icon:'⚔', color:'#dabc85', role:'기존 원정 캐릭터' } };
}
export function cycleCards(player) {
  if (!player) return [];
  if (player.cycleCards) return player.cycleCards;
  // Read-only compatibility for games started before the character migration.
  const remaining = [...player.remainingCards];
  const deck = player.character?.deck || [...player.remainingCards, ...player.discardedCards];
  return deck.map((value, slot) => { const index = remaining.indexOf(value); if (index >= 0) remaining.splice(index, 1); return { id: `${player.memberId}-cycle-${player.cycleIndex || 1}-card-${slot}`, slot, value, used:index < 0 }; });
}
export function deckLabel(character) {
  if (character.definition?.deckType === 'continuous') return '시작 덱 11장(1~5×2 + 6) · 매 턴 2장 · 충전된 6/7은 버린 덱으로';
  return character.definition?.deckType === 'random' ? '1~7 중 매 사이클 랜덤 5장' : character.deck.join(' / ');
}
export function characterChoices(bundle, memberId) {
  return `<div class="eyebrow">CHOOSE YOUR CHARACTER</div><h2>당신의 패, 당신의 방식.</h2><p>같은 캐릭터도 함께 선택할 수 있습니다.</p><div class="character-choices">${[...(bundle.characters || [])].sort((a,b)=>(['gunner','fighter'].includes(a.id)?1:0)-(['gunner','fighter'].includes(b.id)?1:0)).map(c => `<button class="character-choice" data-action="set-character" data-member="${html(memberId)}" data-character="${html(c.id)}" data-network style="--character-color:${html(c.definition.color)}"><span class="character-icon">${skinPortrait(c.id)}</span><span><b>${html(c.display_name)}</b><small>${html(c.definition.role)}</small><span class="character-deck">${html(deckLabel(c))}</span><strong>${c.definition.skill.type === 'hybrid' ? 'PASSIVE & ACTIVE' : c.definition.skill.type.toUpperCase()} · ${html(c.definition.skill.name)}</strong><p>${html(c.definition.skill.description)}</p></span></button>`).join('')}</div>`;
}
function thrallStatus(player,bundle,players){
  const target=bundle.members.find(member=>member.id===player.characterRuntimeState?.thrallId);
  if(!target)return '<small class="thrall-status">현재 권속 : -</small>';
  const character=players[target.id]?.character?.display_name||characterFor(bundle,players[target.id]?.characterId).display_name;
  return `<small class="thrall-status">현재 권속 : ${html(target.display_name)} (${html(character)})</small>`;
}
export function cardPool(player, { own=false, blocked=false, selected=null, useSkill=0 } = {}) {
  const gambler=player.skillId==='random_hand';
  return `<div class="cycle-pool ${player.characterId==='gunner'?'gunner-hand':player.characterId==='twins'?'twins-hand':''} ${gambler?'continuous-hand gambler-hand':''}" data-cycle-pool="${html(player.memberId)}" aria-label="현재 손패 ${cycleCards(player).length}장">${gambler?pileButton(player,'draw',own):''}${cycleCards(player).map(c=>cardComponent(own&&player.skillId==='amplify'&&useSkill&&[selected].flat().includes(c.id)?{...c,value:c.value+Number(useSkill)}:c,{loadout:player.loadout,own,blocked,restricted:!cardAllowed(player,c),selected})).join('')}${gambler?pileButton(player,'discard',own):''}</div>`;
}
export function skillBadge(character) {
  const skill = character.definition?.skill;
  if (!skill) return '';
  const type = skill.type === 'hybrid' ? 'PASSIVE & ACTIVE' : skill.type.toUpperCase();
  return `<span class="skill-tooltip"><button type="button" class="skill-badge" data-action="skill-info" data-character="${html(character.id)}" aria-label="${html(skill.name)} 스킬 설명">${html(character.definition.icon)} ${type} · ${html(skill.name)}</button><span class="skill-description" role="tooltip"><b>${html(skill.name)} · ${type}</b>${html(skill.description)}</span></span>`;
}
export function revelationGauge(player) {
  if(player.skillId==='acrobatics')return `<div class="twins-parity"><b>${player.characterRuntimeState?.parity===1?'홀 · 소년':'짝 · 소녀'}</b><span>${player.characterRuntimeState?.parity===1?'1 · 3 선택':'2 · 4 선택'} · 다음 턴 교대</span></div>`;
  if (player.skillId === 'random_hand') return gamblerCharges(player);
  if(player.skillId==='amplify')return resourceGauge('마나',player.characterRuntimeState?.mana||0,4,'mana-gauge');
  if(player.skillId==='toughness')return resourceGauge('강인함 충전',player.characterRuntimeState?.toughnessCharges||0,2,'toughness-gauge');
  if(player.skillId==='soul_slash'){
    const stacks=player.characterRuntimeState?.predation||0;
    return `<small class="predation-count">포식 ${stacks} · 귀참 Lv.${Math.floor(stacks/8)} +${1+Math.floor(stacks/8)}</small>${resourceGauge('다음 귀참 레벨 진행도',stacks%8,8,'predation-gauge')}`;
  }
  if (player.skillId === 'combo') return `<div class="revelation-gauge" role="meter" aria-label="연격 중첩" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${player.characterRuntimeState?.comboStacks||0}">${[0,1,2].map(i=>`<i class="revelation-pip ${i<(player.characterRuntimeState?.comboStacks||0)?'filled':''}" aria-hidden="true"></i>`).join('')}</div><small class="combo-previous">직전 카드: ${html(player.characterRuntimeState?.comboPrevious ?? '-')}</small>`;
  if (player.skillId !== 'revelation') return '';
  const stacks = Math.max(0, Math.min(1, player.characterRuntimeState?.revelationStacks || 0));
  return resourceGauge('계시',stacks,1,'seer-gauge');
}
export function resourceGauge(label,value,max,extra='') {
  return `<div class="revelation-gauge ${extra}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}">${Array.from({length:max},(_,i)=>`<i class="revelation-pip ${i<value?'filled':''}" aria-hidden="true"></i>`).join('')}</div>`;
}
export function nextAmplifyLevel(mana,current){return current===0?mana>=2?1:0:current===1&&mana>=4?2:0;}
export function activeButton(player, useSkill, blocked, members=[], players={}, hasSelected=false) {
  if(player.skillId==='acrobatics')return `<button type="button" class="active-skill" data-action="activate-acrobatics" data-network ${blocked||!player.activeSkillState?.available?'disabled':''}>♊ 곡예 <b>${player.activeSkillState?.available?'손패 초기화 · 홀짝 반전':'사이클 완주 시 재충전'}</b></button>`;
  if(player.skillId==='blood_command'){
    const thrallId=player.characterRuntimeState?.thrallId,target=members.find(m=>m.id===thrallId);
    const ready=!!target&&!players[thrallId]?.knockedOut&&!blocked;
    return `<button type="button" class="active-skill ${useSkill&&ready?'armed':''}" data-action="toggle-skill" aria-pressed="${Boolean(useSkill&&ready)}" ${!ready?'disabled':''}>♜ 피의 명령 <b>${ready?(useSkill?'교환 예약':'READY'):'권속 필요'}</b></button>`;
  }
  if(player.skillId==='soul_slash'){
    const ready=!!player.activeSkillState?.available&&!blocked;
    const level=Math.floor((player.characterRuntimeState?.predation||0)/8);
    return `<button type="button" class="active-skill ${useSkill&&ready?'armed':''}" data-action="toggle-skill" aria-pressed="${Boolean(useSkill&&ready)}" ${!ready?'disabled':''}><span class="soul-slash-level">⚔ 귀참 Lv.${level} +${level+1}</span> <b>${ready?(useSkill?'ON':'READY'):'이번 사이클 사용'}</b></button>${revelationGauge(player)}`;
  }
  if(player.skillId==='amplify'){
    const mana=player.characterRuntimeState?.mana||0,level=Number(useSkill)||0;
    return `<button type="button" class="active-skill ${level?'armed':''}" data-action="toggle-skill" aria-pressed="${Boolean(level)}" ${blocked||mana<2?'disabled':''}>✺ 증폭 <b>마나 ${mana-level*2}/4 · ${level?'숫자 +'+level:'2마나 필요'}${level?' · 다시 눌러 변경/취소':''}</b></button>`;
  }
  if (player.skillId === 'revelation') {
    const active = Boolean(player.characterRuntimeState?.revealExpiresTurn);
    const ready = (player.characterRuntimeState?.revelationStacks || 0) >= 1 && !active;
    return `<button type="button" class="active-skill ${active?'armed':''}" data-action="activate-revelation" data-network data-unavailable="${blocked||!ready}" ${blocked||!ready?'disabled':''}>✧ 계시 <b>${active?'이번 턴 공개 중':ready?'1칸 소모 · 발동':'1칸 필요'}</b></button>`;
  }
  if (player.skillType !== 'active' && player.skillId !== 'full_burst') return '';
  const ready = player.activeSkillState?.available;
  const knight = player.skillId === 'toughness';
  if(player.skillId==='full_burst')return `<button type="button" class="active-skill ${useSkill&&ready?'armed':''}" data-action="toggle-skill" aria-pressed="${Boolean(useSkill&&ready)}" ${blocked||!ready?'disabled':''}>⌖ 전탄발사 <b>${ready?(useSkill?'ON · 손패 전체 사용':'READY'):'다음 사이클에 충전'}</b></button>`;
  return `<button type="button" class="active-skill ${useSkill && ready ? 'armed' : ''}" data-action="toggle-skill" aria-pressed="${Boolean(useSkill && ready)}" ${blocked || !ready ? 'disabled' : ''}>${knight?'◇ 강인함':'✺ 증폭'} <b>${ready ? useSkill ? knight?'ON · 충전 1 소모':'ON · +2' : 'READY' : 'USED'}</b></button>`;
}
export function partyPanels(bundle, players, { me, result, selected, useSkill }) {
  const s = bundle.session.state;
  const privateState = result ? {} : bundle.privateState || {};
  return [...bundle.members].sort((a,b) => a.seat_index-b.seat_index).map(m => {
    const p = players[m.id]; if (!p) return '';
    const own = me?.id === m.id;
    const ready = Boolean(result || (s.lockedMembers.includes(m.id)&&!(own&&s.selectionHolds?.[m.id])));
    const c = p.character || characterFor(bundle, p.characterId);
    const seen = privateState.revealedCards?.find(card => card.memberId === m.id);
    const marked = privateState.revealTargets?.includes(m.id);
    const publicMark=privateState.publicRevealTargets?.includes(m.id);
    const greed=s.monster?.greedTargets?.includes(m.id);
    const thrall=Object.values(players).some(x=>x.skillId==='blood_command'&&x.characterRuntimeState?.thrallId===m.id);
    return `<article class="player-panel illustrated-panel seat-${m.seat_index} ${own ? 'is-me' : ''} ${p.knockedOut ? 'knocked-out' : ''}" data-player="${m.id}" style="--character-color:${html(c.definition?.color || '#dabc85')}">
      <div class="player-art-stage">${skinIllustration(p.characterId||c.id,p.loadout,p.knockedOut,p.characterRuntimeState)}</div>
      <div class="player-info">
        <div class="player-heading"><div class="player-identity player-identity-bar ${thrall?'is-thrall':''}" title="${html(m.display_name)}"><h3>${html(m.display_name)} ${own ? '<em>나</em>' : ''}</h3><small>${html(c.display_name)}${m.ai_type ? ' · AI' : ''}${p.knockedOut ? ' · 기절' : ''}</small></div><div class="hearts" aria-label="HP ${p.hp}/${p.maxHp}">${Array.from({length:p.maxHp},(_,i)=>`<span class="heart ${i<p.hp?'filled':''}">♥</span>`).join('')}</div></div>
        <div class="player-content"><div class="player-stats"><span>SCORE <b>${p.score}</b></span><span>RUN GOLD <b>${p.gold}</b></span><small>${c.definition?.deckType==='continuous'?'운명의 패':`CYCLE ${p.cycleIndex || 1}`} · ${cycleCards(p).filter(card=>!card.used).length}장 남음</small></div>${cardComponent(null,{loadout:p.loadout,blocked:ready,revealId:m.id})}</div>
        ${cardPool(p,{own,blocked:ready || p.knockedOut,selected,useSkill})}
        <div class="player-bottom"><div class="player-skill">${skillBadge(c)}${p.skillId==='soul_slash'&&own?'':revelationGauge(p)}${p.skillId==='blood_command'?thrallStatus(p,bundle,players):''}</div><span class="lock-state ${ready?'ready':''}">${result ? '공개 중' : seen ? `선택: ${seen.value}` : p.knockedOut ? '자동 제출' : ready ? '✓ 선택 완료' : '선택 중'}</span></div>
        ${greed?'<div class="boss-player-mark">탐욕 표식 · 다음 기본 공격 대상</div>':''}${marked ? `<div class="seer-vision">✧ ${publicMark?'표적 지정 · 전체 공개':own&&p.skillId==='blood_command'?'권속 관찰':'계시 대상'} · ${seen ? `선택: <b>${seen.value}</b>` : '제출을 기다리는 중'}</div>` : ''}${own ? activeButton(p,useSkill,ready || p.knockedOut,bundle.members,players,selected!==null&&selected!==undefined&&(!Array.isArray(selected)||selected.length>0)) : ''}${own ? panelControls(p,{result,locked:ready,selected,useSkill,twoCards:isShuffleTurn(bundle.session)}) : ''}
      </div>
    </article>`;
  }).join('');
}
export function panelControls(player,{result,locked,selected,useSkill,twoCards=false}) {
 const info=selectionInfo({...player,cycleCards:cycleCards(player)},selected,twoCards),blocked=Boolean(result||locked||player?.knockedOut);
 const label=twoCards?`뒤죽박죽 · ${info.cards.length}/${info.count}장 선택 · 무작위 1장 소비`:(info.cards[0]?(info.cards[0].value+(player.skillId==='amplify'?Number(useSkill)||0:0))+' 선택'+(useSkill?(player.skillId==='full_burst'?' · 전탄발사':player.skillId==='toughness'?' · 강인함':player.skillId==='blood_command'?' · 피의 명령':player.skillId==='soul_slash'?' · 귀참':' · 증폭 +'+Number(useSkill)):''):'카드를 선택하세요');
 return `<div class="panel-controls"><span>${result?'공개 중':player?.knockedOut?'자동 제출 · 턴 종료 후 HP 3 부활':locked?'선택 완료 · 동료를 기다리는 중':label}</span>${!blocked?`<button class="button primary" data-action="submit" data-network data-unavailable="${!info.ready}" ${!info.ready?'disabled':''}>${twoCards?'무작위 제출':'제출'} →</button>`:'<span class="waiting-pill">선택 완료</span>'}</div>`;
}
export function mobileSelection(player,options) {
 if(!player)return '';
 return `<aside class="mobile-selection" aria-label="내 카드 선택">${cardPool(player,{own:true,blocked:Boolean(options.result||options.locked||player.knockedOut),selected:options.selected,useSkill:options.useSkill})}${panelControls(player,options)}</aside>`;
}
// Compatibility for existing component tests; no separate hand section is rendered.
export const ownHand=mobileSelection;
