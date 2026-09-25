select count(*) filter(where item_type='character_skin') as skins,
 count(*) filter(where item_type='character_skin' and is_default) as free_defaults,
 count(*) filter(where item_type='character_skin' and gacha_enabled and enabled) as draw_pool,
 to_regprocedure('public.account_draw_skin(uuid,uuid)') is not null as draw_rpc,
 has_function_privilege('authenticated','public.account_draw_skin(uuid,uuid)','execute') as client_direct_draw_allowed,
 has_function_privilege('service_role','public.account_draw_skin(uuid,uuid)','execute') as server_draw_allowed,
 (select tgenabled from pg_trigger where tgname='account_game_skins_snapshot') as snapshot_trigger
from public.shop_items;
