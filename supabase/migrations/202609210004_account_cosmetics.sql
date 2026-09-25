begin;
-- Additive account/cosmetic foundation. Existing gameplay rows remain intact.
alter table public.profiles drop constraint profiles_display_name_check;
alter table public.profiles add constraint profiles_display_name_check check(char_length(display_name) between 2 and 21);
alter table public.profiles add column account_type text not null default 'guest' check(account_type in ('guest','registered'));
alter table public.profiles add column nickname text;
alter table public.profiles add column nickname_normalized text;
alter table public.profiles add column free_nickname_change_available boolean not null default true;
alter table public.profiles add column last_active_at timestamptz not null default now();
alter table public.profiles add column registration_nickname text;
update public.profiles set nickname=display_name;
-- Existing guests receive distinct display codes, without changing their base name.
do $$ declare p record; candidate text; begin
 for p in select user_id,nickname from public.profiles order by user_id loop
  loop
   candidate:=p.nickname || '#' || lpad(floor(random()*10000)::text,4,'0');
   exit when not exists(select 1 from public.profiles where display_name=candidate);
  end loop;
  update public.profiles set display_name=candidate where user_id=p.user_id;
 end loop;
end $$;
create unique index registered_nickname_unique on public.profiles(nickname_normalized) where account_type='registered';
create unique index guest_display_unique on public.profiles(display_name) where account_type='guest';
create index guest_activity on public.profiles(last_active_at) where account_type='guest';
alter table public.profiles add constraint registered_nickname_required check(account_type='guest' or (nickname is not null and nickname_normalized is not null and nickname_normalized=lower(nickname)));

