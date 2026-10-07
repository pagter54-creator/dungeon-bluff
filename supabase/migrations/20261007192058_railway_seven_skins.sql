-- Cosmetic catalog only; activate after deployed PNG and client verification.
begin;
insert into public.shop_items
(id,display_name,item_type,price,asset_key,target_character_id,enabled,sort_order,is_default,gacha_enabled)
values
('gunner3','청동 압력의 명사수','character_skin',10,'gunner3','gunner',true,168,false,true),
('fighter3','검댕투성이 정비사','character_skin',10,'fighter3','fighter',true,169,false,true),
('berserker4','강철 차축의 작업반장','character_skin',10,'berserker4','berserker',true,170,false,true),
('imp4','말썽쟁이 신호차장','character_skin',10,'imp4','imp',true,171,false,true),
('mage4','별빛 객실 안내원','character_skin',10,'mage4','mage',true,172,false,true),
('gambler4','행운의 검표원','character_skin',10,'gambler4','gambler',true,173,false,true),
('travler4','새벽을 달리는 기관사','character_skin',10,'travler4','adventurer',true,174,false,true)
on conflict(id) do nothing;
commit;

