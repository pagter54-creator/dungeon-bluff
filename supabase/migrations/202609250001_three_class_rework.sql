-- Raw session JSON contains private, ordered gambler piles. Use game-api views.
alter table public.characters drop constraint characters_deck_check;
alter table public.characters add constraint characters_deck_check check (
  jsonb_array_length(deck)=5 or (id='gunner' and deck='[1,2,3]'::jsonb)
  or (definition->>'deckType' in ('random','continuous') and jsonb_array_length(deck)=0)
  or (id='gambler' and deck='[1,1,2,2,3,3,4,4,5,5,6,7]'::jsonb)
);
alter policy sessions_read on public.game_sessions using (public.is_room_member(room_id) and coalesce((state->>'remakeVersion')::integer,1)<2 and not jsonb_path_exists(state, '$.**.drawPile'));
update public.characters set deck='[1,2,3,4,5]'::jsonb, definition='{"deckType":"fixed","role":"선택을 꿰뚫어 보는 예언가","icon":"✧","color":"#8bd9ff","attackFx":"starlight","attackSfx":"sfx_attack_seer","skill":{"id":"revelation","name":"계시","type":"hybrid","description":"중복 시 계시 1 획득(최대 1). 카드 선택 전 계시 1을 소비해 상대 선택을 확인하고 현재 사이클의 사용 카드 1장을 무작위 복구합니다. 발동한 턴에도 중복 시 다시 획득하며, 통과 시에는 획득하지 않습니다."},"balanceRevision":5}'::jsonb where id='seer';
update public.characters set deck='[1,1,2,2,3,3,4,4,5,5,6,7]'::jsonb, definition='{"deckType":"continuous","role":"매 턴 새로운 두 장으로 승부하는 도박사","icon":"⚄","color":"#ffd078","attackFx":"dice","attackSfx":"sfx_attack_gambler","skill":{"id":"random_hand","name":"운명의 패","type":"passive","description":"12장 덱에서 매 턴 2장을 뽑고 나머지도 턴 종료 시 버립니다. 사용한 6·7만 소멸. 서로 다른 1~5 숫자 3종 제출 시 6 충전, 5종 제출 시 7 충전(각 최대 2장). 덱이 비면 버린 덱을 섞어 이어 뽑습니다."},"balanceRevision":5}'::jsonb where id='gambler';
update public.characters set deck='[1,2,3,4,4]'::jsonb, definition='{"deckType":"fixed","role":"막타를 거듭하며 강해지는 귀검사","icon":"⚔","color":"#dc586b","attackFx":"demon_sword","attackSfx":"sfx_attack_demonsword","skill":{"id":"soul_slash","name":"포식 · 귀참","type":"hybrid","description":"몬스터 유효 공격으로 포식 +1, 처치 턴 기여 시 총 +3, 공동 최고 피해면 총 +5. 포식 8마다 귀참 레벨 +1. 사이클당 한 번 귀참으로 레벨+1의 추가 피해를 줍니다. 포식은 소모하지 않으며 성장 상한이 없습니다."},"balanceRevision":5}'::jsonb where id='demonsword';
