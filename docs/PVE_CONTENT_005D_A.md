# PVE CONTENT-005D-A — 무투가 runtime 검증 현황

## 상태

**A 최종 수락은 대기 중이다. B/C/D/FINAL은 시작하지 않았다.**

- Branch: feat/pve-content-005d-a-martial
- Draft PR: https://github.com/pagter54-creator/dungeon-bluff/pull/25
- Baseline: 60de86e12132f48ad64b891d3970d5b41b7996e3
- 코드·테스트 HEAD: 474ef7e6823215c2d603be3ec824e12473971aed
- 아래 실행 증거는 04a8fbde58185d040e8ec0e57f63005c189a80d1 기준이다. 이후 변경은 recovery/supplier 테스트 2개 추가다.

## 구현

aug-271~300의 30개 계약을 등록했다. 기존 legacy aug-291은 같은 ID의 확정 계약으로 통합했다.

FINAL 비교, 첫 공격 gain0, 일반 연격 damage ADD, collision score-1, 보존 우선순위299→291→280→276→base, cap292→271→base, 공급자별 Shatter FIFO, SHRED283, owner collision 보호287, finisher 자원 소비/Qi/penetration296/복구297·300/MAX 병합을 구현했다. 추가 피해 component는 별도 hit/ON_VALID를 만들지 않는다.

Private authoritative guards/results는 augmentFramework에 저장되고 public projection에서 제거한다. Shatter 수와 공급자는 공개하되 내부 순서/receipt는 숨긴다. guard는 현재 turn/cycle과 combat once만 보존하며 runtime dispatch는 owner-owned augment 조회를 사용한다.

## 확인된 검증

Project Checks #956의 **005D A targeted runtime verification** job111278004050:

- actual runtime tests148/148, fail0, skip0
- npm run check:222 files PASS
- 기존 stress smoke:8 scenarios ×10 seeds, hard failure0
- T02/T05/T06: 각100 seeds, hard failure0
- balance warnings: smoke54; T02 100; T05 99; T06 100. 기존 harness 경고를 기록하며 수치 tuning은 하지 않았다.
- 카드별 positive30 / contract condition negative30 / wrong-room negative30
- 3개 full build와 실제 EXP stage1→4 progression,30개 actual offer/acquisition/retry
- 여섯 기존 직업 mixed number pipeline과 reconnect 동일 결과
- source25개 Git blob SHA 비교 변경0
- 기존 테스트 파일 변경0 / golden 변경0

추가한 Seer 실제 physical-card recovery 및 두 Martial supplier 테스트를 포함하는 최신 HEAD 재검증은 GitHub CI에 남긴다. 전체 Project Checks 성공으로 표기하지 않는다.

## 자동 승인 검토 차단

전체 npm test는1582 tests 중1578 PASS,4 FAIL,0 skip이다. 실패는 아래 과거 수락 검사다.

1.005A metadata total305 — 새 카드 추가 후334.
2.005C-C executable total276 — 추가 후305.
3.005C-FINAL executable total276 — 추가 후305.
4.005C-FINAL augment-catalog.js 과거 blob hash — authorized new catalog entry block으로 변경됨.

기존 개수/해시 검사 변경을 시도한 Git tree 생성은 **자동 승인 검토가 거부했다**. 원인: 기존 테스트를 조정하여 회귀를 숨기지 말라는 명시적 사용자 지시와 충돌한다는 검토 결과.

거부된 테스트 변경은 branch에 적용하지 않았다. 기존001~270 behavioral tests와 모든 golden은 그대로 실행했다. T02 golden 차이는 finisher event/optional field compatibility를 수정하여 해소했다.

사용자에게 과거 개수·해시 검사만 새005D 수락 검사와 함께 갱신할 수 있는지 승인 요청을 남겼다. 승인 전 해당 변경 및 A 최종 수락/다음 phase 진입은 진행할 수 없다.

이는 gameplay DESIGN_BLOCKER가 아니며 자동 승인 검토에 따른 permission blocker다.

## Flags

MARTIAL_RUNTIME_COMPLETE = false
READY_FOR_PVE_CONTENT_005D_B_VAMPIRE = false

## Safety

Draft 유지. merge/Ready/deploy/Supabase/DB/schema mutation0. BETA/stable IDs/005R/DESIGN-B/C/D/golden 수정0.
