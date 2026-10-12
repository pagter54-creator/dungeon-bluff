-- Cosmetic catalog only. Apply after all public images are verified.
begin;
insert into public.shop_items (id,display_name,item_type,price,asset_key,target_character_id,enabled,sort_order,is_default,gacha_enabled) values
('twins3','TS 쌍둥이','character_skin',10,'twins3','twins',true,175,false,true),
('vampire3','TS 흡혈귀','character_skin',10,'vampire3','vampire',true,176,false,true),
('demonsword3','TS 귀검사','character_skin',10,'demonsword3','demonsword',true,177,false,true),
('gunner4','TS 총잡이','character_skin',10,'gunner4','gunner',true,178,false,true),
('fighter4','TS 무투가','character_skin',10,'fighter4','fighter',true,179,false,true),
('gambler5','TS 도박사','character_skin',10,'gambler5','gambler',true,180,false,true),
('berserker5','TS 광전사','character_skin',10,'berserker5','berserker',true,181,false,true),
('imp5','TS 임프','character_skin',10,'imp5','imp',true,182,false,true),
('mage5','TS 마법사','character_skin',10,'mage5','mage',true,183,false,true),
('prophet5','TS 예언가','character_skin',10,'prophet5','seer',true,184,false,true),
('thief5','TS 도적','character_skin',10,'thief5','rogue',true,185,false,true),
('travler5','TS 모험가','character_skin',10,'travler5','adventurer',true,186,false,true),
('warrior5','TS 기사','character_skin',10,'warrior5','warrior',true,187,false,true)
on conflict (id) do nothing;
commit;
