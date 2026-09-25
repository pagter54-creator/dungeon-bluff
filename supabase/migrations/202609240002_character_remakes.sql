-- Character definitions for the gambler, knight and seer balance update.
begin;
update public.characters set definition = definition || '{"balanceRevision":2}'::jsonb || jsonb_build_object('skill',
  jsonb_build_object('id','toughness','name','강인함','type','active','description','사이클당 1회. 제출할 때 발동하면 카드가 중복되어도 자신의 행동은 유효합니다. 함께 겹친 상대의 카드는 정상적으로 무효화됩니다.'))
where id='warrior';
update public.characters set display_name='예언가', definition = definition || '{"balanceRevision":2}'::jsonb || jsonb_build_object('skill',
  jsonb_build_object('id','revelation','name','계시','type','hybrid','description','중복될 때마다 계시 1중첩 획득(최대 3). 카드 제출 전에 2중첩을 소모하면 이번 턴 다른 모든 플레이어가 제출한 숫자를 자신만 볼 수 있습니다.'))
where id='seer';
update public.characters set definition = definition || '{"balanceRevision":2}'::jsonb || jsonb_build_object('skill',
  jsonb_build_object('id','random_hand','name','운명의 패','type','passive','description','매 턴 사용하지 않은 카드도 버리고 1~7 중 새 카드 2장을 받습니다. 두 장 중 6·7은 합쳐서 최대 한 장이며 사이클은 없습니다.'))
where id='gambler';
commit;
