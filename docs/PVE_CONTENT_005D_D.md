# PVE CONTENT-005D-D — 쌍둥이 30장

DESIGN-D 및 사용자 확정 D04 구현. 원래 숫자의 홀짝을 선택·제출에서 검사한다. 이후 숫자 변경/교환/탈취로 최종 홀짝이 달라져도 다시 무효화하지 않는다.

## 구현

aug-361~390의 연속 유효/충돌 기록, 사이클 완료 보너스, 태양·달과 다음 턴 특수 상태, 회복·보호, 곡예 직접 활성화와 충전/다음 유효 보너스, 동일 실물 카드 복구를 구현했다. 현재 카드 소모 후 복구하고 남은 카드가 없을 때만 자연 사이클 완료를 처리한다. aug-390은 첫 세 제출 모두 유효인 경우만 발동하며 현재/삭제/다른 소유자/소멸 카드 제외, SPENT 순서 내림차순으로 선택한다. 복구할 카드가 없어도 충전 진행도는 적용한다. 원본 golden 및 stable ID는 보존한다.

## 검증 대기

보조 검증183 PASS/0 FAIL. 카드별 positive/negative/room/candidate/acquisition 각30, EXP 네 단계·세 전체 빌드·혼합 파이프라인·다중 소유자·재접속·privacy·실제 Vampire 교환 후 홀짝·복구 순서·빈 후보·사용 제한 포함. GitHub 전체 Node/check/smoke/100시드 결과는 대기 중이다.

TWINS_RUNTIME_COMPLETE=false
READY_FOR_PVE_CONTENT_005D_FINAL=false

Draft 유지. 최종 문서 HEAD의 Project Checks 성공 후 FINAL을 시작한다.
