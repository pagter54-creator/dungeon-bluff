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
  return character.definition?.deckType === 'random' ? '1~7 중 매 사이클 랜덤 5장' : character.deck.join(' / ');
}
export function characterChoices(bundle, memberId) {
  return `<div class="eyebrow">CHOOSE YOUR CHARACTER</div><h2>당신의 패, 당신의 방식.</h2><p>같은 캐릭터도 함께 선택할 수 있습니다.</p><div class="character-choices">${(bundle.characters || []).map(c => `<button class="character-choice" data-action="set-character" data-member="${html(memberId)}" data-character="${html(c.id)}" data-network style="--character-color:${html(c.definition.color)}"><span class="character-icon">${html(c.definition.icon)}</span><span><b>${html(c.display_name)}</b><small>${html(c.definition.role)}</small><span class="character-deck">${html(deckLabel(c))}</span><strong>${c.definition.skill.type.toUpperCase()} · ${html(c.definition.skill.name)}</strong><p>${html(c.definition.skill.description)}</p></span></button>`).join('')}</div>`;
}
export function cardPool(player, { own=false, blocked=false, selected=null } = {}) {
  return `<div class="cycle-pool" data-cycle-pool="${html(player.memberId)}" aria-label="현재 사이클 카드 5장">${cycleCards(player).map(c=>cardComponent(c,{loadout:player.loadout,own,blocked,selected})).join('')}</div>`;
}
export function skillBadge(character) {
  const skill = character.definition?.skill;
  if (!skill) return '';
  return `<span class="skill-tooltip"><button type="button" class="skill-badge" data-action="skill-info" data-character="${html(character.id)}" aria-label="${html(skill.name)} 스킬 설명">${html(character.definition.icon)} ${skill.type.toUpperCase()} · ${html(skill.name)}</button><span class="skill-description" role="tooltip"><b>${html(skill.name)} · ${skill.type.toUpperCase()}</b>${html(skill.description)}</span></span>`;
}
export function activeButton(player, useSkill, blocked) {
  if (player.skillType !== 'active') return '';
  const ready = player.activeSkillState?.available;
  return `<button type="button" class="active-skill ${useSkill && ready ? 'armed' : ''}" data-action="toggle-skill" aria-pressed="${Boolean(useSkill && ready)}" ${blocked || !ready ? 'disabled' : ''}>✺ 증폭 <b>${ready ? useSkill ? 'ON · +2' : 'READY' : 'USED'}</b></button>`;
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
    return `<article class="player-panel seat-${m.seat_index} ${own ? 'is-me' : ''} ${p.knockedOut ? 'knocked-out' : ''}" data-player="${m.id}" style="--character-color:${html(c.definition?.color || '#dabc85')}"><div class="player-heading"><span class="small-avatar character-avatar">${html(c.definition?.icon || '⚔')}</span><div><h3>${html(m.display_name)} ${own ? '<em>나</em>' : ''}</h3><small>${html(c.display_name)}${m.ai_type ? ' · AI' : ''}${p.knockedOut ? ' · 기절' : ''}</small></div><div class="hearts" aria-label="HP ${p.hp}/${p.maxHp}">${Array.from({length:p.maxHp},(_,i)=>`<span class="heart ${i<p.hp?'filled':''}">♥</span>`).join('')}</div></div><div class="player-content"><div class="player-stats"><span>SCORE <b>${p.score}</b></span><span>RUN GOLD <b>${p.gold}</b></span><small>CYCLE ${p.cycleIndex || 1} · ${cycleCards(p).filter(card=>!card.used).length}장 남음</small></div>${cardComponent(null,{loadout:p.loadout,blocked:ready,revealId:m.id})}</div>${cardPool(p,{own,blocked:ready || p.knockedOut,selected})}<div class="player-bottom">${skillBadge(c)}<span class="lock-state ${ready?'ready':''}">${result ? '공개 중' : seen ? `선택: ${seen.value}` : p.knockedOut ? '자동 제출' : ready ? '✓ 선택 완료' : '선택 중'}</span></div>${marked ? `<div class="seer-vision">✧ 계시 대상 · ${seen ? `선택: <b>${seen.value}</b>` : '제출을 기다리는 중'}</div>` : ''}${own ? activeButton(p,useSkill,ready || p.knockedOut) : ''}${own ? panelControls(p,{result,locked:ready,selected,useSkill}) : ''}${p.skillId==='toughness' ? `<small class="runtime-label">강인함 ${p.characterRuntimeState.toughnessAvailable?'READY':'소진 · HP 2 이상 회복 시 충전'}</small>` : ''}</article>`;
  }).join('');
}
export function panelControls(player,{result,locked,selected,useSkill}) {
 const chosen=cycleCards(player).find(c=>c.id===selected&&!c.used),blocked=Boolean(result||locked||player?.knockedOut);
 return `<div class="panel-controls"><span>${result?'공개 중':player?.knockedOut?'자동 제출 · 턴 종료 후 HP 3 부활':locked?'선택 완료 · 동료를 기다리는 중':chosen?chosen.value+' 선택'+(useSkill?' · 증폭 +2':''):'카드를 선택하세요'}</span>${!blocked?`<button class="button primary" data-action="submit" data-network data-unavailable="${!chosen}" ${!chosen?'disabled':''}>제출 →</button>`:'<span class="waiting-pill">선택 완료</span>'}</div>`;
}
export function mobileSelection(player,options) {
 if(!player)return '';
 return `<aside class="mobile-selection" aria-label="내 카드 선택">${cardPool(player,{own:true,blocked:Boolean(options.result||options.locked||player.knockedOut),selected:options.selected})}${panelControls(player,options)}</aside>`;
}
// Compatibility for existing component tests; no separate hand section is rendered.
export const ownHand=mobileSelection;
