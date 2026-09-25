begin;
alter table public.game_results add column outcome text not null default 'completed' check(outcome in ('completed','failed'));
alter table public.game_results add column payout_percent integer not null default 100 check(payout_percent between 0 and 100);
alter table public.game_results add column raw_score integer;
alter table public.game_results add column raw_gold integer;

create or replace function public.account_session_rewards() returns trigger language plpgsql security definer set search_path='' as $$
declare m record; member jsonb; source jsonb; n integer; ties integer; delta integer; score integer; gold integer; old_rating integer; new_rating integer; percent integer; raw_score integer; raw_gold integer; cleared boolean; begin
 if tg_op='INSERT' then
  for m in select rm.id,rm.user_id,p.account_type,l.equipped_card_front,l.equipped_card_back from public.room_members rm left join public.profiles p on p.user_id=rm.user_id left join public.player_loadout l on l.user_id=rm.user_id where rm.room_id=new.room_id loop
   insert into public.game_reward_members(session_id,member_id,user_id) values(new.id,m.id,case when m.account_type='registered' then m.user_id else null end);
   update public.game_sessions set state=jsonb_set(state,array['players',m.id::text,'loadout'],jsonb_build_object('equipped_card_front',case when m.account_type='registered' then coalesce(m.equipped_card_front,'default_card_front') else 'default_card_front' end,'equipped_card_back',case when m.account_type='registered' then coalesce(m.equipped_card_back,'default_card_back') else 'default_card_back' end)) where id=new.id;
  end loop;
  return new;
 end if;
 if new.status not in ('completed','failed') or old.status in ('completed','failed') or new.rewards_committed then return new; end if;
 cleared:=new.status='completed';
 -- A surrender/expired room is not a wipeout and never awards partial loot.
 if not cleared and (new.party_knockouts<8 or coalesce(new.state->'settlement'->>'reason','')<>'wipeout') then return new; end if;
 percent:=case when cleared then 100 when new.stage_index>=5 then least(70,(new.stage_index-3)*10) else 0 end;
 for m in select r.member_id,r.user_id from public.game_reward_members r join public.room_members rm on rm.id=r.member_id and rm.user_id=r.user_id join public.profiles pr on pr.user_id=r.user_id where r.session_id=new.id and pr.account_type='registered' order by r.user_id loop
  member:=new.state->'players'->m.member_id::text;
  source:=new.state->'settlement'->'players'->m.member_id::text;
  raw_score:=coalesce((source->>'rawScore')::integer,(member->>'score')::integer,0);
  raw_gold:=coalesce((source->>'rawGold')::integer,(member->>'gold')::integer,0);
  score:=case when cleared then raw_score else floor(greatest(0,raw_score)::numeric*percent/100)::integer end;
  gold:=floor(greatest(0,raw_gold)::numeric*percent/100)::integer;
  select count(*) filter(where (value->>'score')::integer>(member->>'score')::integer)+1,count(*) filter(where (value->>'score')::integer=(member->>'score')::integer) into n,ties from jsonb_each(new.state->'players');
  delta:=0;
  if cleared then select round(avg((array[30,10,-10,-20])[i]))::integer into delta from generate_series(n,n+ties-1) i; end if;
  select rating_points into old_rating from public.player_stats where user_id=m.user_id for update;
  new_rating:=greatest(0,old_rating+delta);
  insert into public.game_results(session_id,user_id,run_score,run_gold,placement,rating_before,rating_delta,rating_after,outcome,payout_percent,raw_score,raw_gold)
   values(new.id,m.user_id,score,gold,n,old_rating,new_rating-old_rating,new_rating,new.status,percent,raw_score,raw_gold) on conflict(session_id,user_id) do nothing;
  if found then
   update public.player_stats set rating_points=new_rating,account_gold=account_gold+gold,games_completed=games_completed+case when cleared then 1 else 0 end,
    first_place_count=first_place_count+case when cleared and n=1 then 1 else 0 end,second_place_count=second_place_count+case when cleared and n=2 then 1 else 0 end,third_place_count=third_place_count+case when cleared and n=3 then 1 else 0 end,fourth_place_count=fourth_place_count+case when cleared and n=4 then 1 else 0 end,
    lifetime_run_score=lifetime_run_score+score,lifetime_gold_earned=lifetime_gold_earned+gold,updated_at=now() where user_id=m.user_id;
  end if;
 end loop;
 update public.game_sessions set rewards_committed=true where id=new.id;
 return new;
end $$;
revoke all on function public.account_session_rewards() from public,anon,authenticated;
grant execute on function public.account_session_rewards() to service_role;
commit;
