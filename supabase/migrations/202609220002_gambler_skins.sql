begin;
alter table public.characters drop constraint characters_deck_check;
alter table public.characters add constraint characters_deck_check check (
  jsonb_array_length(deck)=5 or (definition->>'deckType' in ('random','continuous') and jsonb_array_length(deck)=0)
);
update public.characters set display_name='도박사', deck='[]'::jsonb, definition='{"deckType":"continuous","role":"두 장의 패로 운명을 거는 승부사","icon":"⚄","color":"#ffd078","attackFx":"dice","attackSfx":"sfx_attack_gambler","skill":{"id":"random_hand","name":"운명의 패","type":"passive","description":"손패는 최대 2장. 한 장을 쓰면 다음 턴에 1~7 중 한 장을 보충합니다. 손에 남은 6·7과 같은 숫자는 뽑히지 않습니다. 사이클이 없으며 패는 모두에게 공개됩니다."},"randomDeck":{"min":1,"max":7,"count":2}}'::jsonb where id='gambler';
update public.characters set display_name='기사', deck='[1,2,3,5,5]'::jsonb, definition='{"deckType":"fixed","role":"높은 카드와 강인한 생존력","icon":"➶","color":"#d6b77a","attackFx":"spear","attackSfx":"sfx_attack_warrior","skill":{"id":"toughness","name":"강인함","type":"passive","description":"HP 1에서 처음 받는 피해를 무효화합니다. HP 2 이상으로 회복하면 재충전됩니다."}}'::jsonb where id='warrior';
update public.shop_items set display_name='기사' where id='warrior0';
insert into public.shop_items(id,display_name,item_type,price,asset_key,target_character_id,is_default,gacha_enabled,sort_order) values
('gambler3','선상 도박꾼','character_skin',10,'gambler3','gambler',false,true,140),
('berserker3','흑철 기사','character_skin',10,'berserker3','berserker',false,true,141),
('imp3','깜짝 선물','character_skin',10,'imp3','imp',false,true,142),
('mage3','꼭두각시 마녀','character_skin',10,'mage3','mage',false,true,143),
('prophet3','거울 세계','character_skin',10,'prophet3','seer',false,true,144),
('thief3','사냥개','character_skin',10,'thief3','rogue',false,true,145),
('travler3','유적 발굴단','character_skin',10,'travler3','adventurer',false,true,146),
('warrior3','용기사','character_skin',10,'warrior3','warrior',false,true,147)
on conflict(id) do update set display_name=excluded.display_name,gacha_enabled=true,enabled=true;

-- Include only public cosmetic IDs in the existing room read, with no extra polling.
create or replace function public.game_read(p_room uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'room', to_jsonb(r),
    'members', coalesce((select jsonb_agg(to_jsonb(m) || jsonb_build_object('display_name',coalesce(p.display_name,m.display_name),'loadout',jsonb_build_object('equipped_character_skins',coalesce(l.equipped_character_skins,'{}'::jsonb))) order by m.seat_index)
      from public.room_members m left join public.profiles p on p.user_id=m.user_id left join public.player_loadout l on l.user_id=m.user_id where m.room_id=r.id), '[]'::jsonb),
    'password_hash', (select password_hash from public.room_secrets where room_id = r.id),
    'session', (select to_jsonb(g) from public.game_sessions g where g.room_id = r.id),
    'submissions', coalesce((select jsonb_agg(t) from public.turn_submissions t join public.game_sessions g on g.id=t.session_id where g.room_id=r.id and t.turn_index=g.turn_index), '[]'::jsonb)
  ) from public.rooms r where r.id=p_room;
$$;
commit;
