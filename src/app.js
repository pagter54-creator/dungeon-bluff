import * as api from './api.js';
import { dungeonArt, creatureArt, eventArt } from './art.js';
import { reveal, finale, toggleSound } from './fx.js';

const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const AI = { balanced: ['균형형', '중복, 공격, 보상을 균형 있게'], greedy: ['탐욕형', '높은 카드와 개인 보상을 우선'], cautious: ['신중형', '피격과 기절을 최대한 회피'], blocker: ['견제형', '선두의 공개 행동을 읽고 견제'], chaotic: ['혼돈형', '가장 예측하기 어려운 선택'] };
const categoryLabel = { monster: 'MONSTER ENCOUNTER', boss: 'FINAL BOSS', trap: 'DUNGEON TRAP', treasure: 'HIDDEN TREASURE', recovery: 'A MOMENT OF REST', event: 'UNKNOWN ENCOUNTER' };
let bundle = null;
let view = 'home';
let connected = false;
let busy = false;
let syncing = false;
let resync = false;
let animating = false;
let lastResult = 0;
let queue = [];
let selected = null;
let toastTimer;
let sessionIdentity = null;
let roomEpoch = 0;
let listLoading = false;
const status = (text, online = false) => {
  const el = document.querySelector('#connection'); el.classList.toggle('online', online); el.lastChild.textContent = ` ${text}`;
};
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4500); }
function showModal(html) { document.querySelector('#modal-body').innerHTML = html; modal.showModal(); }
const mine = () => bundle?.members.find(m => m.user_id === api.user?.id);
const isHost = () => bundle?.room.host_user_id === api.user?.id;
function updateBusy() { document.querySelectorAll('[data-network]').forEach(button => { button.disabled = busy || button.dataset.unavailable === 'true'; }); }
async function perform(action, params = {}) {
  if (busy) return;
  busy = true; updateBusy();
  try {
    const response = await api.request(action, { ...(bundle?.room ? { room_id: bundle.room.id } : {}), ...params });
    if (response.left) {
      roomEpoch++; await api.unsubscribe(); bundle = null; queue = []; sessionIdentity = null; lastResult = 0; view = 'home'; renderHome();
    } else if (response.room) { modal.close(); await accept(response); }
  } catch (error) { toast(error.message); if (bundle) void sync(); }
  finally { busy = false; updateBusy(); }
}
async function accept(next, restoring = false) {
  if (!next.room) return;
  if (bundle?.room.id === next.room.id && next.room.version < bundle.room.version) return;
  const newRoom = bundle?.room.id !== next.room.id;
  if (newRoom) roomEpoch++;
  bundle = next;
  if (next.session?.id !== sessionIdentity) {
    sessionIdentity = next.session?.id || null;
    lastResult = restoring ? (next.session?.state.lastResult?.turnIndex || 0) : 0;
    queue = []; selected = null;
  }
  if (newRoom) await api.subscribe(next.room.id, sync, status);
  view = next.session ? 'game' : 'lobby';
  if (next.session) {
    const newResults = next.session.state.eventLog.filter(e => e.type === 'turn_result' && e.turnIndex > lastResult);
    for (const r of newResults) { queue.push(r); lastResult = r.turnIndex; selected = null; }
    if (!animating) {
      if (queue.length) void playQueue();
      else renderGame();
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
  } catch (error) { status('연결 복구 중', false); }
  finally { syncing = false; if (resync) { resync = false; void sync(); } }
}
function renderHome() {
  view = 'home';
  app.innerHTML = `<section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="tiny-diamond"></span> 4인 협력 · 심리전 던전 레이드</div><h1>네 장의 카드.<br>하나의 <em>운명.</em></h1><p class="hero-description">같은 숫자는 사라진다.<br>동료의 패를 읽고, 던전의 끝까지 살아남아라.</p><div class="hero-actions"><button class="button primary" data-action="create">방 생성 <span>↗</span></button><button class="button secondary" data-action="find">방 찾기 <span>⌕</span></button></div><div class="hero-facts"><span><b>04</b> PLAYERS</span><span><b>10</b> STAGES</span><span><b>05</b> CARDS</span></div></div><div class="hero-visual">${dungeonArt()}<span class="art-label">THE GATE IS OPEN<br><b>당신의 선택을 기다립니다</b></span><div class="hero-card card-one"><small>Ⅰ</small><strong>1</strong><span>◇</span></div><div class="hero-card card-five"><small>Ⅴ</small><strong>5</strong><span>✧</span></div><div class="hero-card card-three"><small>Ⅲ</small><strong>3</strong><span>◇</span></div><div class="visual-caption"><span class="live-dot"></span> 믿을 건, 당신의 눈치뿐.</div></div></section><section class="principles"><article><span class="principle-number">01 /</span><div><h3>눈치껏, 한 장</h3><p>1부터 5까지. 비밀리에 카드를 선택하세요.</p></div><span class="principle-symbol">♠</span></article><article><span class="principle-number">02 /</span><div><h3>겹치면, 사라진다</h3><p>같은 숫자를 낸 카드들은 모두 무효가 됩니다.</p></div><span class="principle-symbol">⨯</span></article><article><span class="principle-number">03 /</span><div><h3>함께, 끝까지</h3><p>누적 기절 5회면 전멸. 보스까지 살아남으세요.</p></div><span class="principle-symbol">⚑</span></article></section>${!api.configured ? '<div class="setup-note"><span>연결 설정 대기</span> config.js에 Supabase URL과 publishable key를 입력하면 온라인 원정이 열립니다. <button data-action="setup">설정 안내 ↗</button></div>' : ''}`;
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
  showModal(`<div class="eyebrow">CHOOSE A COMPANION</div><h2>어떤 동료와 함께할까요?</h2><p>AI도 당신의 비공개 카드를 볼 수 없습니다.</p><div class="ai-options">${Object.entries(AI).map(([id, [name, description]], i) => `<button data-action="add-ai" data-type="${id}" data-network><span class="ai-icon">${['◈', '♛', '◇', '♜', '✧'][i]}</span><span><b>${name}</b><small>${description}</small></span><code>${id}</code></button>`).join('')}</div>`);
}
function renderLobby() {
  const { room, members } = bundle;
  const host = isHost();
  app.innerHTML = `<section class="page-heading"><div><div class="eyebrow">BASE CAMP · 원정 준비</div><h1>${escape(room.room_title)}</h1><p>${room.has_password ? '비밀번호가 있는 비공개 입장' : '누구나 참가할 수 있는 원정'} · 네 명의 운명이 만나는 곳</p></div><button class="button secondary" data-action="leave-confirm">나가기 ↗</button></section><section class="invite-bar"><div><span>ROOM CODE</span><strong>${room.room_code}</strong><button class="text-button" data-action="copy">코드 복사 ⧉</button></div><p>친구에게 코드를 공유하세요.</p><span class="waiting-pill"><i class="live-dot"></i> 대기 중</span></section><div class="lobby-slots">${[0, 1, 2, 3].map(seat => {
    const m = members.find(m => m.seat_index === seat);
    if (!m) return `<article class="lobby-slot empty"><span class="seat-number">0${seat + 1}</span><div class="empty-avatar">＋</div><h3>동료를 기다리는 중</h3><p>함께할 한 자리가 남았어요</p>${host ? '<button class="button secondary small" data-action="ai">AI 동료 추가 +</button>' : '<span class="muted">호스트가 AI를 추가할 수 있어요</span>'}</article>`;
    return `<article class="lobby-slot seat-${seat}"><span class="seat-number">0${seat + 1}</span><span class="member-badge">${m.member_type === 'ai' ? 'AI COMPANION' : 'HUMAN'}${m.user_id === room.host_user_id ? ' · HOST' : ''}</span><div class="avatar avatar-${seat}">${['♠', '◈', '♜', '✧'][seat]}</div><h3>${escape(m.display_name)}${m.user_id === api.user.id ? '<small> 나</small>' : ''}</h3><p>${m.ai_type ? AI[m.ai_type][0] + ' · ' + m.ai_type : '기본 캐릭터 · 모험가'}</p><div class="mini-deck" aria-label="공유 카드 5장">${Array.from({ length: 5 }, () => '<span>◇</span>').join('')}</div>${host && m.member_type === 'ai' ? `<button class="text-button remove-ai" data-action="remove-ai" data-id="${m.id}" data-network>AI 제거</button>` : '<span class="ready-marker">✓ 원정 준비 완료</span>'}</article>`;
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
  app.innerHTML = `<section class="game-top"><div class="stage-counter"><span>STAGE</span><b>${String(stageIndex).padStart(2, '0')}</b><small>/ 10</small></div><div class="stage-track">${s.stageOrder.map((st, i) => `<span class="stage-node ${i + 1 < stageIndex ? 'passed' : i + 1 === stageIndex ? 'current' : ''}" title="Stage ${i + 1}">${i === 9 ? '♛' : i + 1 < stageIndex ? '✓' : '◇'}</span>`).join('')}</div><div class="knockout-meter"><small>누적 기절</small><b class="${g.party_knockouts >= 4 ? 'danger-text' : ''}">${g.party_knockouts}<span> / 5</span></b></div><button class="icon-button" data-action="leave-confirm" aria-label="원정 나가기">↗</button></section><section class="arena ${stage.category === 'boss' ? 'boss-arena' : ''}" style="--stage-color:${escape(stage.color)}"><div class="arena-grid"></div><div class="encounter-heading"><div class="eyebrow">${categoryLabel[stage.category]}</div><h1>${escape(stage.name)}</h1><p>${escape(stage.subtitle || '당신의 카드가 다음 운명을 결정합니다')}</p></div><div id="enemy-art" class="enemy-art">${monster ? creatureArt(stage.shape, stage.color) : eventArt(stage.category)}</div><div class="arena-side left"><span>TURN</span><b>${String(turnIndex).padStart(2, '0')}</b><small>${result ? 'REVEALING' : 'SELECTING'}</small></div><div class="arena-side right"><span>${monster ? 'THREAT' : 'ENCOUNTER'}</span><b>${monster ? (stage.category === 'boss' ? 'Ⅲ' : 'Ⅱ') : 'Ⅰ'}</b><small>${monster ? '공격 예고 확인' : '한 턴으로 판정'}</small></div>${monster ? `<div class="enemy-health"><div><span>${stage.category === 'boss' ? 'BOSS' : 'MONSTER'} HP</span><b>${monster.hp} <small>/ ${monster.maxHp}</small></b></div><div class="health-track"><i style="width:${monster.hp / monster.maxHp * 100}%"></i></div></div>` : ''}<div class="intent ${monster?.attackIn === 1 ? 'imminent' : ''}"><span>${monster ? (monster.attackIn === 1 ? '⚠ 이번 턴 공격' : `◷ ${monster.attackIn}턴 후 공격`) : '◇ 방의 규칙'}</span><p>${escape(monster?.intent || stage.rule)}</p></div></section><section class="party-grid">${sortedMembers.map(m => {
    const p = players[m.id]; if (!p) return '';
    const ready = result || s.lockedMembers.includes(m.id);
    return `<article class="player-panel seat-${m.seat_index} ${m.id === me?.id ? 'is-me' : ''} ${p.knockedOut ? 'knocked-out' : ''}" data-player="${m.id}"><div class="player-heading"><span class="small-avatar avatar-${m.seat_index}">${['♠', '◈', '♜', '✧'][m.seat_index]}</span><div><h3>${escape(m.display_name)} ${m.id === me?.id ? '<em>나</em>' : ''}</h3><small>${m.ai_type ? AI[m.ai_type][0] : '모험가'}${p.knockedOut ? ' · 기절' : ''}</small></div><div class="hearts" aria-label="HP ${p.hp}/${p.maxHp}">${hearts(p)}</div></div><div class="player-content"><div class="player-stats"><span>SCORE <b>${p.score}</b></span><span>GOLD <b>${p.gold}</b></span><small>남은 카드 ${p.remainingCards.length}장</small></div><div class="reveal-card ${ready ? 'locked' : ''}" data-reveal="${m.id}"><span class="card-back">◇</span><b class="reveal-value">?</b><i></i></div></div><div class="player-bottom"><span class="used-cards">사용 ${p.discardedCards.length ? p.discardedCards.map(v => `<i>${v}</i>`).join('') : '<small>—</small>'}</span><span class="lock-state ${ready ? 'ready' : ''}">${result ? '공개 중' : p.knockedOut ? '자동 제출' : ready ? '✓ 선택 완료' : '선택 중 ···'}</span></div></article>`;
  }).join('')}</section><section class="hand-section"><div class="hand-heading"><div><div class="eyebrow">${result ? 'FATE REVEALED' : locked ? 'CHOICE LOCKED' : 'MAKE YOUR CHOICE'}</div><h2>${result ? '선택의 결과를 확인하세요.' : player?.knockedOut ? '잠시 쉬어가세요.' : locked ? '선택 완료. 동료를 기다리는 중' : '어떤 숫자로 승부할까요?'}</h2><p>${result ? '같은 숫자의 카드는 모두 무효화됩니다.' : player?.knockedOut ? '서버가 카드를 선택했습니다. 이번 턴이 끝나면 HP 1로 복귀합니다.' : locked ? '모든 카드가 모이면 동시에 공개됩니다.' : '카드를 고르고 확정하세요. 겹치지 않은 카드만 힘을 발휘합니다.'}</p></div><span class="deck-label">SHARED DECK<br><b>모든 방에서 함께 사용하는 카드</b></span></div><div class="hand">${(player?.remainingCards || []).map((v, i) => `<button class="hand-card ${selected === i ? 'selected' : ''}" data-action="select-card" data-index="${i}" data-value="${v}" aria-label="${v} 카드 선택" aria-pressed="${selected === i}" ${result || locked || player?.knockedOut ? 'disabled' : ''}><span class="card-corner">${v}<small>♠</small></span><strong>${v}</strong><span class="card-sigil">${['', '◇', '♧', '♠', '✧', '♛'][v] || '◇'}</span><span class="card-corner bottom">${v}</span></button>`).join('')}</div><div class="hand-actions"><span>${result ? '운명을 판정하는 중…' : locked ? '선택한 카드는 공개 전까지 비밀입니다.' : '확정한 카드는 변경할 수 없습니다.'}</span>${!result && !locked && !player?.knockedOut ? `<button class="button primary" data-action="submit" data-network data-unavailable="${selected === null}" ${selected === null ? 'disabled' : ''}>${selected === null ? '카드를 선택하세요' : `${player.remainingCards[selected]} 카드 확정`} <span>→</span></button>` : '<span class="waiting-pill"><i class="live-dot"></i> ' + (result ? '결과 공개 중' : `${s.lockedMembers.length} / 4 선택 완료`) + '</span>'}</div></section><details class="battle-log"><summary>원정 기록 <span>${s.eventLog.length} TURNS</span></summary><div>${[...s.eventLog].reverse().map(log => `<p><span>STAGE ${log.stageIndex} · TURN ${log.turnIndex}</span><b>${escape(log.stage.name)}</b> ${log.cards.filter(c => !c.valid).length}장 중복 · ${log.monsterBefore ? `${log.totalDamage} 피해` : log.success ? '성공' : '조건 미달'}${log.stageCleared ? ' · 다음 방' : ''}</p>`).join('') || '<p>첫 번째 선택을 기다리고 있습니다.</p>'}</div></details>`;
  updateBusy();
}
function renderEnd() {
  const g = bundle.session;
  const success = g.status === 'completed';
  const ranked = [...bundle.members].sort((a, b) => g.state.players[b.id].score - g.state.players[a.id].score);
  app.innerHTML = `<section class="end-screen ${success ? 'victory' : 'failure'}"><div class="end-emblem">${success ? '♛' : '♠'}</div><div class="eyebrow">${success ? 'EXPEDITION COMPLETE' : 'EXPEDITION FAILED'}</div><h1>${success ? '던전이 당신을 기억합니다.' : '이번 운명은, 여기까지.'}</h1><p>${success ? '열 개의 방, 그리고 마지막 보스. 함께 살아남았습니다.' : '누적 기절 5회. 이번 원정의 점수와 골드는 모두 무효가 됩니다.'}</p><div class="end-stats"><span>도달 스테이지 <b>${g.stage_index} / 10</b></span><span>플레이한 턴 <b>${g.turn_index - 1}</b></span><span>누적 기절 <b>${g.party_knockouts} / 5</b></span></div><div class="ranking">${ranked.map((m, i) => `<div><span class="rank">0${i + 1}</span><span class="small-avatar avatar-${m.seat_index}">${['♠', '◈', '♜', '✧'][m.seat_index]}</span><b>${escape(m.display_name)}${m.user_id === api.user.id ? ' · 나' : ''}</b><span>${g.state.players[m.id].score} <small>PTS</small></span><span>${g.state.players[m.id].gold} <small>G</small></span></div>`).join('')}</div><button class="button primary" data-action="leave" data-network>새로운 원정 준비 <span>→</span></button></section>`;
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
  if (action === 'add-ai') void perform('add_ai', { ai_type: button.dataset.type });
  if (action === 'remove-ai') void perform('remove_ai', { member_id: button.dataset.id });
  if (action === 'start') void perform('start_game');
  if (action === 'copy') { try { await navigator.clipboard.writeText(bundle.room.room_code); toast('방 코드를 복사했습니다.'); } catch { toast(`방 코드: ${bundle.room.room_code}`); } }
  if (action === 'leave-confirm') {
    if (animating) { toast('결과 연출이 끝난 뒤 나갈 수 있습니다.'); return; }
    showModal(`<div class="eyebrow">LEAVE PARTY</div><h2>원정대를 떠날까요?</h2><p>${bundle.session?.status === 'active' ? '진행 중인 자리는 균형형 AI가 이어받습니다. 나간 원정에는 다시 참가할 수 없습니다.' : '호스트라면 다음 인간 플레이어에게 호스트가 이전됩니다.'}</p><button class="button primary full" data-action="leave" data-network>방 나가기 →</button>`);
  }
  if (action === 'leave') { modal.close(); void perform('leave_room'); }
  if (action === 'select-card') { selected = Number(button.dataset.index); renderGame(); }
  if (action === 'submit' && selected !== null && !animating) {
    const me = mine(), g = bundle.session;
    void perform('submit_card', { session_id: g.id, turn_index: g.turn_index, member_id: me.id, card_value: g.state.players[me.id].remainingCards[selected] });
  }
});
document.addEventListener('submit', async event => {
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
document.querySelector('#help').addEventListener('click', () => showModal('<div class="eyebrow">HOW TO SURVIVE</div><h2>눈치를 읽고, 살아남아라.</h2><ol class="guide-list"><li><b>각자 카드 한 장.</b> 4명 모두 비밀리에 선택합니다.</li><li><b>같은 숫자는 전부 무효.</b> 유효한 카드만 공격과 방 효과에 참여합니다.</li><li><b>모든 제출 카드는 소비.</b> 5장을 쓰면 자신의 기본 덱을 다시 받습니다.</li><li><b>HP는 3.</b> 0이 되면 한 턴 자동 제출 후 HP 1로 부활합니다.</li><li><b>누적 기절 5회는 전멸.</b> 점수와 골드를 모두 잃습니다.</li><li><b>10번째 방은 보스.</b> 공격 예고를 읽고, 끝까지 함께 살아남으세요.</li></ol><p class="muted">일반 공격은 카드 숫자만큼 피해를 줍니다. 피해량이 점수가 되고, 막타는 점수·골드 보너스가 있습니다.</p>'));
document.querySelector('#sound').addEventListener('click', async () => { try { const on = await toggleSound(); const button = document.querySelector('#sound'); button.innerHTML = `♪ <span>${on ? 'ON' : 'OFF'}</span>`; button.setAttribute('aria-label', on ? '효과음 끄기' : '효과음 켜기'); button.title = on ? '효과음 끄기' : '효과음 켜기'; } catch { toast('이 브라우저에서는 효과음을 시작할 수 없습니다.'); } });
addEventListener('online', () => { status('재연결 중'); void sync(); });
addEventListener('offline', () => status('연결 끊김 · 복구 대기'));
document.addEventListener('visibilitychange', () => { if (!document.hidden) void sync(); });
setInterval(() => { if (!document.hidden && connected && bundle) void sync(); }, 5000);
renderHome();
try {
  connected = await api.connect(status);
  if (connected) { status('온라인', true); await sync(); }
  else status('서버 설정 대기');
} catch (error) { status('연결 실패'); toast(error.message); }
