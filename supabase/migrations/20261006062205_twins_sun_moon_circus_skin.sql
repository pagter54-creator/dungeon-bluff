-- Register artwork already deployed by the preceding client-only release.
-- This migration changes one cosmetic catalog row; no combat or API definitions.
begin;
insert into public.shop_items
  (id,display_name,item_type,price,asset_key,target_character_id,enabled,sort_order,is_default,gacha_enabled)
values
  ('twins1','태양과 달의 서커스','character_skin',10,'twins1','twins',true,161,false,true)
on conflict(id) do update set
  display_name=excluded.display_name,
  item_type=excluded.item_type,
  price=excluded.price,
  asset_key=excluded.asset_key,
  target_character_id=excluded.target_character_id,
  enabled=excluded.enabled,
  sort_order=excluded.sort_order,
  is_default=excluded.is_default,
  gacha_enabled=excluded.gacha_enabled;
commit;
