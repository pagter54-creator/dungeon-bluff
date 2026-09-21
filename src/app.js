import { isShuffleTurn,selectionInfo,toggleCardSelection } from './battle-rules.js';
import { skinPortrait } from './skins.js';
import { initAccountUI, refreshAccount, openAccountPage, getAccount } from './account-ui.js';
import { preloadEssentials, preloadSession } from './cosmetics.js';
import * as api from './api.js';
import { dungeonArt, creatureArt, eventArt } from './art.js';
import { reveal, finale } from './fx.js';
import { initAudioControls, getAudio } from './audio.js';
import { characterFor, characterChoices, deckLabel, partyPanels, mobileSelection, cycleCards } from './character-ui.js';
import { animateCycle } from './character-fx.js';

const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const AI = { balanced: ['균형형', '중복, 공격, 보상을 균형 있게'], greedy: ['탐욕형', '높은 카드와 개인 보상을 우선'], cautious: ['신중형', '피격과 기절을 최대한 회피'], blocker: ['견제형', '선두의 공개 행동을 읽고 견제'], chaotic: ['혼돈형', '가장 예측하기 어려운 선택'] };
const categoryLabel = { monster: 'MONSTER ENCOUNTER', boss: 'FINAL BOSS', trap: 'DUNGEON TRAP', treasure: 'HIDDEN TREASURE', recovery: 'A MOMENT OF REST', event: 'UNKNOWN ENCOUNTER' };
let bundle = null;
let view = 'home';
let connected = false;
let profile = null;
let busy = false;
let syncing = false;
let resync = false;
let animating = false;
let lastResult = 0;
let queue = [];
let selected = null;
let useSkill = false;
let toastTimer;
let sessionIdentity = null;
let rewardRefreshSession = null;
let roomEpoch = 0;
let listLoading = false;
const status = (text, online = false) => {
  const el = document.querySelector('#connection'); el.classList.toggle('online', online); el.lastChild.textContent = ` ${text}`;
};
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4500); }
function showModal(html) { document.querySelector('#modal-body').innerHTML = html; modal.showModal(); }
function setProfile(next) {
  profile = next;
  const button = document.querySelector('#nickname');
  button.textContent = profile.display_name;
  button.title = `${profile.display_name} · 닉네임 변경`;
  button.setAttribute('aria-label', `${profile.display_name}, 닉네임 변경`);
  button.disabled = false;
}
function nicknameModal() {
  showModal(`<div class="eyebrow">YOUR ADVENTURER</div><h2>어떤 이름으로 떠날까요?</h2><p>원정대에 표시할 닉네임을 정하세요. 나중에도 변경할 수 있습니다.</p><form id="nickname-form"><label>닉네임<input name="display_name" required minlength="2" maxlength="16" autocomplete="nickname" value="${escape(profile?.nickname_set ? profile.nickname || profile.display_name : '')}" placeholder="2~16자, 글자·숫자·공백·_·-"></label><button class="button primary full" data-network>닉네임 저장 <span>→</span></button></form>`);
  updateBusy();
}
const mine = () => bundle?.members.find(m => m.user_id === api.user?.id);
const isHost = () => bundle?.room.host_user_id === api.user?.id;
function updateBusy() { document.querySelectorAll('[data-network]').forEach(button => { button.disabled = busy || button.dataset.unavailable === 'true'; }); }
async function perform(action, params = {}) {
  if (busy) return;
  busy = true; updateBusy();
  try {
    const response = await api.request(action, { ...(bundle?.room ? { room_id: bundle.room.id } : {}), ...params });
    if (response.profile) {
      setProfile(response.profile); modal.close(); toast('닉네임을 저장했습니다.');
      if (bundle) await sync();
    } else if (response.left) {
      roomEpoch++; await api.unsubscribe(); bundle = null; queue = []; sessionIdentity = null; lastResult = 0; view = 'home'; renderHome();
    } else if (response.room) { modal.close(); await accept(response); }
  } catch (error) { toast(error.message); if (bundle) void sync(); }
  finally { busy = false; updateBusy(); }
}
async function accept(next, restoring = false) {
  if (!next.room) return;
  if (bundle?.room.id === next.room.id && next.room.version < bundle.room.version) return;
  const newRoom = bundle?.room.id !== next.room.id;
  const newSession = next.session?.id && next.session.id !== sessionIdentity;
  if (newSession) await preloadSession(next.session);
  if (bundle?.room.id === next.room.id && next.room.version < bundle.room.version) return;
  if (newRoom) roomEpoch++;
  bundle = next;
  if (next.session?.status !== 'active' && next.session && rewardRefreshSession !== next.session.id) { rewardRefreshSession=next.session.id; void refreshAccount().catch(()=>{}); }
  void getAudio().setScene(next.session ? 'dungeon' : 'lobby');
  if (next.session?.id !== sessionIdentity) {
    sessionIdentity = next.session?.id || null;
    lastResult = restoring ? (next.session?.state.lastResult?.turnIndex || 0) : 0;
    queue = []; selected = null; useSkill = false;
  }
  if (newRoom) await api.subscribe(next.room.id, sync, status);
  view = next.session ? 'game' : 'lobby';
  if (next.session) {
    // Catch up to the latest turn instead of replaying minutes of stale battles.
    const newResults = next.session.state.eventLog.filter(e => e.type === 'turn_result' && e.turnIndex > lastResult).slice(-2);
    for (const r of newResults) { queue.push(r); lastResult = r.turnIndex; selected = null; useSkill = false; }
    if (!animating) {
      if (queue.length) void playQueue();
      else {
        renderGame();
        if (newSession && !restoring && next.session.status === 'active') {
          for (const p of Object.values(next.session.state.players)) if(p.character?.definition?.deckType === 'random') void animateCycle({memberId:p.memberId,random:true,cards:p.cycleCards});
        }
      }
    }
  } else renderLobby();
  updateBusy();
}
async function playQueue() {
  animating = true;
  try {
    while (queue.length && bundle) {
      const result = queue.shift(); renderGame(result); await reveal(result);
    }
  } catch (error) {
    queue = []; toast('연출을 건너뛰고 최신 턴으로 복구했습니다.');
  } finally {
    animating = false;
    if (bundle?.session) { renderGame(); if (bundle.session.status !== 'active') finale(bundle.session.status === 'completed'); }
  }
}
async function sync() {
  if (!connected) return;
  if (syncing) { resync = true; return; }
  syncing = true;
  const epoch = roomEpoch;
  const roomId = bundle?.room.id;
  try {
    const next = await api.request('get_room_state', roomId ? { room_id: roomId } : {});
    if (epoch !== roomEpoch) return;
    if (next.room) await accept(next, !bundle);
    else if (bundle) {
      roomEpoch++; await api.unsubscribe(); bundle = null; queue = []; sessionIdentity = null; lastResult = 0;
      selected = null; useSkill = false; renderHome();
      toast('접속이 오래 끊겨 방이 종료되었습니다. 새 방을 만들어 주세요.');
    }
  } catch (error) { status('연결 복구 중', false); }
  finally { syncing = false; if (resync) { resync = false; void sync(); } }
}
function renderHome() {
  void getAudio().setScene('lobby');
  view = 'home';
  app.innerHTML = `<section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="tiny-diamond"></span> 4인 협력 · 심리전 던전 레이드</div><h1>네 장의 카드.<br>하나의 <em>운명.</em></h1><p class="hero-description">같은 숫자는 사라진다.<br>동료의 패를 읽고, 던전의 끝까지 살아남아라.</p><div class="hero-actions"><button class="button primary" data-action="create">방 생성 <span>↗</span></button><button class="button secondary" data-action="find">방 찾기 <span>⌕</span></button></div><div class="hero-facts"><span><b>04</b> PLAYERS</span><span><b>10</b> STAGES</span><span><b>05</b> CARDS</span></div></div><div class="hero-visual">${dungeonArt()}<span class="art-label">THE GATE IS OPEN<br><b>당신의 선택을 기다립니다</b></span><div class="hero-card card-one"><small>Ⅰ</small><strong>1</strong><span>◇</span></div><div class="hero-card card-five"><small>Ⅴ</small><strong>5</strong><span>✧</span></div><div class="hero-card card-three"><small>Ⅲ</small><strong>3</strong><span>◇</span></div><div class="visual-caption"><span class="live-dot"></span> 믿을 건, 당신의 눈치뿐.</div></div></section><section class="principles"><article><span class="principle-number">01 /</span><div><h3>눈치껏, 한 장</h3><p>공개된 카드 풀에서 비밀리에 한 장을 선택하세요.</p></div><span class="principle-symbol">♠</span></article><article><span class="principle-number">02 /</span><div><h3>겹치면, 사라진다</h3><p>같은 숫자를 낸 카드들은 모두 무효가 됩니다.</p></div><span class="principle-symbol">⨯</span></article><article><span class="principle-number">03 /</span><div><h3>함께, 끝까지</h3><p>누적 기절 8회면 전멸. 보스까지 살아남으세요.</p></div><span class="principle-symbol">⚑</span></article></section>${!api.configured ? '<div class="setup-note"><span>연결 설정 대기</span> config.js에 Supabase URL과 publishable key를 입력하면 온라인 원정이 열립니다. <button data-action="setup">설정 안내 ↗</button></div>' : ''}`;
  app.insertAdjacentHTML('beforeend','<nav class="meta-menu" aria-label="계정 콘텐츠"><button data-meta="ranking"><small>HALL OF FAME</small>랭킹 ↗</button><button data-meta="shop"><small>TRADING POST</small>상점 ↗</button><button data-meta="inventory"><small>YOUR COLLECTION</small>인벤토리 ↗</button><button data-meta="account"><small>ADVENTURER ACCOUNT</small>계정 / 등록 ↗</button></nav>');
}
function connectionNeeded() {
  if (connected) return false;
  if (!api.configured) setupHelp(); else toast('서버 연결 중입니다. 잠시 후 다시 시도해 주세요.');
  return true;
}
function setupHelp() {
  showModal('<div class="eyebrow">SERVER CONNECTION</div><h2>던전의 문을 열 준비</h2><p>프로젝트의 <code>config.js</code>에 <b>SUPABASE_URL</b>과 <b>SUPABASE_PUBLISHABLE_KEY</b>를 입력하세요.</p><ol class="guide-list"><li>Supabase Anonymous Auth 활성화</li><li>동봉한 SQL 마이그레이션 적용</li><li><code>game-api</code> Edge Function 배포</li><li>Realtime에서 private 채널 사용 설정</li><li><code>npm start</code> 실행 후 새로고침</li></ol><p class="muted">정확한 명령과 검증 항목은 README.md에 있습니다.</p>');
}
function createModal() {
  if (connectionNeeded()) return;
  showModal(`<div class="eyebrow">NEW EXPEDITION</div><h2>동료를 모으세요.</h2><p>누가 같은 카드를 낼지, 아무도 모릅니다.</p><form id="create-form"><label>방 제목<input name="room_title" required maxlength="40" placeholder="눈치 좋은 모험가 구합니다" autocomplete="off"></label><label>비밀번호 <span class="muted">선택 사항</span><input name="password" type="password" maxlength="72" placeholder="비워두면 누구나 참가할 수 있어요" autocomplete="new-password"></label><button class="button primary full" data-network>방 생성하기 <span>→</span></button></form>`);
}
async function renderFind() {
  if (connectionNeeded()) return;
  view = 'find';
  app.innerHTML = `<section class="page-heading"><div><div class="eyebrow">FIND YOUR PARTY</div><h1>함께할 동료들.</h1><p>빈자리에 합류하고, 새로운 원정을 시작하세요.</p></div><button class="button secondary" data-action="home">← 돌아가기</button></section><div class="find-layout"><section><div class="section-label">공개 원정 <button class="text-button" data-action="refresh">새로고침 ↻</button></div><div id="room-list" class="room-list"><div class="empty-state">원정 목록을 불러오는 중…</div></div></section><aside class="join-box"><span class="eyebrow">HAVE AN INVITATION?</span><h2>초대받았나요?</h2><p>동료에게 받은 6자리 코드를 입력하세요.</p><form id="code-form"><input name="room_code" class="code-input" required minlength="6" maxlength="6" pattern="[A-Za-z2-9]{6}" placeholder="ABC234" autocomplete="off" aria-label="방 코드"><button class="button primary full" data-network>코드로 참가 <span>→</span></button></form><div class="aside-rule">네 명이 모이면 출발합니다.<br>빈자리는 AI로 채울 수 있어요.</div></aside></div>`;
  await loadRooms();
}
async function loadRooms() {
  if (listLoading) return;
  listLoading = true;
  try {
    const { rooms } = await api.request('list_rooms');
    const el = document.querySelector('#room-list'); if (!el) return;
    el.innerHTML = rooms.length ? rooms.map(r => `<article class="room-list-card"><div class="room-mini-icon">${r.has_password ? '▣' : '◇'}</div><div class="room-card-info"><h3>${escape(r.room_title)}</h3><p>${r.has_password ? '비밀번호 있음' : '자유 참가'} <span>·</span> AI ${r.ai_count}명 <span>·</span> ${r.status === 'waiting' ? '대기 중' : '플레이 중'}</p></div><strong class="member-count">${r.member_count}<small> / 4</small></strong><button class="button small secondary" data-action="join" data-id="${r.id}" data-password="${r.has_password}" ${r.status !== 'waiting' || r.member_count >= 4 ? 'disabled' : ''}>참가 →</button></article>`).join('') : '<div class="empty-state"><span>◇</span><h3>아직 열린 원정이 없어요.</h3><p>첫 번째 원정대를 만들어보세요.</p><button class="button primary" data-action="create">방 생성 →</button></div>';
  } catch (error) { toast(error.message); const el = document.querySelector('#room-list'); if (el) el.innerHTML = '<div class="empty-state">목록을 불러오지 못했습니다. 새로고침해 주세요.</div>'; }
  finally { listLoading = false; }
}
function joinModal(params, password = false) {
  if (!password) { void perform('join_room', params); return; }
  showModal('<div class="eyebrow">PRIVATE PARTY</div><h2>비밀번호를 입력하세요.</h2><form id="password-form"><label>방 비밀번호<input type="password" name="password" required maxlength="72" autocomplete="current-password"></label><button class="button primary full" data-network>참가하기 →</button></form>');
  document.querySelector('#password-form').addEventListener('submit', e => { e.preventDefault(); void perform('join_room', { ...params, password: new FormData(e.target).get('password') }); });
}
function aiModal() {
  showModal(`<div class="eyebrow">CHOOSE A COMPANION</div><h2>어떤 동료와 함께할까요?</h2><p>AI도 공개 정보와 자신에게 허용된 계시만 사용합니다.</p><div class="ai-options">${Object.entries(AI).map(([id, [name, description]], i) => `<button data-action="add-ai" data-type="${id}" data-network><span class="ai-icon">${['◈', '♛', '◇', '♜', '✧'][i]}</span><span><b>${name}</b><small>${description}</small></span><code>${id}</code></button>`).join('')}</div>`);
}
function renderLobby() {
  const { room, members } = bundle;
  const host = isHost();
  app.innerHTML = `<section class="page-heading"><div><div class="eyebrow">BASE CAMP · 원정 준비</div><h1>${escape(room.room_title)}</h1><p>${room.has_password ? '비밀번호가 있는 비공개 입장' : '누구나 참가할 수 있는 원정'} · 네 명의 운명이 만나는 곳</p></div><button class="button secondary" data-action="leave-confirm">나가기 ↗</button></section><section class="invite-bar"><div><span>ROOM CODE</span><strong>${room.room_code}</strong><button class="text-button" data-action="copy">코드 복사 ⧉</button></div><p>친구에게 코드를 공유하세요.</p><span class="waiting-pill"><i class="live-dot"></i> 대기 중</span></section><div class="lobby-slots">${[0, 1, 2, 3].map(seat => {
    const m = members.find(m => m.seat_index === seat);
    if (!m) return `<article class="lobby-slot empty"><span class="seat-number">0${seat + 1}</span><div class="empty-avatar">＋</div><h3>동료를 기다리는 중</h3><p>함께할 한 자리가 남았어요</p>${host ? '<button class="button secondary small" data-action="ai">AI 동료 추가 +</button>' : '<span class="muted">호스트가 AI를 추가할 수 있어요</span>'}</article>`;
    const character = characterFor(bundle, m.character_id);
    return `<article class="lobby-slot seat-${seat}"><span class="seat-number">0${seat + 1}</span><span class="member-badge">${m.member_type === 'ai' ? 'AI COMPANION' : 'HUMAN'}${m.user_id === room.host_user_id ? ' · HOST' : ''}</span><div class="avatar avatar-${seat}">${skinPortrait(character.id,m.user_id===api.user.id?getAccount()?.loadout:null)}</div><h3>${escape(m.display_name)}${m.user_id === api.user.id ? '<small> 나</small>' : ''}</h3><p>${escape(character.display_name)}${m.ai_type ? ' · ' + AI[m.ai_type][0] : ''}</p><p class="lobby-deck">${escape(deckLabel(character))}</p><p>${escape(character.definition?.skill?.name || '')}</p>${m.user_id === api.user.id || (host && m.member_type === 'ai') ? `<button class="button secondary small" data-action="character-select" data-member="${m.id}">캐릭터 선택</button>` : ''}${host && m.member_type === 'ai' ? `<button class="text-button remove-ai" data-action="remove-ai" data-id="${m.id}" data-network>AI 제거</button>` : '<span class="ready-marker">✓ 원정 준비 완료</span>'}</article>`;
  }).join('')}</div><section class="departure"><div><span class="eyebrow">YOUR PARTY</span><h2>${members.length}<small> / 4명 준비 완료</small></h2><p>카드는 모든 방에서 공유됩니다. 서로 다른 선택이 생존을 만듭니다.</p></div>${host ? `<button class="button primary start-button" data-action="start" data-network data-unavailable="${members.length !== 4}" ${members.length !== 4 ? 'disabled' : ''}>${members.length === 4 ? '던전 입장' : `${4 - members.length}명의 동료가 더 필요해요`} <span>→</span></button>` : '<p class="muted">호스트가 원정을 시작하기를 기다리고 있습니다.</p>'}</section>`;
}
function hearts(player) { return Array.from({ length: player.maxHp }, (_, i) => `<span class="heart ${i < player.hp ? 'filled' : ''}">♥</span>`).join(''); }
function renderGame(result = null) {
  if (!bundle?.session) return;
  const g = bundle.session, s = g.state, me = mine();
  if (!result && g.status !== 'active') { renderEnd(); return; }
  const stage = result?.stage || s.currentStage;
  const monster = result ? result.monsterBefore : s.monster;
  const players = result?.beforePlayers || s.players;
  const player = players[me?.id];
  const locked = s.lockedMembers.includes(me?.id);
  const stageIndex = result?.stageIndex || g.stage_index;
  const turnIndex = result?.turnIndex || g.turn_index;
  const sortedMembers = [...bundle.members].sort((a, b) => a.seat_index - b.seat_index);
  app.innerHTML = `<section class="game-top"><div class="stage-counter"><span>STAGE</span><b>${String(stageIndex).padStart(2, '0')}</b><small>/ 10</small></div><div class="stage-track">${s.stageOrder.map((st, i) => `<span class="stage-node ${i + 1 < stageIndex ? 'passed' : i + 1 === stageIndex ? 'current' : ''}" title="Stage ${i + 1}">${i === 9 ? '♛' : i + 1 < stageIndex ? '✓' : '◇'}</span>`).join('')}</div><div class="knockout-meter"><small>누적 기절</small><b class="${g.party_knockouts >= 7 ? 'danger-text' : ''}">${g.party_knockouts}<span> / 8</span></b></div><button class="icon-button" data-action="leave-confirm" aria-label="원정 나가기">↗</button></section><section class="arena ${stage.category === 'boss' ? 'boss-arena' : ''}" style="--stage-color:${escape(stage.color)}"><div class="arena-grid"></div><div class="encounter-heading"><div class="eyebrow">${categoryLabel[stage.category]}</div><h1>${escape(stage.name)}</h1><p>${escape(stage.subtitle || '당신의 카드가 다음 운명을 결정합니다')}</p></div><div id="enemy-art" class="enemy-art">${monster ? creatureArt(stage.shape, stage.color) : eventArt(stage.category)}</div><div class="arena-side left"><span>TURN</span><b>${String(turnIndex).padStart(2, '0')}</b><small>${result ? 'REVEALING' : 'SELECTING'}</small></div><div class="arena-side right"><span>${monster ? 'THREAT' : 'ENCOUNTER'}</span><b>${monster ? (stage.category === 'boss' ? 'Ⅲ' : 'Ⅱ') : 'Ⅰ'}</b><small>${monster ? '공격 예고 확인' : '한 턴으로 판정'}</small></div>${monster ? `<div class="enemy-health"><div><span>${stage.category === 'boss' ? 'BOSS' : 'MONSTER'} HP</span><b>${monster.hp} <small>/ ${monster.maxHp}</small></b></div><div class="health-track"><i style="width:${monster.hp / monster.maxHp * 100}%"></i></div></div>` : ''}<div class="intent ${monster?.attackIn === 1 ? 'imminent' : ''}"><span>${monster ? (monster.attackIn === 1 ? (stage.category==='boss'&&monster.nextAction==='special'?'✦ 이번 턴 특수 패턴':'⚠ 이번 턴 공격') : `◷ ${monster.attackIn}턴 후 ${stage.category==='boss'&&monster.nextAction==='special'?'특수 패턴':'공격'}`) : '◇ 방의 규칙'}</span><p>${escape(monster?.intent || stage.rule)}</p></div>${monster?.statusText?`<div class="boss-status"><b>이번 턴 특수 효과</b><p>${escape(monster.statusText)}</p></div>`:''}</section><section class="party-grid">${partyPanels(bundle, players, { me, result, selected, useSkill })}</section>${mobileSelection(player, { result, locked, selected, useSkill, twoCards:isShuffleTurn(g) })}<details class="battle-log"><summary>원정 기록 <span>${s.eventLog.length} TURNS</span></summary><div>${[...s.eventLog].reverse().map(log => `<p><span>STAGE ${log.stageIndex} · TURN ${log.turnIndex}</span><b>${escape(log.stage.name)}</b> ${log.cards.filter(c => !c.valid).length}장 중복 · ${log.monsterBefore ? `${log.totalDamage} 피해` : log.success ? '성공' : '조건 미달'}${log.stageCleared ? ' · 다음 방' : ''}</p>`).join('') || '<p>첫 번째 선택을 기다리고 있습니다.</p>'}</div></details>`;
  updateBusy();
}
function renderEnd() {
  const g = bundle.session;
  const success = g.status === 'completed';
  const ranked = [...bundle.members].sort((a, b) => g.state.players[b.id].score - g.state.players[a.id].score);
  app.innerHTML = `<section class="end-screen ${success ? 'victory' : 'failure'}"><div class="end-emblem">${success ? '♛' : '♠'}</div><div class="eyebrow">${success ? 'EXPEDITION COMPLETE' : 'EXPEDITION FAILED'}</div><h1>${success ? '던전이 당신을 기억합니다.' : '이번 운명은, 여기까지.'}</h1><p>${success ? '열 개의 방, 그리고 마지막 보스. 함께 살아남았습니다.' : `누적 기절 8회. ${g.stage_index}스테이지 도달 · 이번 원정 점수와 골드 ${g.state.settlement?.percent||0}% 정산`}</p><div class="account-notice">${getAccount()?.profile.account_type==='registered'?(success?'원정 보상은 서버에서 계정에 한 번만 반영됩니다. 랭킹과 Account Gold는 계정 메뉴에서 확인하세요.':'전멸 정산 골드는 계정에 한 번 지급됩니다. 영구 RP와 클리어 횟수는 유지됩니다.'):'게스트의 이번 원정 점수와 골드는 영구 저장되지 않습니다.'}</div><div class="end-stats"><span>도달 스테이지 <b>${g.stage_index} / 10</b></span><span>플레이한 턴 <b>${g.turn_index - 1}</b></span><span>누적 기절 <b>${g.party_knockouts} / 8</b></span></div><div class="ranking">${ranked.map((m, i) => `<div><span class="rank">0${1 + ranked.filter(other => g.state.players[other.id].score > g.state.players[m.id].score).length}</span><span class="small-avatar avatar-${m.seat_index}">${skinPortrait(g.state.players[m.id].characterId,g.state.players[m.id].loadout)}</span><b>${escape(m.display_name)}${m.user_id === api.user.id ? ' · 나' : ''}</b><span>${g.state.players[m.id].score} <small>PTS${g.state.settlement?` · ${g.state.settlement.players[m.id]?.rawScore??0} × ${g.state.settlement.percent}%`:''}</small></span><span>${g.state.players[m.id].gold} <small>G${g.state.settlement?` · ${g.state.settlement.players[m.id]?.rawGold??0} × ${g.state.settlement.percent}%`:''}</small></span></div>`).join('')}</div><button class="button primary" data-action="leave" data-network>새로운 원정 준비 <span>→</span></button></section>`;
}
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'home') renderHome();
  if (action === 'setup') setupHelp();
  if (action === 'create') createModal();
  if (action === 'find') void renderFind();
  if (action === 'refresh') void loadRooms();
  if (action === 'join') joinModal({ room_id: button.dataset.id }, button.dataset.password === 'true');
  if (action === 'ai') aiModal();
  if (action === 'character-select') showModal(characterChoices(bundle, button.dataset.member));
  if (action === 'set-character') void perform('set_character', { member_id: button.dataset.member, character_id: button.dataset.character });
  if (action === 'skill-info') {
    const c = characterFor(bundle, button.dataset.character), skill = c.definition?.skill;
    if (skill) showModal(`<div class="eyebrow">${skill.type.toUpperCase()} · ${escape(c.display_name)}</div><h2>${escape(skill.name)}</h2><p>${escape(skill.description)}</p>`);
  }
  if (action === 'toggle-skill' && !animating) { useSkill = !useSkill; renderGame(); }
  if (action === 'add-ai') void perform('add_ai', { ai_type: button.dataset.type });
  if (action === 'remove-ai') void perform('remove_ai', { member_id: button.dataset.id });
  if (action === 'start') void perform('start_game');
  if (action === 'copy') { try { await navigator.clipboard.writeText(bundle.room.room_code); toast('방 코드를 복사했습니다.'); } catch { toast(`방 코드: ${bundle.room.room_code}`); } }
  if (action === 'leave-confirm') {
    if (animating) { toast('결과 연출이 끝난 뒤 나갈 수 있습니다.'); return; }
    showModal(`<div class="eyebrow">LEAVE PARTY</div><h2>원정대를 떠날까요?</h2><p>${bundle.session?.status === 'active' ? '진행 중인 자리는 균형형 AI가 이어받습니다. 나간 원정에는 다시 참가할 수 없습니다.' : '호스트라면 다음 인간 플레이어에게 호스트가 이전됩니다.'}</p><button class="button primary full" data-action="leave" data-network>방 나가기 →</button>`);
  }
  if (action === 'leave') { modal.close(); void perform('leave_room'); }
  if (action === 'select-card' && !animating) { selected = toggleCardSelection(selected,button.dataset.cardId,isShuffleTurn(bundle.session)); renderGame(); }
  if (action === 'submit' && selected !== null && !animating) {
    const me = mine(), g = bundle.session;
    const twoCards=isShuffleTurn(g),info=selectionInfo(g.state.players[me.id],selected,twoCards);
    if(info.ready)void perform('submit_card',{session_id:g.id,turn_index:g.turn_index,member_id:me.id,...(twoCards?{card_ids:info.cards.map(c=>c.id)}:{card_id:info.cards[0].id,card_value:info.cards[0].value}),use_skill:useSkill});
  }
});
document.addEventListener('submit', async event => {
  if (event.target.id === 'nickname-form') { event.preventDefault(); void perform('set_profile', Object.fromEntries(new FormData(event.target))); }
  if (event.target.id === 'create-form') { event.preventDefault(); void perform('create_room', Object.fromEntries(new FormData(event.target))); }
  if (event.target.id === 'code-form') {
    event.preventDefault(); const room_code = new FormData(event.target).get('room_code').trim().toUpperCase();
    // Code entry includes optional password, avoiding any password-disclosure query.
    showModal(`<div class="eyebrow">JOIN PARTY · ${escape(room_code)}</div><h2>원정에 합류합니다.</h2><p>비밀번호가 없는 방은 비워두세요.</p><form id="direct-join-form"><label>비밀번호 <span class="muted">선택 사항</span><input type="password" name="password" maxlength="72" autocomplete="current-password"></label><button class="button primary full" data-network>참가하기 →</button></form>`);
    document.querySelector('#direct-join-form').addEventListener('submit', e => { e.preventDefault(); void perform('join_room', { room_code, password: new FormData(e.target).get('password') }); });
  }
});
document.querySelector('.modal-close').addEventListener('click', () => modal.close());
modal.addEventListener('click', event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close(); } });
document.querySelector('#help').addEventListener('click', () => showModal('<div class="eyebrow">HOW TO SURVIVE</div><h2>눈치를 읽고, 살아남아라.</h2><ol class="guide-list"><li><b>각자 카드 한 장.</b> 4명 모두 비밀리에 선택합니다.</li><li><b>같은 숫자는 전부 무효.</b> 유효한 카드만 공격과 방 효과에 참여합니다.</li><li><b>모든 제출 카드는 소비.</b> 5장을 쓰면 자신의 기본 덱을 다시 받습니다.</li><li><b>HP는 3.</b> 0이 되면 한 턴 자동 제출 후 HP 3으로 부활합니다.</li><li><b>누적 기절 8회는 전멸.</b> 도달 스테이지에 따라 원정 점수·골드를 정산합니다. 1~4층 0%, 5층 20%, 6층 30%, 7층 40%, 8층 50%, 9층 60%, 보스층 70%, 클리어 100%. 소수점은 버립니다.</li><li><b>10번째 방은 보스.</b> 2턴마다 일반 공격과 특수 패턴을 번갈아 사용합니다. 일반 몬스터는 3턴마다 공격합니다.</li></ol><p class="muted">일반 공격은 카드 숫자만큼 피해를 줍니다. 적이 쓰러지는 턴에도 모든 유효 카드가 끝까지 공격합니다. 최고 피해자는 +10점과 기존 처치 보너스 3G를 받습니다. 기절할 때마다 -5점, -2G가 적용됩니다.</p>'));
document.querySelector('#nickname').addEventListener('click', () => void openAccountPage('account'));
initAccountUI({showModal,toast,canSwitch:()=>!bundle,ready:()=>connected,onNickname:()=>bundle?sync():Promise.resolve(),onAccount:data=>{
  setProfile(data.profile);
  document.querySelector('#account-summary').textContent=data.stats?data.stats.rating_points+' RP · '+data.stats.account_gold+' Account Gold':'GUEST · 계정 등록';
}});
initAudioControls();
// Block native drag/drop and context menus without blocking range-slider gestures
// or caret/selection inside nickname and password inputs.
for (const type of ['dragstart', 'dragover', 'drop', 'contextmenu']) document.addEventListener(type, event => event.preventDefault(), { capture: true });
addEventListener('online', () => { status('재연결 중'); void sync(); });
addEventListener('offline', () => status('연결 끊김 · 복구 대기'));
document.addEventListener('visibilitychange', () => { if (!document.hidden) void sync(); });
setInterval(() => { if (!document.hidden && connected && bundle) void sync(); }, 5000);
await preloadEssentials();
renderHome();
try {
  connected = await api.connect(status);
  if (connected) {
    status('온라인', true); await sync();
    document.querySelector('#nickname').disabled = false;
    try {
      await refreshAccount();
      if (!profile.nickname_set && !modal.open) nicknameModal();
    } catch (error) { toast(error.message); }
  }
  else status('서버 설정 대기');
} catch (error) { status('연결 실패'); toast(error.message); }
