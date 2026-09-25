begin;

insert into public.shop_items
  (id,display_name,item_type,price,asset_key,target_character_id,is_default,gacha_enabled,sort_order)
values
  ('gunner1','황야의 무법자','character_skin',10,'gunner1','gunner',false,true,152),
  ('gunner2','유령선의 포격수','character_skin',10,'gunner2','gunner',false,true,153),
  ('fighter1','뇌격투희','character_skin',10,'fighter1','fighter',false,true,154),
  ('fighter2','염화난무','character_skin',10,'fighter2','fighter',false,true,155)
on conflict (id) do update set
  display_name=excluded.display_name,
  item_type=excluded.item_type,
  price=excluded.price,
  asset_key=excluded.asset_key,
  target_character_id=excluded.target_character_id,
  is_default=false,
  gacha_enabled=true,
  enabled=true,
  sort_order=excluded.sort_order;

commit;
