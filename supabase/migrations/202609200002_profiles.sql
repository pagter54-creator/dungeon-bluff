-- Stable identity: nickname belongs to auth.users.id, never to an email address
-- or room seat. Linking email credentials to the same user will preserve it.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 16),
  nickname_set boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy own_profile_read on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

-- Default names are upgraded lazily; old Auth users and rooms remain compatible.
create function public.game_profile(p_user_id uuid, p_display_name text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  rid uuid;
  saved public.profiles;
begin
  if p_display_name is not null and (
    char_length(p_display_name) not between 2 and 16 or
    p_display_name !~ '^[[:alnum:]가-힣 _-]+$' or
    p_display_name != btrim(p_display_name)
  ) then raise exception 'INVALID_NICKNAME'; end if;

  -- Lock the room before changing live member labels. A stale game_commit will
  -- then retry, rather than overwriting a nickname during concurrent submission.
  if p_display_name is not null then
    select room_id into rid from public.room_members where user_id = p_user_id;
    if rid is not null then perform 1 from public.rooms where id = rid for update; end if;
  end if;
  insert into public.profiles(user_id, display_name, nickname_set)
    values (p_user_id, coalesce(p_display_name, 'Player-' || upper(left(p_user_id::text,4))), p_display_name is not null)
    on conflict (user_id) do nothing;
  if p_display_name is not null then
    update public.profiles set display_name = p_display_name, nickname_set = true, updated_at = now()
      where user_id = p_user_id;
    update public.room_members set display_name = p_display_name where user_id = p_user_id;
    if rid is not null then
      update public.rooms set version = version + 1, updated_at = now() where id = rid;
      perform realtime.send(jsonb_build_object('room_id',rid), 'room_updated', 'room:' || rid::text, true);
    end if;
  end if;
  select * into saved from public.profiles where user_id = p_user_id;
  return to_jsonb(saved);
end;
$$;
revoke all on function public.game_profile(uuid,text) from public, anon, authenticated;
grant execute on function public.game_profile(uuid,text) to service_role;

-- Canonicalize labels when joining and when the existing CAS RPC rewrites seats.
create function public.member_profile_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null then
    new.display_name := coalesce((select display_name from public.profiles where user_id = new.user_id), new.display_name);
  end if;
  return new;
end;
$$;
revoke all on function public.member_profile_name() from public, anon, authenticated;
create trigger room_member_profile before insert or update on public.room_members
  for each row execute function public.member_profile_name();

-- Read the current profile even if a room was created concurrently with rename.
create or replace function public.game_read(p_room uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'room', to_jsonb(r),
    'members', coalesce((select jsonb_agg(to_jsonb(m) || jsonb_build_object('display_name',coalesce(p.display_name,m.display_name)) order by m.seat_index)
      from public.room_members m left join public.profiles p on p.user_id=m.user_id where m.room_id=r.id), '[]'::jsonb),
    'password_hash', (select password_hash from public.room_secrets where room_id = r.id),
    'session', (select to_jsonb(g) from public.game_sessions g where g.room_id = r.id),
    'submissions', coalesce((select jsonb_agg(t) from public.turn_submissions t join public.game_sessions g on g.id=t.session_id where g.room_id=r.id and t.turn_index=g.turn_index), '[]'::jsonb)
  ) from public.rooms r where r.id=p_room;
$$;
