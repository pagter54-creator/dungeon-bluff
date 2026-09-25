begin;

-- Card cosmetics use one consistent price; existing ownership is untouched.
update public.shop_items set price=5 where item_type in ('card_front','card_back');

insert into public.shop_items(id,display_name,item_type,price,asset_key,sort_order) values
 ('card_front_04','핏빛 룬','card_front',5,'card_front_04',7),
 ('card_back_04','핏빛 인장','card_back',5,'card_back_04',8),
 ('card_front_05','서리 달','card_front',5,'card_front_05',9),
 ('card_back_05','빙결 문장','card_back',5,'card_back_05',10)
on conflict(id) do update set display_name=excluded.display_name,price=excluded.price,asset_key=excluded.asset_key,enabled=true;

commit;
