# PVE CONTENT-005D-A — 무투가 30/30

## 구현과 검증

- Draft PR: https://github.com/pagter54-creator/dungeon-bluff/pull/25
- 코드 검증 HEAD: ed5d2c40bd4e275c7a6b4980f3a28d6fee1f1f40
- Project Checks #960 completed/success: https://github.com/pagter54-creator/dungeon-bluff/actions/runs/37154168805
- aug-271~300: registered/executable/candidate reachable 30/30. Stable option 번호 1/2/3 및 중복 검증 통과.
- 신규 실제 테스트151/151; 전체1585/1585; fail0/skip0; npm run check222 files 통과.
- 카드별 positive30/조건 negative30/room negative30,3개 full build 및 실제 EXP stage1→4,30개 acquisition/retry,6개 기존 직업 pipeline,Seer physical recovery,두 Martial 독립 supplier,재접속과 retry 검증.

FINAL 비교,첫 공격 gain0,일반 연격 ADD,충돌 score-1,보존299→291→280→276→base,cap292→271→base,공급자별 파쇄 FIFO/SHRED283/owner 보호287,finisher/Qi/관통296/복구297·300/MAX 병합 구현. 추가 피해 component는 별도 hit/ON_VALID를 생성하지 않는다. private state/guards는 public projection에서 제거되고 turn/cycle journal은 제한된다.

## 기존 stress

Smoke8 scenarios×10 seeds 및 T00/T02/T03/T04/T05/T06/T09 각각100 seeds: hard failure0. Balance warnings: smoke54; T00 1;T02 100;T03 100;T04 47;T05 99;T06 100;T09 100. 경고를 기록하며 수치 tuning은 하지 않았다.

## 사용자 승인과 회귀 보호

https://github.com/pagter54-creator/dungeon-bluff/pull/25#issuecomment-5973473233 에서 승인된3개 테스트의 과거 카운트만 갱신했다: metadata334/remaining56,executable305. 변경 가능한 runtime catalog만 immutable hash 대상에서 분리했다. 행동·중복·slot·class·tier·option,005C exact120/기존001~270 exact270 검사는 유지했다.

유지한 중복 검사에서 aug-272 이후 option1 중복을 발견해 runtime catalog를 수정했다. 테스트 기준을 완화하지 않았으며 별도 stable option 회귀 검사를 추가했다. BETA/005R/DESIGN source 및7개 golden 포함25개 hash 변경0. 원본 stable ID 변경0.

## 수락 순서

MARTIAL_RUNTIME_COMPLETE=true
READY_FOR_PVE_CONTENT_005D_B_VAMPIRE=true

이 문서를 포함한 최종 HEAD의 Project Checks completed/success를 확인한 뒤에만 B branch를 생성한다. Draft 유지; merge/Ready/deploy/Supabase/DB/schema mutation0.
