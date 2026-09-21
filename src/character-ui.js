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
  return `<div class="cycle-pool" data-cycle-pool="${html(player.memberId)}" aria-label="현재 사이클 카드 5장">${cycleCards(player).map(c => `<button type="button" class="pool-card ${c.used ? 'spent' : ''} ${own && c.id === selected ? 'chosen' : ''}" data-card-instance="${html(c.id)}" ${own ? `data-action="select-card" data-card-id="${html(c.id)}"` : ''} ${!own || blocked || c.used ? 'disabled' : ''} aria-label="${c.value}, ${c.used ? '사용 완료' : '사용 가능'}${own ? ', 선택' : ''}"><b>${c.value}</b><small>${c.used ? 'OFF' : '◆'}</small></button>`).join('')}</div>`;
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
    return `<article class="player-panel seat-${m.seat_index} ${own ? 'is-me' : ''} ${p.knockedOut ? 'knocked-out' : ''}" data-player="${m.id}" style="--character-color:${html(c.definition?.color || '#dabc85')}"><div class="player-heading"><span class="small-avatar character-avatar">${html(c.definition?.icon || '⚔')}</span><div><h3>${html(m.display_name)} ${own ? '<em>나</em>' : ''}</h3><small>${html(c.display_name)}${m.ai_type ? ' · AI' : ''}${p.knockedOut ? ' · 기절' : ''}</small></div><div class="hearts" aria-label="HP ${p.hp}/${p.maxHp}">${Array.from({length:p.maxHp},(_,i)=>`<span class="heart ${i<p.hp?'filled':''}">♥</span>`).join('')}</div></div><div class="player-content"><div class="player-stats"><span>SCORE <b>${p.score}</b></span><span>GOLD <b>${p.gold}</b></span><small>CYCLE ${p.cycleIndex || 1} · ${cycleCards(p).filter(card=>!card.used).length}장 남음</small></div><div class="reveal-card ${ready?'locked':''}" data-reveal="${m.id}"><span class="card-back">◇</span><b class="reveal-value">?</b><i></i></div></div>${cardPool(p,{own,blocked:ready || p.knockedOut,selected})}<div class="player-bottom">${skillBadge(c)}<span class="lock-state ${ready?'ready':''}">${result ? '공개 중' : seen ? `선택: ${seen.value}` : p.knockedOut ? '자동 제출' : ready ? '✓ 선택 완료' : '선택 중'}</span></div>${marked ? `<div class="seer-vision">✧ 계시 대상 · ${seen ? `선택: <b>${seen.value}</b>` : '제출을 기다리는 중'}</div>` : ''}${own ? activeButton(p,useSkill,ready || p.knockedOut) : ''}${p.skillId==='toughness' ? `<small class="runtime-label">강인함 ${p.characterRuntimeState.toughnessAvailable?'READY':'소진 · HP 2 이상 회복 시 충전'}</small>` : ''}</article>`;
  }).join('');
}
export function ownHand(player, { result, locked, selected, useSkill }) {
  const cards = cycleCards(player), chosen = cards.find(c=>c.id===selected && !c.used);
  const blocked = !!result || locked || player?.knockedOut;
  return `<section class="hand-section"><div class="hand-heading"><div><div class="eyebrow">${result?'FATE REVEALED':locked?'CHOICE LOCKED':'MAKE YOUR CHOICE'}</div><h2>${result?'선택의 결과를 확인하세요.':player?.knockedOut?'잠시 쉬어가세요.':locked?'선택 완료. 동료를 기다리는 중':'어떤 숫자로 승부할까요?'}</h2><p>${player?.knockedOut?'서버가 자동 제출하며, 턴 종료 후 HP 3으로 부활합니다.':'숫자는 모두에게 공개됩니다. 이번 턴의 선택은 비밀입니다.'}</p></div><span class="deck-label">CYCLE ${player?.cycleIndex || 1}<br><b>OFF 카드도 다음 사이클까지 그대로 표시</b></span></div><div class="hand">${cards.map(c=>`<button class="hand-card ${c.used?'spent':''} ${selected===c.id?'selected':''}" data-action="select-card" data-card-id="${html(c.id)}" data-card-instance="${html(c.id)}" ${blocked || c.used?'disabled':''} aria-label="${c.value} 카드, ${c.used?'사용 완료':'사용 가능'}" aria-pressed="${selected===c.id}"><span class="card-corner">${c.value}</span><strong>${c.value}</strong><span class="card-sigil">${c.used?'OFF':'◆'}</span><span class="card-corner bottom">${c.value}</span></button>`).join('')}</div>${player?activeButton(player,useSkill,blocked):''}<div class="hand-actions"><span>${result?'운명을 판정하는 중…':locked?'제출을 완료했습니다.':useSkill?'증폭 예약 · 중복이면 효과 없이 소모됩니다.':'카드는 숫자가 같아도 각각 한 장씩 소모됩니다.'}</span>${!blocked?`<button class="button primary" data-action="submit" data-network data-unavailable="${!chosen}" ${!chosen?'disabled':''}>${chosen?`${chosen.value} 카드 확정${useSkill?' · 증폭':''}`:'카드를 선택하세요'} →</button>`:'<span class="waiting-pill">판정을 기다리는 중</span>'}</div></section>`;
}
