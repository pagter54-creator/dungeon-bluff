-- Cosmetic catalog only. Artwork must be deployed before activation.
begin;
insert into public.shop_items
(id,display_name,item_type,price,asset_key,target_character_id,enabled,sort_order,is_default,gacha_enabled)
values
('prophet4','영매','character_skin',10,'prophet4','seer',true,162,false,true),
('demonsword2','잊혀진 검귀','character_skin',10,'demonsword2','demonsword',true,163,false,true),
('vampire2','할로윈 침실','character_skin',10,'vampire2','vampire',true,164,false,true),
('twins2','심야의 퍼레이드','character_skin',10,'twins2','twins',true,165,false,true),
('thief4','사탕 도둑','character_skin',10,'thief4','rogue',true,166,false,true),
('warrior4','호박 기사','character_skin',10,'warrior4','warrior',true,167,false,true)
on conflict(id) do update set display_name=excluded.display_name,item_type=excluded.item_type,price=excluded.price,asset_key=excluded.asset_key,target_character_id=excluded.target_character_id,enabled=excluded.enabled,sort_order=excluded.sort_order,is_default=excluded.is_default,gacha_enabled=excluded.gacha_enabled;
commit;
