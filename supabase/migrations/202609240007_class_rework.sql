begin;
alter table public.turn_submissions add column if not exists amplify_level integer check(amplify_level between 0 and 2);
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
  on conflict(session_id, turn_index, member_id) do update set card_id=excluded.card_id,card_value=excluded.card_value,use_skill=excluded.use_skill,amplify_level=excluded.amplify_level
  where (public.turn_submissions.card_id,public.turn_submissions.card_value,public.turn_submissions.use_skill,public.turn_submissions.amplify_level) is distinct from (excluded.card_id,excluded.card_value,excluded.use_skill,excluded.amplify_level);
  -- Notifications contain no game state/card values. Clients fetch authorized state.
  for item in select value from jsonb_array_elements(p_events) loop
    perform realtime.send(jsonb_build_object('room_id', rid, 'version', current_version + 1), item->>'event', 'room:' || rid::text, true);
  end loop;
  return current_version + 1;
end;
$$;

update public.characters set deck='[1,2,3,4,5]'::jsonb,definition='{"deckType":"fixed","role":"선택을 꿰뚫어 보는 예언가","icon":"✧","color":"#8bd9ff","attackFx":"starlight","attackSfx":"sfx_attack_seer","skill":{"id":"revelation","name":"계시","type":"hybrid","description":"계시 최대 3칸. 평소 중복 시 +1, 계시 사용 턴에는 통과 시만 +1. 제출 전 2칸을 소모해 상대 선택을 보고 이번 사이클의 사용 카드 1장을 무작위 복구합니다."},"balanceRevision":4}'::jsonb where id='seer';
update public.characters set deck='[]'::jsonb,definition='{"deckType":"continuous","role":"매 턴 새로운 두 장으로 승부하는 도박사","icon":"⚄","color":"#ffd078","attackFx":"dice","attackSfx":"sfx_attack_gambler","skill":{"id":"random_hand","name":"운명의 패","type":"passive","description":"매 턴 1~7 두 장. 6·7 제출 후 관망: 1~4 한 장, 직전 관망 숫자 제외. 관망에서 두 번 통과하면 다음 턴 운명의 패로 복귀. 중복은 진행도를 유지합니다."},"randomDeck":{"min":1,"max":7,"count":2},"balanceRevision":4}'::jsonb where id='gambler';
update public.characters set deck='[1,2,3]'::jsonb,definition='{"deckType":"fixed","role":"세 발의 탄환을 쏟아내는 사수","icon":"⌖","color":"#ffd08a","attackFx":"bullet","attackSfx":"sfx_attack_gunner","skill":{"id":"full_burst","name":"전탄발사","type":"hybrid","description":"사이클당 1회 전탄발사. 선택 카드가 통과하면 남은 손패를 합산해 사용하고 새 사이클로 진입합니다. 중복 실패 시 HP −1(기절 가능)."},"balanceRevision":4}'::jsonb where id='gunner';
update public.characters set deck='[1,1,3,4,5]'::jsonb,definition='{"deckType":"fixed","role":"낮은 카드로 보상을 노리는 전문가","icon":"🗡","color":"#8ad6b1","attackFx":"dagger","attackSfx":"sfx_attack_rogue","skill":{"id":"low_card_gold","name":"손버릇","type":"passive","description":"단독 최저 유효 카드: 비전투에서 손버릇으로 +5점·+2G, 전투에서 비열한 일격으로 피해 5. 봉인·장갑 등 공격 무효 효과는 유지됩니다."},"balanceRevision":4}'::jsonb where id='rogue';
update public.characters set deck='[1,2,3,4,4]'::jsonb,definition='{"deckType":"fixed","role":"카드의 힘을 증폭하는 마법사","icon":"✺","color":"#b895ff","attackFx":"magic","attackSfx":"sfx_attack_mage","skill":{"id":"amplify","name":"증폭","type":"hybrid","description":"매 턴 마나 +1(최대 4). 증폭으로 마나 2/4를 소모하여 카드 숫자 자체를 +1/+2. 중복·피해·이벤트 모두 변경된 숫자로 판정합니다."},"balanceRevision":4}'::jsonb where id='mage';
update public.characters set deck='[2,3,4,5,5]'::jsonb,definition='{"deckType":"fixed","role":"중복을 버티고 행동하는 기사","icon":"➶","color":"#d6b77a","attackFx":"spear","attackSfx":"sfx_attack_warrior","skill":{"id":"toughness","name":"강인함","type":"active","description":"사이클 시작마다 강인함 +1충전(최대 2). 1충전을 사용하면 중복되어도 자신의 행동은 유효하며 상대 카드는 제거됩니다."},"balanceRevision":4}'::jsonb where id='warrior';
update public.characters set deck='[1,2,3,4,5]'::jsonb,definition='{"deckType":"fixed","role":"균형 잡힌 탐험가","icon":"⚔","color":"#e7dcc3","attackFx":"sword","attackSfx":"sfx_attack_adventurer","skill":{"id":"gold_bonus","name":"노련한 수완","type":"passive","description":"골드를 받는 각 보상마다 +1G. 몬스터 전투에서 중복 없이 통과하면 피해와 별도로 점수 +1."},"balanceRevision":4}'::jsonb where id='adventurer';
commit;
