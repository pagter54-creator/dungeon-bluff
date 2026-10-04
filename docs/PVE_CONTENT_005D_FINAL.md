# PVE CONTENT-005D-FINAL — 전체 390장 런타임 감사

## 범위

신규 aug-271~390 120장: 무투가/흡혈귀/귀검사/쌍둥이 각30장. 전체 aug-001~390 등록·고유·실행·선택 후보390장, DATA_ONLY/MISSING/UNSUPPORTED/중복0을 검사한다.

## 검증

각 신규 카드의 positive/condition-negative/wrong-room/candidate/실제 획득 검증은 각 단계 테스트에 포함한다. FINAL에서12개 전체10장 빌드,12개 EXP 단계 진행,6개 혼합 파티,4개 동일 클래스 쌍,400 실제 턴 상태 기록 상한을 검증한다. D01~D07은 FINAL의 독립7개 실행 테스트와 단계별 테스트로 회귀 검증한다.

BASE→SELF_MODIFY→Vampire SWAP→Imp STEAL→FINAL→COLLISION→보호→VALIDITY→class post-valid→DAMAGE 순서, 소유자 상태 격리, hidden guard/physical zone privacy, 재접속·같은 root/action retry를 검사한다.

실제 PVE API로 네 파티의 F1→F2→F3→최종 보스→RUN_CLEAR를 진행하며 원정마다 두 재접속을 포함한다. Flame0 전체 DOWN 및 동시 boss kill/full wipe RUN_FAILED 우선순위, ABANDONED, Gold0/RP 불변을 검사한다. RUN_CLEAR는 runGold 정확 지급·RP delta0·rewards_committed/ledger once 및 중복 지급0.

원정 fixture는 모든 층과 room 흐름에 도달하기 위해 적 HP와 임시 상태를 제어한다. 실제 router와 카드·방·EXP·전이·정산 RPC 계약을 검증하며, 자연 밸런스나 실제 DB 정산 검증 결과로 표기하지 않는다. DB 호출은 메모리 admin이 모사하고 기존 SQL은 read-only 정적 검사한다.

## 명세/성능

BETA v0.1/005R/DESIGN-B/C/D 및 결정19개 파일의 Git blob SHA를 보존 검증한다. USER_CONFIRMED 보완 규칙은 원본 source-explicit으로 재분류하지 않는다. B의 제한 T03 migration, T04 원본 보존, C의 Ghost-only T02/T06 versioned golden, D의 authoritative combat ID fixture 보완은 단계 감사 문서에 기록한다.

전투 효과는 owner-owned augment와 indexed handler로 처리한다. 신규390 전체 registry 순회는 hot path에 추가하지 않았다. 임시 guard·history·복구 zone은 범위 종료 시 정리하며 현재 physical IDs만 보관한다.

## GitHub 검증 대기

보조 실행165 및 원정6 PASS, source/SQL21 검증은 GitHub Node CI에서 실행한다. 전체 npm test/check/smoke,8개 기존 시나리오×500시드=4000 검증 결과와 warning을 감사 JSON에 기록한다. 경고만 기록하며 밸런스 수치를 조정하지 않는다.

PVE_CONTENT_005D_FINAL_ACCEPTED=false
PVE_ALL_390_AUGMENTS_RUNTIME_COMPLETE=false
MERGE_RECOMMENDED=false
READY_FOR_NEXT_PVE_PHASE=false

모든 단계 Draft 유지. 최종 문서 HEAD의 Project Checks completed/success와 head_sha 일치 확인 후 PR 본문에 최종 승인 결과를 기록한다. production/DB/schema mutation0.

## 기준 커밋

D 최종 문서 HEAD a2958a289f7b3b7650d686725b1d40ea51a231b3, Project Checks #976 completed/success 이후 생성.
