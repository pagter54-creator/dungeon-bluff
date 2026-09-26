-- PVE-001..004: authoritative expedition snapshots isolated from PVP.
create table public.pve_runs (
  id uuid primary key,
  room_id uuid not null unique references public.rooms(id) on delete cascade,
  seed text not null,
  version bigint not null default 0,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.pve_actions (
  run_id uuid not null references public.pve_runs(id) on delete cascade,
  action_id uuid not null,
  committed_version bigint not null,
  created_at timestamptz not null default now(),
  primary key(run_id,action_id)
);
alter table public.pve_runs enable row level security;
alter table public.pve_actions enable row level security;
revoke all on public.pve_runs,public.pve_actions from anon,authenticated;
grant all on public.pve_runs,public.pve_actions to service_role;

create function public.pve_create_run(p_run_id uuid,p_room uuid,p_seed text,p_state jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.pve_runs;
begin
  perform 1 from public.rooms where id=p_room for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if exists(select 1 from public.game_sessions where room_id=p_room) then raise exception 'PVP_SESSION_EXISTS'; end if;
  insert into public.pve_runs(id,room_id,seed,version,state) values(p_run_id,p_room,p_seed,0,p_state) returning * into v;
  update public.rooms set status='playing',updated_at=now() where id=p_room;
  return jsonb_build_object('version',v.version);
exception when unique_violation then
  raise exception 'PVE_RUN_EXISTS';
end $$;

create function public.pve_read(p_run uuid,p_action_id uuid default null) returns jsonb
language sql security definer set search_path='' as $$
  select jsonb_build_object(
    'version',r.version,
    'state',r.state,
    'action_result',case when p_action_id is null then null else
      (select jsonb_build_object('committed_version',a.committed_version) from public.pve_actions a where a.run_id=r.id and a.action_id=p_action_id) end
  ) from public.pve_runs r where r.id=p_run
$$;

create function public.pve_try_commit(p_run uuid,p_expected bigint,p_action_id uuid,p_state jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.pve_runs; prior bigint;
begin
  select * into r from public.pve_runs where id=p_run for update;
  if not found then return jsonb_build_object('missing',true); end if;
  select committed_version into prior from public.pve_actions where run_id=p_run and action_id=p_action_id;
  if prior is not null then return jsonb_build_object('duplicate',true,'version',r.version,'state',r.state); end if;
  if r.version<>p_expected then return jsonb_build_object('conflict',true,'version',r.version,'state',r.state); end if;
  update public.pve_runs set version=version+1,state=jsonb_set(p_state,'{version}',to_jsonb(version+1),true),updated_at=now() where id=p_run returning * into r;
  insert into public.pve_actions(run_id,action_id,committed_version) values(p_run,p_action_id,r.version);
  perform realtime.send(jsonb_build_object('room_id',r.room_id,'run_id',r.id,'version',r.version),'pve_run_updated','room:'||r.room_id::text,true);
  return jsonb_build_object('version',r.version,'state',r.state);
end $$;

revoke all on function public.pve_create_run(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.pve_read(uuid,uuid) from public,anon,authenticated;
revoke all on function public.pve_try_commit(uuid,bigint,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pve_create_run(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.pve_read(uuid,uuid) to service_role;
grant execute on function public.pve_try_commit(uuid,bigint,uuid,jsonb) to service_role;
