import {pveResourceBadgesMarkup,pveAmplifyCost} from './pve-resource-ui.js';
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
export function skillBadge(character,memberId='') {
  const skill = character.definition?.skill;
  if (!skill) return '';
  const type = skill.type === 'hybrid' ? 'PASSIVE & ACTIVE' : skill.type.toUpperCase();
  return `<span class="skill-tooltip"><button type="button" class="skill-badge" data-action="skill-info" data-character="${html(character.id)}" data-member="${html(memberId)}" aria-label="${html(skill.name)} 스킬 설명">${html(character.definition.icon)} ${type} · ${html(skill.name)}</button><span class="skill-description" role="tooltip"><b>${html(skill.name)} · ${type}</b>${html(skill.description)}</span></span>`;
}
export function revelationGauge(player) {
  if(player.skillId==='acrobatics')return `<div class="twins-parity"><b>${player.characterRuntimeState?.parity===1?'홀 · 소년':'짝 · 소녀'}</b><span>${player.characterRuntimeState?.parity===1?'1 · 3 선택':'2 · 4 선택'} · 다음 턴 교대${player.characterRuntimeState?.sun!=null?' · 태양 '+player.characterRuntimeState.sun+' / 달 '+player.characterRuntimeState.moon:''}</span></div>`;
  if (player.skillId === 'random_hand') return gamblerCharges(player);
  if(player.skillId==='amplify')return resourceGauge('마나',player.characterRuntimeState?.mana||0,player.characterRuntimeState?.manaMax||4,'mana-gauge');
  if(player.skillId==='toughness')return resourceGauge('강인함 충전',player.characterRuntimeState?.toughnessCharges||0,player.characterRuntimeState?.toughnessChargesMax||2,'toughness-gauge');
  if(player.skillId==='soul_slash'){
    const stacks=player.characterRuntimeState?.predation||0;
    const level=player.characterRuntimeState?.ghostSlashLevel??Math.floor(stacks/8),threshold=player.characterRuntimeState?.ghostThreshold||8;
    if(player.characterRuntimeState?.ghostTransformation)return `<small class="predation-count">포식 ${stacks} · ${player.characterRuntimeState?.transformationActive?'귀화 중':'귀화에 포식 6 필요'}</small>`;
    return `<small class="predation-count">포식 ${stacks} · 귀참 Lv.${level} +${level+1}</small>${resourceGauge('다음 귀참 레벨 진행도',player.characterRuntimeState?.ghostSlashLevel==null?stacks%threshold:stacks,threshold,'predation-gauge')}`;
  }
  if (player.skillId === 'combo') return resourceGauge('연격 중첩',player.characterRuntimeState?.comboStacks||0,player.characterRuntimeState?.comboMax||3)+`<small class="combo-previous">직전 카드: ${html(player.characterRuntimeState?.comboPrevious ?? '-')}</small>`;
  if (player.skillId !== 'revelation') return '';
  const r=player.characterRuntimeState||{},max=r.revelationMax||6,stacks=Math.max(0,Math.min(max,r.revelationStacks||0));
  return resourceGauge('계시',stacks,max,'seer-gauge')+`<small>계시 ${stacks}/${max} · 자동 공개 ${r.prophetCore?.threshold||3} 이상</small>`;
}
export function resourceGauge(label,value,max,extra='') {
  return `<div class="revelation-gauge ${extra}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}">${Array.from({length:max},(_,i)=>`<i class="revelation-pip ${i<value?'filled':''}" aria-hidden="true"></i>`).join('')}</div>`;
}
export function nextAmplifyLevel(mana,current){return current===0?mana>=2?1:0:current===1&&mana>=4?2:0;}
export function activeButton(player, useSkill, blocked, members=[], players={}, hasSelected=false) {
  if(player.skillId==='acrobatics')return `<button type="button" class="active-skill" data-action="activate-acrobatics" data-network ${blocked||!player.activeSkillState?.available?'disabled':''}>♊ 곡예 <b>${player.activeSkillState?.available?'손패 초기화 · 홀짝 반전':player.characterRuntimeState?.acrobaticsRechargeNeed?'유효 공격 '+player.characterRuntimeState.acrobaticsRechargeNeed+'회로 재충전':'사이클 완주 시 재충전'}</b></button>`;
  if(player.skillId==='blood_command'){
    const thrallId=player.characterRuntimeState?.thrallId,target=members.find(m=>m.id===thrallId);
    const ready=!!target&&!players[thrallId]?.knockedOut&&!blocked;
    const state=player.characterRuntimeState||{},choice=state.thrallChoice,echo=state.echo;
    const choices=choice&&!blocked?`<div class="thrall-choice" aria-label="권속 선택">${choice.candidates.map(id=>`<button type="button" data-action="pve-thrall-choice" data-player-id="${html(id)}" data-network>${html(members.find(m=>m.id===id)?.display_name||id)} · 권속</button>`).join('')}</div>`:'';
    const echoChoice=echo&&!blocked?`<div class="thrall-choice" aria-label="피의 명령 대상"><button type="button" data-action="pve-command-target" data-player-id="${html(thrallId)}">현재 권속</button><button type="button" data-action="pve-command-target" data-player-id="${html(echo.targetId)}">잔향 · ${html(members.find(m=>m.id===echo.targetId)?.display_name||echo.targetId)}</button></div>`:'';
    return choices+echoChoice+`<button type="button" class="active-skill ${useSkill&&ready?'armed':''}" data-action="toggle-skill" aria-pressed="${Boolean(useSkill&&ready)}" ${!ready?'disabled':''}>♜ 피의 명령 <b>${ready?(useSkill?'교환 예약':'READY'):'권속 필요'}</b></button>`;
  }
  if(player.skillId==='soul_slash'){
    const ready=!!player.activeSkillState?.available&&!blocked;
    if(player.characterRuntimeState?.ghostTransformation)return `<button type="button" class="active-skill" data-action="activate-ghost-transformation" data-network ${!ready?'disabled':''}>귀화 <b>${player.characterRuntimeState?.transformationActive?'귀화 중':ready?'포식 6 소비 · 귀화 시작':'포식 6 필요'}</b></button>${revelationGauge(player)}`;
    const level=player.characterRuntimeState?.ghostSlashLevel??Math.floor((player.characterRuntimeState?.predation||0)/8);
    return `<button type="button" class="active-skill ${useSkill&&ready?'armed':''}" data-action="toggle-skill" aria-pressed="${Boolean(useSkill&&ready)}" ${!ready?'disabled':''}><span class="soul-slash-level">⚔ 귀참 Lv.${level} +${level+1}</span> <b>${ready?(useSkill?'ON':'READY'):'이번 사이클 사용'}</b></button>${revelationGauge(player)}`;
  }
  if(player.skillId==='amplify'){
    const mana=player.characterRuntimeState?.mana||0,level=Number(useSkill)||0;
    const reverse=Boolean(player.characterRuntimeState?.reverseMath),manaMax=player.characterRuntimeState?.manaMax||4;
    const cost=player.characterRuntimeState?.pveAmplify?pveAmplifyCost(level):Math.abs(level)*2,delta=level>0?('+'+level):String(level);
    return `<button type="button" class="active-skill ${level?'armed':''}" data-action="toggle-skill" aria-pressed="${Boolean(level)}" ${blocked||mana<2?'disabled':''}>✺ ${reverse?'역산술':'증폭'} <b>마나 ${Math.max(0,mana-cost)}/${manaMax} · ${level?'숫자 '+delta:'2마나 필요'}${level?' · 다시 눌러 변경/취소':''}</b></button>`;
  }
  if(player.skillId==='revelation'){
    const r=player.characterRuntimeState||{},core=r.prophetCore||{},cost=r.fragmentCost||core.cost||6;
    const occupied=Boolean(core.fragment||core.fragmentPending),ready=(r.revelationStacks||0)>=cost&&!occupied;
    const reason=occupied?'이미 과거의 편린을 보유하고 있습니다.':ready?`${cost} 소모 · 발동`:'계시가 부족합니다.';
    return `<button type="button" class="active-skill" data-action="activate-revelation" data-network ${blocked||!ready?'disabled':''}>✧ 과거의 편린 <b>${html(reason)}</b></button>`;
  }
  if (player.skillType !== 'active' && player.skillId !== 'full_burst') return '';
  const ready = player.activeSkillState?.available;
  const knight = player.skillId === 'toughness';
  if(player.skillId==='full_burst')return `<button type="button" class="active-skill ${useSkill&&ready?'armed':''}" data-action="toggle-skill" aria-pressed="${Boolean(useSkill&&ready)}" ${blocked||!ready?'disabled':''}>⌖ 전탄발사 <b>${ready?(useSkill?'ON · 손패 전체 사용':'READY'):'다음 사이클에 충전'}</b></button>`;
  return `<button type="button" class="active-skill ${useSkill && ready ? 'armed' : ''}" data-action="toggle-skill" aria-pressed="${Boolean(useSkill && ready)}" ${blocked || !ready ? 'disabled' : ''}>${knight?'◇ 강인함':'✺ 증폭'} <b>${ready ? useSkill ? knight?'ON · 충전 1 소모':'ON · +2' : 'READY' : 'USED'}</b></button>`;
}
export function partyPanels(bundle, players, { me, result, selected, useSkill, statLabel='SCORE' }) {
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
        <div class="player-content"><div class="player-stats"><span>${html(statLabel)} <b>${p.score}</b></span><span>RUN GOLD <b>${p.gold}</b></span><small>${c.definition?.deckType==='continuous'?'운명의 패':`CYCLE ${p.cycleIndex || 1}`} · ${cycleCards(p).filter(card=>!card.used).length}장 남음</small></div>${cardComponent(null,{loadout:p.loadout,blocked:ready,revealId:m.id})}</div>
        ${cardPool(p,{own,blocked:ready || p.knockedOut,selected,useSkill})}
        <div class="player-bottom"><div class="player-skill">${skillBadge(c,m.id)}${pveResourceBadgesMarkup(p.pveResourceBadges)}${p.skillId==='soul_slash'&&own?'':revelationGauge(p)}${p.skillId==='blood_command'?thrallStatus(p,bundle,players):''}</div><span class="lock-state ${ready?'ready':''}">${result ? '공개 중' : seen ? `선택: ${seen.value}` : p.knockedOut ? '자동 제출' : ready ? '✓ 선택 완료' : '선택 중'}</span></div>
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
