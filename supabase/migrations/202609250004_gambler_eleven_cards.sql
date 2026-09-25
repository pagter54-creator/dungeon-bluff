begin;
alter table public.characters drop constraint characters_deck_check;
alter table public.characters add constraint characters_deck_check check (
  jsonb_array_length(deck)=5 or (id='gunner' and deck='[1,2,3]'::jsonb)
  or (id='twins' and deck='[1,2,3,4]'::jsonb)
  or (definition->>'deckType' in ('random','continuous') and jsonb_array_length(deck)=0)
  or (id='gambler' and deck in ('[1,1,2,2,3,3,4,4,5,5,6,7]'::jsonb,'[1,1,2,2,3,3,4,4,5,5,6]'::jsonb))
);
update public.characters
set deck='[1,1,2,2,3,3,4,4,5,5,6]'::jsonb,
    definition=jsonb_set(jsonb_set(definition,'{skill,description}',to_jsonb('1~5 각 2장과 6 한 장, 총 11장 덱에서 매 턴 2장을 뽑습니다. 사용한 6·7만 소멸합니다. 서로 다른 1~5 숫자 3종 제출 시 6, 5종 제출 시 7을 충전해 버린 덱에 넣습니다(각 최대 2장). 뽑을 덱이 비면 버린 덱을 섞습니다.'::text)),'{balanceRevision}','6'::jsonb)
where id='gambler';
commit;
