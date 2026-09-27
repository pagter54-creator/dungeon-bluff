begin;

-- PVE BETA-001 canonical reward settlement.
-- RULE-PVE-REWARD-01: RUN_CLEAR pays authoritative server runGold once.
-- RULE-PVE-REWARD-02: RUN_FAILED pays 0 permanent Gold.
-- RULE-PVE-REWARD-03: ABANDONED pays 0 permanent Gold.
-- RULE-PVE-REWARD-04: COOP_PVE never changes competitive RP.

alter table public.pve_results
  drop constraint if exists pve_results_outcome_check;
alter table public.pve_results
  add constraint pve_results_outcome_check
  check(outcome in ('RUN_CLEAR','RUN_FAILED','ABANDONED'));

-- Closing the room canonically abandons any unfinished PVE run.
-- ABANDONED has a zero-Gold/zero-RP result, so it is safe to mark the
-- terminal zero settlement committed immediately.
create or replace function public.pve_abandon_closed_room() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status='closed' and old.status is distinct from 'closed' then
    update public.pve_runs
      set state=jsonb_set(state,'{phase}','"ABANDONED"'::jsonb,true),
          rewards_committed=true,
          updated_at=now()
      where room_id=new.id
        and coalesce(state->>'phase','') not in ('RUN_CLEAR','RUN_FAILED','ABANDONED');
  end if;
  return new;
end $$;

-- All settlement values come from server-owned pve_runs.state.
-- Request payload gold/rp fields are never consulted by this function.
create or replace function public.pve_settle_rewards(p_run uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  r public.pve_runs;
  player jsonb;
  uid uuid;
  gold integer;
  old_rating integer;
  terminal_phase text;
  inserted_count integer:=0;
  paid_gold integer:=0;
  forfeited_players integer:=0;
begin
  select * into r from public.pve_runs where id=p_run for update;
  if not found then return jsonb_build_object('missing',true); end if;

  terminal_phase:=coalesce(r.state->>'phase','');
  if terminal_phase not in ('RUN_CLEAR','RUN_FAILED','ABANDONED') then
    return jsonb_build_object('settled',false,'reason','RUN_NOT_TERMINAL','rp_delta',0);
  end if;

  if r.rewards_committed then
    return jsonb_build_object(
      'settled',true,
      'idempotent',true,
      'outcome',terminal_phase,
      'paid_gold',coalesce((select sum(run_gold) from public.pve_results where run_id=p_run),0),
      'rp_delta',0
    );
  end if;

  for player in select value from jsonb_array_elements(coalesce(r.state->'players','[]'::jsonb))
  loop
    if nullif(player->>'userId','') is null then continue; end if;
    uid:=(player->>'userId')::uuid;
    if not exists(select 1 from public.profiles p where p.user_id=uid and p.account_type='registered') then continue; end if;

    select rating_points into old_rating from public.player_stats where user_id=uid for update;
    if old_rating is null then continue; end if;

    gold:=0;
    if terminal_phase='RUN_CLEAR'
       and not coalesce((player->>'departed')::boolean,false)
       and exists(select 1 from public.room_members rm where rm.room_id=r.room_id and rm.user_id=uid)
    then
      gold:=greatest(0,coalesce((player->>'runGold')::integer,0));
    elsif greatest(0,coalesce((player->>'runGold')::integer,0))>0 then
      forfeited_players:=forfeited_players+1;
    end if;

    insert into public.pve_results(run_id,user_id,run_gold,rating_before,rating_delta,rating_after,outcome)
      values(p_run,uid,gold,old_rating,0,old_rating,terminal_phase)
      on conflict(run_id,user_id) do nothing;
    if found then
      if gold>0 then
        update public.player_stats
          set account_gold=account_gold+gold,
              lifetime_gold_earned=lifetime_gold_earned+gold,
              updated_at=now()
          where user_id=uid;
      end if;
      inserted_count:=inserted_count+1;
      paid_gold:=paid_gold+gold;
    end if;
  end loop;

  update public.pve_runs set rewards_committed=true,updated_at=now() where id=p_run;
  return jsonb_build_object(
    'settled',true,
    'idempotent',false,
    'outcome',terminal_phase,
    'players',inserted_count,
    'paid_gold',paid_gold,
    'forfeited_players',forfeited_players,
    'rp_delta',0
  );
end $$;

revoke all on function public.pve_settle_rewards(uuid) from public,anon,authenticated;
grant execute on function public.pve_settle_rewards(uuid) to service_role;

commit;
