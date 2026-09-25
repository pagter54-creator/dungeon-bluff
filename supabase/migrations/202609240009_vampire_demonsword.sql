begin;

insert into public.characters(id,display_name,deck,enabled,definition) values
('vampire','흡혈귀','[1,2,3,4,5]'::jsonb,true,'{"deckType":"fixed","role":"권속의 운명을 바꾸는 흡혈귀","icon":"♜","color":"#e85b79","attackFx":"vampire_bite","attackSfx":"sfx_attack_vampire","skill":{"id":"blood_command","name":"흡혈의 낙인 · 피의 명령","type":"hybrid","description":"카드가 겹치면 최고 점수의 상대 한 명에게 권속 표식. 권속의 선택을 보고, 피의 명령으로 중복 판정 전에 두 카드의 최종 숫자를 교환합니다."}}'::jsonb),
('demonsword','귀검사','[1,2,3,4,4]'::jsonb,true,'{"deckType":"fixed","role":"막타를 거듭하며 강해지는 귀검사","icon":"⚔","color":"#dc586b","attackFx":"demon_sword","attackSfx":"sfx_attack_demonsword","skill":{"id":"soul_slash","name":"포식 · 귀참","type":"hybrid","description":"몬스터 처치 턴에 유효 피해를 주면 포식 +1, 최고 피해면 +2. 사이클당 한 번 귀참으로 포식 단계에 따라 추가 피해를 줍니다."}}'::jsonb)
on conflict(id) do update set display_name=excluded.display_name,deck=excluded.deck,enabled=true,definition=excluded.definition;

insert into public.shop_items(id,display_name,item_type,price,asset_key,target_character_id,is_default,gacha_enabled,sort_order) values
('vampire0','흡혈귀 기본 스킨','character_skin',0,'vampire0','vampire',true,false,156),
('vampire1','가면 무도회','character_skin',10,'vampire1','vampire',false,true,157),
('demonsword0','귀검사 기본 스킨','character_skin',0,'demonsword0','demonsword',true,false,158),
('demonsword1','천명 집행자','character_skin',10,'demonsword1','demonsword',false,true,159)
on conflict(id) do update set display_name=excluded.display_name,item_type=excluded.item_type,price=excluded.price,asset_key=excluded.asset_key,target_character_id=excluded.target_character_id,is_default=excluded.is_default,gacha_enabled=excluded.gacha_enabled,enabled=true,sort_order=excluded.sort_order;

commit;
