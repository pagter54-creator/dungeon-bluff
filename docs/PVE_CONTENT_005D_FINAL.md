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

## GitHub 검증 결과

runtime HEAD: 69a2add966c04be7ea1c981d6f381b8625329c0b
Project Checks #977: completed/success, head_sha 일치.

npm test 2,321/2,321 PASS, FAIL/skip0.
npm run check PASS, 234 JS/TS 파일과 로컬 모듈/HTML 자산 참조 검증.
원본19개 hash 비교 및 기존 정산/임시 로그 저장 SQL2개 검사 PASS.
smoke80 runs 및 T00/T02/T03/T04/T05/T06/T09 각100시드 hard failure/failed seed0.

| 시나리오 | 시드 | hard failure | failed seed | 경고 발생 시드 | 경고 항목 |
|---|---:|---:|---:|---:|---:|
| T00 | 500 | 0 | 0 | 1 | 1 |
| T02 | 500 | 0 | 0 | 500 | 500 |
| T03 | 500 | 0 | 0 | 500 | 1500 |
| T04 | 500 | 0 | 0 | 266 | 266 |
| T05 | 500 | 0 | 0 | 496 | 496 |
| T06 | 500 | 0 | 0 | 500 | 1325 |
| T09 | 500 | 0 | 0 | 500 | 500 |
| T14 | 500 | 0 | 0 | 0 | 0 |
| 합계 | 4000 | 0 | 0 | 2763 | 4588 |

경고 종류: REFERENCE_CLASS_COLLISION_2X_SAME_AVAILABILITY 1, REPEATED_BURST 500, TURN_LENGTH_OUTSIDE_35_PERCENT 3265, SAME_CARD_RECOVERY_HIGH 317, CARD_REUSE_HIGH 500, RECOVERY_DOMINATES 5.
경고는 기록만 했으며 수치/게임플레이 조정0. 실행 실패와 분리한다.

GitHub tree 비교에서도 보호된 명세/결정19개와 기존 T02/T04/T06 golden3개,22개 파일이 기준 tree와 동일하다. B에서 승인된 제한 T03 migration만 별도 기록되어 있다.

## 완료 판정

Martial30/30, Vampire30/30, Ghost30/30, Twins30/30.
005D120/120, global390/390, candidate390/390.
신규 카드별 positive/negative/room/candidate/acquisition 각120,12 전체 빌드,12 단계 진행,6 혼합,4 동일 클래스 쌍 및 독립 D01~D07 PASS. 기존001~270 high-risk 경로를 포함한 전체 suite PASS.
3층 원정4개 파티,각2재접속, RUN_CLEAR/RUN_FAILED/ABANDONED 및 once Gold/RP 정산 계약 PASS.

PVE_CONTENT_005D_FINAL_ACCEPTED=true
PVE_ALL_390_AUGMENTS_RUNTIME_COMPLETE=true
MERGE_RECOMMENDED=true
READY_FOR_NEXT_PVE_PHASE=true

## 최종 문서 HEAD 게이트

이 최종 문서 커밋 자체의 Project Checks가 completed/success이고 head_sha와 일치해야 최종 승인한다. 동일 npm test/check/smoke/100시드/4000시드 검증을 다시 수행하며, 정확한 최종 HEAD·CI 결과는 PR29 본문에 기록한다. 최종 커밋에는 동시 boss-kill/full-wipe 검증의 boss 실제 사망·Flame0·BOSS_CLEAR 회복 금지 assertion도 포함한다.

모든 PR Draft 유지. merge/Ready/production/DB/schema mutation0.

## 순차 기준

A PR25: 7280128c0aa0f19a1719242de483023171a0143e / CI961 success
B PR26: 62be0b795a325592f258ce68268859d80515262c / CI967 success
C PR27: 857507e02817c8494e569db647cec30ff850a310 / CI971 success
D PR28: a2958a289f7b3b7650d686725b1d40ea51a231b3 / CI976 success

FINAL은 D의 최종 문서 exact HEAD gate 성공 이후 생성했다.
