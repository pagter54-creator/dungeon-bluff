# PVE CONTENT-005C-D — Gunslinger aug-241~270

## 검증과 완료 기준

Draft [PR #22](https://github.com/pagter54-creator/dungeon-bluff/pull/22). GitHub connector에서 직접 파일을 작성했습니다. 로컬 프로젝트 파일은 읽기 전용 참고 자료로 사용했습니다.

Runtime 30장을 구현하고 카드별 실제 효과/negative 검증을 추가했습니다. 완료 상태는 **이 문서를 포함한 현재 documentation HEAD**의 Project Checks `completed / success`로 계산합니다. 이전 커밋의 성공은 최종 완료 근거를 대신하지 않습니다. 실제 final SHA와 CI run은 PR 본문에 남깁니다.

## 사용자 확정 실행 규칙

두 규칙은 `USER_CONFIRMED_EXECUTION_RULE`, `executionRuleSource: USER_CONFIRMED_005C_D_PATCH`로 기록합니다. DESIGN-C/BETA 원문을 덮어쓰거나 source-explicit으로 재표기하지 않습니다.

- **aug-248**: selected 최종 VALID + 시작 시 다른 remaining 정확히3. 정상 remaining-card damage 뒤 fixed extra damage5를 같은 root에 붙입니다. 별도 hit/submit/collision/validity/ON_VALID/ON_HIT를 만들지 않으며 cycle당1회, retry 중복0입니다.
- **aug-253**: collision으로 소비될 현재 armed Precision Shot 사용권만 전투당1회 보존합니다. 같은 cycle 다음 eligible activation에 사용하고 미사용 보존권은 cycle 종료에 만료합니다. setup/accuracy/weakness/history/HP protection은 보존 대상이 아닙니다. 옛 “다음 직접 피해1 감소”는 runtime 의미로 사용하지 않습니다.

## 원본 불변성

DESIGN-C JSON/보고서/audit, 005Q decisions, 005R contracts, BETA source3개를 baseline/current blob으로 비교했습니다. 동일합니다. Stable ID catalog도 변경하지 않았습니다. Production 배포/DB/schema 변경은 없습니다.

## 원자적 처리와 재접속 범위

서버는 한 turn의 판정과 피해를 원자적으로 저장합니다. 외부에 저장되는 부분 피해 batch checkpoint는 없습니다. pending activation과 처리 전후 snapshot의 재접속을 검증하고, primitive mutation은 canonical root ID로 중복을 막습니다. Burst phase trace는 owner-private 실행 상태에 저장합니다.

## 요청된 74항목

| # | 항목 | 결과 / 근거 |
|---:|---|---|
| 1 | branch / PR | feat/pve-content-005c-d-gunslinger / Draft PR #22 |
| 2 | baseline HEAD | a4a42f2b75cb036616437f1440564134ab4f614c — PR #21 final docs; Project Checks #840 completed/success |
| 3 | final HEAD | 이 문서를 포함한 PR #22의 current documentation HEAD. 최종 SHA와 Actions 링크는 PR 본문에 기록. |
| 4 | changed files | 런타임/화면 10개, 테스트 4개, 이번 문서 3개. 아래 파일 목록 참조. |
| 5 | target | aug-241~270, 30장 |
| 6 | registered | 30 |
| 7 | executable | 30 |
| 8 | DATA_ONLY | 0 |
| 9 | MISSING | 0 |
| 10 | UNSUPPORTED | 0 |
| 11 | 005C executable total | aug-151~270: 120/120 unique |
| 12 | global executable total | aug-001~270: 270/270; all390: 276 (범위 밖 기존 6장 포함) |
| 13 | candidate reachability | 총잡이 30/30; 005C 4직업 각각 30장 |
| 14 | archetype coverage | 전탄 난사 / 정밀 사수 / 과열 기관 각 10장 |
| 15 | stage distribution | 3 / 9 / 9 / 9 |
| 16 | base Gunslinger canonical | [1,2,3] physical magazine; 전투 시작 ready; selected 최종 VALID를 사용. |
| 17 | magazine state | 고유 physical IDs, used/remaining, size, cycleIndex, ready/readyCycle; 서버 저장과 owner projection. |
| 18 | Full Burst phase model | ACTIVATION → SELECTED → SUCCESS/FAILURE → REMAINING → DAMAGE → MAGAZINE/CYCLE_ADVANCE → COOLDOWN/RECHARGE. root별 phase trace와 완료 guard. |
| 19 | success path | 선택 카드 최종 VALID → 나머지 physical 카드 순서대로 추가 사용 → 피해 → 소비 → 다음 cycle. |
| 20 | failure path | remaining 미사용; collision은 HP 1 자해; 기본 readyCycle=current+1. |
| 21 | self-damage taxonomy | SELF / GUNSLINGER_FULL_BURST_FAILURE / amount1 / canDown=true / minHP0 / POST_PLAYER_ATTACK / owner attribution. |
| 22 | cycle advance | 카드 소비 이후 단 한 번. 마지막 카드 Burst도 natural exhaustion으로 한 번 전환. |
| 23 | cooldown/recharge | 기본 성공 current+2; 실패 current+1; aug261/269 성공 current+1. |
| 24 | retry idempotency | canonical action ID의 activation, component, self-damage, phase, completed/once guard. 서버의 원자적 turn 저장 경계 사용. |
| 25 | aug-241 | legacy registry 통합. 첫 탄창은 canonical base IDs; 진행 중 획득은 기존 IDs/카드/zone 보존 후 새 2 한 장 추가. |
| 26 | 4-card magazine | [1,2,2,3]; 3개 remaining 추가 사용; new cycle/reconnect 동일. |
| 27 | aug-251 | Full Burst를 armed Precision Shot으로 교체. spent0/1/2에 +0/+1/+3; remaining 자동 소비 안 함. |
| 28 | Precision predicate | skillIntent + armed activation + selected 최종 VALID. 마지막 카드·이전 FINAL_NUMBER 차이 등 구조화 조건. |
| 29 | aug-253 | USER_CONFIRMED_EXECUTION_RULE. collision으로 잃는 Precision 사용권만 전투당 1회 보존; 같은 cycle만; HP 피해 감소 아님. |
| 30 | aug-257 | enemy defense ignore1. 피해 pipeline의 방어 적용 전. |
| 31 | penetration | min(1, actual enemy defense); defense0은 피해 추가0. 결과/telemetry attribution 유지. |
| 32 | aug-261 | 과열 cap3; activation+1, collision 추가+1, 미사용 turn 냉각. |
| 33 | Overheat | 0~3, COMBAT_END reset; 3 도달 시 다음 턴 제한 후1; 그 제한 턴 추가 냉각 없음. |
| 34 | Overheat/Burst ordering | activation gain → selected 판정/실패 gain → damage predicates → magazine close/recharge. remaining마다 gain 없음. |
| 35 | aug-242~250 summary | derived +1 cap3; 새 cycle 첫 VALID +1 두 효과; remaining 조건 추가 피해; aug248 별도 fixed component5; 다음 Burst +3; 마지막 탄환 +5. |
| 36 | aug-252~260 summary | setup +1; 사용권 보존; 마지막 +2; FINAL 차이>=2 +2; weakness/accuracy; 관통1; Deadeye SET6와 aim+2; 기존 약점3 처형+7 소모. |
| 37 | aug-262~270 summary | heat predicates +1/+1/+3/+4; unused cooling2; output cap3; once/combat emergency cooling; RUN output269; once/combat forced Burst +8 / 실패 HP1 heat3. |
| 38 | room isolation | 전체 COMBAT YES / EVENT REWARD SHOP REST NO. Reward Burst 제출 거절; combat 피해를 보상 ranking으로 변환하지 않음. |
| 39 | once/reset/persistence | 카드별 contract JSON에 기록. TURN/CYCLE/BURST/COMBAT/root 구분; aug269 RUN 유지; combat transient 정리. |
| 40 | reconnect | normal/4-card magazine, pending activation, cooldown, Precision armed/once, Heat0/1/2/3 복원. |
| 41 | privacy | exact magazine/activation/history/once는 owner-private; 다른 viewer의 gunner* 내부 판정 필드 제거; 선언된 public resource만 제공. |
| 42 | cleanup | combat Heat/Accuracy/Weakness/flags/phase guards 정리, output269 RUN 유지. 컨테이너 RUN_END cleanup. |
| 43 | telemetry | 각 실제 효과 augmentId/triggerCount/successCount; burstAttempts/success/failures/derivedCardsUsed/damage/selfDamage/precision/penetration/heat. |
| 44 | tooltip parity | 30/30 runtime overlay = PVE_EXECUTABLE_AUGMENT_UI. aug253/257의 충돌하는 옛 tooltip 의미 사용 안 함. |
| 45 | positive coverage | 30/30 카드 실제 mutation/effect; core 통합 검증 별도. |
| 46 | negative coverage | 30/30 wrong-room dispatcher + collision/defense0/last-card/once/cooldown/expiry 등의 고위험 검증. |
| 47 | Burst tests | 실제 4-card success, failure, physical derived cards, fixed component ordering, cycle/cooldown. |
| 48 | magazine tests | initial canonical IDs, mid-cycle acquisition preserve IDs, reconnect, independent owners. |
| 49 | Precision tests | spent scaling, armed consumption, collision preservation, noncollision negative, second failure, cycle expiry. |
| 50 | penetration tests | 실제 mitigation 비교, defense0 negative, root retry attribution. |
| 51 | Overheat tests | 0→1→2→3 cap; blocked turn cooling; emergency/forced failure; once/retry. |
| 52 | retry tests | activation, selected resolution, damage bonus, penetration, fixed component, heat, combat init, phase/cycle guards. |
| 53 | reconnect tests | owner projection와 structured snapshot round-trip; pending activation 재처리 중복 없음. |
| 54 | recursion tests | derived 카드 collision participant/submit 아님; no re-Burst/extra queue/depth duplication; aug248 AFTER_DAMAGE/ON_HIT 미재발동. |
| 55 | high-risk tests | 241/251/253/257/261, 248 component, 270 forcing, SELF DOWN/Flame/Revenge. |
| 56 | full 전탄 난사 build | 전체10장 × 3 mixed-party 구성 × 8턴 × 동일 replay2회. actual success 필수. |
| 57 | full 정밀 사수 build | 전체10장 × 3 mixed-party 구성 × 8턴 × 동일 replay2회. actual Precision success 필수. |
| 58 | full 과열 기관 build | 전체10장 × 3 mixed-party 구성 × 8턴 × 동일 replay2회. actual success와 Heat 범위 검증. |
| 59 | mixed-party integration | 총잡이+예언자+임프+마법사/기사/도박꾼 9 cases; 2 Gunners 독립; Berserker Revenge negative. |
| 60 | 005B regression | 150/150 유지; 기존 tests와 7개 stress gate. |
| 61 | Seer regression | 30/30 유지; recovery 및 candidate tests. |
| 62 | Imp regression | 30/30 유지; steal/ordering 및 candidate tests. |
| 63 | Gambler regression | 30/30 유지; zone integrity/Luck privacy/All-In idempotency; registry 전체 숫자 assertion만 현재 범위로 갱신. |
| 64 | npm test | 최종 documentation HEAD의 Project Checks Run tests success 필요. |
| 65 | npm run check | 같은 HEAD Run project checks success 필요. |
| 66 | stress smoke | 같은 HEAD Run PVE stress smoke success 필요. |
| 67 | relevant stress | 같은 HEAD T06/T02/T00/T05/T09/T04/T03 각100seed success 필요. golden/schedules/workflow 변경 없음. |
| 68 | Project Checks | 현재 documentation HEAD completed/success일 때만 최종 PASS. pending/in_progress는 완료 아님. |
| 69 | BALANCE_WARNING_005C_D | 수치 튜닝 없음. 새 통계적 밸런스 인증은 수행하지 않음; 이번 full-build 검증은 기능·상태·ordering 검증. |
| 70 | FRAMEWORK_BLOCKERS | 0 |
| 71 | RUNTIME_BLOCKERS | 0 |
| 72 | TEST_BLOCKERS | 0; 최종 CI gate 미완료 시 완료 flags는 false. |
| 73 | GUNSLINGER_RUNTIME_COMPLETE | current documentation HEAD Project Checks completed/success => true; 그 외 false. |
| 74 | READY_FOR_PVE_CONTENT_005C_FINAL | 동일 CI gate. 이후 작업은 이번 PR에서 시작하지 않음. |

## 카드별 오버레이

| ID | 이름 | 빌드 | Stage | 판정 |
|---|---|---|---:|---|
| aug-241 | 전탄 난사 | 전탄 난사 | 1 | MATCH — 최종 CI gate 적용 |
| aug-242 | 대용량 탄창 | 전탄 난사 | 2 | MATCH — 최종 CI gate 적용 |
| aug-243 | 급속 장전 | 전탄 난사 | 2 | MATCH — 최종 CI gate 적용 |
| aug-244 | 화약 증량 | 전탄 난사 | 2 | MATCH — 최종 CI gate 적용 |
| aug-245 | 탄띠 급탄 | 전탄 난사 | 3 | MATCH — 최종 CI gate 적용 |
| aug-246 | 완전 연소 | 전탄 난사 | 3 | MATCH — 최종 CI gate 적용 |
| aug-247 | 마지막 한 발까지 | 전탄 난사 | 3 | MATCH — 최종 CI gate 적용 |
| aug-248 | 탄막 지배 | 전탄 난사 | 4 | MATCH — 최종 CI gate 적용 |
| aug-249 | 전쟁 기계 | 전탄 난사 | 4 | MATCH — 최종 CI gate 적용 |
| aug-250 | 최후통첩 | 전탄 난사 | 4 | MATCH — 최종 CI gate 적용 |
| aug-251 | 정밀 사수 | 정밀 사수 | 1 | MATCH — 최종 CI gate 적용 |
| aug-252 | 영점 조정 | 정밀 사수 | 2 | MATCH — 최종 CI gate 적용 |
| aug-253 | 침착한 호흡 | 정밀 사수 | 2 | MATCH — 최종 CI gate 적용 |
| aug-254 | 대구경 탄환 | 정밀 사수 | 2 | MATCH — 최종 CI gate 적용 |
| aug-255 | 탄도 계산 | 정밀 사수 | 3 | MATCH — 최종 CI gate 적용 |
| aug-256 | 약점 포착 | 정밀 사수 | 3 | MATCH — 최종 CI gate 적용 |
| aug-257 | 관통탄 | 정밀 사수 | 3 | MATCH — 최종 CI gate 적용 |
| aug-258 | 데드아이 | 정밀 사수 | 4 | MATCH — 최종 CI gate 적용 |
| aug-259 | 백발백중 | 정밀 사수 | 4 | MATCH — 최종 CI gate 적용 |
| aug-260 | 사형 선고 | 정밀 사수 | 4 | MATCH — 최종 CI gate 적용 |
| aug-261 | 과열 기관 | 과열 기관 | 1 | MATCH — 최종 CI gate 적용 |
| aug-262 | 고압 기관 | 과열 기관 | 2 | MATCH — 최종 CI gate 적용 |
| aug-263 | 냉각핀 | 과열 기관 | 2 | MATCH — 최종 CI gate 적용 |
| aug-264 | 붉은 배기관 | 과열 기관 | 2 | MATCH — 최종 CI gate 적용 |
| aug-265 | 임계 출력 | 과열 기관 | 3 | MATCH — 최종 CI gate 적용 |
| aug-266 | 폭주 실린더 | 과열 기관 | 3 | MATCH — 최종 CI gate 적용 |
| aug-267 | 비상 냉각 | 과열 기관 | 3 | MATCH — 최종 CI gate 적용 |
| aug-268 | 레드존 | 과열 기관 | 4 | MATCH — 최종 CI gate 적용 |
| aug-269 | 멈추지 않는 포화 | 과열 기관 | 4 | MATCH — 최종 CI gate 적용 |
| aug-270 | 기관 폭주 | 과열 기관 | 4 | MATCH — 최종 CI gate 적용 |

정확한 trigger/condition/rooms/once/reset/persistence/visibility/primitiveMapping과 테스트 이름은 [RUNTIME JSON](PVE_CONTENT_005C_D_RUNTIME.json), 집계/증거/gate는 [AUDIT JSON](PVE_CONTENT_005C_D_AUDIT.json)에 기록했습니다.

## 변경 파일

- `src/pve-ui-catalog.js`
- `supabase/functions/game-api/pve/augment-runtime.js`
- `supabase/functions/game-api/pve/augments.js`
- `supabase/functions/game-api/pve/characters.js`
- `supabase/functions/game-api/pve/combat.js`
- `supabase/functions/game-api/pve/effects.js`
- `supabase/functions/game-api/pve/gunner-contracts.js`
- `supabase/functions/game-api/pve/gunner-runtime.js`
- `supabase/functions/game-api/pve/projection.js`
- `supabase/functions/game-api/pve/rooms.js`
- `tests/pve-content-005c-a-seer.test.mjs`
- `tests/pve-content-005c-b-imp-integration.test.mjs`
- `tests/pve-content-005c-c-gambler-repair.test.mjs`
- `tests/pve-content-005c-d-gunslinger.test.mjs`
- `docs/PVE_CONTENT_005C_D_RUNTIME.json`
- `docs/PVE_CONTENT_005C_D_AUDIT.json`
- `docs/PVE_CONTENT_005C_D.md`
