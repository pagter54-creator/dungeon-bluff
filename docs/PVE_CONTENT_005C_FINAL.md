# PVE CONTENT-005C-FINAL — 최종 수락 / 통합 / Release Gate

GitHub 직접 수정. [Draft PR #23](https://github.com/pagter54-creator/dungeon-bluff/pull/23). 기준은 PR22의 최종 문서 HEAD와 Project Checks #887 성공입니다.

## 완료 게이트

이 문서가 포함된 **현재 HEAD**의 Project Checks가 completed/success이고, npm test/check/smoke 및8개500seed job이 모두 성공해야 아래 조건부 수락 상태가 true가 됩니다. 이전 code HEAD의 성공으로 대체하지 않습니다. 정확한 최종 SHA/run/jobs/실측 결과는 커밋을 새로 만들지 않는 PR 본문에 기록합니다. Draft를 유지합니다.

## 검증의 실제 범위

원정 E2E는 기존 API fixture를 재사용하며, 테스트의 commit adapter가 적HP1/파티HP·Flame복구를 적용합니다. 실제 증강과 판정·직업 state·방/층전환·재접속·최종승리 경로를 검증합니다. 자연밸런스의 원정클리어 가능성을 입증하는 결과로 표시하지 않습니다. 이를 보완하는 혼합005B+005C 파티와 기존 canonical 500seed harness를 함께 실행합니다. 정산 증거는 mock 정산이 아니라 기존 PGlite SQL/API 검사입니다.

재생 비교에서 제외되는 필드는 제출 시각 submittedAt뿐입니다. 물리카드/자원/결과/seed counter/once/상태/telemetry는 동일해야 합니다. 진단이벤트는 최신2048행을 유지하고 trigger/success 누적 합계를 보존합니다. 이는 관찰데이터의 보관 범위이며 BETA수치나게임플레이 변경이 아닙니다.

## 69항목 보고서

|순서|항목|내용 / 검증 기준|
|---:|---|---|
|1|branch / PR|feat/pve-content-005c-final / Draft PR #23|
|2|baseline HEAD|c59573dc58343c603aa00ab49cf9271e065a3267; PR22 #887 completed/success 및 두 완료 flag 확인|
|3|final HEAD|현재 문서를 포함한 최신 PR HEAD. SHA와 동일 HEAD의 CI 결과는 PR 본문에 확정 기록(본문 수정은 새 커밋을 만들지 않음).|
|4|changed files|워크플로1, runtime 결함 수정5, FINAL 테스트3, FINAL 문서3. GitHub diff 기준.|
|5|target augment count|aug-151~270 /120|
|6|registered count|120|
|7|executable count|120|
|8|DATA_ONLY count|0|
|9|MISSING count|0|
|10|UNSUPPORTED count|0|
|11|Seer count|30|
|12|Imp count|30|
|13|Gambler count|30|
|14|Gunner count|30|
|15|candidate eligibility|120장 각각 실제 후보 생성→선택→재접속→중복 재시도 검사. 소유 중복 제외/빌드/직업/단계 검증.|
|16|archetype coverage|12 archetype ×10|
|17|stage coverage|직업별3/9/9/9; 12개 실제 EXP50/150/350/750 진행 검사.|
|18|number pipeline|BASE_NUMBER→SELF_MODIFY→PRE_COLLISION_SWAP→PRE_COLLISION_STEAL→FINAL_NUMBER→COLLISION_GROUP→COLLISION_RESOLUTION→POST_COLLISION_EFFECTS→VALIDITY→DAMAGE. 실제 combat phaseTrace 및 고정 회귀 검사.|
|19|cross-class ordering|Mage→Imp, Imp→Knight override, Imp→Rogue soloLowest 기존 실제 통합 검사 유지; A-E 풀빌드 추가.|
|20|privacy|선택 숫자/계시 검사/정확한 Gambler 영역/상대 물리ID/미공개 All-In/내부 Gunner 상태의 owner/ally/spectator 경계 검증.|
|21|reconnect|직업별 기존 상세 검사 +15 혼합 파티 pending-submit 복원 +4 동직업 파티 복원 +2 원정 파티 API 복원.|
|22|idempotency|120개 실제 취득 재시도 state 불변; 기존 회복/All-In/Burst/관통/Luck/피해 root guard 유지.|
|23|delayed effects|origin combat/room mismatch 예언 취소 추가. 장난/버프 만료 및 이미 DOWN된 대상 회귀 유지.|
|24|cleanup / reset|Seer owner claim 완료 전투 정리; Gambler 완료 action receipt 정리; 다른 owner 및 물리 zones/ID 유지.|
|25|room applicability|120장 DESIGN-C 5방 행렬 동일성 + 각 금지 방 실제 CARD_VALIDATED/BEFORE_DAMAGE gate. Reward Luck/허용 회복·저장숫자 예외는 기존 테스트.|
|26|tooltip parity|120개 실제 UI description과 실행 contract overlay 일치. source 대신 overlay가 필요한 기존237/248/253/257 의미 보존.|
|27|telemetry sanity|실제 trigger/success 기록 유지; 최신2048 진단행과 정확한 누적 counter 병행.2400 이벤트 반복 검사.|
|28|Seer final acceptance|30 실제 효과/음성/복구/예언/선택프라이버시 회귀 +3 전체 archetype 혼합 검사.|
|29|Imp final acceptance|30 실제 효과/피해/저장숫자/장난 회귀. 여러 폭발 대상의 진단키 충돌 수정; 전투 밖 보너스 차단.|
|30|Gambler final acceptance|30 실제 효과/물리6·7 VANISHED/셔플/All-In/Luck/정확한 deck/history 복원 회귀.|
|31|Gunner final acceptance|30 실제 효과/물리탄창/단계/derived packet/Heat/관통/실패SELF/DOWN 회귀.|
|32|aug-248 confirmed rule|EXTRA_DAMAGE_COMPONENT5; activation-time remaining=3; 같은 Burst root; separate-hit/재귀/추가VALID 없음; cycle once. USER_CONFIRMED_005C_D_PATCH 보존.|
|33|aug-253 confirmed rule|충돌로 잃을 armed activation만 combat once 보존; 같은cycle 만료/복원. HP감소보호/setup/accuracy/weakness 보존 효과 아님. USER_CONFIRMED_005C_D_PATCH.|
|34|mixed-party matrix|A Seer/Imp/Gambler/Gunner; B Seer/Imp/Knight/Gunner; C Mage/Imp/Gambler/Gunner; D Seer/Rogue/Gambler/Gunner; E Knight/Imp/Gambler/Gunner. 각3 build ×16턴 복원 재생.|
|35|same-class party isolation|2Seer/2Imp/2Gambler/2Gunner 각24턴; 고유 물리ID/독립 영역/소유자별 기록/복원 동일성.|
|36|full archetype builds|각 archetype10장을 동시에 소유하여 총12 full build 검증. 실제 Seer 즉시 스킬/아군 복구/예언도 실행.|
|37|candidate progression|12개 class/build 실제4단계. 모든120카드 개별 취득 가능; 임계값 직전/도달/완료·중복 처리.|
|38|AI augment progression|실제 선택 경계 호출과 seed replay, 네 직업 모두 4단계 취득/빌드 lock. EXP750 일괄 도달은 기존 경계 반복 처리 의미 유지.|
|39|Full Expedition RUN_CLEAR|실제 API로 네005C직업 파티 및 Mage 포함005B+005C 파티 각각 Floor1/2/3/final boss/RUN_CLEAR.|
|40|Expedition reconnect|각 파티 F1_COMBAT /F3_MAP_ENTRY 두 번 getState. 실제 특수 state 상세 복원은 개별/혼합 파티 검사 병행.|
|41|settlement|실제 PGlite SQL/API REWARD-PVE-01/04/05/06: authoritative runGold,RP0,rewards_committed,동일요청 정산 once.|
|42|failure path|기존005-006 Flame0+전원DOWN→RUN_FAILED 및 SQL REWARD-PVE-02 Gold0/RP불변/정산 once.|
|43|boss kill + wipe priority|기존CONTENT003 final boss 사망 동시 전원wipe/Flame0→RUN_FAILED 우선, finalSummary없음.|
|44|abandon path|실제 SQL REWARD-PVE-03 및 last-human departure ABANDONED Gold0/RP불변/once.|
|45|npm test|최종 HEAD 검사 게이트. 예상1408개(기준1125 + FINAL283), 실제 수치는 CI log/PR 본문.|
|46|npm run check|최종 HEAD Project Checks test job 필수.|
|47|stress smoke|기존 npm run pve:stress:smoke 필수.|
|48|final500 stress|T00/T02/T03/T04/T05/T06/T09/T14 각500(총4000seed). 기존 npm run pve:stress:full 사용, test성공 후8 job 실행.|
|49|hard failure count|필수0. 최종 stress 로그 및 각 scenario 보고서로 확인; 코드/상태/privacy/재귀/중복/물리영역 오류는 release blocker.|
|50|stress warnings|실제 보고서 warning을 BALANCE_WARNING_005C_FINAL로 기록. 수정·튜닝 없이 비차단 처리.|
|51|performance sanity|effect dispatch는 소유 augment/relic 기준; trigger당120장 전체 조회 없음. 기존 turn/action ceiling 및500seed 실행. 이 작업은 성능 benchmark 자체를 주장하지 않음.|
|52|memory/state sanity|Gambler history<=48, 반복80 combat2400 이벤트 후 diagnostic<=2048, 누적count2400유지; 완료 prediction/Mischief/Burst/custom claim/action receipt 정리.|
|53|backward compatibility|실제 Gunner/Seer/Imp partial snapshot 필드 복원 검사 + 기존 Gambler normalize 및 전체직업 reconnect. Heat/armed/once/stack 보존; 명시적 origin mismatch만취소.|
|54|005B regression|aug-001~150 executable150 및 기존 전체 테스트, 고정T02/T06 등 회귀.|
|55|global aug-001~270 registry|270 unique executable, 결측/중복0.|
|56|all390 informational count|276 executable. 기존 범위 밖6장은005C count에 합산하지 않음; 신규271+구현0.|
|57|source integrity|DESIGN-C/005Q/005R/BETA source 불변; 현runtime clear defect만수정. 원본을 source-explicit으로 재분류하지 않음.|
|58|BETA / stable ID / golden|BETA원본행·stablecatalog·golden 불변. DESIGN-C/005Q/catalog/T02/T06 Git blob hash 실제 테스트.|
|59|production deploy / DB mutation|0 /0 /schema0. Draft FINAL branch는 production release job 조건에 해당하지 않음. SQL 검사는 독립 PGlite.|
|60|documentation|PVE_CONTENT_005C_FINAL.md /_AUDIT.json /_MATRIX.json|
|61|Project Checks CI|최종 documentation HEAD와 run head_sha 일치 + completed/success + test/8개500job success가 완료조건. 실제run 링크는 PR 본문.|
|62|RELEASE_BLOCKERS|최종CI 모든필수gate 성공 시0; 하나라도 실패/누락이면미수락.|
|63|DESIGN_BLOCKERS|현재0; 새게임플레이 의미가 필요하면 STOP. 이번 수정은 기존 scope/identity/cleanup 실행 결함.|
|64|RUNTIME_BLOCKERS|발견한 clear defects는 회귀 포함수정. 최종필수 gate성공시0.|
|65|TEST_BLOCKERS|최종 required gate전체성공시0; fail/skip/미실행을PASS로 기록하지 않음.|
|66|BALANCE_WARNING_005C_FINAL|기존 harness 실제 warning자료를 PR에 기록; 이 플래그는 튜닝 지시나 merge차단이 아님.|
|67|PVE_CONTENT_005C_FINAL_ACCEPTED|CURRENT_DOCUMENTATION_HEAD_ALL_REQUIRED_CI_SUCCESS ? true : false|
|68|MERGE_RECOMMENDED|CURRENT_DOCUMENTATION_HEAD_ALL_REQUIRED_CI_SUCCESS ? true : false; 실제merge금지|
|69|READY_FOR_PVE_CONTENT_005D_DESIGN|CURRENT_DOCUMENTATION_HEAD_ALL_REQUIRED_CI_SUCCESS ? true : false;005D시작금지|

## 수정된 실행 결함

- 장난 다중 폭발의 진단 mutation key가 source/target 식별을 누락하여 생기는 전투 중단을 수정했습니다. 피해수치는 동일합니다.
- 전투가 끝난 Seer owner custom claim을 정리하여 다음 전투의 Revelation serial 재사용을 막지 않도록 했습니다.
- 예언 origin combat/room mismatch를 취소하고, 선언된 source room 밖의 Seer/Imp 전투 보너스를 차단했습니다.
- 완료된 Gambler combat receipt를 제거하면서 모든물리 zone/ID/해금/이력을 유지했습니다.
- Seer/Imp 진단행을 bounded하게 유지하며 실제 trigger/success 누적합계를 보존했습니다.

- 오래된 Gunner/Seer/Imp 부분 snapshot에 빠진 새 필드를 기본값으로 복원하면서 기존Heat/armed/once/counter/stack은 보존했습니다.

aug248/253의 명시적 사용자 규칙은 변경하지 않았습니다. 상술한 모든 조건부 결과는 최종 HEAD CI gate가 증명할 때만 완료로 평가합니다.
