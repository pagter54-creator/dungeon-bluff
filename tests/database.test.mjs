import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { settleExpedition } from '../supabase/functions/game-api/settlement.js';

let db;
let handler;
let accountHandler;
let remakeHandler;
let useRemakeHandler=false;
let created;
const users = Array.from({ length: 8 }, () => crypto.randomUUID());

// This adapter runs the real Edge router against an actual embedded PostgreSQL
// engine. Only Supabase Auth and Realtime transport are replaced with local stubs.
function queryBuilder(table) {
  const filters = []; let selection = '*', ordering = '', limit = '', single = false;
  const builder = {
    select(value) { selection = value; return builder; },
    eq(column, value) { filters.push([column, '=', value]); return builder; },
    neq(column, value) { filters.push([column, '<>', value]); return builder; },
    order(column, { ascending }) { ordering = ` order by ${column} ${ascending ? 'asc' : 'desc'}`; return builder; },
    limit(value) { limit = ` limit ${Number(value)}`; return builder; },
    maybeSingle() { single = true; return builder; },
    async then(resolve, reject) {
      try {
        const params = filters.map(f => f[2]);
        const where = filters.length ? ' where ' + filters.map(([column, operator], i) => `${column} ${operator} $${i + 1}`).join(' and ') : '';
        const { rows } = await db.query(`select * from public.${table}${where}${ordering}${limit}`, params);
        if (selection.includes('room_members(')) for (const row of rows) row.room_members = (await db.query('select member_type from public.room_members where room_id = $1', [row.id])).rows;
        if (single && rows.length > 1) return resolve({ data: null, error: { message: 'Multiple rows' } });
        resolve({ data: single ? rows[0] || null : rows, error: null });
      } catch (error) { resolve({ data: null, error }); }
    },
  };
  return builder;
}
const admin = {
  auth: { async getUser(token) { return users.includes(token) ? { data: { user: { id: token } }, error: null } : { data: { user: null }, error: new Error('Bad token') }; } },
  from: queryBuilder,
  async rpc(name, args) {
    try {
      const values = Object.values(args).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      const named = Object.keys(args).map((key, i) => `${key} => $${i + 1}`).join(',');
      const { rows } = await db.query(`select public.${name}(${named}) as result`, values);
      return { data: rows[0].result, error: null };
    } catch (error) { return { data: null, error: { code: error.code, message: error.message } }; }
  },
};
async function rawApi(userIndex, action, params = {}) {
  const response = await (useRemakeHandler?remakeHandler:handler)(new Request('https://local.test/functions/v1/game-api', {
    method: 'POST', headers: { Authorization: `Bearer ${users[userIndex] || 'invalid'}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...params }),
  }));
  return { status: response.status, ...await response.json() };
}
// Existing gameplay fixtures explicitly complete the new lobby/asset handshake.
// Dedicated entry tests below use rawApi so the guards themselves are tested.
async function api(userIndex,action,params={}){
 if(action!=='start_game')return rawApi(userIndex,action,params);
 const state=await rawApi(userIndex,'get_room_state',{room_id:params.room_id});
 if(state.room?.host_user_id===users[userIndex]&&state.members?.length===4&&state.room.status==='waiting')
  for(const m of state.members.filter(m=>m.member_type==='human'))await rawApi(users.indexOf(m.user_id),'set_ready',{room_id:params.room_id,ready:true});
 let result=await rawApi(userIndex,action,params);
 if(result.status===200&&result.session?.state.entryLoading){
  for(const m of result.members.filter(m=>m.member_type==='human'))await rawApi(users.indexOf(m.user_id),'assets_loaded',{room_id:params.room_id,session_id:result.session.id});
  result=await rawApi(userIndex,'get_room_state',{room_id:params.room_id});
 }
 return result;
}
before(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,is_anonymous boolean not null default true,email text,email_confirmed_at timestamptz,encrypted_password text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema realtime;
    create table realtime.messages(id serial primary key, topic text, extension text, payload jsonb, private boolean);
    alter table realtime.messages enable row level security;
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
    create function realtime.send(payload jsonb, event text, topic text, private boolean) returns void language sql as $$ insert into realtime.messages(topic,extension,payload,private) values(topic,'broadcast',payload || jsonb_build_object('event', event),private) $$;
    grant usage on schema public, auth, realtime to authenticated, anon, service_role;
    grant select on realtime.messages to authenticated;
  `);
  for (const id of users) await db.query('insert into auth.users values ($1)', [id]);
  await db.exec(await readFile(new URL('../supabase/migrations/202609200001_initial.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609200002_profiles.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609210001_character_system.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609210002_knockout_limit.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609210003_room_expiry.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609210004_account_cosmetics.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609210005_skin_gacha.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609210006_monster_remaster.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609220001_quiet_room_conflicts.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609220002_gambler_skins.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609230001_card_cosmetics.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609240001_skill_balance.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609240002_character_remakes.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609240003_gunner_fighter.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609240004_performance_rp.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609240005_targeted_balance.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609240006_room_remake.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609240007_class_rework.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609240008_fighter_gunner_skins.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609240009_vampire_demonsword.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609240010_ready_loading.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609250001_three_class_rework.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609250002_event_predation.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609250003_twins.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609250004_gambler_eleven_cards.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609250005_demonsword_predation.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609250006_imp_number_steal.sql', import.meta.url), 'utf8'));
  globalThis.__testCreateClient = () => admin;
  globalThis.Deno = { env: { get: () => 'test-value' }, serve: fn => { handler = fn; } };
  let router = stripTypeScriptTypes(await readFile(new URL('../supabase/functions/game-api/index.ts', import.meta.url), 'utf8'));
  router = router.replace(/import \{ createClient \} from 'npm:[^']+';/, 'const createClient = globalThis.__testCreateClient;');
  router = router.replaceAll(/(['"])\.\/([^'"]+)\1/g, (_, quote, file) => `${quote}${new URL(`../supabase/functions/game-api/${file}`, import.meta.url).href}${quote}`);
  await import(`data:text/javascript;base64,${Buffer.from(router).toString('base64')}`);
  remakeHandler=handler;
  // The existing suite exercises compatibility with expeditions already in progress.
  await import(`data:text/javascript;base64,${Buffer.from(router.replace('await characters(), Math.random, 2','await characters(), Math.random, 1')).toString('base64')}`);
  globalThis.Deno.serve=fn=>{accountHandler=fn;};
  let accountSource=stripTypeScriptTypes(await readFile(new URL('../supabase/functions/account-api/index.ts',import.meta.url),'utf8'));
  accountSource=accountSource.replace(/import \{ createClient \} from 'npm:[^']+';/,'const createClient = globalThis.__testCreateClient;');
  await import(`data:text/javascript;base64,${Buffer.from(accountSource).toString('base64')}`);
});
after(async () => { delete globalThis.__testCreateClient; delete globalThis.Deno; await db?.close(); });

test('gambler piles stay private through API, replay snapshots and direct database reads',async()=>{
  const ids=[];
  for(let i=0;i<2;i++){const id=crypto.randomUUID();ids.push(users.length);users.push(id);await db.query('insert into auth.users(id) values ($1)',[id]);}
  const room=(await api(ids[0],'create_room',{room_title:'Private gambler piles'})).room;
  try{
    await api(ids[1],'join_room',{room_id:room.id});await api(ids[0],'add_ai',{room_id:room.id,ai_type:'balanced'});
    let b=await api(ids[0],'add_ai',{room_id:room.id,ai_type:'balanced'});
    const me=b.members.find(m=>m.user_id===users[ids[0]]),peer=b.members.find(m=>m.user_id===users[ids[1]]);
    await api(ids[0],'set_character',{room_id:room.id,member_id:me.id,character_id:'gambler'});
    b=await api(ids[0],'start_game',{room_id:room.id});assert.equal(b.status,200,b.error);
    assert.equal(b.session.state.players[me.id].gamblerDeck.drawComposition.reduce((a,b)=>a+b,0),9);
    const other=await api(ids[1],'get_room_state',{room_id:room.id});
    assert.equal(other.session.state.players[me.id].gamblerDeck.drawComposition,undefined);
    assert.equal(other.session.state.players[me.id].gamblerDeck.drawCount,9);
    const card=b.session.state.players[me.id].cycleCards[0];
    await api(ids[0],'submit_card',{room_id:room.id,session_id:b.session.id,turn_index:1,member_id:me.id,card_id:card.id});
    const peerCard=b.session.state.players[peer.id].cycleCards[0];
    await api(ids[1],'submit_card',{room_id:room.id,session_id:b.session.id,turn_index:1,member_id:peer.id,card_id:peerCard.id});
    for(const viewer of ids){const response=await api(viewer,'get_room_state',{room_id:room.id});assert.ok(!JSON.stringify(response).includes('drawPile'));assert.ok(!JSON.stringify(response).includes('discardPile'));}
    const stored=(await db.query('select state from public.game_sessions where id=$1',[b.session.id])).rows[0].state;
    assert.ok(Array.isArray(stored.players[me.id].characterRuntimeState.drawPile));
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[ids[0]]]);await db.exec('set role authenticated');
    try{assert.equal((await db.query('select * from public.game_sessions where id=$1',[b.session.id])).rows.length,0);}finally{await db.exec('reset role');}
  }finally{for(const id of ids)await api(id,'leave_room',{room_id:room.id});}
});

test('revelation activation commits once under concurrent retries and exposes only submitted peer choices to its owner',async()=>{
 const indexes=[];
 for(let i=0;i<2;i++){const id=crypto.randomUUID();indexes.push(users.length);users.push(id);await db.query('insert into auth.users(id) values ($1)',[id]);}
 const [a,b]=indexes;
 let state=await api(a,'create_room',{room_title:'Revelation activation'});const room_id=state.room.id;
 await api(b,'join_room',{room_id});await api(a,'add_ai',{room_id,ai_type:'balanced'});
 state=await api(a,'add_ai',{room_id,ai_type:'balanced'});
 const owner=state.members.find(m=>m.user_id===users[a]),peer=state.members.find(m=>m.user_id===users[b]);
 await api(a,'set_character',{room_id,member_id:owner.id,character_id:'seer'});
 state=await api(a,'start_game',{room_id});assert.equal(state.status,200,state.error);
 const session=state.session,player=session.state.players[owner.id];
 assert.equal(player.character.display_name,'예언가');assert.equal(player.skillType,'hybrid');
 player.characterRuntimeState.revelationStacks=1;
 await db.query('update public.game_sessions set state=$1 where id=$2',[JSON.stringify(session.state),session.id]);
 const params={room_id,session_id:session.id,turn_index:session.turn_index,member_id:owner.id};
 const responses=await Promise.all([api(a,'activate_skill',params),api(a,'activate_skill',params)]);
 for(const r of responses){assert.equal(r.status,200,r.error);assert.equal(r.session.state.players[owner.id].characterRuntimeState.revelationStacks,0);assert.equal(r.privateState.revealedCards.length,2);}
 assert.equal((await api(b,'activate_skill',params)).status,400);
 const version=responses[0].room.version;
 const repeated=await api(a,'activate_skill',params);assert.equal(repeated.room.version,version);
 assert.equal((await api(a,'get_room_state',{room_id})).room.version,version);
 const card=session.state.players[peer.id].cycleCards[0];
 const locked=await api(b,'submit_card',{...params,member_id:peer.id,card_id:card.id});assert.equal(locked.status,200,locked.error);
 assert.deepEqual(locked.privateState.revealedCards,[]);
 const seen=await api(a,'get_room_state',{room_id});assert.equal(seen.privateState.revealedCards.length,3);
 assert.ok(seen.privateState.revealedCards.some(c=>c.memberId===peer.id&&c.value===card.value));
 assert.ok(!JSON.stringify(seen.session.state).includes('revealedCards'));
 const mine=player.cycleCards[0];
 await api(a,'submit_card',{...params,card_id:mine.id});
 const ended=await api(a,'get_room_state',{room_id});assert.deepEqual(ended.privateState.revealedCards,[]);
 const late=await api(a,'activate_skill',params);assert.equal(late.status,200);
 assert.equal(late.session.state.players[owner.id].characterRuntimeState.revelationStacks,ended.session.state.players[owner.id].characterRuntimeState.revelationStacks);
 const messages=(await db.query('select payload from realtime.messages')).rows;
 assert.ok(!JSON.stringify(messages).includes('card_value'));
 await api(b,'leave_room',{room_id});await api(a,'leave_room',{room_id});
});

test('real migration parses and enforces service-only RPC and private table access', async () => {
  const { rows } = await db.query(`select tablename from pg_tables where schemaname='public'`);
  assert.equal(rows.length, 14);
  await db.exec(`set role authenticated`);
  try {
    await assert.rejects(db.query('select * from public.turn_submissions'), /permission denied/);
    await assert.rejects(db.query('select * from public.room_secrets'), /permission denied/);
    await assert.rejects(db.query('select public.game_read($1)', [crypto.randomUUID()]), /permission denied/);
    await assert.rejects(db.query('update public.characters set enabled=false'), /permission denied/);
    await assert.rejects(db.query('select public.game_profile($1,$2)', [users[0], '침입자']), /permission denied/);
    await assert.rejects(db.query('update public.profiles set display_name=$1', ['침입자']), /permission denied/);
  } finally { await db.exec('reset role'); }
});
test('nicknames persist by verified user ID, validate input, and ignore forged identity', async () => {
  const initial = await api(0, 'get_profile'); assert.equal(initial.status, 200); assert.equal(initial.profile.nickname_set, false);
  assert.equal(initial.profile.user_id, users[0]);
  for (const display_name of ['', '가', '<img onerror=x>', 'a'.repeat(17), 'ab\ncd', null]) {
    assert.equal((await api(0, 'set_profile', { display_name })).status, 400);
  }
  const saved = await api(0, 'set_profile', { user_id: users[1], display_name: '  용감한 모험가  ' });
  assert.equal(saved.status, 200, saved.error); assert.match(saved.profile.display_name, /^용감한 모험가#[0-9]{4}$/); assert.equal(saved.profile.user_id, users[0]);
  assert.equal((await api(0, 'get_profile')).profile.display_name, saved.profile.display_name);
  assert.equal((await api(1, 'get_profile')).profile.nickname_set, false);
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [users[0]]);
  await db.exec('set role authenticated');
  try { const rows = (await db.query('select * from public.profiles')).rows; assert.equal(rows.length, 1); assert.equal(rows[0].user_id, users[0]); }
  finally { await db.exec('reset role'); }
});
test('router rejects invalid JWT and atomically creates a salted password room', async () => {
  const roomCountBefore = (await db.query('select count(*)::int as n from public.rooms')).rows[0].n;
  assert.equal((await api(99, 'list_rooms')).status, 401);
  created = await api(0, 'create_room', { room_title: '트랜잭션 테스트', password: 'secret-test' });
  assert.equal(created.status, 200); assert.match(created.room.room_code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  assert.equal(created.members.length, 1); assert.ok(created.room.has_password);
  assert.match(created.members[0].display_name, /^용감한 모험가#[0-9]{4}$/);
  const secret = (await db.query('select password_hash from public.room_secrets where room_id=$1', [created.room.id])).rows[0].password_hash;
  assert.notEqual(secret, 'secret-test'); assert.ok(secret.includes('.'));
  assert.ok(!JSON.stringify(created).includes('password_hash'));
  assert.equal((await api(0, 'create_room', { room_title: '두 번째 방' })).status, 400);
  assert.equal((await db.query('select count(*)::int as n from public.rooms')).rows[0].n, roomCountBefore + 1, 'failed creation rolls back orphan room');
});
test('password joining, current-room recovery and list filtering keep secrets private', async () => {
  const list = await api(1, 'list_rooms'); assert.equal(list.rooms[0].member_count, 1);
  assert.ok(!JSON.stringify(list).includes('password_hash'));
  assert.equal((await api(1, 'join_room', { room_code: created.room.room_code, password: 'wrong' })).status, 400);
  assert.equal((await api(1, 'join_room', { room_code: created.room.room_code, password: 'secret-test' })).status, 200);
  assert.equal((await api(1, 'get_room_state')).room.id, created.room.id);
  assert.equal((await api(2, 'get_room_state', { room_id: created.room.id })).status, 400);
});
test('host-only controls, four-player limit, and concurrent AI mutations survive CAS retries', async () => {
  assert.equal((await api(1, 'add_ai', { room_id: created.room.id, ai_type: 'balanced' })).status, 400);
  assert.equal((await api(0, 'start_game', { room_id: created.room.id })).status, 400);
  const additions = await Promise.all(['balanced', 'blocker'].map(ai_type => api(0, 'add_ai', { room_id: created.room.id, ai_type })));
  assert.ok(additions.every(r => r.status === 200), JSON.stringify(additions));
  const state = await api(0, 'get_room_state'); assert.equal(state.members.length, 4); assert.equal(new Set(state.members.map(m => m.seat_index)).size, 4);
  assert.equal((await api(2, 'join_room', { room_id: created.room.id, password: 'secret-test' })).status, 400);
  assert.equal((await api(0, 'add_ai', { room_id: created.room.id, ai_type: 'greedy' })).status, 400);
});
test('start game locks AI privately; concurrent human submissions resolve exactly once', async () => {
  const start = await api(0, 'start_game', { room_id: created.room.id });
  assert.equal(start.status, 200); assert.equal(start.session.state.lockedMembers.length, 2);
  assert.ok(!JSON.stringify(start.session).includes('card_value'));
  const raw = (await db.query('select card_value from public.turn_submissions where session_id=$1', [start.session.id])).rows; assert.equal(raw.length, 2);
  const humans = start.members.filter(m => m.member_type === 'human');
  const results = await Promise.all(humans.map((m, i) => api(i, 'submit_card', { room_id: created.room.id, session_id: start.session.id, member_id: m.id, turn_index: 1, card_value: i + 1, card_id: start.session.state.players[m.id].cycleCards.find(c => c.value === i + 1).id })));
  assert.ok(results.every(r => r.status === 200), JSON.stringify(results));
  const state = await api(0, 'get_room_state'); assert.equal(state.session.turn_index, 2); assert.equal(state.session.state.eventLog.length, 1);
  assert.equal((await db.query('select count(*)::int as n from public.turn_submissions where session_id=$1 and turn_index=1', [start.session.id])).rows[0].n, 4);
  assert.equal((await api(0, 'submit_card', { room_id: created.room.id, session_id: start.session.id, member_id: humans[0].id, turn_index: 1, card_value: 1 })).status, 200);
  assert.equal((await api(0, 'submit_card', { room_id: created.room.id, session_id: start.session.id, member_id: humans[1].id, turn_index: 2, card_value: 5 })).status, 400);
});
test('RLS permits member snapshot/realtime reads and rejects outsiders', async () => {
  for (const [index, expected] of [[0, 1], [4, 0]]) {
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [users[index]]);
    await db.query(`select set_config('realtime.topic',$1,false)`, [`room:${created.room.id}`]);
    await db.exec('set role authenticated');
    try {
      assert.equal((await db.query('select * from public.game_sessions')).rows.length, expected);
      assert.equal((await db.query('select * from public.room_members')).rows.length, expected * 4);
      const messages = (await db.query('select * from realtime.messages')).rows;
      if (expected) {
        assert.ok(messages.length > 0); assert.ok(messages.every(m => m.private));
        assert.ok(!JSON.stringify(messages).includes('card_value')); assert.ok(!JSON.stringify(messages).includes('cards'));
      } else assert.equal(messages.length, 0);
    } finally { await db.exec('reset role'); }
  }
});
test('renaming during concurrent card submission preserves nickname, seat, and locked card', async () => {
  const before = await api(0, 'get_room_state');
  const me = before.members.find(m => m.user_id === users[0]);
  const results = await Promise.all([
    api(0, 'set_profile', { display_name: '새로운 이름' }),
    api(0, 'submit_card', { room_id: before.room.id, session_id: before.session.id, turn_index: before.session.turn_index, member_id: me.id, card_id: before.session.state.players[me.id].cycleCards.find(c => !c.used).id, card_value: before.session.state.players[me.id].remainingCards[0] }),
  ]);
  assert.ok(results.every(r => r.status === 200), JSON.stringify(results));
  const next = await api(1, 'get_room_state');
  assert.match(next.members.find(m => m.id === me.id).display_name, /^새로운 이름#[0-9]{4}$/);
  assert.ok(next.session.state.lockedMembers.includes(me.id));
  assert.match((await db.query('select display_name from public.room_members where id=$1', [me.id])).rows[0].display_name, /^새로운 이름#[0-9]{4}$/);
});
test('stale commits roll back without changing room, seats or game state', async () => {
  const { data: before } = await admin.rpc('game_read', { p_room: created.room.id });
  const { error } = await admin.rpc('game_commit', { p_room: before.room, p_members: [], p_session: before.session, p_submissions: [], p_expected: before.room.version - 1 });
  assert.equal(error.code, '40001');
  const { data: current } = await admin.rpc('game_read', { p_room: created.room.id }); assert.deepEqual(current, before);
});
test('host leaving transfers ownership and substitutes AI; last human closes expedition', async () => {
  const state = await api(0, 'get_room_state');
  const departedId = state.members.find(m => m.user_id === users[0]).id;
  assert.equal((await api(0, 'leave_room', { room_id: created.room.id })).status, 200);
  const next = await api(1, 'get_room_state'); assert.equal(next.room.host_user_id, users[1]); assert.equal(next.members.length, 4);
  const replacement = next.members.find(m => m.id === departedId); assert.equal(replacement.ai_type, 'balanced'); assert.equal(replacement.user_id, null);
  assert.equal((await api(0, 'get_room_state', { room_id: created.room.id })).status, 400);
  assert.equal((await api(1, 'leave_room', { room_id: created.room.id })).status, 200);
  const { data: closed } = await admin.rpc('game_read', { p_room: created.room.id }); assert.equal(closed.room.status, 'closed'); assert.equal(closed.session.status, 'failed'); assert.equal(closed.members.length, 0);
  assert.ok(Object.values(closed.session.state.players).every(p => p.score === 0 && p.gold === 0));
  assert.equal((await api(2, 'list_rooms')).rooms.length, 0);
});

test('character selection authorizes self and host AI only, permits duplicates, and freezes after start', async () => {
  const lobby = await api(2, 'create_room', { room_title:'캐릭터 보안 검사' });
  assert.equal(lobby.status,200,lobby.error); assert.equal(lobby.members[0].character_id,'adventurer');
  assert.equal(lobby.characters.length,13);
  await api(3,'join_room',{room_id:lobby.room.id});
  await api(2,'add_ai',{room_id:lobby.room.id,ai_type:'balanced'});
  let state=await api(2,'add_ai',{room_id:lobby.room.id,ai_type:'blocker'});
  const me=state.members.find(m=>m.user_id===users[2]), other=state.members.find(m=>m.user_id===users[3]), ai=state.members.find(m=>m.member_type==='ai');
  assert.equal((await api(2,'set_character',{room_id:lobby.room.id,member_id:other.id,character_id:'imp'})).status,400);
  assert.equal((await api(3,'set_character',{room_id:lobby.room.id,member_id:ai.id,character_id:'mage'})).status,400);
  assert.equal((await api(2,'set_character',{room_id:lobby.room.id,member_id:me.id,character_id:'missing'})).status,400);
  assert.equal((await api(2,'set_character',{room_id:lobby.room.id,member_id:me.id,character_id:'seer'})).status,200);
  assert.equal((await api(2,'set_character',{room_id:lobby.room.id,member_id:ai.id,character_id:'seer'})).status,200);
  state=await api(2,'start_game',{room_id:lobby.room.id});assert.equal(state.status,200,state.error);
  assert.equal(state.session.state.players[me.id].skillId,'revelation');
  assert.equal((await api(2,'set_character',{room_id:lobby.room.id,member_id:me.id,character_id:'imp'})).status,400);
});

test('seer responses reveal only entitled current submissions, never broadcast or another caller', async () => {
  const state=await api(2,'get_room_state');const me=state.members.find(m=>m.user_id===users[2]), other=state.members.find(m=>m.user_id===users[3]);
  const ai=state.members.find(m=>m.member_type==='ai');const session=state.session;
  session.state.players[me.id].characterRuntimeState={revealTargets:[ai.id,other.id],revealExpiresTurn:session.turn_index};
  await db.query('update public.game_sessions set state=$1 where id=$2',[JSON.stringify(session.state),session.id]);
  const aiSubmission=(await db.query('select * from public.turn_submissions where session_id=$1 and member_id=$2 and turn_index=$3',[session.id,ai.id,session.turn_index])).rows[0];
  const seen=await api(2,'get_room_state');assert.deepEqual(seen.privateState.revealedCards,[{memberId:ai.id,value:aiSubmission.card_value}]);
  const hidden=await api(3,'get_room_state',{room_id:state.room.id,member_id:me.id});assert.deepEqual(hidden.privateState.revealedCards,[]);
  assert.ok(!JSON.stringify(seen.session.state).includes('revealedCards'));assert.ok(!JSON.stringify(seen.session.state).includes('card_value'));
  const card=session.state.players[other.id].cycleCards[0];
  const submitted=await api(3,'submit_card',{room_id:state.room.id,session_id:session.id,turn_index:session.turn_index,member_id:other.id,card_id:card.id,use_skill:false});
  assert.equal(submitted.status,200,submitted.error);assert.deepEqual(submitted.privateState.revealedCards,[]);
  const next=await api(2,'get_room_state');assert.equal(next.privateState.revealedCards.length,2);
  assert.ok(next.privateState.revealedCards.some(c=>c.memberId===other.id&&c.value===card.value));
  const messages=(await db.query('select payload from realtime.messages')).rows;
  assert.ok(!JSON.stringify(messages).includes('revealedCards'));assert.ok(!JSON.stringify(messages).includes('card_value'));
  const mine=next.session.state.players[me.id].cycleCards[0];
  await api(2,'submit_card',{room_id:state.room.id,session_id:session.id,turn_index:session.turn_index,member_id:me.id,card_id:mine.id,use_skill:false});
  const expired=await api(2,'get_room_state');assert.deepEqual(expired.privateState.revealedCards,[]);assert.deepEqual(expired.privateState.revealTargets,[]);
});

test('room expiry preserves connected rooms, closes abandoned sessions and releases membership', async () => {
  const room = await api(6, 'create_room', { room_title: 'Expiry test' });
  assert.equal(room.status, 200, room.error);
  const id = room.room.id;
  await db.query("update public.rooms set last_seen_at=now()-interval '29 minutes' where id=$1", [id]);
  assert.equal((await api(6, 'get_room_state', { room_id:id })).room.id, id);
  const age = (await db.query('select extract(epoch from now()-last_seen_at) as age from public.rooms where id=$1',[id])).rows[0].age;
  assert.ok(Number(age)<10);
  for (let i=0;i<3;i++) await api(6,'add_ai',{room_id:id,ai_type:'balanced'});
  const active = await api(6,'start_game',{room_id:id});
  assert.equal(active.status,200,active.error);
  const expected=active.room.version;
  await db.query("update public.rooms set last_seen_at=now()-interval '31 minutes' where id=$1",[id]);
  const listed=await api(7,'list_rooms');
  assert.ok(!listed.rooms.some(r=>r.id===id));
  const saved=(await db.query('select status,version from public.rooms where id=$1',[id])).rows[0];
  assert.equal(saved.status,'closed');assert.equal(Number(saved.version),Number(expected)+1);
  const session=(await db.query('select * from public.game_sessions where room_id=$1',[id])).rows[0];
  assert.equal(session.status,'failed');assert.equal(session.state.turnPhase,'finished');
  assert.ok(Object.values(session.state.players).every(p=>p.gold===0&&p.score===0));
  const stale=await admin.rpc('game_commit',{p_room:active.room,p_members:active.members,p_session:active.session,p_submissions:[],p_expected:expected});
  assert.equal(stale.error.code,'40001');
  const expired=await api(6,'get_room_state',{room_id:id});assert.equal(expired.room,null);assert.equal(expired.expired,true);
  const replacement=await api(6,'create_room',{room_title:'Replacement'});assert.equal(replacement.status,200,replacement.error);
  await api(6,'leave_room',{room_id:replacement.room.id});
  await db.exec('set role authenticated');
  try { await assert.rejects(db.query('select public.game_room_presence($1)',[users[6]]), /permission denied/); }
  finally { await db.exec('reset role'); }
});


test('state reads repair incomplete locks and resolve stored full turns exactly once; retries are idempotent', async () => {
 const room=await api(6,'create_room',{room_title:'Turn recovery'});const id=room.room.id;
 await api(7,'join_room',{room_id:id});
 await api(6,'add_ai',{room_id:id,ai_type:'balanced'});await api(6,'add_ai',{room_id:id,ai_type:'balanced'});
 const start=await api(6,'start_game',{room_id:id});assert.equal(start.status,200,start.error);
 const g=start.session,me=start.members.find(m=>m.user_id===users[6]),other=start.members.find(m=>m.user_id===users[7]);
 await db.query('delete from public.turn_submissions where session_id=$1',[g.id]);
 g.state.lockedMembers=start.members.map(m=>m.id);
 await db.query('update public.game_sessions set state=$1 where id=$2',[JSON.stringify(g.state),g.id]);
 const repaired=await api(6,'get_room_state',{room_id:id});
 assert.equal(repaired.session.state.lockedMembers.length,2);
 assert.ok(!repaired.session.state.lockedMembers.includes(me.id));
 const card=g.state.players[me.id].cycleCards[0];
 const params={room_id:id,session_id:g.id,turn_index:g.turn_index,member_id:me.id,card_id:card.id,card_value:card.value,use_skill:false};
 const first=await api(6,'submit_card',params);assert.equal(first.status,200,first.error);
 const retry=await api(6,'submit_card',params);assert.equal(retry.status,200,retry.error);assert.equal(retry.room.version,first.room.version);
 const second=g.state.players[other.id].cycleCards[0];
 await db.query('insert into public.turn_submissions(id,session_id,turn_index,member_id,card_value,card_id,use_skill,is_ai) values($1,$2,$3,$4,$5,$6,false,false)',[crypto.randomUUID(),g.id,g.turn_index,other.id,second.value,second.id]);
 const messagesBefore=(await db.query('select count(*) as n from realtime.messages')).rows[0].n;
 const responses=await Promise.all([api(6,'get_room_state',{room_id:id}),api(7,'get_room_state',{room_id:id})]);
 assert.ok(responses.every(r=>r.status===200),JSON.stringify(responses));
 const result=await api(6,'get_room_state',{room_id:id});
 assert.equal(result.session.turn_index,g.turn_index+1);assert.equal(result.session.state.eventLog.length,1);
 assert.equal(Number((await db.query('select count(*) as n from realtime.messages')).rows[0].n)-Number(messagesBefore),1);
 const oldRetry=await api(6,'submit_card',params);assert.equal(oldRetry.status,200);assert.equal(oldRetry.session.turn_index,result.session.turn_index);
 const forged=await api(7,'submit_card',params);assert.equal(forged.status,400);
 await api(6,'leave_room',{room_id:id});await api(7,'leave_room',{room_id:id});
});

async function accountApi(userIndex,action,params={}){
 const response=await accountHandler(new Request('https://local.test/account-api',{method:'POST',headers:{Authorization:`Bearer ${users[userIndex]||'bad'}`},body:JSON.stringify({action,...params})}));
 return {status:response.status,...await response.json()};
}
async function newAccount(nickname,registered=true){
 const index=users.length;users.push(crypto.randomUUID());await db.query('insert into auth.users(id) values($1)',[users[index]]);
 await accountApi(index,'get_account');
 if(registered){
  const staged=await accountApi(index,'register_account',{nickname});assert.equal(staged.status,200,staged.error);
  await db.query("update auth.users set is_anonymous=false,email=$2,email_confirmed_at=now(),encrypted_password='auth-managed-hash' where id=$1",[users[index],`user${index}@example.test`]);
  const data=await accountApi(index,'get_account');assert.equal(data.profile.account_type,'registered',JSON.stringify(data));
 }
 return index;
}
let accountOwner,accountOther;
test('registration retains identity and immediately grants initial stats with automatically confirmed Auth credentials',async()=>{
 accountOwner=await newAccount('unused',false);
 const initial=await accountApi(accountOwner,'get_account');assert.match(initial.profile.display_name,/^Guest#[0-9]{4}$/);assert.equal(initial.stats,null);
 const staged=await accountApi(accountOwner,'register_account',{nickname:'DungeonKing',account_type:'registered',user_id:users[0]});
 assert.equal(staged.profile.account_type,'guest');assert.equal(staged.profile.user_id,users[accountOwner]);
 // Confirm Email OFF: Auth writes email, password and automatic confirmation together.
 await db.query("update auth.users set is_anonymous=false,email='king@example.test',email_confirmed_at=now(),encrypted_password='auth-managed-hash' where id=$1",[users[accountOwner]]);
 const done=await accountApi(accountOwner,'get_account');assert.equal(done.profile.user_id,initial.profile.user_id);assert.equal(done.profile.account_type,'registered');assert.equal(done.stats.rating_points,1000);assert.equal(done.stats.account_gold,0);assert.equal(done.profile.free_nickname_change_available,true);
 accountOther=await newAccount('OtherPlayer');
 assert.equal((await accountApi(accountOther,'change_nickname',{nickname:'dungeonking'})).status,400);
});
test('nickname uniqueness, one free change, paid change and same-name no-op are atomic',async()=>{
 let r=await accountApi(accountOwner,'change_nickname',{nickname:'NewKing'});assert.equal(r.status,200,r.error);assert.equal(r.profile.free_nickname_change_available,false);
 assert.equal((await accountApi(accountOwner,'change_nickname',{nickname:'GoldKing'})).status,400);
 await db.query('update public.player_stats set account_gold=100 where user_id=$1',[users[accountOwner]]);
 assert.equal((await accountApi(accountOwner,'change_nickname',{nickname:'otherplayer'})).status,400);
 assert.equal((await accountApi(accountOwner,'get_account')).stats.account_gold,100);
 assert.equal((await accountApi(accountOwner,'change_nickname',{nickname:'GoldKing'})).status,200);
 assert.equal((await accountApi(accountOwner,'get_account')).stats.account_gold,50);
 assert.equal((await accountApi(accountOwner,'change_nickname',{nickname:' GOLDKING '})).status,200);
 assert.equal((await accountApi(accountOwner,'get_account')).stats.account_gold,50);
 // Legacy nickname route cannot bypass price checks.
 assert.equal((await api(accountOwner,'set_profile',{display_name:'LastKing'})).status,200);
 assert.equal((await accountApi(accountOwner,'get_account')).stats.account_gold,0);
});
test('shop purchases serialize debit and ownership; loadout requires ownership and survives reconnect',async()=>{
 const guest=await newAccount('Guest',false);
 assert.equal((await accountApi(guest,'purchase_item',{item_id:'card_front_01'})).status,400);
 assert.equal((await accountApi(accountOwner,'purchase_item',{item_id:'card_front_01'})).status,400);
 await db.query('update public.player_stats set account_gold=10 where user_id=$1',[users[accountOwner]]);
 const buy=await Promise.all([accountApi(accountOwner,'purchase_item',{item_id:'card_front_01',price:0}),accountApi(accountOwner,'purchase_item',{item_id:'card_front_01'})]);
 assert.equal(buy.filter(r=>r.status===200).length,1);
 let data=await accountApi(accountOwner,'get_account');assert.equal(data.stats.account_gold,5);assert.deepEqual(data.inventory,['card_front_01']);
 assert.equal((await accountApi(accountOwner,'equip_item',{item_id:'card_front_03'})).status,400);
 assert.equal((await accountApi(accountOwner,'equip_item',{item_id:'card_front_01'})).status,200);
 await accountApi(accountOwner,'purchase_item',{item_id:'card_back_02'});await accountApi(accountOwner,'equip_item',{item_id:'card_back_02'});
 data=await accountApi(accountOwner,'get_loadout');assert.equal(data.loadout.equipped_card_front,'card_front_01');assert.equal(data.loadout.equipped_card_back,'card_back_02');
 await accountApi(accountOwner,'equip_item',{item_id:'default_card_front'});assert.equal((await accountApi(accountOwner,'get_loadout')).loadout.equipped_card_front,'default_card_front');
 const before=data.stats.account_gold;assert.equal((await accountApi(accountOwner,'purchase_item',{item_id:'skin_gacha'})).status,400);assert.equal((await accountApi(accountOwner,'get_account')).stats.account_gold,before);
});
test('card cosmetic shop exposes five fronts and backs at the server-owned 5 gold price',async()=>{
 const shop=await accountApi(accountOwner,'get_shop');const cards=shop.items.filter(i=>i.item_type==='card_front'||i.item_type==='card_back');
 assert.equal(cards.length,10);assert.equal(cards.filter(i=>i.item_type==='card_front').length,5);assert.equal(cards.filter(i=>i.item_type==='card_back').length,5);
 assert.ok(cards.every(i=>i.price===5));
 assert.deepEqual(cards.filter(i=>i.id.endsWith('_04')||i.id.endsWith('_05')).map(i=>i.id),['card_front_04','card_back_04','card_front_05','card_back_05']);
});
async function rewardFixture(indices,scores,golds,status='completed',duringGame=null,failureStage=null){
 const created=await api(indices[0],'create_room',{room_title:'Reward test'});assert.equal(created.status,200,created.error);
 const id=created.room.id;for(const index of indices.slice(1))await api(index,'join_room',{room_id:id});
 const start=await api(indices[0],'start_game',{room_id:id});assert.equal(start.status,200,start.error);
 if(duringGame)await duringGame(start);
 const {data:b}=await admin.rpc('game_read',{p_room:id});
 for(let i=0;i<indices.length;i++){const m=b.members.find(m=>m.user_id===users[indices[i]]);b.session.state.players[m.id].score=scores[i];b.session.state.players[m.id].gold=golds[i];}
 b.session.status=status;b.session.finished_at=new Date().toISOString();b.session.state.turnPhase='finished';
 if(failureStage!==null){b.session.stage_index=failureStage;b.session.party_knockouts=8;settleExpedition(b.session);}
 const commit=()=>admin.rpc('game_commit',{p_room:b.room,p_members:b.members,p_session:b.session,p_submissions:[],p_expected:b.room.version,p_events:[]});
 const result=await commit();assert.equal(result.error,null,JSON.stringify(result));
 b.room.version=result.data;const repeated=await commit();assert.equal(repeated.error,null,JSON.stringify(repeated));
 return {start,b,close:async()=>{for(const i of indices)await api(i,'leave_room',{room_id:id});}};
}
test('completed rewards use server scores, frozen loadout and idempotent results for all four ranks',async()=>{
 const ids=[accountOwner,accountOther,await newAccount('RewardThird'),await newAccount('RewardFourth')];
 const before=await Promise.all(ids.map(i=>accountApi(i,'get_account')));
 const game=await rewardFixture(ids,[40,30,20,10],[5,4,3,2]);
 const p=game.start.session.state.players[game.start.members.find(m=>m.user_id===users[accountOwner]).id];assert.equal(p.loadout.equipped_card_back,'card_back_02');
 for(let j=0;j<4;j++){
  const after=await accountApi(ids[j],'get_account');assert.equal(after.stats.rating_points,before[j].stats.rating_points+[36,12,-11,-25][j]);assert.equal(after.stats.account_gold,before[j].stats.account_gold+[5,4,3,2][j]);assert.equal(after.stats.games_completed,1);
 }
 assert.equal(Number((await db.query('select count(*) as n from public.game_results where session_id=$1',[game.b.session.id])).rows[0].n),4);
 await game.close();
});
test('ties average rank rewards, RP floors at zero, failure and guests earn no permanent rewards',async()=>{
 const a=await newAccount('TieFirst'),b=await newAccount('TieSecond'),c=await newAccount('TieThird'),d=await newAccount('TieGuest',false),ids=[a,b,c,d];
 await db.query('update public.player_stats set rating_points=0 where user_id=$1',[users[c]]);
 let game=await rewardFixture(ids,[10,10,5,5],[3,3,-2,10]);
 assert.equal((await accountApi(a,'get_account')).stats.rating_points,1021);assert.equal((await accountApi(b,'get_account')).stats.rating_points,1021);assert.equal((await accountApi(c,'get_account')).stats.rating_points,0);assert.equal((await accountApi(c,'get_account')).stats.account_gold,0);assert.equal((await accountApi(d,'get_account')).stats,null);await game.close();
 const before=await accountApi(a,'get_account');game=await rewardFixture(ids,[99,40,30,10],[100,100,100,100],'failed');
 const after=await accountApi(a,'get_account');assert.deepEqual(after.stats,before.stats);assert.equal(Number((await db.query('select count(*) as n from public.game_results where session_id=$1',[game.b.session.id])).rows[0].n),0);await game.close();
});
test('leaderboard exposes nickname and RP only; client writes and internal RPCs are forbidden',async()=>{
 const board=await accountApi(accountOwner,'get_leaderboard');assert.ok(board.entries.some(r=>r.is_me));assert.ok(board.me.nickname);assert.ok(!JSON.stringify(board).includes('@'));assert.ok(!JSON.stringify(board).includes('user_id'));
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[accountOwner]]);await db.exec('set role authenticated');
 try{
  for(const table of ['player_stats','player_inventory','player_loadout','game_results','profiles'])await assert.rejects(db.query(`delete from public.${table}`),/permission denied/);
  for(const fn of ['account_data','account_ensure','account_leaderboard'])await assert.rejects(db.query(`select public.${fn}($1)`,[users[accountOther]]),/permission denied/);
  await assert.rejects(db.query('select public.account_cleanup_guests()'),/permission denied/);
  assert.ok((await db.query('select * from public.player_stats')).rows.every(r=>r.user_id===users[accountOwner]));
 }finally{await db.exec('reset role');}
});
test('guest cleanup ignores polling, protects active rooms and every registered Auth identity',async()=>{
 const idle=await newAccount('Idle',false),active=await newAccount('Active',false);
 await db.query("update public.profiles set last_active_at=now()-interval '31 minutes' where user_id=any($1::uuid[])",[[users[idle],users[active],users[accountOwner]]]);
 const room=await api(active,'create_room',{room_title:'Protected guest'});
 for(let i=0;i<3;i++)await api(active,'add_ai',{room_id:room.room.id,ai_type:'balanced'});
 assert.equal((await api(active,'start_game',{room_id:room.room.id})).status,200);
 await db.query("update public.profiles set last_active_at=now()-interval '31 minutes' where user_id=$1",[users[active]]);
 await api(active,'get_room_state',{room_id:room.room.id});
 assert.ok(Number((await db.query('select extract(epoch from now()-last_active_at) as age from public.profiles where user_id=$1',[users[active]])).rows[0].age)>1800);
 await admin.rpc('account_cleanup_guests',{});
 assert.equal((await db.query('select id from auth.users where id=$1',[users[idle]])).rows.length,0);
 assert.equal((await db.query('select id from auth.users where id=$1',[users[active]])).rows.length,1);
 assert.equal((await db.query('select id from auth.users where id=$1',[users[accountOwner]])).rows.length,1);
 await api(active,'leave_room',{room_id:room.room.id});
 await db.query("update public.profiles set last_active_at=now()-interval '31 minutes' where user_id=$1",[users[active]]);
 const cleared=await admin.rpc('account_cleanup_guests',{});assert.equal(cleared.error,null,JSON.stringify(cleared));
 assert.equal((await db.query('select id from auth.users where id=$1',[users[active]])).rows.length,0);
});

test('registration during a run cannot retroactively become a reward recipient, and loadouts remain frozen',async()=>{
 const a=await newAccount('FrozenFront'),b=await newAccount('FrozenSecond'),c=await newAccount('FrozenThird'),d=await newAccount('LateGuest',false),ids=[a,b,c,d];
 await db.query('update public.player_stats set account_gold=2 where user_id=$1',[users[a]]);
 await accountApi(a,'purchase_item',{item_id:'card_front_01'});
 const game=await rewardFixture(ids,[5,5,5,5],[3,3,3,3],'completed',async start=>{
  await accountApi(a,'equip_item',{item_id:'card_front_01'});
  await accountApi(d,'register_account',{nickname:'LateJoiner'});
  await db.query("update auth.users set is_anonymous=false,email='late@example.test',email_confirmed_at=now(),encrypted_password='hash' where id=$1",[users[d]]);
  assert.equal((await accountApi(d,'get_account')).profile.account_type,'registered');
  const state=await api(a,'get_room_state',{room_id:start.room.id});
  const member=state.members.find(m=>m.user_id===users[a]);assert.equal(state.session.state.players[member.id].loadout.equipped_card_front,'default_card_front');
 });
 assert.equal((await accountApi(a,'get_account')).stats.rating_points,1010);
 const late=await accountApi(d,'get_account');assert.equal(late.stats.rating_points,1000);assert.equal(late.stats.account_gold,0);assert.equal(late.stats.games_completed,0);
 await game.close();
});

test('skin gacha catalog matches 32 illustrations and forbids unowned equips, guest draws and direct purchase',async()=>{
 const {items}=await accountApi(accountOwner,'get_shop');const skins=items.filter(i=>i.item_type==='character_skin');
 assert.equal(skins.length,43);assert.equal(skins.filter(i=>i.is_default).length,13);assert.equal(skins.filter(i=>i.gacha_enabled).length,30);
 const {SKINS}=await import('../src/skins.js');for(const skin of skins){assert.equal(skin.display_name,SKINS[skin.id].name);assert.equal(skin.target_character_id,SKINS[skin.id].character);}
 const guest=await newAccount('SkinGuest',false);
 assert.equal((await accountApi(guest,'draw_skin',{request_id:crypto.randomUUID()})).status,400);
 assert.equal((await accountApi(accountOwner,'draw_skin',{request_id:'bad'})).status,400);
 assert.equal((await accountApi(accountOwner,'purchase_item',{item_id:'mage1',price:0})).status,400);
 assert.equal((await accountApi(accountOwner,'equip_item',{item_id:'mage1'})).status,400);
 assert.equal((await accountApi(accountOwner,'equip_item',{item_id:'mage0'})).status,200);
 await db.exec('set role authenticated');try{
  await assert.rejects(db.query('select public.account_draw_skin($1,$2)',[users[accountOwner],crypto.randomUUID()]),/permission denied/);
  await assert.rejects(db.query('insert into public.skin_draws values($1,$2,$3,now())',[users[accountOwner],crypto.randomUUID(),'mage1']),/permission denied/);
  await assert.rejects(db.query("update public.player_loadout set equipped_character_skins='{}'::jsonb"),/permission denied/);
 }finally{await db.exec('reset role');}
});

test('gacha is atomic, charges once for concurrent retries and never duplicates across all twenty-eight draws',async()=>{
 const u=await newAccount('SkinCollector');const empty=await accountApi(u,'draw_skin',{request_id:crypto.randomUUID()});assert.equal(empty.status,400);
 assert.deepEqual((await accountApi(u,'get_account')).inventory,[]);
 await db.query('update public.player_stats set account_gold=310 where user_id=$1',[users[u]]);
 const request_id=crypto.randomUUID();const results=await Promise.all([accountApi(u,'draw_skin',{request_id,price:0,item_id:'mage1'}),accountApi(u,'draw_skin',{request_id})]);
 results.forEach(r=>assert.equal(r.status,200,r.error));assert.equal(results[0].item.id,results[1].item.id);
 assert.equal((await accountApi(u,'get_account')).stats.account_gold,300);
 const all=[results[0].item.id];
 for(let i=0;i<29;i++){const r=await accountApi(u,'draw_skin',{request_id:crypto.randomUUID()});assert.equal(r.status,200,r.error);all.push(r.item.id);}
 assert.equal(new Set(all).size,30);assert.ok(all.every(id=>!id.endsWith('0')));
 let state=await accountApi(u,'get_account');assert.equal(state.stats.account_gold,10);assert.equal(state.inventory.length,30);
 assert.equal((await accountApi(u,'draw_skin',{request_id:crypto.randomUUID()})).status,400);
 const retry=await accountApi(u,'draw_skin',{request_id});assert.equal(retry.item.id,results[0].item.id);assert.equal(retry.remaining,0);
 assert.equal((await accountApi(u,'get_account')).stats.account_gold,10);
 await accountApi(u,'equip_item',{item_id:'mage1'});await accountApi(u,'equip_item',{item_id:'thief2'});
 state=await accountApi(u,'get_account');assert.deepEqual(state.loadout.equipped_character_skins,{mage:'mage1',rogue:'thief2'});
 const ids=[u,await newAccount('SkinTwo'),await newAccount('SkinThree'),await newAccount('SkinFour')];
 const fixture=await rewardFixture(ids,[4,3,2,1],[0,0,0,0],'completed',async start=>{
  const member=start.members.find(m=>m.user_id===users[u]);assert.equal(start.session.state.players[member.id].loadout.equipped_character_skins.mage,'mage1');
  await accountApi(u,'equip_item',{item_id:'mage0'});
  const live=await api(u,'get_room_state',{room_id:start.room.id});assert.equal(live.status,200,live.error);assert.equal(live.session.state.players[member.id].loadout.equipped_character_skins.mage,'mage1');
 });
 await fixture.close();state=await accountApi(u,'get_account');assert.equal(state.loadout.equipped_character_skins.mage,'mage0');assert.equal(state.loadout.equipped_character_skins.rogue,'thief2');
});

test('concurrent distinct draw requests cannot overspend the last 10 gold',async()=>{
 const u=await newAccount('SkinLastGold');await db.query('update public.player_stats set account_gold=10 where user_id=$1',[users[u]]);
 const results=await Promise.all([accountApi(u,'draw_skin',{request_id:crypto.randomUUID()}),accountApi(u,'draw_skin',{request_id:crypto.randomUUID()})]);
 assert.equal(results.filter(r=>r.status===200).length,1);const state=await accountApi(u,'get_account');assert.equal(state.stats.account_gold,0);assert.equal(state.inventory.length,1);
});

test('wipeout pays staged gold and score exactly once, preserves RP/clear counts and excludes guests',async()=>{
 const ids=[await newAccount('WipeOne'),await newAccount('WipeTwo'),await newAccount('WipeThree'),await newAccount('WipeGuest',false)];
 for(let stage=1;stage<=10;stage++){
  const before=await Promise.all(ids.map(i=>accountApi(i,'get_account')));
  const game=await rewardFixture(ids,[99,51,-5,20],[57,33,-2,60],'failed',null,stage),percent=stage<5?0:(stage-3)*10;
  for(let i=0;i<3;i++){
   const after=await accountApi(ids[i],'get_account');
   assert.equal(after.stats.account_gold,before[i].stats.account_gold+Math.floor(Math.max(0,[57,33,-2][i])*percent/100));
   assert.equal(after.stats.lifetime_run_score,before[i].stats.lifetime_run_score+Math.floor(Math.max(0,[99,51,-5][i])*percent/100));
   for(const field of ['rating_points','games_completed','first_place_count','second_place_count','third_place_count','fourth_place_count'])assert.equal(after.stats[field],before[i].stats[field]);
  }
  assert.equal((await accountApi(ids[3],'get_account')).stats,null);
  const results=(await db.query('select * from public.game_results where session_id=$1',[game.b.session.id])).rows;
  assert.equal(results.length,3);assert.ok(results.every(r=>r.outcome==='failed'&&r.payout_percent===percent&&r.rating_delta===0));
  const snapshot=await accountApi(ids[0],'get_account');await api(ids[0],'get_room_state',{room_id:game.b.room.id});assert.deepEqual((await accountApi(ids[0],'get_account')).stats,snapshot.stats);
  await game.close();
 }
});

test('goblin API retries keep one randomly selected card, hide choices and recover it after a state fetch',async()=>{
 const ids=[await newAccount('ShuffleOne'),await newAccount('ShuffleTwo'),await newAccount('ShuffleThree'),await newAccount('ShuffleFour')];
 const created=await api(ids[0],'create_room',{room_title:'Shuffle recovery'}),room_id=created.room.id;
 for(const i of ids.slice(1))await api(i,'join_room',{room_id});
 const start=await api(ids[0],'start_game',{room_id});const session=start.session;
 session.state.currentStage={category:'boss',contentId:'chaos_goblin',name:'혼돈 고블린'};
 session.state.monster={id:'chaos_goblin',hp:1000,maxHp:1000,attackIn:2,nextAction:'normal',pending:{kind:'shuffle',turn:session.turn_index}};
 await db.query('update public.game_sessions set state=$2::jsonb,stage_index=10 where id=$1',[session.id,JSON.stringify(session.state)]);
 const member=start.members.find(m=>m.user_id===users[ids[0]]),cards=session.state.players[member.id].cycleCards;
 const body={room_id,session_id:session.id,turn_index:session.turn_index,member_id:member.id,card_ids:cards.slice(0,2).map(c=>c.id)};
 assert.equal((await api(ids[0],'submit_card',{...body,card_ids:[cards[0].id]})).status,400);
 assert.equal((await api(ids[0],'submit_card',{...body,card_ids:[cards[0].id,cards[0].id]})).status,400);
 const both=await Promise.all([api(ids[0],'submit_card',body),api(ids[0],'submit_card',body)]);both.forEach(r=>assert.equal(r.status,200,r.error));
 const stored=(await db.query('select * from public.turn_submissions where session_id=$1 and member_id=$2',[session.id,member.id])).rows;
 assert.equal(stored.length,1);assert.ok(body.card_ids.includes(stored[0].card_id));
 const state=await api(ids[1],'get_room_state',{room_id});assert.equal(state.privateState.revealedCards.length,0);assert.ok(state.session.state.lockedMembers.includes(member.id));
 await api(ids[0],'submit_card',body);assert.equal((await db.query('select card_id from public.turn_submissions where session_id=$1 and member_id=$2',[session.id,member.id])).rows[0].card_id,stored[0].card_id);
 for(const i of ids.slice(1)){
  const m=start.members.find(m=>m.user_id===users[i]);const cards=session.state.players[m.id].cycleCards;
  assert.equal((await api(i,'submit_card',{...body,member_id:m.id,card_ids:cards.slice(0,2).map(c=>c.id)})).status,200);
 }
 const resolved=await api(ids[0],'get_room_state',{room_id});assert.equal(resolved.session.turn_index,session.turn_index+1);
 for(const p of Object.values(resolved.session.state.players))assert.equal(p.cycleCards.filter(c=>c.used).length,1);
 for(const i of ids)await api(i,'leave_room',{room_id});
});

test('hunter public mark exposes only its target through API until resolution, including after reconnect',async()=>{
 const ids=[await newAccount('MarkOne'),await newAccount('MarkTwo'),await newAccount('MarkThree'),await newAccount('MarkFour')];
 const created=await api(ids[0],'create_room',{room_title:'Hunter reveal'}),room_id=created.room.id;
 for(const i of ids.slice(1))await api(i,'join_room',{room_id});
 const start=await api(ids[0],'start_game',{room_id}),session=start.session;
 const m=start.members.find(m=>m.user_id===users[ids[0]]);
 session.state.currentStage={category:'boss',contentId:'coward_hunter',name:'비겁한 사냥꾼'};
 session.state.monster={id:'coward_hunter',hp:1000,maxHp:1000,attackIn:2,nextAction:'normal',pending:{kind:'mark',turn:session.turn_index,targets:[m.id]}};
 await db.query('update public.game_sessions set state=$2::jsonb,stage_index=10 where id=$1',[session.id,JSON.stringify(session.state)]);
 for(const i of ids.slice(0,2)){
  const member=start.members.find(m=>m.user_id===users[i]),card=session.state.players[member.id].cycleCards[0];
  assert.equal((await api(i,'submit_card',{room_id,session_id:session.id,turn_index:session.turn_index,member_id:member.id,card_id:card.id,card_value:card.value})).status,200);
 }
 for(const i of ids){const view=await api(i,'get_room_state',{room_id});assert.deepEqual(view.privateState.revealedCards,[{memberId:m.id,value:1}]);}
 for(const i of ids)await api(i,'leave_room',{room_id});
});

test('expected simultaneous CAS misses return data without a database exception or partial writes',async()=>{
 const u=await newAccount('QuietCommit');const room=await api(u,'create_room',{room_title:'CAS test'});
 const {data:before}=await admin.rpc('game_read',{p_room:room.room.id});
 const args={p_room:before.room,p_members:before.members,p_session:before.session,p_submissions:[],p_expected:before.room.version,p_events:[{event:'room_updated'}]};
 const countBefore=Number((await db.query('select count(*) as n from realtime.messages')).rows[0].n);
 const attempts=await Promise.all([admin.rpc('game_try_commit',args),admin.rpc('game_try_commit',args)]);
 assert.ok(attempts.every(r=>r.error===null));assert.equal(attempts.filter(r=>r.data.conflict).length,1);
 assert.equal(attempts.find(r=>r.data.conflict).data.version,before.room.version+1);
 const fresh=(await admin.rpc('game_read',{p_room:room.room.id})).data;
 assert.equal(fresh.room.version,before.room.version+1);assert.deepEqual(fresh.members,before.members);
 assert.equal(Number((await db.query('select count(*) as n from realtime.messages')).rows[0].n)-countBefore,1);
 const absent=await admin.rpc('game_try_commit',{...args,p_room:{...before.room,id:crypto.randomUUID()}});assert.equal(absent.error,null);assert.equal(absent.data.missing,true);
 await db.exec('set role authenticated');try{await assert.rejects(db.query('select public.game_try_commit($1,$2,$3,$4,$5)',[JSON.stringify(before.room),'[]',null,'[]',before.room.version]),/permission denied/);}finally{await db.exec('reset role');}
 await api(u,'leave_room',{room_id:room.room.id});
});

test('two humans and two AI can repeatedly poll reversed lock order without saving or broadcasting',async()=>{
 const a=await newAccount('PollOne'),b=await newAccount('PollTwo'),room=(await api(a,'create_room',{room_title:'Stable reads'})).room;
 await api(b,'join_room',{room_id:room.id});for(let i=0;i<2;i++)await api(a,'add_ai',{room_id:room.id,ai_type:'balanced'});
 const start=await api(a,'start_game',{room_id:room.id});assert.equal(start.status,200,start.error);
 const {data:stored}=await admin.rpc('game_read',{p_room:room.id});
 stored.session.state.lockedMembers=stored.submissions.map(s=>s.member_id).reverse();
 await db.query('update public.game_sessions set state=$1::jsonb where id=$2',[JSON.stringify(stored.session.state),start.session.id]);
 const messages=Number((await db.query('select count(*) as n from realtime.messages')).rows[0].n);
 for(let i=0;i<8;i++){
  const responses=await Promise.all([api(a,'get_room_state',{room_id:room.id}),api(b,'get_room_state',{room_id:room.id})]);
  responses.forEach(r=>{assert.equal(r.status,200,r.error);assert.equal(r.room.version,stored.room.version);assert.equal(r.session.state.lockedMembers.length,2);});
 }
 assert.equal(Number((await db.query('select count(*) as n from realtime.messages')).rows[0].n),messages);
 await api(a,'leave_room',{room_id:room.id});await api(b,'leave_room',{room_id:room.id});
});

test('a complete two-human/two-AI expedition survives simultaneous submissions, polls and retries',async()=>{
 const humans=[await newAccount('ParallelOne'),await newAccount('ParallelTwo')];
 const room=(await api(humans[0],'create_room',{room_title:'Two player expedition'})).room;
 await api(humans[1],'join_room',{room_id:room.id});for(let i=0;i<2;i++)await api(humans[0],'add_ai',{room_id:room.id,ai_type:'balanced'});
 let state=await api(humans[0],'start_game',{room_id:room.id});assert.equal(state.status,200,state.error);
 const rpc=admin.rpc;let commitErrors=0;
 admin.rpc=async(name,args)=>{const result=await rpc(name,args);if(name==='game_try_commit'&&result.error)commitErrors++;return result;};
 try{
  for(let round=0;state.session.status==='active'&&round<350;round++){
   const session=state.session,turn=session.turn_index,requests=[];
   for(const u of humans){
    const m=state.members.find(m=>m.user_id===users[u]);if(session.state.lockedMembers.includes(m.id))continue;
    const cards=session.state.players[m.id].cycleCards.filter(c=>!c.used),pending=session.state.monster?.pending;
    const shuffle=pending?.kind==='shuffle'&&pending.turn===turn;
    const params={room_id:room.id,session_id:session.id,turn_index:turn,member_id:m.id,...(shuffle?{card_ids:cards.slice(0,2).map(c=>c.id)}:{card_id:cards[0].id,card_value:cards[0].value})};
    requests.push(api(u,'submit_card',params),api(u,'submit_card',params));
   }
   requests.push(...humans.map(u=>api(u,'get_room_state',{room_id:room.id})));
   const results=await Promise.all(requests);results.forEach(r=>assert.equal(r.status,200,r.error));
   state=await api(humans[0],'get_room_state',{room_id:room.id});assert.equal(state.status,200,state.error);assert.ok(state.session.turn_index>turn);
   for(const p of Object.values(state.session.state.players)){assert.equal(p.remainingCards.length+p.discardedCards.length,5);assert.ok(p.hp>=0&&p.hp<=3);}
  }
  assert.notEqual(state.session.status,'active');assert.equal(commitErrors,0);
  const log=state.session.state.eventLog;assert.equal(new Set(log.map(r=>r.turnIndex)).size,log.length);
 }finally{admin.rpc=rpc;for(const u of humans)await api(u,'leave_room',{room_id:room.id});}
});

test('performance RP examples, placement protections, tie rounding and caps are enforced in SQL',async()=>{
 const calc=async(score,mean,gold,rank,ties=1)=>(await db.query('select public.account_rp_delta($1,$2,$3,$4,$5) as delta',[score,mean,gold,rank,ties])).rows[0].delta;
 assert.deepEqual(await Promise.all([200,120,80,50].map((s,i)=>calc(s,112.5,[30,25,20,15][i],i+1))),[64,15,-19,-40]);
 assert.deepEqual(await Promise.all([400,100,60,40].map((s,i)=>calc(s,150,[30,25,20,15][i],i+1))),[100,0,-40,-57]);
 assert.equal(await calc(0,9999,0,2),0);assert.equal(await calc(500,0,5000,2),60);
 assert.equal(await calc(500,0,5000,3),0);assert.equal(await calc(0,9999,0,3),-70);
 assert.equal(await calc(500,0,5000,4),-5);assert.equal(await calc(0,9999,0,4),-100);
 assert.equal(await calc(0,9999,0,1),10);
 assert.equal(await calc(10,10,0,2,2),0);assert.equal(await calc(10,10,0,1,4),10);
 assert.equal(await calc(10,10,-100,3),-10);assert.equal(await calc(10,10,5,3),-10);
 assert.equal(await calc(10,10,6,3),-9);
});
test('performance RP is saved once with actual zero-floor deductions and shared second protection',async()=>{
 const ids=[await newAccount('PerfFirst'),await newAccount('PerfSecond'),await newAccount('PerfThird'),await newAccount('PerfFourth')];
 await db.query('update public.player_stats set rating_points=4 where user_id=$1',[users[ids[3]]]);
 const game=await rewardFixture(ids,[400,100,100,40],[30,25,20,15]);
 const rows=(await db.query('select user_id,placement,rating_delta,rating_after from public.game_results where session_id=$1',[game.b.session.id])).rows;
 for(let i=0;i<4;i++){
  const r=rows.find(r=>r.user_id===users[ids[i]]);
  assert.equal(r.rating_delta,[100,0,0,-4][i]);assert.equal(r.placement,[1,2,2,4][i]);
 }
 const before=await accountApi(ids[0],'get_account');await api(ids[0],'get_room_state',{room_id:game.b.room.id});
 assert.deepEqual((await accountApi(ids[0],'get_account')).stats,before.stats);
 await game.close();
});

test('production remake API persists receipts, all-human readiness, one-time reselection and quiet recovery',async()=>{
 useRemakeHandler=true;
 let room;
 try{
  const ids=[await newAccount('ReceiptOne'),await newAccount('ReceiptTwo'),await newAccount('ReceiptThree'),await newAccount('ReceiptFour')];
  room=(await api(ids[0],'create_room',{room_title:'Room remake'})).room;
  for(const id of ids.slice(1))assert.equal((await api(id,'join_room',{room_id:room.id})).status,200);
  let b=await api(ids[0],'start_game',{room_id:room.id});assert.equal(b.session.state.remakeVersion,2);assert.equal(b.session.state.stageOrder[1].category,'unknown');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[ids[0]]]);await db.exec('set role authenticated');
  try{assert.equal((await db.query('select id from public.game_sessions where id=$1',[b.session.id])).rows.length,0,'hidden routes cannot be read directly through RLS');}finally{await db.exec('reset role');}
  let state=(await db.query('select state from public.game_sessions where id=$1',[b.session.id])).rows[0].state;
  state.currentStage={contentId:'pressure_plate',category:'trap',name:'압력판 회랑',rule:'유효 합 8'};state.monster=null;state.stageTurn=0;
  await db.query('update public.game_sessions set state=$2 where id=$1',[b.session.id,JSON.stringify(state)]);
  const members=ids.map(id=>b.members.find(m=>m.user_id===users[id]));
  const played=await Promise.all(ids.map((id,i)=>{const p=state.players[members[i].id],card=p.cycleCards.find(c=>c.value===i+1);return api(id,'submit_card',{room_id:room.id,session_id:b.session.id,turn_index:1,member_id:members[i].id,card_id:card.id});}));
  assert.ok(played.every(r=>r.status===200));b=await api(ids[0],'get_room_state',{room_id:room.id});assert.equal(b.session.stage_index,1);assert.ok(b.session.state.roomSummary);
  const version=b.room.version;await api(ids[1],'get_room_state',{room_id:room.id});assert.equal((await api(ids[0],'get_room_state',{room_id:room.id})).room.version,version);
  for(const id of ids.slice(0,3))assert.equal((await api(id,'room_ready',{room_id:room.id,session_id:b.session.id,stage_index:1})).status,200);
  assert.equal((await api(ids[0],'get_room_state',{room_id:room.id})).session.stage_index,1);
  const both=await Promise.all([1,2].map(()=>api(ids[3],'room_ready',{room_id:room.id,session_id:b.session.id,stage_index:1})));assert.ok(both.every(r=>r.status===200&&r.session.stage_index===2));
  b=await api(ids[0],'get_room_state',{room_id:room.id});state=(await db.query('select state from public.game_sessions where id=$1',[b.session.id])).rows[0].state;
  state.currentStage={contentId:'armored_boar',category:'monster',name:'멧돼지'};state.monster={id:'armored_boar',hp:999,maxHp:999,attackIn:3};state.stageTurn=0;
  state.personalEchoes={[members[0].id]:{id:'lead',memberId:members[0].id,createdStage:1,activeStage:2}};state.selectionHolds={[members[0].id]:'lead'};
  await db.query('update public.game_sessions set state=$2 where id=$1',[b.session.id,JSON.stringify(state)]);
  const turn=b.session.turn_index;
  for(let i=0;i<4;i++){const card=state.players[members[i].id].cycleCards.find(c=>!c.used);const r=await api(ids[i],'submit_card',{room_id:room.id,session_id:b.session.id,turn_index:turn,member_id:members[i].id,card_id:card.id});assert.equal(r.status,200,r.error);}
  b=await api(ids[0],'get_room_state',{room_id:room.id});assert.equal(b.session.turn_index,turn);
  const fresh=state.players[members[0].id].cycleCards.filter(c=>!c.used)[1];
  const retried=await Promise.all([1,2].map(()=>api(ids[0],'reselect_card',{room_id:room.id,session_id:b.session.id,turn_index:turn,card_id:fresh.id})));
  assert.ok(retried.every(r=>r.status===200));
  const stored=(await db.query('select card_id from public.turn_submissions where session_id=$1 and turn_index=$2 and member_id=$3',[b.session.id,turn,members[0].id])).rows[0];assert.equal(stored.card_id,fresh.id);
  b=await api(ids[0],'get_room_state',{room_id:room.id});assert.equal(b.session.turn_index,turn+1);assert.ok(!b.session.state.selectionHolds[members[0].id]);
  for(const id of ids)await api(id,'leave_room',{room_id:room.id});
 }finally{useRemakeHandler=false;}
});

test('amplification persists effective number and level atomically, retries and reads do not charge twice',async()=>{
 useRemakeHandler=true;const ids=[];let room;
 try{
  for(const name of ['ManaMage','ManaSeer','ManaThird','ManaFourth'])ids.push(await newAccount(name));
  room=(await api(ids[0],'create_room',{room_title:'Mana test'})).room;
  for(const id of ids.slice(1))await api(id,'join_room',{room_id:room.id});
  let b=await api(ids[0],'get_room_state',{room_id:room.id});const members=ids.map(id=>b.members.find(m=>m.user_id===users[id]));
  for(let i=0;i<2;i++)assert.equal((await api(ids[i],'set_character',{room_id:room.id,member_id:members[i].id,character_id:i?'seer':'mage'})).status,200);
  b=await api(ids[0],'start_game',{room_id:room.id});const session=b.session.id;
  let state=(await db.query('select state from public.game_sessions where id=$1',[session])).rows[0].state;
  state.currentStage={contentId:'armored_boar',category:'monster',name:'test'};state.monster={id:'armored_boar',hp:999,maxHp:999,attackIn:99};state.stageTurn=0;
  const mage=state.players[members[0].id];assert.equal(mage.characterRuntimeState.mana,1);mage.characterRuntimeState.mana=4;mage.activeSkillState.available=true;
  state.players[members[1].id].characterRuntimeState.revelationStacks=2;
  await db.query('update public.game_sessions set state=$2 where id=$1',[session,JSON.stringify(state)]);
  const card=mage.cycleCards.find(c=>c.value===4),body={room_id:room.id,session_id:session,turn_index:1,member_id:members[0].id,card_id:card.id,card_value:4,use_skill:true,amplify_level:2};
  assert.equal((await api(ids[0],'submit_card',{...body,amplify_level:3})).status,400);
  const responses=await Promise.all([1,2].map(()=>api(ids[0],'submit_card',body)));assert.ok(responses.every(r=>r.status===200),JSON.stringify({responses:responses.map(r=>({status:r.status,error:r.error})),rows:(await db.query('select card_value,use_skill,amplify_level from public.turn_submissions where session_id=$1',[session])).rows}));
  const stored=(await db.query('select card_value,amplify_level,card_id from public.turn_submissions where session_id=$1 and member_id=$2',[session,members[0].id])).rows[0];assert.equal(stored.card_value,6);assert.equal(stored.amplify_level,2);assert.equal(stored.card_id,card.id);
  const vision=await api(ids[1],'activate_skill',{room_id:room.id,session_id:session,turn_index:1,member_id:members[1].id});assert.equal(vision.privateState.revealedCards.find(c=>c.memberId===members[0].id).value,6);
  const before=await api(ids[0],'get_room_state',{room_id:room.id});const after=await api(ids[0],'get_room_state',{room_id:room.id});assert.equal(before.room.version,after.room.version);assert.equal(after.session.state.players[members[0].id].characterRuntimeState.mana,4);
  for(let i=1;i<4;i++){const c=state.players[members[i].id].cycleCards.find(c=>c.value===i);assert.equal((await api(ids[i],'submit_card',{room_id:room.id,session_id:session,turn_index:1,member_id:members[i].id,card_id:c.id})).status,200);}
  b=await api(ids[0],'get_room_state',{room_id:room.id});assert.equal(b.session.turn_index,2);assert.equal(b.session.state.lastResult.cards.find(c=>c.memberId===members[0].id).value,6);assert.equal(b.session.state.players[members[0].id].characterRuntimeState.mana,1);
  await api(ids[0],'submit_card',body);b=await api(ids[0],'get_room_state',{room_id:room.id});assert.equal(b.session.state.players[members[0].id].characterRuntimeState.mana,1);
 }finally{if(room)for(const id of ids)await api(id,'leave_room',{room_id:room.id});useRemakeHandler=false;}
});


test('lobby readiness and all-human asset barrier are authoritative, idempotent and quiet on reads',async()=>{
 const a=await newAccount('EntryHost'),b=await newAccount('EntryGuest');
 let state=await rawApi(a,'create_room',{room_title:'Entry test'});const room_id=state.room.id;
 try{
  await rawApi(b,'join_room',{room_id});await rawApi(a,'add_ai',{room_id,ai_type:'balanced'});state=await rawApi(a,'add_ai',{room_id,ai_type:'balanced'});
  assert.equal((await rawApi(a,'start_game',{room_id})).status,400);
  await rawApi(a,'set_ready',{room_id,ready:true});await rawApi(b,'set_ready',{room_id,ready:true});
  const owner=state.members.find(m=>m.user_id===users[a]);
  state=await rawApi(a,'set_character',{room_id,member_id:owner.id,character_id:'vampire'});
  assert.equal(state.members.find(m=>m.id===owner.id).lobby_ready,false);
  assert.equal((await rawApi(a,'start_game',{room_id})).status,400);
  await rawApi(a,'set_ready',{room_id,ready:true});state=await rawApi(a,'start_game',{room_id});
  assert.equal(state.status,200,state.error);assert.ok(state.session.state.entryLoading);assert.ok(state.session.state.entryAssets.length>=9);
  assert.equal(state.session.state.lockedMembers.length,0);
  const version=state.room.version,session_id=state.session.id;
  for(let i=0;i<3;i++){const read=await rawApi(a,'get_room_state',{room_id});assert.equal(read.room.version,version);assert.equal(read.session.turn_index,1);}
  const card=state.session.state.players[owner.id].cycleCards[0];
  assert.equal((await rawApi(a,'submit_card',{room_id,session_id,member_id:owner.id,turn_index:1,card_id:card.id})).status,400);
  state=await rawApi(a,'assets_loaded',{room_id,session_id});assert.ok(state.session.state.entryLoading);
  const savedVersion=state.room.version;
  state=await rawApi(a,'assets_loaded',{room_id,session_id});assert.equal(state.room.version,savedVersion);
  state=await rawApi(b,'assets_loaded',{room_id,session_id});assert.equal(state.session.state.entryLoading,undefined);
  assert.equal(state.session.turn_index,1);assert.equal(state.session.state.lockedMembers.length,2);
 }finally{await rawApi(a,'leave_room',{room_id});await rawApi(b,'leave_room',{room_id});}
});


test('loading departure promotes AI and opens exactly one set of automatic submissions',async()=>{
 const a=await newAccount('LoadHost'),b=await newAccount('LoadLeave');
 let state=await rawApi(a,'create_room',{room_title:'Loading departure'});const room_id=state.room.id;
 try{
  await rawApi(b,'join_room',{room_id});await rawApi(a,'add_ai',{room_id,ai_type:'balanced'});await rawApi(a,'add_ai',{room_id,ai_type:'balanced'});
  await rawApi(a,'set_ready',{room_id,ready:true});await rawApi(b,'set_ready',{room_id,ready:true});
  state=await rawApi(a,'start_game',{room_id});const session_id=state.session.id;
  await rawApi(a,'assets_loaded',{room_id,session_id});assert.equal((await rawApi(b,'leave_room',{room_id})).status,200);
  state=await rawApi(a,'get_room_state',{room_id});assert.equal(state.session.state.entryLoading,undefined);
  assert.equal(state.session.turn_index,1);assert.equal(new Set(state.session.state.lockedMembers).size,3);
  const rows=(await db.query('select * from public.turn_submissions where session_id=$1',[session_id])).rows;assert.equal(rows.length,3);
 }finally{await rawApi(a,'leave_room',{room_id});}
});


test('twins immediate acrobatics is atomic, public, parity-validated and recharges after a complete cycle',async()=>{
 useRemakeHandler=true;const ids=[];let room;
 try{
  for(const name of ['TwinHost','TwinPeer','TwinThird','TwinFourth'])ids.push(await newAccount(name));
  room=(await api(ids[0],'create_room',{room_title:'Twins test'})).room;
  for(const id of ids.slice(1))await api(id,'join_room',{room_id:room.id});
  let b=await api(ids[0],'get_room_state',{room_id:room.id});const members=ids.map(id=>b.members.find(m=>m.user_id===users[id]));
  assert.equal((await api(ids[0],'set_character',{room_id:room.id,member_id:members[0].id,character_id:'twins'})).status,200);
  b=await api(ids[0],'start_game',{room_id:room.id});assert.equal(b.status,200,b.error);const session=b.session.id;
  const state=(await db.query('select state from public.game_sessions where id=$1',[session])).rows[0].state;
  state.currentStage={contentId:'armored_boar',category:'monster',name:'test'};state.monster={id:'armored_boar',hp:999,maxHp:999,attackIn:99};
  await db.query('update public.game_sessions set state=$2 where id=$1',[session,JSON.stringify(state)]);
  const old=state.players[members[0].id],body={room_id:room.id,session_id:session,turn_index:1,member_id:members[0].id};
  assert.equal((await api(ids[1],'activate_skill',body)).status,400);
  const responses=await Promise.all([1,2].map(()=>api(ids[0],'activate_skill',body)));
  assert.ok(responses.every(r=>r.status===200),JSON.stringify(responses.map(r=>r.error)));
  b=await api(ids[1],'get_room_state',{room_id:room.id});let p=b.session.state.players[members[0].id];
  assert.equal(p.cycleIndex,old.cycleIndex+1);assert.equal(p.characterRuntimeState.parity,1-old.characterRuntimeState.parity);assert.equal(p.activeSkillState.available,false);
  const version=b.room.version;
  assert.equal((await api(ids[0],'activate_skill',body)).room.version,version);
  assert.equal((await api(ids[0],'get_room_state',{room_id:room.id})).room.version,version);
  assert.equal((await api(ids[0],'submit_card',{...body,card_id:old.cycleCards[0].id})).status,400);
  const forbidden=p.cycleCards.find(c=>c.value%2!==p.characterRuntimeState.parity);
  assert.equal((await api(ids[0],'submit_card',{...body,card_id:forbidden.id})).status,400);
  for(let round=0;round<4;round++){
   b=await api(ids[0],'get_room_state',{room_id:room.id});const turn=b.session.turn_index,parity=b.session.state.players[members[0].id].characterRuntimeState.parity;
   for(let i=0;i<4;i++){
    const current=b.session.state.players[members[i].id];const card=current.cycleCards.find(c=>!c.used&&(i!==0||c.value%2===parity));assert.ok(card);
    const result=await api(ids[i],'submit_card',{room_id:room.id,session_id:session,turn_index:turn,member_id:members[i].id,card_id:card.id});assert.equal(result.status,200,result.error);
   }
   b=await api(ids[0],'get_room_state',{room_id:room.id});p=b.session.state.players[members[0].id];
   assert.equal(b.session.turn_index,turn+1);assert.equal(p.characterRuntimeState.parity,1-parity);assert.equal(p.activeSkillState.available,round===3);
  }
  assert.equal(p.cycleIndex,old.cycleIndex+2);
 }finally{if(room)for(const id of ids)await api(id,'leave_room',{room_id:room.id});useRemakeHandler=false;}
});
