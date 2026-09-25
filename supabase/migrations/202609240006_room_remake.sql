begin;
-- Reselection is validated by the service-only API and committed under the room CAS lock.
create or replace function public.game_commit(
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
  on conflict(session_id, turn_index, member_id) do update set card_id=excluded.card_id,card_value=excluded.card_value,use_skill=excluded.use_skill
  where (public.turn_submissions.card_id,public.turn_submissions.card_value,public.turn_submissions.use_skill) is distinct from (excluded.card_id,excluded.card_value,excluded.use_skill);
  -- Notifications contain no game state/card values. Clients fetch authorized state.
  for item in select value from jsonb_array_elements(p_events) loop
    perform realtime.send(jsonb_build_object('room_id', rid, 'version', current_version + 1), item->>'event', 'room:' || rid::text, true);
  end loop;
  return current_version + 1;
end;
$$;
revoke all on function public.game_read(uuid) from public, anon, authenticated;

-- New expeditions contain hidden route candidates. Clients use the authorized,
-- redacted game-api snapshot; legacy snapshots retain their existing read policy.
alter policy sessions_read on public.game_sessions using (public.is_room_member(room_id) and coalesce((state->>'remakeVersion')::integer,1)<2);
commit;
