begin;
update public.characters set definition=jsonb_set(
  jsonb_set(definition,'{skill,description}',to_jsonb('몬스터 유효 공격 또는 이벤트 유효 카드로 포식 +1, 처치 턴 기여 시 총 +4, 공동 최고 피해면 총 +8. 포식 8마다 귀참 레벨 +1. 레벨업하면 사용한 귀참도 즉시 재활성화됩니다. 귀참은 현재 레벨+1의 추가 피해를 줍니다.'::text)),
  '{balanceRevision}','7'::jsonb
) where id='demonsword';
commit;
