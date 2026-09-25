begin;

-- An expected CAS miss is a normal response, not a PostgreSQL ERROR.
-- Keep the same room row locked through the existing atomic commit so no stale
-- snapshot can overwrite a newer turn. The old RPC remains for compatibility.
create function public.game_try_commit(
 p_room jsonb,p_members jsonb,p_session jsonb,p_submissions jsonb,
 p_expected bigint,p_password_hash text default null,p_events jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare rid uuid:=(p_room->>'id')::uuid; current_version bigint; saved_version bigint;
begin
 if p_expected is null or p_expected < -1 then raise exception 'INVALID_EXPECTED_VERSION' using errcode='22023'; end if;
 if p_expected <> -1 then
  select version into current_version from public.rooms where id=rid for update;
  if not found then return jsonb_build_object('missing',true); end if;
  if current_version <> p_expected then return jsonb_build_object('conflict',true,'version',current_version); end if;
 end if;
 saved_version:=public.game_commit(p_room,p_members,p_session,p_submissions,p_expected,p_password_hash,p_events);
 return jsonb_build_object('conflict',false,'version',saved_version);
end $$;
revoke all on function public.game_try_commit(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.game_try_commit(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb) to service_role;

commit;
