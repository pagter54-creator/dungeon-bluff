import { skinPortrait,skinIllustration } from './skins.js';
import { isShuffleTurn,selectionInfo } from './battle-rules.js';
import { cardComponent } from './card-component.js';
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
  if (character.definition?.deckType === 'continuous') return '매 턴 새 2장 · 고액 카드 제출 후 관망';
  return character.definition?.deckType === 'random' ? '1~7 중 매 사이클 랜덤 5장' : character.deck.join(' / ');
}
export function characterChoices(bundle, memberId) {
  return `<div class="eyebrow">CHOOSE YOUR CHARACTER</div><h2>당신의 패, 당신의 방식.</h2><p>같은 캐릭터도 함께 선택할 수 있습니다.</p><div class="character-choices">${[...(bundle.characters || [])].sort((a,b)=>(['gunner','fighter'].includes(a.id)?1:0)-(['gunner','fighter'].includes(b.id)?1:0)).map(c => `<button class="character-choice" data-action="set-character" data-member="${html(memberId)}" data-character="${html(c.id)}" data-network style="--character-color:${html(c.definition.color)}"><span class="character-icon">${skinPortrait(c.id)}</span><span><b>${html(c.display_name)}</b><small>${html(c.definition.role)}</small><span class="character-deck">${html(deckLabel(c))}</span><strong>${c.definition.skill.type === 'hybrid' ? 'PASSIVE & ACTIVE' : c.definition.skill.type.toUpperCase()} · ${html(c.definition.skill.name)}</strong><p>${html(c.definition.skill.description)}</p></span></button>`).join('')}</div>`;
}
export function cardPool(player, { own=false, blocked=false, selected=null } = {}) {
  return `<div class="cycle-pool ${player.characterId==='gunner'?'gunner-hand':''} ${player.character?.definition?.deckType==='continuous'?'continuous-hand':''}" data-cycle-pool="${html(player.memberId)}" aria-label="현재 손패 ${cycleCards(player).length}장">${cycleCards(player).map(c=>cardComponent(c,{loadout:player.loadout,own,blocked,selected})).join('')}</div>`;
}
export function skillBadge(character) {
  const skill = character.definition?.skill;
  if (!skill) return '';
  const type = skill.type === 'hybrid' ? 'PASSIVE & ACTIVE' : skill.type.toUpperCase();
  return `<span class="skill-tooltip"><button type="button" class="skill-badge" data-action="skill-info" data-character="${html(character.id)}" aria-label="${html(skill.name)} 스킬 설명">${html(character.definition.icon)} ${type} · ${html(skill.name)}</button><span class="skill-description" role="tooltip"><b>${html(skill.name)} · ${type}</b>${html(skill.description)}</span></span>`;
}
export function revelationGauge(player) {
  if (player.skillId === 'random_hand') return `<small class="gambler-mode">${player.characterRuntimeState?.observing?'관망 · 1~5':'운명의 패 · 1~7'}</small>`;
  if (player.skillId === 'combo') return `<div class="revelation-gauge" role="meter" aria-label="연격 중첩" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${player.characterRuntimeState?.comboStacks||0}">${[0,1,2].map(i=>`<i class="revelation-pip ${i<(player.characterRuntimeState?.comboStacks||0)?'filled':''}" aria-hidden="true"></i>`).join('')}</div><small class="combo-previous">직전 카드: ${html(player.characterRuntimeState?.comboPrevious ?? '-')}</small>`;
  if (player.skillId !== 'revelation') return '';
  const stacks = Math.max(0, Math.min(3, player.characterRuntimeState?.revelationStacks || 0));
  return `<div class="revelation-gauge" role="meter" aria-label="계시 중첩" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${stacks}">${[0,1,2].map(i=>`<i class="revelation-pip ${i<stacks?'filled':''}" aria-hidden="true"></i>`).join('')}</div>`;
}
export function activeButton(player, useSkill, blocked) {
  if (player.skillId === 'revelation') {
    const active = Boolean(player.characterRuntimeState?.revealExpiresTurn);
    const ready = (player.characterRuntimeState?.revelationStacks || 0) >= 2 && !active;
    return `<button type="button" class="active-skill ${active?'armed':''}" data-action="activate-revelation" data-network data-unavailable="${blocked||!ready}" ${blocked||!ready?'disabled':''}>✧ 계시 <b>${active?'이번 턴 공개 중':ready?'2칸 소모 · 발동':'2칸 필요'}</b></button>`;
  }
  if (player.skillType !== 'active' && player.skillId !== 'full_burst') return '';
  const ready = player.activeSkillState?.available;
  const knight = player.skillId === 'toughness';
  if(player.skillId==='full_burst')return `<button type="button" class="active-skill ${useSkill&&ready?'armed':''}" data-action="toggle-skill" aria-pressed="${Boolean(useSkill&&ready)}" ${blocked||!ready?'disabled':''}>⌖ 전탄발사 <b>${ready?(useSkill?'ON · 손패 전체 사용':'READY'):`${player.characterRuntimeState.burstReadyCycle}사이클에 충전`}</b></button>`;
  return `<button type="button" class="active-skill ${useSkill && ready ? 'armed' : ''}" data-action="toggle-skill" aria-pressed="${Boolean(useSkill && ready)}" ${blocked || !ready ? 'disabled' : ''}>${knight?'◇ 강인함':'✺ 증폭'} <b>${ready ? useSkill ? knight?'ON · 중복 보호':'ON · +2' : 'READY' : 'USED'}</b></button>`;
}
export function partyPanels(bundle, players, { me, result, selected, useSkill }) {
  const s = bundle.session.state;
  const privateState = result ? {} : bundle.privateState || {};
  return [...bundle.members].sort((a,b) => a.seat_index-b.seat_index).map(m => {
    const p = players[m.id]; if (!p) return '';
    const own = me?.id === m.id;
    const ready = Boolean(result || s.lockedMembers.includes(m.id));
    const c = p.character || characterFor(bundle, p.characterId);
    const seen = privateState.revealedCards?.find(card => card.memberId === m.id);
    const marked = privateState.revealTargets?.includes(m.id);
    const publicMark=privateState.publicRevealTargets?.includes(m.id);
    const greed=s.monster?.greedTargets?.includes(m.id);
    return `<article class="player-panel illustrated-panel seat-${m.seat_index} ${own ? 'is-me' : ''} ${p.knockedOut ? 'knocked-out' : ''}" data-player="${m.id}" style="--character-color:${html(c.definition?.color || '#dabc85')}">
      <div class="player-art-stage">${skinIllustration(p.characterId||c.id,p.loadout,p.knockedOut)}</div>
      <div class="player-info">
        <div class="player-heading"><div class="player-identity player-identity-bar" title="${html(m.display_name)}"><h3>${html(m.display_name)} ${own ? '<em>나</em>' : ''}</h3><small>${html(c.display_name)}${m.ai_type ? ' · AI' : ''}${p.knockedOut ? ' · 기절' : ''}</small></div><div class="hearts" aria-label="HP ${p.hp}/${p.maxHp}">${Array.from({length:p.maxHp},(_,i)=>`<span class="heart ${i<p.hp?'filled':''}">♥</span>`).join('')}</div></div>
        <div class="player-content"><div class="player-stats"><span>SCORE <b>${p.score}</b></span><span>RUN GOLD <b>${p.gold}</b></span><small>${c.definition?.deckType==='continuous'?'운명의 패':`CYCLE ${p.cycleIndex || 1}`} · ${cycleCards(p).filter(card=>!card.used).length}장 남음</small></div>${cardComponent(null,{loadout:p.loadout,blocked:ready,revealId:m.id})}</div>
        ${cardPool(p,{own,blocked:ready || p.knockedOut,selected})}
        <div class="player-bottom"><div class="player-skill">${skillBadge(c)}${revelationGauge(p)}</div><span class="lock-state ${ready?'ready':''}">${result ? '공개 중' : seen ? `선택: ${seen.value}` : p.knockedOut ? '자동 제출' : ready ? '✓ 선택 완료' : '선택 중'}</span></div>
        ${greed?'<div class="boss-player-mark">탐욕 표식 · 다음 기본 공격 대상</div>':''}${marked ? `<div class="seer-vision">✧ ${publicMark?'표적 지정 · 전체 공개':'계시 대상'} · ${seen ? `선택: <b>${seen.value}</b>` : '제출을 기다리는 중'}</div>` : ''}${own ? activeButton(p,useSkill,ready || p.knockedOut) : ''}${own ? panelControls(p,{result,locked:ready,selected,useSkill,twoCards:isShuffleTurn(bundle.session)}) : ''}
      </div>
    </article>`;
  }).join('');
}
export function panelControls(player,{result,locked,selected,useSkill,twoCards=false}) {
 const info=selectionInfo({...player,cycleCards:cycleCards(player)},selected,twoCards),blocked=Boolean(result||locked||player?.knockedOut);
 const label=twoCards?`뒤죽박죽 · ${info.cards.length}/${info.count}장 선택 · 무작위 1장 소비`:(info.cards[0]?info.cards[0].value+' 선택'+(useSkill?(player.skillId==='full_burst'?' · 전탄발사':player.skillId==='toughness'?' · 강인함':' · 증폭 +2'):''):'카드를 선택하세요');
 return `<div class="panel-controls"><span>${result?'공개 중':player?.knockedOut?'자동 제출 · 턴 종료 후 HP 3 부활':locked?'선택 완료 · 동료를 기다리는 중':label}</span>${!blocked?`<button class="button primary" data-action="submit" data-network data-unavailable="${!info.ready}" ${!info.ready?'disabled':''}>${twoCards?'무작위 제출':'제출'} →</button>`:'<span class="waiting-pill">선택 완료</span>'}</div>`;
}
export function mobileSelection(player,options) {
 if(!player)return '';
 return `<aside class="mobile-selection" aria-label="내 카드 선택">${cardPool(player,{own:true,blocked:Boolean(options.result||options.locked||player.knockedOut),selected:options.selected})}${panelControls(player,options)}</aside>`;
}
// Compatibility for existing component tests; no separate hand section is rendered.
export const ownHand=mobileSelection;
