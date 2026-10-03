# PVE CONTENT-005C-C — Gambler 최종 실행 검증

## 최종 구현 상태
aug-211~240: 등록/실행/계약 일치/후보 도달/실제 효과 긍정/부정 검증 **30/30**.
MATCH 30; IMPLEMENTED_UNVERIFIED/PARTIAL/BLOCKED/MISSING/DATA_ONLY/UNSUPPORTED 0.
빌드 3종 각 10장, 단계 3/9/9/9.
005C 범위 실행 91/120; aug-001~270 241개; 390장 전체 레지스트리 실행 247개(기존 범위 밖 6장 포함).
005B 150/150, Seer 30/30, Imp 30/30 유지.

## 완료한 회귀 수정
- Reward presentation → Luck 사용 → final confirm 서버 판정. 재접속 시 행운 소비와 선택한 혜택 저장; 확정 후 창 닫힘.
- 동일 판정/올인/카드 정산 재처리 시 피해·이동·드로우·해금·기록·텔레메트리 중복 방지.
- 소유자만 정확한 덱/손패/버린 패/소멸 패/예측/기록 확인. 아군·관전자·층 전환 결과에서 올인 두 번째 카드 ID/값/선택 쌍 제거.
- 카드 카운터는 셔플 내 이미 사용한 숫자를 재집계하지 않음. 다섯 숫자 기억 셔플당 한 번. 연속 수열은 셔플을 넘겨 유지하고 전투 종료에 정리.
- usesStandardCycle=false; DECK/HAND/DISCARD/VANISHED 단일 소속과 physical ID 유지. 사용한 6/7 소멸; 일반 셔플·SPENT 회수에서 제외.
- 올인은 판정 카드만 충돌/VALIDITY 참가, 성공 피해 SET_DAMAGE, 두 카드 소비. aug-235~238 변형 실제 피해·상태·이동 검증.
- 전투 종료 시 임시 효과/행운/올인 정리, 지속 덱 상태 보존.
- aug-237 툴팁은 DESIGN-C의 구조화된 효과/조건을 기준으로 기존 UI와 서버 표시를 일치시킴. DESIGN-C 원문은 수정하지 않음.

## 검증 근거
구현 HEAD: `9fdce061126ef7826c98ed59154adf392f6b1bbb`.
[Project Checks #837](https://github.com/pagter54-creator/dungeon-bluff/actions/runs/37112765803): completed/success.
npm test 1034/1034; check, smoke, T06/T02/T00/T05/T09/T04/T03 각 100-seed PASS.
운명의 승부사/카드 카운터/올인 실제 혼합 파티 전투와 재접속 재현 PASS.
100 seeds × 3 full builds × 12 turns × 두 번 재현 PASS.
전용 테스트: tests/pve-content-005c-c-gambler-repair.test.mjs 및 tests/pve-content-005c-c-gambler-integration.test.mjs.

## 초기 감사 이력
closeout 시작 HEAD 37843a9에서 IMPLEMENTED_UNVERIFIED 26 / PARTIAL 4 (211/221/225/227).
과거 초안의 18/1/11은 현재 상태가 아님.

## 변경 제한 및 경고
DESIGN-C blob 4b9b2dab17d0a0138abde0aa97a999a39b83a8d4 유지.
BETA 원본/stable IDs/production 불변. 배포·DB·schema 변경 없음. PR #21 Draft 유지.
BALANCE_WARNING_005C_C: 기존 수치 검증만 수행; 수치/기존 golden 조정 없음.
FRAMEWORK_BLOCKERS / RUNTIME_BLOCKERS / TEST_BLOCKERS = 0.

## 최종 문서 HEAD 완료 게이트
이 문서가 포함된 **현재 HEAD**의 Project Checks가 completed/success일 때만:
GAMBLER_RUNTIME_COMPLETE = true
READY_FOR_PVE_CONTENT_005C_D_GUNSLINGER = true
pending/in_progress/failure이면 두 플래그는 false. 구현 HEAD #837 성공만으로 문서 HEAD 완료를 선언하지 않음.
