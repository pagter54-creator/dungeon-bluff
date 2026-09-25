begin;
update public.characters set
  definition=jsonb_set(jsonb_set(jsonb_set(definition,'{role}',to_jsonb('카드 숫자를 뒤틀어 판정을 바꾸는 방해꾼'::text)),'{skill}', '{"id":"number_steal","name":"슬쩍","type":"passive","description":"중복 판정 직전, 나와 같은 숫자를 낸 모든 비임프 플레이어에게서 카드 숫자 1을 빼앗습니다. 대상은 최소 0까지 감소하고 임프는 실제로 빼앗은 만큼 증가합니다. 변경된 숫자로 모든 판정을 진행합니다."}'::jsonb),'{balanceRevision}','7'::jsonb)
where id='imp';
commit;
