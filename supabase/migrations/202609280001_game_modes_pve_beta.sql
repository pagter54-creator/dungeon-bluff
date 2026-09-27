begin;

-- Explicit room mode. Existing/legacy rows are backfilled to competitive.
alter table public.rooms
  add column if not exists game_mode text not null default 'COMPETITIVE';
alter table public.rooms drop constraint if exists rooms_game_mode_check;
alter table public.rooms
  add constraint rooms_game_mode_check check(game_mode in ('COMPETITIVE','COOP_PVE'));
update public.rooms set game_mode='COMPETITIVE' where game_mode is null;

-- PVE permanent rewards are deliberately isolated from competitive game_results/RP.
alter table public.pve_runs
  add column if not exists rewards_committed boolean not null default false;

create table if not exists public.pve_results(
  run_id uuid not null references public.pve_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  run_gold integer not null check(run_gold>=0),
  rating_before integer not null,
  rating_delta integer not null default 0 check(rating_delta=0),
  rating_after integer not null,
  outcome text not null check(outcome in ('RUN_CLEAR')),
  created_at timestamptz not null default now(),
  primary key(run_id,user_id)
);
alter table public.pve_results enable row level security;
revoke all on public.pve_results from anon,authenticated;
grant all on public.pve_results to service_role;

-- Closing/expiring a room also terminates an unfinished PVE run without
-- inventing any failure/abandon Gold payout.
create or replace function public.pve_abandon_closed_room() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status='closed' and old.status is distinct from 'closed' then
    update public.pve_runs
      set state=jsonb_set(state,'{phase}','"ABANDONED"'::jsonb,true),updated_at=now()
      where room_id=new.id
        and coalesce(state->>'phase','') not in ('RUN_CLEAR','RUN_FAILED','ABANDONED');
  end if;
  return new;
end $$;
drop trigger if exists pve_abandon_on_room_close on public.rooms;
create trigger pve_abandon_on_room_close
after update of status on public.rooms
for each row execute function public.pve_abandon_closed_room();

