-- PVE-011~012: exact idempotent snapshots + transactional telemetry flush.
alter table public.pve_actions add column if not exists result_state jsonb;

create table if not exists public.pve_telemetry (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.pve_runs(id) on delete cascade,
  action_id uuid,
  committed_version bigint not null,
  log_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists pve_telemetry_run_version_idx on public.pve_telemetry(run_id,committed_version,id);
alter table public.pve_telemetry enable row level security;
revoke all on public.pve_telemetry from anon,authenticated;
grant all on public.pve_telemetry to service_role;

create or replace function public.pve_read(p_run uuid,p_action_id uuid default null) returns jsonb
language sql security definer set search_path='' as $$
  select jsonb_build_object(
    'version',r.version,
    'state',r.state,
    'action_result',case when p_action_id is null then null else
      (select jsonb_build_object(
        'committed_version',a.committed_version,
        'state',coalesce(a.result_state,r.state)
      ) from public.pve_actions a where a.run_id=r.id and a.action_id=p_action_id) end
  ) from public.pve_runs r where r.id=p_run
$$;

create or replace function public.pve_try_commit(p_run uuid,p_expected bigint,p_action_id uuid,p_state jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  r public.pve_runs;
  prior public.pve_actions;
  clean_state jsonb;
  next_version bigint;
  item jsonb;
begin
  select * into r from public.pve_runs where id=p_run for update;
  if not found then return jsonb_build_object('missing',true); end if;

  select * into prior from public.pve_actions where run_id=p_run and action_id=p_action_id;
  if found then
    return jsonb_build_object(
      'duplicate',true,
      'version',prior.committed_version,
      'state',coalesce(prior.result_state,r.state)
    );
  end if;

  if r.version<>p_expected then
    return jsonb_build_object('conflict',true,'version',r.version,'state',r.state);
  end if;

  next_version:=r.version+1;
  clean_state:=(p_state-'_telemetryPending');
  clean_state:=jsonb_set(clean_state,'{version}',to_jsonb(next_version),true);

  update public.pve_runs
    set version=next_version,state=clean_state,updated_at=now()
    where id=p_run
    returning * into r;

  insert into public.pve_actions(run_id,action_id,committed_version,result_state)
    values(p_run,p_action_id,r.version,r.state);

  for item in select value from jsonb_array_elements(coalesce(p_state->'_telemetryPending','[]'::jsonb))
  loop
    if coalesce(item->>'logType','')<>'' then
      insert into public.pve_telemetry(run_id,action_id,committed_version,log_type,payload)
      values(p_run,p_action_id,r.version,item->>'logType',coalesce(item->'payload','{}'::jsonb));
    end if;
  end loop;

  perform realtime.send(
    jsonb_build_object('room_id',r.room_id,'run_id',r.id,'version',r.version),
    'pve_run_updated','room:'||r.room_id::text,true
  );
  return jsonb_build_object('version',r.version,'state',r.state);
end $$;

create or replace function public.pve_create_run(p_run_id uuid,p_room uuid,p_seed text,p_state jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v public.pve_runs;
  clean_state jsonb;
  item jsonb;
begin
  perform 1 from public.rooms where id=p_room for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
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

revoke all on function public.pve_read(uuid,uuid) from public,anon,authenticated;
revoke all on function public.pve_try_commit(uuid,bigint,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.pve_create_run(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.pve_read(uuid,uuid) to service_role;
grant execute on function public.pve_try_commit(uuid,bigint,uuid,jsonb) to service_role;
grant execute on function public.pve_create_run(uuid,uuid,text,jsonb) to service_role;
