# PVE CONTENT-005D-D — 쌍둥이 30장

DESIGN-D 및 사용자 확정 D04 구현. 원래 숫자의 홀짝을 선택·제출에서 검사한다. 이후 숫자 변경/교환/탈취로 최종 홀짝이 달라져도 다시 무효화하지 않는다.

## 구현

aug-361~390의 연속 유효/충돌 기록, 사이클 완료 보너스, 태양·달과 다음 턴 특수 상태, 회복·보호, 곡예 직접 활성화와 충전/다음 유효 보너스, 동일 실물 카드 복구를 구현했다. 현재 카드 소모 후 복구하고 남은 카드가 없을 때만 자연 사이클 완료를 처리한다. aug-390은 첫 세 제출 모두 유효인 경우만 발동하며 현재/삭제/다른 소유자/소멸 카드 제외, SPENT 순서 내림차순으로 선택한다. 복구할 카드가 없어도 충전 진행도는 적용한다. 원본 golden 및 stable ID는 보존한다.

## 검증 결과

보조 검증184 PASS/0 FAIL. 카드별 positive/negative/room/candidate/acquisition 각30, EXP 네 단계·세 전체 빌드·혼합 파이프라인·다중 소유자·재접속·privacy·실제 Vampire 교환 후 홀짝·복구 순서·빈 후보·사용 제한 포함. GitHub Project Checks #975 (d5ebd7059f6818885e8e32bdb3ea833cc0ebc288) completed/success. 전체 npm test 2,129/2,129 PASS, 0 FAIL/skip. npm run check PASS, smoke 80 runs 및 T00/T02/T03/T04/T05/T06/T09 각100시드에서 hardFailure=0, failedSeeds=0. T06 warning은 261개(100개 시드)이며 기록만 하고 조정하지 않았다.

TWINS_RUNTIME_COMPLETE=true
READY_FOR_PVE_CONTENT_005D_FINAL=true

Draft 유지. 최종 문서 HEAD의 Project Checks 성공 후 FINAL을 시작한다.

## 기존 fixture 보완

R01/R03 승인 및 DESIGN-D의 combatId/ownerId parity seed 규칙에 따라 세 재현성 테스트의 전투 ID를 동일하게 고정했다. 기존 비교·합법성·privacy assertion과 원본 golden은 유지한다. 곡예 미충전 안내에 기본 사이클 완주 조건을 명시한다.

## 최종 문서 검증 조건

이 문서 커밋 자체의 Project Checks가 completed/success이고 head_sha가 일치해야 FINAL 브랜치를 만든다. 해당 최종 결과는 PR 본문에 기록한다.
