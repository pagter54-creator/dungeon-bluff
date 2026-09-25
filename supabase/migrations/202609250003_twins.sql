begin;
alter table public.characters drop constraint characters_deck_check;
alter table public.characters add constraint characters_deck_check check (
  jsonb_array_length(deck)=5 or (id='gunner' and deck='[1,2,3]'::jsonb)
  or (id='twins' and deck='[1,2,3,4]'::jsonb)
  or (definition->>'deckType' in ('random','continuous') and jsonb_array_length(deck)=0)
  or (id='gambler' and deck='[1,1,2,2,3,3,4,4,5,5,6,7]'::jsonb)
);
insert into public.characters(id,display_name,deck,enabled,definition) values
('twins','쌍둥이','[1,2,3,4]'::jsonb,true,'{"deckType":"fixed","role":"교대와 곡예로 예측을 뒤집는 쌍둥이","icon":"♊","color":"#f0c184","attackFx":"twin_thrust","attackSfx":"sfx_attack_twins","skill":{"id":"acrobatics","name":"교대 · 곡예","type":"hybrid","description":"첫 턴 홀짝 무작위, 이후 매 턴 교대. 해당 홀짝 카드만 선택할 수 있습니다. 유효 몬스터 공격의 피해 +2. 곡예는 즉시 손패를 초기화하고 홀짝을 반전하며, 새 사이클을 끝까지 완주하면 다시 사용 가능합니다."}}'::jsonb)
on conflict(id) do update set display_name=excluded.display_name,deck=excluded.deck,enabled=true,definition=excluded.definition;
insert into public.shop_items(id,display_name,item_type,price,asset_key,target_character_id,is_default,gacha_enabled,sort_order) values
('twins0','쌍둥이 기본 스킨','character_skin',0,'twins0','twins',true,false,160)
on conflict(id) do update set display_name=excluded.display_name,price=0,asset_key=excluded.asset_key,target_character_id=excluded.target_character_id,is_default=true,gacha_enabled=false,enabled=true,sort_order=excluded.sort_order;
commit;
