begin;

alter table public.shop_items add column is_default boolean not null default false;
alter table public.shop_items add column gacha_enabled boolean not null default false;
alter table public.player_loadout add column equipped_character_skins jsonb not null default '{}'::jsonb check(jsonb_typeof(equipped_character_skins)='object');

insert into public.shop_items(id,display_name,item_type,price,asset_key,target_character_id,is_default,gacha_enabled,sort_order)
select prefix||n::text,names[n+1],'character_skin',case when n=0 then 0 else 10 end,prefix||n::text,character_id,n=0,n>0,100+ord*3+n
from (values
 ('gambler','gambler',array['도박사 기본 스킨','부르주아','가면 무도회'],0),
 ('berserker','berserker',array['광전사 기본 스킨','혹한의 야만족','지옥불 광전사'],1),
 ('imp','imp',array['임프 기본 스킨','트릭 오어 트릿!','지옥불 요정'],2),
 ('mage','mage',array['마법사 기본 스킨','눈꽃 마녀','신의 사도'],3),
 ('prophet','seer',array['예언가 기본 스킨','붉은 달의 예언가','점성술사'],4),
 ('thief','rogue',array['도적 기본 스킨','신출귀몰의 괴도','무도회의 불청객'],5),
 ('travler','adventurer',array['모험가 기본 스킨','설산의 탐험가','신참 항해사'],6),
 ('warrior','warrior',array['전사','성지 수호자','북부의 병사'],7)
) as skins(prefix,character_id,names,ord) cross join generate_series(0,2) as n;

-- A purchase receipt makes retries (including a lost HTTP response) free and stable.
create table public.skin_draws(
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 item_id text not null references public.shop_items(id),
 created_at timestamptz not null default now(),
 primary key(user_id,request_id),unique(user_id,item_id)
);
alter table public.skin_draws enable row level security;
revoke all on public.skin_draws from public,anon,authenticated;
grant all on public.skin_draws to service_role;
grant select on public.skin_draws to authenticated;
create policy skin_draws_read_self on public.skin_draws for select to authenticated using(user_id=auth.uid());

create function public.account_draw_skin(p_user_id uuid,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; picked public.shop_items; previous text; remaining integer; begin
 if p_request_id is null then raise exception '뽑기 요청 번호가 필요합니다.'; end if;
 p:=public.account_ensure(p_user_id);
 if p->>'account_type'<>'registered' then raise exception '이메일 계정을 등록하면 스킨을 뽑을 수 있습니다.'; end if;
 perform 1 from public.player_stats where user_id=p_user_id for update;
 select item_id into previous from public.skin_draws where user_id=p_user_id and request_id=p_request_id;
 if found then
  select * into picked from public.shop_items where id=previous;
 else
  select s.* into picked from public.shop_items s where s.enabled and s.gacha_enabled and s.item_type='character_skin' and not s.is_default
   and not exists(select 1 from public.player_inventory i where i.user_id=p_user_id and i.item_id=s.id)
   order by random() limit 1;
  if not found then raise exception '모든 스킨을 수집했습니다. 골드는 차감되지 않습니다.'; end if;
  update public.player_stats set account_gold=account_gold-10,updated_at=now() where user_id=p_user_id and account_gold>=10;
  if not found then raise exception 'Account Gold가 부족합니다. 뽑기에는 10G가 필요합니다.'; end if;
  insert into public.player_inventory(user_id,item_id) values(p_user_id,picked.id);
  insert into public.skin_draws(user_id,request_id,item_id) values(p_user_id,p_request_id,picked.id);
  update public.profiles set last_active_at=now() where user_id=p_user_id;
 end if;
 select count(*) into remaining from public.shop_items s where s.enabled and s.gacha_enabled and not s.is_default and s.item_type='character_skin'
  and not exists(select 1 from public.player_inventory i where i.user_id=p_user_id and i.item_id=s.id);
 return jsonb_build_object('item',to_jsonb(picked),'account',public.account_data(p_user_id),'remaining',remaining);
end $$;

create or replace function public.account_equip(p_user_id uuid,p_item_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; kind text; character_id text; begin
 p:=public.account_ensure(p_user_id);
 if p->>'account_type'<>'registered' then raise exception '이메일 계정을 등록하면 인벤토리를 이용할 수 있습니다.'; end if;
 if p_item_id in ('default_card_front','default_card_back') then kind:=replace(p_item_id,'default_','');
 else
  select s.item_type,s.target_character_id into kind,character_id from public.shop_items s where s.id=p_item_id and s.enabled
   and (s.is_default or exists(select 1 from public.player_inventory i where i.user_id=p_user_id and i.item_id=s.id));
 end if;
 if kind is null or kind not in ('card_front','card_back','character_skin') then raise exception '보유한 치장만 장착할 수 있습니다.'; end if;
 if kind='character_skin' and character_id is null then raise exception '스킨의 캐릭터를 확인해 주세요.'; end if;
 update public.player_loadout set
  equipped_card_front=case when kind='card_front' then p_item_id else equipped_card_front end,
  equipped_card_back=case when kind='card_back' then p_item_id else equipped_card_back end,
  equipped_character_skins=case when kind='character_skin' then jsonb_set(equipped_character_skins,array[character_id],to_jsonb(p_item_id)) else equipped_character_skins end,
  updated_at=now() where user_id=p_user_id;
 update public.profiles set last_active_at=now() where user_id=p_user_id;
 return public.account_data(p_user_id);
end $$;

-- Runs after account_game_rewards on INSERT, preserving its cards/recipient snapshot.
create function public.account_session_skins() returns trigger language plpgsql security definer set search_path='' as $$
declare m record; begin
 for m in select rm.id,p.account_type,l.equipped_character_skins from public.room_members rm
  left join public.profiles p on p.user_id=rm.user_id left join public.player_loadout l on l.user_id=rm.user_id where rm.room_id=new.room_id loop
  update public.game_sessions set state=jsonb_set(state,array['players',m.id::text,'loadout','equipped_character_skins'],
   case when m.account_type='registered' then coalesce(m.equipped_character_skins,'{}'::jsonb) else '{}'::jsonb end) where id=new.id;
 end loop;
 return new;
end $$;
create trigger account_game_skins_snapshot after insert on public.game_sessions for each row execute function public.account_session_skins();

revoke all on function public.account_draw_skin(uuid,uuid),public.account_session_skins(),public.account_equip(uuid,text) from public,anon,authenticated;
grant execute on function public.account_draw_skin(uuid,uuid),public.account_session_skins(),public.account_equip(uuid,text) to service_role;
commit;