create table public.player_stats(
 user_id uuid primary key references auth.users(id) on delete cascade,
 rating_points integer not null default 1000 check(rating_points>=0),
 account_gold integer not null default 0 check(account_gold>=0),
 games_completed integer not null default 0,
 first_place_count integer not null default 0,second_place_count integer not null default 0,
 third_place_count integer not null default 0,fourth_place_count integer not null default 0,
 lifetime_run_score bigint not null default 0,lifetime_gold_earned bigint not null default 0,
 updated_at timestamptz not null default now()
);
create index stats_ranking on public.player_stats(rating_points desc,user_id);
create table public.game_results(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references public.game_sessions(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 run_score integer not null,run_gold integer not null,placement integer not null check(placement between 1 and 4),
 rating_before integer not null,rating_delta integer not null,rating_after integer not null,
 completed_at timestamptz not null default now(),unique(session_id,user_id)
);
create table public.shop_items(
 id text primary key,display_name text not null,item_type text not null check(item_type in ('card_front','card_back','character_skin')),
 price integer not null check(price>=0),asset_key text not null,target_character_id text references public.characters(id),
 enabled boolean not null default true,sort_order integer not null default 0,created_at timestamptz not null default now()
);
insert into public.shop_items(id,display_name,item_type,price,asset_key,sort_order) values
 ('card_front_01','황금 서약','card_front',1,'card_front_01',1),('card_front_02','별빛 서고','card_front',1,'card_front_02',2),('card_front_03','비취 유적','card_front',1,'card_front_03',3),
 ('card_back_01','황금 문장','card_back',1,'card_back_01',4),('card_back_02','밤의 성좌','card_back',1,'card_back_02',5),('card_back_03','숲의 봉인','card_back',1,'card_back_03',6);
create table public.player_inventory(user_id uuid references auth.users(id) on delete cascade,item_id text references public.shop_items(id),obtained_at timestamptz not null default now(),primary key(user_id,item_id));
create table public.player_loadout(user_id uuid primary key references auth.users(id) on delete cascade,equipped_card_front text not null default 'default_card_front',equipped_card_back text not null default 'default_card_back',updated_at timestamptz not null default now());
-- Frozen recipient identities avoid paying replacement AIs or late registrations.
create table public.game_reward_members(session_id uuid references public.game_sessions(id) on delete cascade,member_id uuid not null,user_id uuid references auth.users(id) on delete set null,primary key(session_id,member_id));
alter table public.game_sessions add column rewards_committed boolean not null default false;
-- Older finished games must never receive retroactive rewards.
update public.game_sessions set rewards_committed=true where status<>'active';
-- Nullable historical hosts allow safe anonymous-user deletion without deleting game history.
alter table public.rooms alter column host_user_id drop not null;
alter table public.rooms drop constraint rooms_host_user_id_fkey;
alter table public.rooms add constraint rooms_host_user_id_fkey foreign key(host_user_id) references auth.users(id) on delete set null;

do $$ declare t text; begin
 foreach t in array array['player_stats','game_results','shop_items','player_inventory','player_loadout','game_reward_members'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['player_stats','game_results','player_inventory','player_loadout'] loop
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy own_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',t);
 end loop;
end $$;
grant select on public.shop_items to authenticated;
create policy shop_read on public.shop_items for select to authenticated using(enabled);

create function public.account_valid_nickname(p_name text) returns text language plpgsql immutable set search_path='' as $$
declare n text:=normalize(btrim(p_name),NFC); begin
 if n is null or char_length(n) not between 2 and 16 or n !~ '^[[:alnum:]가-힣 _-]+$' then raise exception '닉네임은 2~16자의 글자, 숫자, 공백, _ 또는 -로 입력해 주세요.'; end if;
 return n;
end $$;

-- Never trust client metadata or a requested account_type. Auth is authoritative.
create function public.account_ensure(p_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.profiles; a record; candidate text; base text; begin
 select is_anonymous,email,email_confirmed_at,encrypted_password into a from auth.users where id=p_user_id;
 if not found then raise exception '인증 계정을 찾을 수 없습니다.'; end if;
 select * into p from public.profiles where user_id=p_user_id;
 if not found then
  base:='Guest';
  loop
   candidate:=base || '#' || lpad(floor(random()*10000)::text,4,'0');
   begin
    insert into public.profiles(user_id,display_name,nickname) values(p_user_id,candidate,base) on conflict(user_id) do nothing;
    exit;
   exception when unique_violation then null; end;
  end loop;
 end if;
 select * into p from public.profiles where user_id=p_user_id for update;
 if p.account_type='guest' and a.is_anonymous is false and a.email_confirmed_at is not null and coalesce(a.email,'')<>'' and coalesce(a.encrypted_password,'')<>'' and p.registration_nickname is not null then
  begin
   update public.profiles set account_type='registered',nickname=registration_nickname,nickname_normalized=lower(registration_nickname),display_name=registration_nickname,nickname_set=true,free_nickname_change_available=true,registration_nickname=null,updated_at=now() where user_id=p_user_id returning * into p;
   insert into public.player_stats(user_id) values(p_user_id) on conflict do nothing;
   insert into public.player_loadout(user_id) values(p_user_id) on conflict do nothing;
  exception when unique_violation then null; end;
 end if;
 return to_jsonb(p) || jsonb_build_object('email_verified',a.email_confirmed_at is not null,'password_set',coalesce(a.encrypted_password,'')<>'');
end $$;

create function public.account_data(p_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; begin
 p:=public.account_ensure(p_user_id);
 return jsonb_build_object('profile',p,'stats',(select to_jsonb(s) from public.player_stats s where user_id=p_user_id),
 'inventory',coalesce((select jsonb_agg(i.item_id order by i.item_id) from public.player_inventory i where user_id=p_user_id),'[]'::jsonb),
 'loadout',coalesce((select to_jsonb(l) from public.player_loadout l where user_id=p_user_id),'{"equipped_card_front":"default_card_front","equipped_card_back":"default_card_back"}'::jsonb));
end $$;

create function public.account_register(p_user_id uuid,p_nickname text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n text:=public.account_valid_nickname(p_nickname); p jsonb; begin
 p:=public.account_ensure(p_user_id);
 if p->>'account_type'='registered' then raise exception '이미 등록된 계정입니다.'; end if;
 if exists(select 1 from public.profiles where account_type='registered' and nickname_normalized=lower(n) and user_id<>p_user_id) then raise exception '이미 사용 중인 닉네임입니다.'; end if;
 update public.profiles set registration_nickname=n,last_active_at=now() where user_id=p_user_id;
 return public.account_data(p_user_id);
end $$;

-- Preserve the legacy game-api profile endpoints without bypassing nickname costs.
create or replace function public.game_profile(p_user_id uuid,p_display_name text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.profiles; rid uuid; n text; candidate text; price integer; begin
 select room_id into rid from public.room_members where user_id=p_user_id;
 if rid is not null then perform 1 from public.rooms where id=rid for update; end if;
 perform public.account_ensure(p_user_id);
 select * into p from public.profiles where user_id=p_user_id for update;
 if p_display_name is not null then
  n:=public.account_valid_nickname(p_display_name);
  if lower(n) is distinct from lower(p.nickname) then
   if p.account_type='registered' then
    if exists(select 1 from public.profiles where account_type='registered' and nickname_normalized=lower(n) and user_id<>p_user_id) then raise exception '이미 사용 중인 닉네임입니다.'; end if;
    price:=case when p.free_nickname_change_available then 0 else 50 end;
    update public.player_stats set account_gold=account_gold-price,updated_at=now() where user_id=p_user_id and account_gold>=price;
    if not found then raise exception 'Account Gold가 부족합니다. 닉네임 변경에는 50G가 필요합니다.'; end if;
    update public.profiles set nickname=n,nickname_normalized=lower(n),display_name=n,free_nickname_change_available=false where user_id=p_user_id;
   else
    loop
     candidate:=n || '#' || lpad(floor(random()*10000)::text,4,'0');
     begin
      update public.profiles set nickname=n,display_name=candidate where user_id=p_user_id;
      exit;
     exception when unique_violation then null; end;
    end loop;
   end if;
  end if;
  update public.profiles set nickname_set=true,last_active_at=now(),updated_at=now() where user_id=p_user_id;
 end if;
 select * into p from public.profiles where user_id=p_user_id;
 update public.room_members set display_name=p.display_name where user_id=p_user_id and display_name<>p.display_name;
 if found and rid is not null then
  update public.rooms set version=version+1,updated_at=now() where id=rid;
  perform realtime.send(jsonb_build_object('room_id',rid),'room_updated','room:'||rid::text,true);
 end if;
 return to_jsonb(p);
exception when unique_violation then raise exception '이미 사용 중인 닉네임입니다.';
end $$;

create function public.account_shop(p_user_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(i) order by sort_order,id) from public.shop_items i where enabled),'[]'::jsonb));
$$;
create function public.account_purchase(p_user_id uuid,p_item_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; item public.shop_items; begin
 p:=public.account_ensure(p_user_id);
 if p->>'account_type'<>'registered' then raise exception '이메일 계정을 등록하면 상점을 이용할 수 있습니다.'; end if;
 select * into item from public.shop_items where id=p_item_id and enabled and item_type in ('card_front','card_back');
 if not found then raise exception '구매할 수 없는 아이템입니다.'; end if;
 perform 1 from public.player_stats where user_id=p_user_id for update;
 if exists(select 1 from public.player_inventory where user_id=p_user_id and item_id=p_item_id) then raise exception '이미 보유한 아이템입니다.'; end if;
 update public.player_stats set account_gold=account_gold-item.price,updated_at=now() where user_id=p_user_id and account_gold>=item.price;
 if not found then raise exception 'Account Gold가 부족합니다.'; end if;
 insert into public.player_inventory(user_id,item_id) values(p_user_id,p_item_id);
 update public.profiles set last_active_at=now() where user_id=p_user_id;
 return public.account_data(p_user_id);
end $$;
create function public.account_equip(p_user_id uuid,p_item_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; kind text; begin
 p:=public.account_ensure(p_user_id);
 if p->>'account_type'<>'registered' then raise exception '이메일 계정을 등록하면 인벤토리를 이용할 수 있습니다.'; end if;
 if p_item_id in ('default_card_front','default_card_back') then kind:=replace(p_item_id,'default_','');
 else
  select s.item_type into kind from public.player_inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p_user_id and i.item_id=p_item_id and s.enabled;
 end if;
 if kind is null or kind not in ('card_front','card_back') then raise exception '보유한 카드 치장만 장착할 수 있습니다.'; end if;
 update public.player_loadout set equipped_card_front=case when kind='card_front' then p_item_id else equipped_card_front end,equipped_card_back=case when kind='card_back' then p_item_id else equipped_card_back end,updated_at=now() where user_id=p_user_id;
 update public.profiles set last_active_at=now() where user_id=p_user_id;
 return public.account_data(p_user_id);
end $$;
create function public.account_leaderboard(p_user_id uuid) returns jsonb language sql security definer set search_path='' as $$
 with ranks as (select p.user_id,p.nickname,s.rating_points,rank() over(order by s.rating_points desc) as rank from public.player_stats s join public.profiles p on p.user_id=s.user_id where p.account_type='registered'),
 top_rows as (select * from ranks order by rating_points desc,nickname,user_id limit 100)
 select jsonb_build_object('entries',coalesce((select jsonb_agg(jsonb_build_object('nickname',nickname,'rating_points',rating_points,'rank',rank,'is_me',user_id=p_user_id) order by rating_points desc,nickname,user_id) from top_rows),'[]'::jsonb),
 'me',(select jsonb_build_object('nickname',nickname,'rating_points',rating_points,'rank',rank,'is_me',true) from ranks where user_id=p_user_id));
$$;
create function public.account_touch(p_user_id uuid) returns void language sql security definer set search_path='' as $$
 update public.profiles set last_active_at=now() where user_id=p_user_id;
$$;

-- Old deployed clients/functions may omit the newly added field during rollout.
create function public.account_session_defaults() returns trigger language plpgsql security definer set search_path='' as $$
begin new.rewards_committed:=coalesce(new.rewards_committed,false);return new;end $$;
create trigger account_game_defaults before insert on public.game_sessions for each row execute function public.account_session_defaults();

-- Trigger is part of the same transaction as game_commit: no partial or double reward.
create function public.account_session_rewards() returns trigger language plpgsql security definer set search_path='' as $$
declare m record; member jsonb; n integer; ties integer; delta integer; score integer; gold integer; old_rating integer; new_rating integer; begin
 if tg_op='INSERT' then
  for m in select rm.id,rm.user_id,p.account_type,l.equipped_card_front,l.equipped_card_back from public.room_members rm left join public.profiles p on p.user_id=rm.user_id left join public.player_loadout l on l.user_id=rm.user_id where rm.room_id=new.room_id loop
   insert into public.game_reward_members(session_id,member_id,user_id) values(new.id,m.id,case when m.account_type='registered' then m.user_id else null end);
   -- Snapshot into stored authoritative state; clients never supply loadout.
   update public.game_sessions set state=jsonb_set(state,array['players',m.id::text,'loadout'],jsonb_build_object('equipped_card_front',case when m.account_type='registered' then coalesce(m.equipped_card_front,'default_card_front') else 'default_card_front' end,'equipped_card_back',case when m.account_type='registered' then coalesce(m.equipped_card_back,'default_card_back') else 'default_card_back' end)) where id=new.id;
  end loop;
  return new;
 end if;
 if new.status<>'completed' or old.status='completed' or new.rewards_committed then return new; end if;
 -- Stable user ordering for simultaneous completions touching the same stats.
 for m in select r.member_id,r.user_id from public.game_reward_members r join public.room_members rm on rm.id=r.member_id and rm.user_id=r.user_id join public.profiles pr on pr.user_id=r.user_id where r.session_id=new.id and pr.account_type='registered' order by r.user_id loop
  member:=new.state->'players'->m.member_id::text;score:=(member->>'score')::integer;gold:=greatest(0,(member->>'gold')::integer);
  select count(*) filter(where (value->>'score')::integer>score)+1,count(*) filter(where (value->>'score')::integer=score) into n,ties from jsonb_each(new.state->'players');
  select round(avg((array[30,10,-10,-20])[i]))::integer into delta from generate_series(n,n+ties-1) i;
  select rating_points into old_rating from public.player_stats where user_id=m.user_id for update;
  new_rating:=greatest(0,old_rating+delta);
  insert into public.game_results(session_id,user_id,run_score,run_gold,placement,rating_before,rating_delta,rating_after) values(new.id,m.user_id,score,gold,n,old_rating,new_rating-old_rating,new_rating) on conflict(session_id,user_id) do nothing;
  if found then
   update public.player_stats set rating_points=new_rating,account_gold=account_gold+gold,games_completed=games_completed+1,
    first_place_count=first_place_count+case when n=1 then 1 else 0 end,second_place_count=second_place_count+case when n=2 then 1 else 0 end,third_place_count=third_place_count+case when n=3 then 1 else 0 end,fourth_place_count=fourth_place_count+case when n=4 then 1 else 0 end,
    lifetime_run_score=lifetime_run_score+score,lifetime_gold_earned=lifetime_gold_earned+gold,updated_at=now() where user_id=m.user_id;
  end if;
 end loop;
 update public.game_sessions set rewards_committed=true where id=new.id;
 return new;
end $$;
create trigger account_game_rewards after insert or update of status on public.game_sessions for each row execute function public.account_session_rewards();

-- Expired guests only. Row locking serializes against Auth upgrades/deletions.
create function public.account_cleanup_guests() returns integer language plpgsql security definer set search_path='' as $$
declare u record; removed integer:=0; begin
 for u in select a.id from auth.users a join public.profiles p on p.user_id=a.id
  where a.is_anonymous is true and coalesce(a.email,'')='' and p.account_type='guest' and p.last_active_at<now()-interval '30 minutes'
  and not exists(select 1 from public.room_members m join public.rooms r on r.id=m.room_id where m.user_id=a.id and r.status<>'closed')
  and not exists(select 1 from public.room_members m join public.game_sessions g on g.room_id=m.room_id where m.user_id=a.id and g.status='active')
  order by a.id limit 100 for update of a,p skip locked
 loop
  -- Lock membership-related rooms before rechecking. No active participant is removed.
  if exists(select 1 from public.room_members where user_id=u.id) then continue; end if;
  if exists(select 1 from public.rooms where host_user_id=u.id and status<>'closed') then continue; end if;
  delete from auth.users where id=u.id and is_anonymous is true and coalesce(email,'')='';
  if found then removed:=removed+1; end if;
 end loop;
 return removed;
end $$;
-- Every internal function is service-only, including helpers/triggers.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'account_%' loop
  execute 'revoke all on function '||f.signature||' from public,anon,authenticated';
  execute 'grant execute on function '||f.signature||' to service_role';
 end loop;
end $$;

commit;
