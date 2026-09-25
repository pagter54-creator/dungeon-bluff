create extension if not exists pgcrypto;

create table public.characters (
  id text primary key,
  display_name text not null,
  deck jsonb not null check (jsonb_array_length(deck) = 5),
  enabled boolean not null default true
);
insert into public.characters values ('default_001', '기본 캐릭터', '[1,2,3,4,5]', true);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null check (room_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  room_title text not null check (char_length(room_title) between 1 and 40),
  host_user_id uuid not null references auth.users(id),
  status text not null check (status in ('waiting','playing','closed')),
  has_password boolean not null default false,
  max_members integer not null default 4 check (max_members = 4),
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.room_secrets (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  password_hash text not null
);
create table public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid references auth.users(id),
  display_name text not null,
  member_type text not null check (member_type in ('human','ai')),
  ai_type text check (ai_type in ('balanced','greedy','cautious','blocker','chaotic')),
  character_id text not null references public.characters(id),
  seat_index integer not null check (seat_index between 0 and 3),
  joined_at timestamptz not null default now(),
  unique (room_id, seat_index),
  check ((member_type = 'human' and user_id is not null and ai_type is null) or (member_type = 'ai' and user_id is null and ai_type is not null))
);
create unique index one_room_per_user on public.room_members(user_id) where user_id is not null;
create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  status text not null check (status in ('active','completed','failed')),
  stage_index integer not null check (stage_index between 1 and 10),
  turn_index integer not null check (turn_index >= 1),
  party_knockouts integer not null default 0 check (party_knockouts between 0 and 5),
  state jsonb not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (room_id)
);
create table public.turn_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  turn_index integer not null,
  member_id uuid not null,
  card_value integer not null,
  is_ai boolean not null,
  submitted_at timestamptz not null default now(),
  unique (session_id, turn_index, member_id)
);
create index rooms_status on public.rooms(status, created_at desc);
create index members_room on public.room_members(room_id);

alter table public.characters enable row level security;
alter table public.rooms enable row level security;
alter table public.room_secrets enable row level security;
alter table public.room_members enable row level security;
alter table public.game_sessions enable row level security;
alter table public.turn_submissions enable row level security;

revoke all on public.characters, public.rooms, public.room_secrets, public.room_members, public.game_sessions, public.turn_submissions from anon, authenticated;
grant select on public.characters, public.rooms, public.room_members, public.game_sessions to authenticated;
grant all on public.characters, public.rooms, public.room_secrets, public.room_members, public.game_sessions, public.turn_submissions to service_role;

create function public.is_room_member(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.room_members where room_id = p_room and user_id = (select auth.uid()));
$$;
revoke all on function public.is_room_member(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;
create policy characters_read on public.characters for select to authenticated using (enabled);
create policy rooms_read on public.rooms for select to authenticated using (status != 'closed' or public.is_room_member(id));
create policy members_read on public.room_members for select to authenticated using (public.is_room_member(room_id));
create policy sessions_read on public.game_sessions for select to authenticated using (public.is_room_member(room_id));
-- No SELECT/INSERT/UPDATE/DELETE policies for secrets or submissions.
create policy room_private_broadcast on realtime.messages for select to authenticated using (
  extension = 'broadcast' and exists (
    select 1 from public.room_members m
    where m.user_id = (select auth.uid()) and realtime.topic() = 'room:' || m.room_id::text
  )
);

-- One MVCC snapshot for the Edge Function. Never grant these RPCs to clients.
create function public.game_read(p_room uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'room', to_jsonb(r),
    'members', coalesce((select jsonb_agg(m order by m.seat_index) from public.room_members m where m.room_id = r.id), '[]'::jsonb),
    'password_hash', (select password_hash from public.room_secrets where room_id = r.id),
    'session', (select to_jsonb(g) from public.game_sessions g where g.room_id = r.id),
    'submissions', coalesce((select jsonb_agg(t) from public.turn_submissions t join public.game_sessions g on g.id = t.session_id where g.room_id = r.id and t.turn_index = g.turn_index), '[]'::jsonb)
  ) from public.rooms r where r.id = p_room;
$$;

-- Compare-and-swap under a row lock: concurrent Edge invocations must re-read and
-- recompute. Session, membership, submissions and broadcasts commit together.
create function public.game_commit(
  p_room jsonb, p_members jsonb, p_session jsonb, p_submissions jsonb,
  p_expected bigint, p_password_hash text default null, p_events jsonb default '[]'::jsonb
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  rid uuid := (p_room->>'id')::uuid;
  current_version bigint;
  item jsonb;
begin
  if p_expected = -1 then
    insert into public.rooms(id, room_code, room_title, host_user_id, status, has_password)
    values(rid, p_room->>'room_code', p_room->>'room_title', (p_room->>'host_user_id')::uuid, 'waiting', (p_room->>'has_password')::boolean);
    current_version := 0;
    if p_password_hash is not null then
      insert into public.room_secrets values(rid, p_password_hash);
    end if;
  else
    select version into current_version from public.rooms where id = rid for update;
    if current_version is null or current_version != p_expected then
      raise exception 'VERSION_CONFLICT' using errcode = '40001';
    end if;
  end if;
  if jsonb_array_length(p_members) > 4 then raise exception 'ROOM_FULL'; end if;
  if p_room->>'status' != 'closed' and not exists(select 1 from jsonb_array_elements(p_members) m where m->>'member_type' = 'human') then raise exception 'HUMAN_REQUIRED'; end if;
  update public.rooms set host_user_id = (p_room->>'host_user_id')::uuid, status = p_room->>'status', version = current_version + 1, updated_at = now() where id = rid;
  -- Replacing the four seats also handles a departed human becoming an AI.
  delete from public.room_members where room_id = rid;
  insert into public.room_members(id, room_id, user_id, display_name, member_type, ai_type, character_id, seat_index, joined_at)
  select id, room_id, user_id, display_name, member_type, ai_type, character_id, seat_index, joined_at
  from jsonb_populate_recordset(null::public.room_members, p_members);
  if p_session is not null and p_session != 'null'::jsonb then
    insert into public.game_sessions select * from jsonb_populate_record(null::public.game_sessions, p_session)
    on conflict(id) do update set status = excluded.status, stage_index = excluded.stage_index,
      turn_index = excluded.turn_index, party_knockouts = excluded.party_knockouts,
      state = excluded.state, finished_at = excluded.finished_at;
  end if;
  insert into public.turn_submissions select * from jsonb_populate_recordset(null::public.turn_submissions, p_submissions)
  on conflict(session_id, turn_index, member_id) do nothing;
  -- Notifications contain no game state/card values. Clients fetch authorized state.
  for item in select value from jsonb_array_elements(p_events) loop
    perform realtime.send(jsonb_build_object('room_id', rid, 'version', current_version + 1), item->>'event', 'room:' || rid::text, true);
  end loop;
  return current_version + 1;
end;
$$;
revoke all on function public.game_read(uuid) from public, anon, authenticated;
revoke all on function public.game_commit(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb) from public, anon, authenticated;
grant execute on function public.game_read(uuid) to service_role;
grant execute on function public.game_commit(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb) to service_role;
