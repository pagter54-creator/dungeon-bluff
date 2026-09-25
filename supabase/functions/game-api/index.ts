import {chooseRoomReward,echoList,ECHOES,activeEcho,removeEcho,isCombat} from './room-remake.js';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { AI_TYPES } from './config.js';
import { compactHistory } from './history.js';
import { CHARACTER_CATALOG, ensureCharacterState } from './characters.js';
import {hideGamblerDecks} from './gambler-deck.js';
import { privateKnowledge,amplifyLevel,submissionValue } from './skills.js';
import { updateMonsterIntent } from './boss-patterns.js';
import { sameLockedMembers,waitForConflictRetry } from './room-concurrency.js';
import { lobbyReady,beginEntryLoading,finishEntryLoading } from './entry-loading.js';
import { createSession, openTurn, validateSubmission, advanceAutomaticTurns, fillAutomaticSubmissions, activateSkill, roomReady } from './engine.js';

const url = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const code = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), n => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('');

async function passwordHash(password: string, saved?: string) {
  const salt = saved ? Uint8Array.from(atob(saved.split('.')[0]), c => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `${btoa(String.fromCharCode(...salt))}.${btoa(String.fromCharCode(...new Uint8Array(bits)))}`;
}
function equalHash(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
async function read(roomId: string) {
  const { data, error } = await admin.rpc('game_read', { p_room: roomId });
  if (error) throw new Error('방 정보를 읽지 못했습니다.');
  check(data, '방을 찾을 수 없습니다.');
  if (data.session) compactHistory(data.session.state);
  return data;
}
function publicView(bundle: any, userId: string) {
  if(bundle.session)updateMonsterIntent(bundle.session);
  if (bundle.session) for (const player of Object.values(bundle.session.state.players) as any[]) {
    ensureCharacterState(player, bundle.session.state.characterDefinitions[player.characterId]);
    if (player.character.definition?.balanceRevision >= 2) bundle.session.state.characterDefinitions[player.characterId] = structuredClone(player.character);
  }
  const member = bundle.members.find((m: any) => m.user_id === userId);
  const visible=structuredClone(bundle.session);
  if(visible?.state.entryLoading)visible.state.entryAssets=[...new Set(visible.state.stageOrder.map((stage:any)=>stage.contentId))].sort();
  const privateState:any=member?privateKnowledge(bundle.session,member.id,bundle.submissions||[]):{revealTargets:[],revealedCards:[]};
  if(visible?.state.remakeVersion){
    for(const echo of echoList(visible.state)){echo.name=ECHOES[echo.id]?.[0]||echo.id;echo.description=ECHOES[echo.id]?.[2]||'';}
    for(const offer of Object.values(visible.state.roomChoices||{}) as any[])if(offer.kind==='shop'){offer.name=ECHOES[offer.item]?.[0];offer.description=ECHOES[offer.item]?.[2];}
    const map=member&&echoList(bundle.session.state).find(e=>e.id==='map'&&e.memberId===member.id);
    if(map&&map.createdStage===bundle.session.stage_index){const next=bundle.session.state.stageOrder[map.createdStage];privateState.nextRoom=next?(isCombat(next)?'전투':'이벤트'):null;}
    visible.state.stageOrder=visible.state.stageOrder.map((stage:any,i:number)=>i<visible.stage_index?stage:{category:i===9?'boss':'unknown'});
    if(visible.state.gateOptions)visible.state.gateOptions=visible.state.gateOptions.map((o:any)=>({kind:o.kind}));
  }
  hideGamblerDecks(visible,member?.id);
  return { room: bundle.room, members: bundle.members, session: visible,
    characters: Object.values(CHARACTER_CATALOG),
    privateState };
}
async function commit(b: any, expected: number, events: any[], hash: string | null = null) {
  // Clients fetch the committed snapshot for every notification; one is sufficient.
  const { data, error } = await admin.rpc('game_try_commit', { p_room: b.room, p_members: b.members, p_session: b.session, p_submissions: b.submissions, p_expected: expected, p_password_hash: hash, p_events: events.length ? [{ event: 'room_updated' }] : [] });
  if (error) return { error };
  if(data?.missing)return {error:{code:'P0002',message:'방을 찾을 수 없습니다.'}};
  if(data?.conflict)return {error:{code:'ROOM_VERSION_CONFLICT',message:'Room changed; read a fresh snapshot.'}};
  if(!Number.isSafeInteger(data?.version))return {error:{code:'INVALID_COMMIT_RESULT',message:'Invalid room version.'}};
  b.room.version = data.version;
  return { error: null };
}
async function characters() {
  const { data, error } = await admin.from('characters').select('*').eq('enabled', true);
  if (error) throw new Error('캐릭터 정의를 읽지 못했습니다.');
  return Object.fromEntries(data.map(c => [c.id, c]));
}
function newMember(roomId: string, userId: string | null, seat: number, aiType: string | null = null) {
  return { id: crypto.randomUUID(), room_id: roomId, user_id: userId, display_name: userId ? `Player-${userId.slice(0, 4).toUpperCase()}` : `AI-${aiType}`, member_type: userId ? 'human' : 'ai', ai_type: aiType, character_id: 'adventurer', seat_index: seat, joined_at: new Date().toISOString() };
}

async function profileFor(userId: string, displayName: string | null = null) {
  const { data, error } = await admin.rpc('game_profile', { p_user_id: userId, p_display_name: displayName });
  if (error) throw new Error(error.message || '닉네임을 저장하거나 불러오지 못했습니다.');
  return data;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST 요청만 지원합니다.' }, 405);
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: '인증이 필요합니다.' }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: '인증이 만료되었습니다. 다시 연결해 주세요.' }, 401);
    const raw = await req.text();
    check(raw.length <= 8192, '요청이 너무 큽니다.');
    const body = JSON.parse(raw);
    const { action } = body;
    if (action === 'get_profile') return json({ profile: await profileFor(user.id) });
    if (action === 'set_profile') {
      check(typeof body.display_name === 'string', '닉네임을 입력해 주세요.');
      const displayName = body.display_name.normalize('NFC').trim();
      check(/^[\p{L}\p{N} _-]{2,16}$/u.test(displayName), '닉네임은 2~16자의 글자, 숫자, 공백, _ 또는 -로 입력해 주세요.');
      // Identity is always taken from the verified JWT, never from request fields.
      return json({ profile: await profileFor(user.id, displayName) });
    }
    check(typeof body.password === 'undefined' || (typeof body.password === 'string' && body.password.length <= 72), '비밀번호는 최대 72자입니다.');
    const { error: presenceError } = await admin.rpc('game_room_presence', { p_user_id: user.id });
    if (presenceError) throw new Error('방 접속 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    if (action === 'list_rooms') {
      const { data, error } = await admin.from('rooms').select('id, room_code, room_title, status, has_password, max_members, created_at, room_members(member_type)').neq('status', 'closed').order('created_at', { ascending: false }).limit(60);
      if (error) throw new Error('공개 방 목록을 읽지 못했습니다.');
      return json({ rooms: data.map(({ room_members, ...r }) => ({ ...r, member_count: room_members.length, ai_count: room_members.filter(m => m.member_type === 'ai').length })) });
    }
    if (action === 'create_room') {
      check(typeof body.room_title === 'string' && body.room_title.trim().length > 0 && body.room_title.trim().length <= 40, '방 제목은 1~40자로 입력해 주세요.');
      const hash = body.password ? await passwordHash(body.password) : null;
      const profile = await profileFor(user.id);
      for (let i = 0; i < 5; i++) {
        const room = { id: crypto.randomUUID(), room_code: code(), room_title: body.room_title.trim(), host_user_id: user.id, status: 'waiting', has_password: !!hash, max_members: 4, version: 0 };
        const b = { room, members: [newMember(room.id, user.id, 0)], session: null, submissions: [] };
        b.members[0].display_name = profile.display_name;
        const { error } = await commit(b, -1, [{ event: 'room_updated' }], hash);
        if (!error) { await admin.rpc('account_touch', { p_user_id: user.id }); return json(publicView(b, user.id)); }
        if (error.code === '23505' && error.message.includes('room_code')) continue;
        if (error.code === '23505') throw new Error('이미 참가한 방이 있습니다. 기존 방으로 재접속해 주세요.');
        throw new Error('방을 생성하지 못했습니다. 서버 마이그레이션을 확인해 주세요.');
      }
      throw new Error('방 코드 생성에 실패했습니다. 다시 시도해 주세요.');
    }
    let roomId = body.room_id;
    if (action === 'join_room' && body.room_code) {
      check(typeof body.room_code === 'string' && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(body.room_code.toUpperCase()), '방 코드는 영숫자 6자리입니다.');
      const { data } = await admin.from('rooms').select('id').eq('room_code', body.room_code.toUpperCase()).maybeSingle();
      check(data, '방을 찾을 수 없습니다.'); roomId = data!.id;
    }
    if (action === 'get_room_state' && !roomId) {
      const { data, error } = await admin.from('room_members').select('room_id').eq('user_id', user.id).maybeSingle();
      if (error) throw new Error('현재 방을 확인하지 못했습니다.');
      if (!data) return json({ room: null, members: [], session: null });
      roomId = data.room_id;
    }
    check(uuid(roomId), '올바른 room_id가 필요합니다.');
    for (let attempt = 0; attempt < 8; attempt++) {
      const b = await read(roomId);
      const me = b.members.find((m: any) => m.user_id === user.id);
      const expected = b.room.version;
      const events = [{ event: 'room_updated' }];
      if (action === 'get_room_state') {
        if (b.room.status === 'closed') return json({ room: null, members: [], session: null, expired: true });
        check(me, '이 방의 참가자가 아닙니다.');
        if (b.session?.status === 'active' && !b.session.state.entryLoading) {
          const storedLocks=b.submissions.filter((s: any)=>s.turn_index===b.session.turn_index).map((s: any)=>s.member_id);
          const locksChanged=!sameLockedMembers(b.session.state.lockedMembers,storedLocks);
          const submissionCount=b.submissions.length;
          // Stored submissions are authoritative. A UI lock alone is never a card.
          b.session.state.lockedMembers = storedLocks;
          const automaticChanged = fillAutomaticSubmissions(b.session, b.members, b.submissions);
          const recovered = advanceAutomaticTurns(b.session, b.members, b.submissions);
          if (recovered.length || locksChanged || automaticChanged || submissionCount!==b.submissions.length) {
            const { error } = await commit(b, expected, [{ event: 'room_updated' }, ...recovered]);
            if (['ROOM_VERSION_CONFLICT','40001'].includes(error?.code)) {await waitForConflictRetry(attempt);continue;}
            if (error) throw new Error('턴 상태를 복구하지 못했습니다. 다시 시도해 주세요.');
          }
        }
        return json(publicView(b, user.id));
      }
      if (action === 'join_room') {
        if (me) return json(publicView(b, user.id));
        check(b.room.status === 'waiting', '이미 시작했거나 닫힌 방입니다.');
        check(b.members.length < 4, '방이 가득 찼습니다.');
        if (b.room.has_password) check(equalHash(await passwordHash(body.password || '', b.password_hash), b.password_hash), '비밀번호가 일치하지 않습니다.');
        const seat = [0, 1, 2, 3].find(n => !b.members.some((m: any) => m.seat_index === n))!;
        const member = newMember(roomId, user.id, seat);
        member.display_name = (await profileFor(user.id)).display_name;
        b.members.push(member); events.push({ event: 'member_joined' });
      } else {
        check(me, '이 방의 참가자가 아닙니다.');
        if (action === 'leave_room') {
          const humans = b.members.filter((m: any) => m.user_id && m.user_id !== user.id).sort((a: any, c: any) => a.joined_at.localeCompare(c.joined_at));
          if (!humans.length) {
            b.room.status = 'closed'; b.members = [];
            if (b.session?.status === 'active') {
              b.session.status = 'failed'; b.session.finished_at = new Date().toISOString(); b.session.state.turnPhase = 'finished';
              for (const p of Object.values(b.session.state.players) as any[]) { p.score = 0; p.gold = 0; }
              for (const key of ['stageScore','totalScore','gold']) b.session.state[key] = Object.fromEntries(Object.keys(b.session.state.players).map(id => [id, 0]));
            }
          } else {
            if (b.room.host_user_id === user.id) { b.room.host_user_id = humans[0].user_id; events.push({ event: 'host_changed' }); }
            if (b.session?.status === 'active') {
              me.user_id = null; me.member_type = 'ai'; me.ai_type = 'balanced'; me.display_name = 'AI-balanced';
              if(!finishEntryLoading(b.session,b.members))fillAutomaticSubmissions(b.session, b.members, b.submissions);
              events.push(...advanceAutomaticTurns(b.session, b.members, b.submissions));
            } else b.members = b.members.filter((m: any) => m.id !== me.id);
          }
          events.push({ event: 'member_left' });
        } else if (action === 'set_character') {
          check(b.room.status === 'waiting' && !b.session, '게임 시작 후에는 캐릭터를 변경할 수 없습니다.');
          const target = b.members.find((m: any) => m.id === body.member_id);
          check(target && (target.user_id === user.id || (target.member_type === 'ai' && b.room.host_user_id === user.id)), '자신 또는 호스트의 AI만 변경할 수 있습니다.');
          const catalog = await characters();
          check(typeof body.character_id === 'string' && Object.hasOwn(CHARACTER_CATALOG, body.character_id) && catalog[body.character_id]?.enabled, '선택할 수 없는 캐릭터입니다.');
          target.character_id = body.character_id;
          target.lobby_ready = target.member_type === 'ai';
        } else if(action==='set_ready'){
          check(b.room.status==='waiting'&&!b.session,'대기실에서만 준비할 수 있습니다.');
          check(typeof body.ready==='boolean','준비 상태를 확인해 주세요.');
          if(me.lobby_ready===body.ready)return json(publicView(b,user.id));
          me.lobby_ready=body.ready;
        } else if(action==='assets_loaded'){
          check(b.session?.id===body.session_id,'원정이 변경되었습니다.');
          const loading=b.session.state.entryLoading;
          if(!loading||loading.ready.includes(me.id))return json(publicView(b,user.id));
          loading.ready.push(me.id);
          if(finishEntryLoading(b.session,b.members))events.push(...advanceAutomaticTurns(b.session,b.members,b.submissions));
        } else if (['add_ai', 'remove_ai', 'start_game'].includes(action)) {
          check(b.room.host_user_id === user.id, '호스트만 사용할 수 있습니다.');
          check(b.room.status === 'waiting', '대기실에서만 사용할 수 있습니다.');
          if (action === 'add_ai') {
            check(AI_TYPES.includes(body.ai_type), 'AI 성향을 선택해 주세요.'); check(b.members.length < 4, '방이 가득 찼습니다.');
            const seat = [0, 1, 2, 3].find(n => !b.members.some((m: any) => m.seat_index === n))!;
            b.members.push(newMember(roomId, null, seat, body.ai_type)); events.push({ event: 'member_joined' });
          } else if (action === 'remove_ai') {
            check(b.members.some((m: any) => m.id === body.member_id && m.member_type === 'ai'), '제거할 AI를 찾을 수 없습니다.');
            b.members = b.members.filter((m: any) => m.id !== body.member_id); events.push({ event: 'member_left' });
          } else {
            check(b.members.length === 4 && b.members.some((m: any) => m.member_type === 'human'), '인간을 포함한 4명이 필요합니다.');
            check(b.members.every(lobbyReady),'모든 플레이어가 준비를 완료해야 합니다.');
            b.session = createSession(roomId, b.members, await characters(), Math.random, 2); b.room.status = 'playing';
            beginEntryLoading(b.session);b.submissions=[];events.push({event:'game_loading'});
          }
        } else if (['room_ready','room_choice'].includes(action)) {
          check(b.session&&body.session_id===b.session.id,'원정이 변경되었습니다.');
          check(Number.isInteger(body.stage_index)&&body.stage_index>=1,'방 번호를 확인해 주세요.');
          if(body.stage_index<b.session.stage_index||!b.session.state.roomSummary&&b.session.status!=='active')return json(publicView(b,user.id));
          check(b.session.state.roomSummary?.stageIndex===body.stage_index,'결산이 변경되었습니다.');
          const changed=action==='room_ready'?roomReady(b.session,me.id,body.stage_index):chooseRoomReward(b.session,me.id,body.choice);
          if(!changed)return json(publicView(b,user.id));
          events.push(...advanceAutomaticTurns(b.session,b.members,b.submissions));
          fillAutomaticSubmissions(b.session,b.members,b.submissions);
        } else if (['confirm_card','reselect_card'].includes(action)) {
          check(b.session&&body.session_id===b.session.id,'원정이 변경되었습니다.');
          if(body.turn_index<b.session.turn_index)return json(publicView(b,user.id));
          check(body.turn_index===b.session.turn_index&&!b.session.state.roomSummary,'턴이 변경되었습니다.');
          const saved=b.submissions.find((x:any)=>x.turn_index===body.turn_index&&x.member_id===me.id);
          check(saved,'먼저 카드를 제출해 주세요.');
          const echoId=b.session.state.selectionHolds?.[me.id];
          if(!echoId)return json(publicView(b,user.id));
          if(action==='reselect_card'){
            const others=b.submissions.filter((x:any)=>x!==saved);
            const card=validateSubmission(b.session,me,user.id,body,others);
            saved.card_id=card.id;saved.card_value=submissionValue(b.session.state.players[me.id],card,body);saved.use_skill=body.use_skill===true;saved.amplify_level=amplifyLevel(b.session.state.players[me.id],body);
          }
          const echo=activeEcho(b.session,echoId,me.id);if(echo)removeEcho(b.session.state,echo,action==='reselect_card'?'재선택':'확정');
          delete b.session.state.selectionHolds[me.id];
          fillAutomaticSubmissions(b.session,b.members,b.submissions);
          events.push(...advanceAutomaticTurns(b.session,b.members,b.submissions));
        } else if (action === 'activate_skill') {
          check(b.session, '원정이 아직 시작되지 않았습니다.');
          const member = b.members.find((m: any) => m.id === body.member_id);
          check(member?.user_id === user.id && member?.member_type === 'human', '자신의 스킬만 사용할 수 있습니다.');
          if (body.session_id === b.session.id && Number.isInteger(body.turn_index) && body.turn_index > 0 && body.turn_index < b.session.turn_index) return json(publicView(b, user.id));
          if (!activateSkill(b.session, member, user.id, body, b.submissions)) return json(publicView(b, user.id));
          fillAutomaticSubmissions(b.session, b.members, b.submissions);
          events.push({ event: 'skill_activated' });
        } else if (action === 'submit_card') {
          check(b.session, '원정이 아직 시작되지 않았습니다.');
          const member = b.members.find((m: any) => m.id === body.member_id);
          check(member?.user_id === user.id && member?.member_type === 'human', '자신의 카드만 제출할 수 있습니다.');
          // A lost HTTP response must not turn a successful retry into a second play.
          if (body.session_id === b.session.id && Number.isInteger(body.turn_index)) {
            const saved = b.submissions.find((s: any) => s.member_id === member.id && s.turn_index === body.turn_index);
            if ((body.turn_index > 0 && body.turn_index < b.session.turn_index) ||
                (saved && (saved.card_id === body.card_id || Array.isArray(body.card_ids)&&body.card_ids.includes(saved.card_id)) && Boolean(saved.use_skill) === Boolean(body.use_skill) && (saved.amplify_level||0) === amplifyLevel(b.session.state.players[member.id],body))) {
              return json(publicView(b, user.id));
            }
          }
          const card = validateSubmission(b.session, member, user.id, body, b.submissions);
          b.submissions.push({ id: crypto.randomUUID(), session_id: b.session.id, turn_index: b.session.turn_index, member_id: member.id, card_value: submissionValue(b.session.state.players[member.id],card,body), card_id: card.id, amplify_level: amplifyLevel(b.session.state.players[member.id],body), use_skill: body.use_skill === true, is_ai: false, submitted_at: new Date().toISOString() });
          b.session.state.lockedMembers.push(member.id); events.push({ event: 'player_locked' });
          fillAutomaticSubmissions(b.session, b.members, b.submissions);
          events.push(...advanceAutomaticTurns(b.session, b.members, b.submissions));
        } else throw new Error('지원하지 않는 action입니다.');
      }
      const { error } = await commit(b, expected, events);
      if (!error) {
        await admin.rpc('account_touch', { p_user_id: user.id });
        return json(action === 'leave_room' ? { left: true } : publicView(action === 'start_game' ? await read(roomId) : b, user.id));
      }
      if (['ROOM_VERSION_CONFLICT','40001'].includes(error.code)) {await waitForConflictRetry(attempt);continue;}
      if (error.code === '23505') throw new Error('이미 다른 방에 참가 중입니다. 기존 방에서 나와 주세요.');
      throw new Error('상태 저장에 실패했습니다. 다시 시도해 주세요.');
    }
    return json({ error: '요청이 겹쳤습니다. 잠시 후 다시 시도해 주세요.' }, 409);
  } catch (error) {
    return json({ error: error instanceof SyntaxError ? '올바른 JSON이 필요합니다.' : error instanceof Error ? error.message : '요청을 처리하지 못했습니다.' }, 400);
  }
});
