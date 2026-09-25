-- Existing rooms get a reconnect grace period when presence tracking is installed.
alter table public.rooms add column last_seen_at timestamptz not null default now();
create index rooms_expiry on public.rooms(last_seen_at) where status <> 'closed';

-- Called only by the authenticated Edge router. Lock the same room row as game_commit
-- and bump its version so an in-flight mutation cannot resurrect an expired room.
create function public.game_room_presence(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  expired record;
  session_row record;
  zeroes jsonb;
  players jsonb;
begin
  for expired in
    select id from public.rooms
    where status <> 'closed' and last_seen_at < now() - interval '30 minutes'
    order by id for update skip locked
  loop
    update public.rooms set status = 'closed', version = version + 1, updated_at = now()
      where id = expired.id;
    for session_row in select id, state from public.game_sessions where room_id = expired.id and status = 'active'
    loop
      select coalesce(jsonb_object_agg(key, value || '{"score":0,"gold":0}'::jsonb), '{}'::jsonb),
        coalesce(jsonb_object_agg(key, 0), '{}'::jsonb)
        into players, zeroes from jsonb_each(session_row.state->'players');
      update public.game_sessions set status = 'failed', finished_at = now(),
        state = session_row.state || jsonb_build_object('turnPhase','finished','players',players,
          'stageScore',zeroes,'totalScore',zeroes,'gold',zeroes)
        where id = session_row.id;
    end loop;
    delete from public.room_members where room_id = expired.id;
  end loop;
  -- A known human's existing membership is required; a visitor cannot keep a room alive.
  update public.rooms r set last_seen_at = now()
    where r.status <> 'closed' and exists (
      select 1 from public.room_members m where m.room_id = r.id and m.user_id = p_user_id
    );
end;
$$;
revoke all on function public.game_room_presence(uuid) from public, anon, authenticated;
grant execute on function public.game_room_presence(uuid) to service_role;
