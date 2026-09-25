-- Update skill descriptions for new expeditions. Existing snapshots stay readable.
begin;
update public.characters set definition=jsonb_set(definition,'{skill,description}',to_jsonb('보물·이벤트에서 가장 낮은 유효 숫자를 내면 +2G와 +5점. 판정당 한 번.'::text)) where id='rogue';
update public.characters set definition=jsonb_set(definition,'{skill,description}',to_jsonb('중복 시 겹친 인원수와 무관하게 HP 1 회복. 유효 공격 효과 +1, 명중 시 HP 1 소모(최소 HP 1). 중복 판정은 원래 숫자이며 비전투 효과에는 +1이 적용되지 않습니다.'::text)) where id='berserker';
update public.characters set definition=jsonb_set(definition,'{skill,description}',to_jsonb('중복 시 함께 겹친 모든 상대에게서 각각 1점 강탈. 양수 점수만 강탈합니다.'::text)) where id='imp';
update public.characters set definition=jsonb_set(definition,'{skill,description}',to_jsonb('손패는 최대 2장. 한 장을 쓰면 다음 턴에 1~7 중 한 장을 보충합니다. 손에 남은 6·7과 같은 숫자는 뽑히지 않으며, 6·7 사용 직후에는 반드시 1~5를 뽑습니다. 사이클이 없으며 패는 모두에게 공개됩니다.'::text)) where id='gambler';
commit;