-- Preserve the current room CAS contract, but persist game_mode on creation only.
-- Updates intentionally never change game_mode: room mode is immutable after create.
create or replace function public.game_commit(
  p_room jsonb, p_members jsonb, p_session jsonb, p_submissions jsonb,
  p_expected bigint, p_password_hash text default null, p_events jsonb default '[]'::jsonb
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  rid uuid := (p_room->>'id')::uuid;
  current_version bigint;
  item jsonb;
  requested_mode text := coalesce(nullif(p_room->>'game_mode',''),'COMPETITIVE');
begin
  if requested_mode not in ('COMPETITIVE','COOP_PVE') then
    raise exception 'INVALID_GAME_MODE' using errcode='22023';
  end if;
  if p_expected = -1 then
    insert into public.rooms(id, room_code, room_title, host_user_id, status, has_password, game_mode)
    values(rid, p_room->>'room_code', p_room->>'room_title', (p_room->>'host_user_id')::uuid, 'waiting', (p_room->>'has_password')::boolean, requested_mode);
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
  update public.rooms
    set host_user_id=(p_room->>'host_user_id')::uuid,
        status=p_room->>'status',
        version=current_version+1,
        updated_at=now()
    where id=rid;
  delete from public.room_members where room_id = rid;
  insert into public.room_members(id, room_id, user_id, display_name, member_type, ai_type, character_id, seat_index, joined_at, lobby_ready)
  select id, room_id, user_id, display_name, member_type, ai_type, character_id, seat_index, joined_at, coalesce(lobby_ready, member_type = 'ai')
  from jsonb_populate_recordset(null::public.room_members, p_members);
  -- During an active COOP_PVE run, a departed human becomes an AI for gameplay
  -- but retains its server-owned userId + departed marker so Gold can remain
  -- unresolved instead of silently choosing a payout rule.
  if (select game_mode from public.rooms where id=rid)='COOP_PVE'
     and p_room->>'status'='playing'
     and exists(select 1 from public.pve_runs where room_id=rid) then
    update public.pve_runs pr set
      state=jsonb_set(
        pr.state,
        '{players}',
        coalesce((
          select jsonb_agg(
            case when not exists(
              select 1 from jsonb_array_elements(p_members) m
              where m->>'id'=player->>'playerId'
            ) then
              jsonb_set(jsonb_set(player,'{memberType}','"ai"'::jsonb,true),'{departed}','true'::jsonb,true)
            else player end
            order by ord
          )
          from jsonb_array_elements(coalesce(pr.state->'players','[]'::jsonb)) with ordinality as x(player,ord)
        ),'[]'::jsonb),
        true
      ),
      updated_at=now()
    where pr.room_id=rid;
  end if;
  if p_session is not null and p_session != 'null'::jsonb then
    insert into public.game_sessions select * from jsonb_populate_record(null::public.game_sessions, p_session)
    on conflict(id) do update set status=excluded.status,stage_index=excluded.stage_index,
      turn_index=excluded.turn_index,party_knockouts=excluded.party_knockouts,
      state=excluded.state,finished_at=excluded.finished_at;
  end if;
  insert into public.turn_submissions select * from jsonb_populate_recordset(null::public.turn_submissions, p_submissions)
  on conflict(session_id,turn_index,member_id) do update
    set card_id=excluded.card_id,card_value=excluded.card_value,use_skill=excluded.use_skill,amplify_level=excluded.amplify_level
  where (public.turn_submissions.card_id,public.turn_submissions.card_value,public.turn_submissions.use_skill,public.turn_submissions.amplify_level)
    is distinct from (excluded.card_id,excluded.card_value,excluded.use_skill,excluded.amplify_level);
  for item in select value from jsonb_array_elements(p_events) loop
    perform realtime.send(jsonb_build_object('room_id',rid,'version',current_version+1),item->>'event','room:'||rid::text,true);
  end loop;
  return current_version+1;
end $$;

-- Atomic room -> PVE start. This is the authoritative COOP_PVE start path.
create or replace function public.pve_start_room(
  p_run_id uuid,p_room uuid,p_expected bigint,p_seed text,p_state jsonb
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  r public.rooms;
  v public.pve_runs;
  clean_state jsonb;
  item jsonb;
begin
  select * into r from public.rooms where id=p_room for update;
  if not found then return jsonb_build_object('missing',true); end if;
  if r.version<>p_expected then return jsonb_build_object('conflict',true,'version',r.version); end if;
  if r.status<>'waiting' then raise exception 'ROOM_NOT_WAITING'; end if;
  if coalesce(r.game_mode,'COMPETITIVE')<>'COOP_PVE' then raise exception 'ROOM_NOT_COOP_PVE'; end if;
  if exists(select 1 from public.game_sessions where room_id=p_room) then raise exception 'PVP_SESSION_EXISTS'; end if;
  if exists(select 1 from public.pve_runs where room_id=p_room) then raise exception 'PVE_RUN_EXISTS'; end if;

  clean_state:=(p_state-'_telemetryPending');
  insert into public.pve_runs(id,room_id,seed,version,state)
    values(p_run_id,p_room,p_seed,0,clean_state) returning * into v;

  update public.rooms set status='playing',version=r.version+1,updated_at=now() where id=p_room;

  for item in select value from jsonb_array_elements(coalesce(p_state->'_telemetryPending','[]'::jsonb))
  loop
    if coalesce(item->>'logType','')<>'' then
      insert into public.pve_telemetry(run_id,action_id,committed_version,log_type,payload)
      values(p_run_id,null,0,item->>'logType',coalesce(item->'payload','{}'::jsonb));
    end if;
  end loop;

  perform realtime.send(
    jsonb_build_object('room_id',p_room,'run_id',p_run_id,'version',r.version+1),
    'pve_run_started','room:'||p_room::text,true
  );
  return jsonb_build_object('conflict',false,'room_version',r.version+1,'run_version',v.version,'state',v.state);
end $$;

-- Keep direct pve.createRun callers safe as well. New clients use pve_start_room.
create or replace function public.pve_create_run(p_run_id uuid,p_room uuid,p_seed text,p_state jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  r public.rooms;
  v public.pve_runs;
  clean_state jsonb;
  item jsonb;
begin
  select * into r from public.rooms where id=p_room for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if r.status<>'waiting' then raise exception 'ROOM_NOT_WAITING'; end if;
  if coalesce(r.game_mode,'COMPETITIVE')<>'COOP_PVE' then raise exception 'ROOM_NOT_COOP_PVE'; end if;
  if exists(select 1 from public.game_sessions where room_id=p_room) then raise exception 'PVP_SESSION_EXISTS'; end if;
  clean_state:=(p_state-'_telemetryPending');
  insert into public.pve_runs(id,room_id,seed,version,state)
    values(p_run_id,p_room,p_seed,0,clean_state) returning * into v;
  update public.rooms set status='playing',updated_at=now() where id=p_room;
  for item in select value from jsonb_array_elements(coalesce(p_state->'_telemetryPending','[]'::jsonb))
  loop
    if coalesce(item->>'logType','')<>'' then
      insert into public.pve_telemetry(run_id,action_id,committed_version,log_type,payload)
      values(p_run_id,null,0,item->>'logType',coalesce(item->'payload','{}'::jsonb));
    end if;
  end loop;
  return jsonb_build_object('version',v.version,'state',v.state);
exception when unique_violation then
  raise exception 'PVE_RUN_EXISTS';
end $$;

-- PVE clear pays server-owned runGold only. It never mutates rating_points.
-- Failure/abandon Gold is intentionally not invented here; the API reports it as unresolved.
create or replace function public.pve_settle_rewards(p_run uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  r public.pve_runs;
  player jsonb;
  uid uuid;
  gold integer;
  old_rating integer;
  inserted_count integer:=0;
  paid_gold integer:=0;
  unresolved_departures integer:=0;
begin
  select * into r from public.pve_runs where id=p_run for update;
  if not found then return jsonb_build_object('missing',true); end if;
  if r.rewards_committed then
    return jsonb_build_object('settled',true,'idempotent',true,'paid_gold',
      coalesce((select sum(run_gold) from public.pve_results where run_id=p_run),0));
  end if;
  if coalesce(r.state->>'phase','') in ('RUN_FAILED','ABANDONED') then
    return jsonb_build_object('settled',false,'reason','AMBIGUOUS_FAILURE_GOLD','rp_delta',0);
  end if;
  if coalesce(r.state->>'phase','')<>'RUN_CLEAR' then
    return jsonb_build_object('settled',false,'reason','RUN_NOT_CLEAR','rp_delta',0);
  end if;

  for player in select value from jsonb_array_elements(coalesce(r.state->'players','[]'::jsonb))
  loop
    if nullif(player->>'userId','') is null then continue; end if;
    uid:=(player->>'userId')::uuid;
    if not exists(select 1 from public.profiles p where p.user_id=uid and p.account_type='registered') then continue; end if;
    if coalesce((player->>'departed')::boolean,false)
       or not exists(select 1 from public.room_members rm where rm.room_id=r.room_id and rm.user_id=uid) then
      unresolved_departures:=unresolved_departures+1;
      continue;
    end if;
    gold:=greatest(0,coalesce((player->>'runGold')::integer,0));
    select rating_points into old_rating from public.player_stats where user_id=uid for update;
    if old_rating is null then continue; end if;
    insert into public.pve_results(run_id,user_id,run_gold,rating_before,rating_delta,rating_after,outcome)
      values(p_run,uid,gold,old_rating,0,old_rating,'RUN_CLEAR')
      on conflict(run_id,user_id) do nothing;
    if found then
      update public.player_stats
        set account_gold=account_gold+gold,
            lifetime_gold_earned=lifetime_gold_earned+gold,
            updated_at=now()
        where user_id=uid;
      inserted_count:=inserted_count+1;
      paid_gold:=paid_gold+gold;
    end if;
  end loop;
  if unresolved_departures=0 then
    update public.pve_runs set rewards_committed=true,updated_at=now() where id=p_run;
  end if;
  return jsonb_build_object(
    'settled',unresolved_departures=0,
    'partial',unresolved_departures>0 and inserted_count>0,
    'reason',case when unresolved_departures>0 then 'AMBIGUOUS_ABANDON_GOLD' else null end,
    'unresolved_departures',unresolved_departures,
    'idempotent',false,'players',inserted_count,'paid_gold',paid_gold,'rp_delta',0
  );
end $$;

revoke all on function public.pve_start_room(uuid,uuid,bigint,text,jsonb) from public,anon,authenticated;
revoke all on function public.pve_create_run(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.pve_settle_rewards(uuid) from public,anon,authenticated;
grant execute on function public.pve_start_room(uuid,uuid,bigint,text,jsonb) to service_role;
grant execute on function public.pve_create_run(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.pve_settle_rewards(uuid) to service_role;

commit;
