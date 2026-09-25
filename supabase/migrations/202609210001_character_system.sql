-- Additive migration; existing active default_001 sessions retain their snapshot.
alter table public.characters add column definition jsonb not null default '{}'::jsonb;
alter table public.characters drop constraint characters_deck_check;
alter table public.characters add constraint characters_deck_check check (jsonb_array_length(deck) = 5 or (definition->>'deckType' = 'random' and jsonb_array_length(deck) = 0));
insert into public.characters(id,display_name,deck,enabled,definition) values
('adventurer', '모험가', '[1,2,3,4,5]'::jsonb, true, '{"deckType":"fixed","role":"균형 잡힌 탐험가","icon":"⚔","color":"#e7dcc3","attackFx":"sword","attackSfx":"sfx_attack_adventurer","skill":{"id":"gold_bonus","name":"노련한 수완","type":"passive","description":"골드를 받는 각 보상마다 +1G. 0G 보상에는 발동하지 않습니다."}}'::jsonb),
('warrior', '전사', '[1,2,3,5,5]'::jsonb, true, '{"deckType":"fixed","role":"높은 카드와 강인한 생존력","icon":"➶","color":"#d6b77a","attackFx":"spear","attackSfx":"sfx_attack_warrior","skill":{"id":"toughness","name":"강인함","type":"passive","description":"HP 1에서 처음 받는 피해를 무효화합니다. HP 2 이상으로 회복하면 재충전됩니다."}}'::jsonb),
('rogue', '도적', '[1,1,3,4,5]'::jsonb, true, '{"deckType":"fixed","role":"낮은 카드로 보상을 노리는 전문가","icon":"🗡","color":"#8ad6b1","attackFx":"dagger","attackSfx":"sfx_attack_rogue","skill":{"id":"low_card_gold","name":"손버릇","type":"passive","description":"보물·이벤트에서 가장 낮은 유효 숫자를 내면 +2G. 판정당 한 번."}}'::jsonb),
('mage', '마법사', '[1,2,3,4,5]'::jsonb, true, '{"deckType":"fixed","role":"카드의 힘을 증폭하는 마법사","icon":"✺","color":"#b895ff","attackFx":"magic","attackSfx":"sfx_attack_mage","skill":{"id":"amplify","name":"증폭","type":"active","description":"사이클당 1회. 제출할 때 사용하면 유효 카드 효과값 +2. 원래 숫자로 중복 판정하며, 무효여도 사용 횟수는 소비됩니다."}}'::jsonb),
('berserker', '광전사', '[1,2,4,4,5]'::jsonb, true, '{"deckType":"fixed","role":"위험할수록 강해지는 공격수","icon":"⚒","color":"#ff766d","attackFx":"axe","attackSfx":"sfx_attack_berserker","skill":{"id":"blood_heat","name":"피의 열기","type":"passive","description":"HP 1일 때 유효 카드의 몬스터·보스 피해 +1. 비전투 효과에는 적용되지 않습니다."}}'::jsonb),
('seer', '점술사', '[1,2,3,3,5]'::jsonb, true, '{"deckType":"fixed","role":"한 턴 앞을 엿보는 예언자","icon":"✧","color":"#8bd9ff","attackFx":"starlight","attackSfx":"sfx_attack_seer","skill":{"id":"revelation","name":"계시","type":"passive","description":"사이클 마지막 카드가 중복되면, 다음 한 턴 동안 함께 겹친 상대가 제출한 숫자를 자신만 볼 수 있습니다."}}'::jsonb),
('imp', '임프', '[1,2,3,4,5]'::jsonb, true, '{"deckType":"fixed","role":"충돌을 이득으로 바꾸는 방해꾼","icon":"♆","color":"#ee8cd7","attackFx":"imp_magic","attackSfx":"sfx_attack_imp","skill":{"id":"score_steal","name":"슬쩍","type":"passive","description":"중복 시 함께 겹친 상대 중 점수가 가장 높은 상대에게서 1점 강탈. 동점은 무작위, 양수 점수만 강탈합니다."}}'::jsonb),
('gambler', '도박사', '[]'::jsonb, true, '{"deckType":"random","role":"매 사이클 운명을 다시 뽑는 승부사","icon":"⚄","color":"#ffd078","attackFx":"dice","attackSfx":"sfx_attack_gambler","skill":{"id":"random_cycle","name":"운명의 패","type":"passive","description":"매 사이클 1~7에서 무작위 5장. 같은 숫자 최대 2장, 7은 최대 1장. 패는 모두에게 공개됩니다."},"randomDeck":{"min":1,"max":7,"count":5,"maxDuplicates":2,"maxSeven":1}}'::jsonb)
on conflict (id) do update set display_name=excluded.display_name,deck=excluded.deck,enabled=excluded.enabled,definition=excluded.definition;
update public.room_members m set character_id='adventurer' from public.rooms r where r.id=m.room_id and r.status='waiting' and m.character_id='default_001';
alter table public.turn_submissions add column card_id text;
-- Null remains valid for rows submitted by an older client/function deployment.
alter table public.turn_submissions add column use_skill boolean default false;
