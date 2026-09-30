# PVE CONTENT-005Q-DESIGN-B — 005B BETA v0.2 실행 명세

## 범위와 판정

- 설계 대상은 52장: 모험가 8, 기사 12(직업 질문 10 + Q01/Q02 2), 도적 8, 마법사 9(직업 질문 7 + Q03 2), 광전사 15(직업 질문 11 + Q03 4).
- 원본 BETA v0.1 행과 stable ID는 변경하지 않았다. 새 v0.2는 계약 오버레이에 별도 출처로 반영한다.
- 기존 005Q 자동 정리 중 005B의 10장을 새로운 설계 없이 계약에 반영했다.
- 게임 런타임, balance, Stress fixture/golden은 변경하지 않았다.
- 전체 계약 상태: COMPLETE 79, PARTIAL 200, AMBIGUOUS 111.
- 설계 대상의 원자 항목은 58개이며 기존 자동 정리와 aug-107 CONDITION 1개가 겹친다. 순증 해소는 57개다.
- **READY_FOR_PVE_CONTENT_005B_RUNTIME = true.** 설계 명세가 준비됐다는 뜻이며 실제 효과 구현은 후속 005B 작업이다.

## 공통 실행 규칙

- 증강 소유권은 원정 동안 유지한다. 임시 상태와 횟수 카운터는 카드별 resetScope에서 지운다.
- 52장 중 49장은 Combat 전용이다. aug-038/044/045의 강인함·호위·물리 카드 구성요소는 해당 행동이 합법인 Event/Reward에서도 적용한다. Shop/Rest는 모두 false다.
- 동률 대상 선택은 카드별 선택자가 우선하고 일반 동률은 로비 좌석순이다. 직접 아군 선택 UI를 요구하지 않는다.
- 광전사 기본 충돌 회복 상한은 HP 2이며 aug-131이 있으면 최대 HP까지 완화한다.
- 추가 타격은 별도 피해 구성요소다. 처치는 소유 플레이어에게 귀속하며 같은 증강은 자신의 추가 타격에서 재귀 발동하지 않는다.
- 물리 카드 복구는 동일 cardInstanceId를 SPENT에서 REMAINING으로 이동하며 자동 제출하지 않는다. 기존 체인 안전 한도를 따른다.

## 직업별 성장 검토

| 직업 | 아키타입 | Stage 1 출발점 | v0.2 Stage 2~4 성장 |
|---|---|---|---|
| 모험가 | 노련한 탐험가 | 연속 유효 공격 | 3번째 공격 +1 → 4번째부터 +3 |
| 모험가 | 만능 장비꾼 | 숫자대별 장비 | 각 종류 세분화 → 교대 개조 → 세 종류 기본값 강화 |
| 모험가 | 기적의 탐험가 | 네 명 서로 다른 숫자·전원 유효 | 발견 보상 전원 EXP 2 |
| 기사 | 불굴의 기사 | 강인함·불굴 | HP1 충전 → 사이클 무료 사용·잔여 충전 보상 |
| 기사 | 수호벽 | 호위 | 다음 사이클 충전 → 희생 카드 복구 → 추가 보호 표식 |
| 기사 | 압살 기사 | 강인함 중복 관통 | 숫자5·환급·방어 관통 → 다중 압살·비축 → 진격 누적 |
| 도적 | 비열한 일격 | 단독 최저·비열함 | 하향 숫자 → 다음 턴 상향 → 비열함2 처형·실패 보호 |
| 도적 | 독 묻은 칼날 | 맹독 최대3 | 물리 카드 복구 → 중첩 잔존 |
| 도적 | 그림자 도약 | 숫자 차이3 도약 | 낮음→높음 강화 → 사이클당 실패 보호 |
| 마법사 | 백마도사 | 백마법 회복 | 저체력 보호·마나 환급·축복 → 해로운 상태 제거 |
| 마법사 | 역산술 | 마나2/4로 ±1/±2 | 하향 환급·방향 교대 → 다음 턴 회복 → 하향2 폭발·대칭 누적 |
| 광전사 | 피의 광전 | 실제 HP비용 공격 | 회복 연계·상향 추격 → 피의 폭풍·혈기 소비·HP 환급 |
| 광전사 | 불사 투사 | 회복 상한·복수 | 피격 기억·복수 회복 → 난전·반격 보호 |
| 광전사 | 최후의 격노 | HP1 공격 보너스 | 격노 스택 → 폭주·작은 보호 → 추가 타격·대격노 |

## 설계 경고

- **DESIGN_WARNING_EQUIPMENT_EXP_OVERLAP** (aug-013, aug-019): Stage 4 utility EXP 2 equals Stage 2 enhanced utility EXP 2 because the combat cap is 2; Stage 4 remains stronger in LOW and WEAPON effects.
- **DESIGN_WARNING_POISON_PERSISTENCE** (aug-080): Retaining poison 1 after detonation can repeatedly extend poison across a long combat; monitor damage telemetry.
- **DESIGN_WARNING_STAGE4_BURST** (aug-119, aug-120, aug-128, aug-148): Multiple Stage 4 damage bonuses can stack; runtime balance pass should measure burst without changing this design silently.
- **DESIGN_WARNING_ROOM_SCOPE_NARROWING** (aug-073, aug-080, aug-116): 005R의 Event/Reward true 자동 분류를 v0.2에서 Combat-only로 좁혔다. 맹독 대상과 다음 턴 마나 자연 회복은 비전투 방에 없으므로 해당 구성요소가 발동하지 않는다.

## 카드별 명세

각 카드의 수치와 조건은 동일 이름의 JSON에도 기계 판독 형식으로 기록했다. effect는 순서가 있는 작업 명세이며 이 단계에서 실행 코드는 아니다.

### aug-003 노련한 검술 · 모험가 / 노련한 탐험가 / Stage 2

- 원본 의미: 연속 유효 공격이 일정 횟수 이상 이어지면 이후 공격에 추가 보너스.
- BETA v0.1: 조건 달성 시 추가 피해 +1. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 유효 공격을 2회 연속 성공한 뒤, 3번째부터 연속 성공 공격의 피해가 1 증가합니다. 자신의 공격이 무효가 되면 기록이 초기화됩니다.
- Trigger: ON_VALID → PRE_DAMAGE → ON_INVALID → POST_COLLISION
- Condition: 전투에서 자신의 유효 공격을 연속으로 3번째 이상 성공한다. 유효 공격이 아닌 자신의 제출(충돌 포함)이 발생하면 연속 수를 0으로 한다.
- Effect: [{"op":"ADD_DAMAGE","amount":1,"target":"CURRENT_ATTACK"}]
- Value: {"bonusDamage":1,"activationStreak":3}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: Stage 1 연속 성공과 연결하고 2회 준비 후 3번째 공격에 보상을 준다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-009 일당백 · 모험가 / 노련한 탐험가 / Stage 4

- 원본 의미: 높은 연속 성공 상태에서 충돌 전까지 큰 공격 보너스를 유지.
- BETA v0.1: 조건 달성 시 추가 피해 +3. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 유효 공격을 3회 연속 성공하면 4번째부터 연속 성공 공격 피해가 3 증가합니다. 무효 제출이나 전투 종료 시 기록이 초기화됩니다.
- Trigger: ON_VALID → PRE_DAMAGE → ON_INVALID → POST_COLLISION
- Condition: 같은 전투에서 자신의 유효 공격 연속 수가 4 이상이고 현재 공격이 유효하다. 충돌 또는 다른 무효 제출에서 연속 수가 0이 된다; 몬스터 처치 및 전투 종료에서도 종료한다.
- Effect: [{"op":"ADD_DAMAGE","amount":3,"target":"CURRENT_ATTACK"}]
- Value: {"bonusDamage":3,"activationStreak":4}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: Stage 4의 +3은 세 번의 선행 성공을 요구한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-012 튼튼한 야영 장비 · 모험가 / 만능 장비꾼 / Stage 2

- 원본 의미: 1~2 장비 효과를 강화하고 조건부로 최저 HP 아군에게 작은 보호 제공.
- BETA v0.1: 조건 달성 시 추가 피해 +1. (SUPERSEDED_TO_PRESERVE_ORIGINAL_EFFECT)
- **BETA v0.2:** 전투에서 1~2 방어 장비가 발동하면 HP가 가장 낮은 아군 1명(자신 포함)의 다음 직접 피해를 1 줄입니다. 보호는 중첩되지 않습니다.
- Trigger: ON_VALID → POST_COLLISION
- Condition: 만능 장비꾼의 숫자 1~2 방어 장비 효과가 전투에서 실제로 발동한다. 살아 있는 아군 중 현재 HP가 가장 낮은 1명(자신 포함, 동률이면 로비 좌석순)을 고른다.
- Effect: [{"op":"APPLY_STATUS","status":"NEXT_DIRECT_DAMAGE_REDUCTION","amount":1,"target":"LOWEST_HP_ALLY_INCLUDING_SELF","expiry":"NEXT_DIRECT_DAMAGE_OR_COMBAT_END"}]
- Value: {"damageReduction":1}; cap: {"statusStacks":1,"grantPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: APPLY_STATUS; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: 원문의 낮은 숫자 방어·최저 HP 보호 정체성을 유지한다. v0.1의 피해 +1은 방어 효과로 재설계한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-013 탐험가의 공구함 · 모험가 / 만능 장비꾼 / Stage 2

- 원본 의미: 숫자 3의 탐험/성장 장비 효과를 강화하고 소규모 전투 유틸리티 추가.
- BETA v0.1: 조건 달성 시 EXP +1. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 숫자 3 탐험 장비가 처음 발동하면 그 장비의 EXP 보상에 1을 더합니다. 장비 EXP는 전투당 최대 2입니다.
- Trigger: ON_VALID
- Condition: 전투에서 만능 장비꾼의 FINAL_NUMBER 3 탐험 장비가 유효하게 발동하고 해당 전투의 장비 EXP 총 획득량이 2 미만이다.
- Effect: [{"op":"MODIFY_EXP","amount":1,"target":"SELF_EQUIPMENT_EXP_GRANT","timing":"SAME_GRANT"}]
- Value: {"extraExp":1,"totalEquipmentExpPerCombat":2}; cap: {"equipmentExpPerCombat":2}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: MODIFY_EXP; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: Stage 1 장비 EXP +1을 +2로 높이고 총 cap 2를 지킨다. Event EXP는 대상에서 제외한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-014 잘 벼린 여행검 · 모험가 / 만능 장비꾼 / Stage 2

- 원본 의미: 4~5 공격 장비 효과 강화. 4와 5를 번갈아 성공하면 추가 보너스.
- BETA v0.1: 조건 달성 시 추가 피해 +1. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 4와 5 무기 장비를 번갈아 유효하게 사용하면 두 번째 무기 공격부터 피해가 1 증가합니다. 다른 숫자나 무효 제출은 기록을 끊습니다.
- Trigger: ON_VALID → PRE_DAMAGE → ON_INVALID
- Condition: 전투에서 자신의 직전 유효한 4~5 무기 장비 숫자와 현재 유효 FINAL_NUMBER가 4↔5로 번갈아 나타난다. 다른 숫자 제출 또는 무효 제출은 교대 기록을 끊는다.
- Effect: [{"op":"ADD_DAMAGE","amount":1,"target":"CURRENT_ATTACK"}]
- Value: {"bonusDamage":1,"eligibleNumbers":[4,5]}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: 무기 장비 교대라는 원문 조건을 숫자 4/5와 현재 공격으로 고정한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-017 현장 개조 · 모험가 / 만능 장비꾼 / Stage 3

- 원본 의미: 서로 다른 장비 종류를 연속 발동할수록 다음 장비 효과 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +2. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 서로 다른 종류의 장비를 3회 연속 유효하게 사용하면 세 번째 장비가 강화됩니다: 방어는 피해 감소 +1, 탐험은 EXP +1(전투 상한 2), 무기는 피해 +2입니다. 같은 종류나 무효 제출 시 기록이 초기화됩니다.
- Trigger: ON_VALID → POST_DAMAGE
- Condition: 전투에서 서로 다른 장비 종류 LOW(1/2), UTILITY(3), WEAPON(4/5)를 연속 유효 발동한다. 다른 종류로 바뀔 때 개조 1을 얻고 최대 2; 같은 종류 또는 무효 제출은 개조를 0으로 한다. 개조 2가 된 바로 그 장비에 강화가 적용된다.
- Effect: [{"op":"APPLY_STATUS","status":"EQUIPMENT_RETROFIT","stacks":1,"target":"SELF"},{"op":"MODIFY_EQUIPMENT_EFFECT","when":"STACK_REACHES_2","amountByCategory":{"LOW":"NEXT_DIRECT_DAMAGE_REDUCTION_PLUS_1","UTILITY":"EXP_PLUS_1_WITH_COMBAT_CAP_2","WEAPON":"CURRENT_ATTACK_DAMAGE_PLUS_2"},"consumeStacks":2}]
- Value: {"stackGain":1,"activationStacks":2,"weaponBonusDamage":2,"lowExtraReduction":1,"utilityExtraExp":1}; cap: {"retrofitStacks":2,"utilityExpPerCombat":2,"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: APPLY_STATUS, OVERRIDE_BASE_RULE; telemetry: triggerCount, successCount, bonusDamage, resourceDelta
- 설계 근거: 원문의 '다음 장비 효과'를 세 범주 모두에 적용하고 무기 보너스는 v0.1 +2를 사용한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-019 전설의 장비 세트 · 모험가 / 만능 장비꾼 / Stage 4

- 원본 의미: 세 종류의 기본 장비 효과 자체를 대폭 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +4. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 장비 효과가 강화됩니다. 1~2 방어는 다음 직접 피해 2 감소, 3 탐험은 EXP 2, 4~5 무기는 피해 +4입니다. 종류별 사이클당 1회와 EXP 전투 상한 2는 유지됩니다.
- Trigger: ON_VALID → PRE_DAMAGE
- Condition: 전투에서 만능 장비꾼의 각 기본 장비 효과가 발동한다. 해당 장비 종류의 사이클당 기본 사용 제한은 그대로 적용한다.
- Effect: [{"op":"OVERRIDE_EQUIPMENT_VALUE","values":{"LOW":"NEXT_DIRECT_DAMAGE_REDUCTION_2","UTILITY":"EXP_2","WEAPON":"CURRENT_ATTACK_DAMAGE_PLUS_4"}}]
- Value: {"lowDamageReduction":2,"utilityExp":2,"weaponBonusDamage":4}; cap: {"equipmentUsePerCategoryPerCycle":1,"utilityExpPerCombat":2}
- Once: "ONCE_PER_CYCLE"; reset: CYCLE; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: OVERRIDE_BASE_RULE; telemetry: triggerCount, successCount, bonusDamage, resourceDelta
- 설계 근거: 원문의 기본 장비 3종 자체 강화를 선택한다. 세 종류 사전 완성 조건은 추가하지 않는다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-022 공동 탐사 기록 · 모험가 / 기적의 탐험가 / Stage 2

- 원본 의미: 기적의 발견으로 얻는 파티 EXP 증가.
- BETA v0.1: 기적의 발견 보상을 전원 EXP +2로 증가. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 네 명이 서로 다른 숫자로 모두 유효 성공해 기적의 발견이 발동하면, 보상이 전원 EXP 1 대신 전원 EXP 2가 됩니다. 전투당 1회입니다.
- Trigger: ON_VALID
- Condition: 전투에서 기적의 탐험가 Stage 1 '기적의 발견'의 네 플레이어 서로 다른 FINAL_NUMBER·전원 유효 성공 조건이 실제 성립하고 해당 전투에서 아직 발동하지 않았다.
- Effect: [{"op":"MODIFY_EXP","mode":"REPLACE_MIRACLE_PARTY_REWARD","amountPerPlayer":2}]
- Value: {"partyExpPerPlayer":2,"baseRewardReplaced":1}; cap: {"miraclePerCombat":1}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: MODIFY_EXP; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: aug-021의 조건과 보상 기회를 그대로 재사용하고 추가 지급이 아니라 값 교체로 명시한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-037 마지막 보루 · 기사 / 불굴의 기사 / Stage 3

- 원본 의미: HP 1일 때 전투당 1회 즉시 강인함 충전 또는 충전 속도 증가.
- BETA v0.1: HP 1이 된 순간 강인함 +1. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투 중 처음으로 HP가 1이 되는 순간 강인함 1을 얻습니다. HP 1로 전투를 시작하면 발동하지 않습니다. 전투당 1회입니다.
- Trigger: ON_DAMAGE_TAKEN
- Condition: 전투 중 실제 HP 감소 또는 비용 정산으로 HP가 2 이상에서 정확히 1이 된 최초 1회. 전투 시작부터 HP 1인 상태는 해당하지 않는다. 회복 후 재진입해도 재발동하지 않는다.
- Effect: [{"op":"GAIN_RESOURCE","resource":"toughnessCharges","amount":1,"target":"SELF"}]
- Value: {"toughnessGain":1}; cap: {"toughnessCharges":"CLASS_EFFECTIVE_MAX","activationsPerCombat":1}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: GAIN_RESOURCE; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: HP 1 진입이라는 BETA 조건을 실제 HP 변경 이벤트에 연결하고 시작 상태와 반복 진입을 구분한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-038 불퇴전 · 기사 / 불굴의 기사 / Stage 4

- 원본 의미: 매 사이클 첫 강인함의 비용을 완화하거나 사용 후 조건부 즉시 재충전.
- BETA v0.1: 매 사이클 첫 강인함 사용은 충전을 소비하지 않음. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 매 사이클 처음 정상적으로 사용하는 강인함은 충전을 소비하지 않습니다. 사용을 취소하거나 사용할 수 없는 요청은 무료 사용 횟수를 쓰지 않습니다.
- Trigger: ON_SKILL_USE
- Condition: 각 물리 카드 사이클에서 처음으로 검증을 통과한 강인함 활성화. 취소·불법 요청은 카운트하지 않는다. 실제 중복이 없어도 유효한 활성화라면 무료 1회를 소비한다.
- Effect: [{"op":"MODIFY_RESOURCE_COST","resource":"toughnessCharges","setCost":0,"for":"CURRENT_VALID_ACTIVATION"}]
- Value: {"firstUseCost":0,"normalCost":1}; cap: {"freeUsePerCycle":1}
- Once: "ONCE_PER_CYCLE"; reset: CYCLE; persistence: RUN
- Rooms: Combat true, Event true, Reward true, Shop false, Rest false; visibility: PUBLIC
- Primitives: MODIFY_RESOURCE_COST; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: 기존 강인함 활성화의 비용만 바꾸며 충돌 성공 여부를 새로운 조건으로 붙이지 않는다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-040 영원한 전열 · 기사 / 불굴의 기사 / Stage 4

- 원본 의미: 사이클 완료 시 남은 강인함/사용 기록에 따라 다음 사이클 충전과 공격 보너스 획득.
- BETA v0.1: 강인함 1 충전 또는 환급. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 강인함을 1 이상 남기고 사이클을 마치면 다음 사이클 시작 시 강인함을 1 더 얻습니다. 최대 충전량을 넘지 않습니다.
- Trigger: ON_CYCLE_RESET
- Condition: 전투 중 막 끝난 물리 카드 사이클 종료 시 강인함이 1 이상 남아 있다. 이 보너스는 다음 사이클 시작의 기본 충전 이후 적용한다.
- Effect: [{"op":"GAIN_RESOURCE","resource":"toughnessCharges","amount":1,"target":"SELF","timing":"NEXT_CYCLE_START"}]
- Value: {"nextCycleToughnessGain":1}; cap: {"gainPerCycle":1,"toughnessCharges":"CLASS_EFFECTIVE_MAX"}
- Once: "ONCE_PER_CYCLE"; reset: CYCLE; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: GAIN_RESOURCE; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: 원문의 사이클 완료·남은 강인함을 조건으로 삼고 v0.1의 +1 충전만 채택한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-044 헌신의 보답 · 기사 / 수호벽 / Stage 2

- 원본 의미: 호위 성공 시 다음 사이클 강인함 충전 가속.
- BETA v0.1: 강인함 1 충전 또는 환급. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 호위로 아군 카드가 실제로 유효해지면 다음 사이클 시작에 강인함 1을 추가로 얻습니다. 사이클당 1회입니다. 다음 사이클이 다른 방에서 시작해도 지급됩니다.
- Trigger: POST_COLLISION → ON_CYCLE_RESET
- Condition: Combat·Event·Reward에서 수호벽 호위가 실제로 아군 카드 1장을 중복에서 구하고 해당 아군 카드가 유효 처리된다. 같은 사이클에서 최초 1회만 다음 사이클 충전 예약을 만든다. 다음 사이클 예약은 방을 넘어도 유지되며 다음 사이클 시작 시 1회 지급한다.
- Effect: [{"op":"GAIN_RESOURCE","resource":"toughnessCharges","amount":1,"target":"SELF","timing":"NEXT_CYCLE_START"}]
- Value: {"nextCycleToughnessGain":1}; cap: {"reservationPerCycle":1,"toughnessCharges":"CLASS_EFFECTIVE_MAX"}
- Once: "ONCE_PER_CYCLE"; reset: CYCLE; persistence: RUN
- Rooms: Combat true, Event true, Reward true, Shop false, Rest false; visibility: PUBLIC
- Primitives: GAIN_RESOURCE; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: aug-041 수호벽의 성공 결과를 재사용하고 숨은 진행도를 추가하지 않는다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-045 전열 교대 · 기사 / 수호벽 / Stage 3

- 원본 의미: 호위로 희생된 자신의 카드를 조건부로 현재 사이클에 복구.
- BETA v0.1: 사용 카드 1장 복구. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 호위로 희생된 자신의 기본 물리 카드 1장을 같은 사이클에 복구합니다. 같은 카드가 SPENT가 된 뒤 처리하며, 사이클당 1회입니다.
- Trigger: POST_COLLISION → ON_RECOVER_CARD
- Condition: 이번 사이클에 수호벽 호위로 무효·소비된 자신의 BASE 물리 카드가 SPENT에 있고 아직 선택·제출 상태가 아니다. 그 카드 인스턴스 하나를 동일 ID로 REMAINING에 되돌린다. SPENT에 들어간 뒤 실행한다.
- Effect: [{"op":"RECOVER_CARD","selector":"SELF_GUARDIAN_SACRIFICED_CARD_THIS_CYCLE","physicalOnly":true,"preserveInstanceId":true}]
- Value: {"cardsRecovered":1}; cap: {"recoveriesPerCycle":1}
- Once: "ONCE_PER_CYCLE"; reset: CYCLE; persistence: RUN
- Rooms: Combat true, Event true, Reward true, Shop false, Rest false; visibility: PUBLIC
- Primitives: RECOVER_CARD; telemetry: triggerCount, successCount, recoveryCount
- 설계 근거: 원문의 호위 희생 카드만 복구한다. 특수·임시 카드는 제외하고 체인 안전 제한을 따른다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-049 불침의 수호자 · 기사 / 수호벽 / Stage 4

- 원본 의미: 호위한 아군에게 보호 표식을 남겨 다음 직접 피해도 기사에게 전가.
- BETA v0.1: 조건 달성 시 추가 피해 +3. (SUPERSEDED_TO_PRESERVE_ORIGINAL_EFFECT)
- **BETA v0.2:** 호위한 아군에게 보호 표식을 남깁니다. 기본 호위 전가가 사용된 뒤, 그 아군의 다음 직접 피해 1회도 기사에게 원래 피해량 그대로 전가합니다. 기사가 기절하면 표식은 사라집니다.
- Trigger: POST_COLLISION → ON_DAMAGE_TAKEN
- Condition: 수호벽 호위로 구한 아군 1명에게 전투 동안 보호 표식을 부여한다. 기본 수호벽의 첫 직접 피해 전가가 소모된 후 그 아군에게 들어오는 다음 직접 피해 1회를 동일 기사에게 전가한다. 기사가 DOWNED 또는 전투 밖이면 표식은 소멸한다.
- Effect: [{"op":"APPLY_STATUS","status":"GUARDIAN_FOLLOWUP_MARK","target":"ACTUAL_GUARDED_ALLY","charges":1,"expiry":"CONSUMED_OR_COMBAT_END"},{"op":"REDIRECT_DIRECT_DAMAGE","from":"MARKED_ALLY","to":"SOURCE_KNIGHT","after":"BASE_GUARDIAN_REDIRECT"}]
- Value: {"additionalRedirects":1,"redirectedDamage":"ORIGINAL_DIRECT_DAMAGE_AMOUNT"}; cap: {"marksPerGuardedAlly":1,"additionalRedirectsPerMark":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: APPLY_STATUS, OVERRIDE_BASE_RULE, MODIFY_INCOMING_DAMAGE; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: Q02=A. 원본의 추가 보호 표식·피해 전가 정체성을 유지한다. v0.1 피해 +3은 폐기한다.
- 구현 보완: ADDITIONAL_GUARDIAN_REDIRECT_MARK_ADAPTER

### aug-052 중갑 돌파 · 기사 / 압살 기사 / Stage 2

- 원본 의미: 압살 공격이 적 방어·피해 감소 일부를 무시.
- BETA v0.1: 다음 직접 피해 1 감소. (SUPERSEDED_TO_PRESERVE_ORIGINAL_EFFECT)
- **BETA v0.2:** 강인함으로 중복을 관통한 유효 공격은 적 방어 1을 무시합니다. 한 턴에 1회이며 방어가 없으면 추가 피해가 생기지 않습니다.
- Trigger: POST_COLLISION → PRE_DAMAGE
- Condition: 전투에서 강인함 사용으로 자신의 카드가 실제 중복을 관통해 유효 공격이 되고, 그 공격의 적 방어 수치가 1 이상이다. 현재 공격의 적 방어 적용 전에 방어 1을 무시한다.
- Effect: [{"op":"PENETRATE_ENEMY_DEFENSE","amount":1,"target":"CURRENT_ATTACK","timing":"PRE_MITIGATION"}]
- Value: {"enemyDefenseIgnored":1}; cap: {"defenseIgnoredPerAttack":1,"activationsPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: MODIFY_DAMAGE, OVERRIDE_BASE_RULE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: Q01=A. 적 방어 관통 원문에 맞춰 v0.1 자기 피해 감소를 폐기한다.
- 구현 보완: PRE_MITIGATION_ENEMY_DEFENSE_PENETRATION_ADAPTER

### aug-053 무게 싣기 · 기사 / 압살 기사 / Stage 2

- 원본 의미: 높은 숫자로 압살할수록 추가 피해 증가. 특히 5 효율 상승.
- BETA v0.1: 조건 달성 시 추가 피해 +1. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 숫자 5로 압살에 성공하면 그 공격 피해가 1 증가합니다. 턴당 1회입니다.
- Trigger: POST_COLLISION → PRE_DAMAGE
- Condition: 강인함의 실제 중복 관통으로 압살이 성립했고 자신의 FINAL_NUMBER가 5이며 현재 카드가 유효 공격이다.
- Effect: [{"op":"ADD_DAMAGE","amount":1,"target":"CURRENT_ATTACK"}]
- Value: {"bonusDamageAtFinal5":1}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: 압살 숫자 5 보너스를 조건으로 고정하고 v0.1 +1을 유지한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-054 전진 또 전진 · 기사 / 압살 기사 / Stage 2

- 원본 의미: 압살 성공 시 다음 강인함 충전까지의 진행 일부 단축.
- BETA v0.1: 강인함 1 충전 또는 환급. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 압살로 다른 카드를 무효화하면 강인함 1을 환급받습니다. 사이클당 1회이며 최대 충전량을 넘지 않습니다.
- Trigger: POST_COLLISION
- Condition: 강인함으로 실제 중복을 관통해 압살에 성공하고 무효화된 다른 카드가 1장 이상이다. 같은 사이클에서 최초 1회.
- Effect: [{"op":"GAIN_RESOURCE","resource":"toughnessCharges","amount":1,"target":"SELF","timing":"AFTER_SKILL_COST"}]
- Value: {"toughnessRefund":1}; cap: {"refundPerCycle":1,"toughnessCharges":"CLASS_EFFECTIVE_MAX"}
- Once: "ONCE_PER_CYCLE"; reset: CYCLE; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: GAIN_RESOURCE; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: 별도 충전 진행도를 만들지 않고 실제 압살 결과에 따른 +1 환급으로 정의한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-055 다중 압살 · 기사 / 압살 기사 / Stage 3

- 원본 의미: 한 번에 여러 장을 무효화하면 압살 보너스가 크게 상승.
- BETA v0.1: 조건 달성 시 추가 피해 +3. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 한 번의 압살로 다른 카드 2장 이상을 무효화하면 그 유효 공격 피해가 3 증가합니다. 턴당 1회입니다.
- Trigger: POST_COLLISION → PRE_DAMAGE
- Condition: 강인함의 실제 중복 관통으로 압살한 한 충돌 묶음에서 자신 외 물리 카드 2장 이상이 무효화되고 자신의 공격이 유효하다.
- Effect: [{"op":"ADD_DAMAGE","amount":3,"target":"CURRENT_ATTACK"}]
- Value: {"minimumInvalidatedOtherCards":2,"bonusDamage":3}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: '여러 장'을 2장으로 고정하고 같은 충돌의 중복 카드만 센다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-057 힘을 비축하라 · 기사 / 압살 기사 / Stage 3

- 원본 의미: 강인함 최대 충전을 쓰지 않고 유지한 턴에 돌파력을 쌓아 다음 압살 강화.
- BETA v0.1: 강인함 1 충전 또는 환급. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 강인함이 최대인 채 사용하지 않고 턴을 마치면 돌파 준비를 얻습니다. 다음 압살 성공 시 강인함 1을 환급하고 그 공격 피해가 1 증가합니다. 준비는 중첩되지 않습니다.
- Trigger: TURN_END → ON_SKILL_USE → POST_COLLISION
- Condition: 강인함이 유효 최대 충전량인 채 한 턴을 마치고 그 턴에 강인함을 사용하지 않았다면 돌파 준비 1을 얻는다(최대 1). 다음 실제 압살 성공 때 강인함 비용을 먼저 지불한 뒤 1 환급하고 해당 공격 피해 +1; 준비를 소모한다.
- Effect: [{"op":"APPLY_STATUS","status":"BREAKTHROUGH_READY","stacks":1,"expiry":"NEXT_SUCCESSFUL_CRUSH_OR_COMBAT_END"},{"op":"GAIN_RESOURCE","resource":"toughnessCharges","amount":1,"timing":"AFTER_NEXT_CRUSH_COST"},{"op":"ADD_DAMAGE","amount":1,"target":"NEXT_SUCCESSFUL_CRUSH_ATTACK"}]
- Value: {"breakthroughReady":1,"toughnessRefund":1,"bonusDamage":1}; cap: {"readyStacks":1,"armingPerCycle":1,"toughnessCharges":"CLASS_EFFECTIVE_MAX"}
- Once: "ONCE_PER_CYCLE"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: APPLY_STATUS, GAIN_RESOURCE, ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage, resourceDelta
- 설계 근거: 원문의 비축→압살 강화와 v0.1 환급 1을 함께 실현한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-060 진격의 기사 · 기사 / 압살 기사 / Stage 4

- 원본 의미: 압살 반복 성공 시 전투 중 진격 누적, 공격력 증가. 평범한 공격이 이어지면 일부 감소.
- BETA v0.1: 조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 압살에 성공할 때마다 진격 1을 얻습니다(최대 4). 유효 공격 피해가 진격 1당 1 증가합니다. 압살이 아닌 유효 공격 뒤에는 진격이 1 줄어듭니다. 전투가 끝나면 초기화됩니다.
- Trigger: POST_COLLISION → ON_VALID → PRE_DAMAGE
- Condition: 전투에서 실제 압살 성공 시 진격 1 획득(최대 4). 현재 공격부터 진격 1당 피해 +1. 압살 없이 보통 유효 공격을 하면 그 공격에는 기존 진격을 적용하고 피해 처리 후 진격 1 감소. 무효 제출은 진격 변화 없음.
- Effect: [{"op":"ADD_STACK","status":"ADVANCE","amount":1,"when":"SUCCESSFUL_CRUSH"},{"op":"ADD_DAMAGE","amountPerStack":1,"status":"ADVANCE","target":"CURRENT_VALID_ATTACK"},{"op":"CONSUME_STACK","status":"ADVANCE","amount":1,"when":"NON_CRUSH_VALID_ATTACK_AFTER_DAMAGE"}]
- Value: {"stackGain":1,"damagePerStack":1,"normalAttackDecay":1}; cap: {"advanceStacks":4}
- Once: "NONE"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_STACK, ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage, resourceDelta
- 설계 근거: Stage 4 누적 공격력과 평범한 공격 시 감쇠를 수치화한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-063 틈새 포착 · 도적 / 비열한 일격 / Stage 2

- 원본 의미: 직전 턴보다 낮은 숫자로 단독 최저 성공 시 추가 보너스.
- BETA v0.1: 조건 달성 시 추가 피해 +1. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 직전 턴보다 낮은 숫자로 단독 최저 유효 공격에 성공하면 그 공격 피해가 1 증가합니다. 직전 턴이 무효였다면 발동하지 않습니다.
- Trigger: ON_VALID → PRE_DAMAGE
- Condition: 직전 전투 턴 자신의 제출이 유효 공격이었고, 현재 유효 공격의 FINAL_NUMBER가 직전 유효 FINAL_NUMBER보다 작으며 현재 카드가 단독 최저 유효 카드다. 직전 턴이 무효·미제출이면 발동하지 않는다.
- Effect: [{"op":"ADD_DAMAGE","amount":1,"target":"CURRENT_ATTACK"}]
- Value: {"bonusDamage":1}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: 직전 턴 기준을 유지해 오래된 유효 공격 기록을 끌어오지 않는다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-066 밑장 빼기 · 도적 / 비열한 일격 / Stage 3

- 원본 의미: 단독 최저 성공 후 다음 턴 높은 숫자로 유효 성공하면 추가 보너스.
- BETA v0.1: 조건 달성 시 추가 피해 +2. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 단독 최저 유효 공격 다음 턴에 더 높은 숫자로 유효 공격에 성공하면 피해가 2 증가합니다. 바로 다음 턴을 놓치면 기회가 사라집니다.
- Trigger: ON_VALID → PRE_DAMAGE → TURN_END
- Condition: 턴 N에 단독 최저 유효 성공한 뒤 바로 다음 턴 N+1에 이전 FINAL_NUMBER보다 높은 FINAL_NUMBER로 유효 공격에 성공한다. N+1의 충돌·무효·미제출은 기회를 종료한다.
- Effect: [{"op":"ADD_DAMAGE","amount":2,"target":"CURRENT_ATTACK"}]
- Value: {"bonusDamage":2,"windowTurns":1}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: 원문의 '다음 턴'을 정확히 한 턴으로 제한한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-068 목을 노려라 · 도적 / 비열한 일격 / Stage 4

- 원본 의미: 비열함을 충분히 쌓은 상태의 단독 최저 공격을 크게 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +4. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 비열함이 2인 상태에서 단독 최저 공격에 성공하면 그 공격 피해가 추가로 4 증가합니다. 비열함은 기본 규칙대로 소모됩니다.
- Trigger: ON_VALID → PRE_DAMAGE
- Condition: 현재 카드가 단독 최저 유효 공격이고, 기본 비열함의 소비 직전 스택이 2다. 현재 공격의 기본 비열함 피해와 별개로 +4를 적용하고 기본 규칙에 따라 비열함을 소모한다.
- Effect: [{"op":"ADD_DAMAGE","amount":4,"target":"CURRENT_ATTACK","timing":"BEFORE_BASE_SNEAKY_STACK_CONSUMPTION"}]
- Value: {"requiredSneakyStacks":2,"bonusDamage":4}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: 새 비밀 자원 없이 aug-061의 비열함 최대 2를 임계값으로 사용한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-070 완전범죄 · 도적 / 비열한 일격 / Stage 4

- 원본 의미: 연속 단독 최저 성공 보너스를 크게 강화하며 첫 실패 1회는 기록을 유지.
- BETA v0.1: 조건 달성 시 추가 피해 +4. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 단독 최저 유효 성공을 3회 이어가면 세 번째 공격부터 피해가 4 증가합니다. 전투당 첫 실패 1회는 연속 기록만 보존하며, 그 실패에는 보너스가 없습니다.
- Trigger: ON_VALID → ON_INVALID → POST_COLLISION → PRE_DAMAGE
- Condition: 전투에서 단독 최저 유효 성공을 연속 3번째 이상 달성하면 현재 공격에 +4. 단독 최저 실패(충돌·무효·유효하나 최저 아님) 최초 1회는 기록을 유지하지만 실패 자체는 연속 수를 올리지 않는다. 두 번째 실패는 0으로 초기화한다. 실패 보호는 전투당 1회.
- Effect: [{"op":"ADD_DAMAGE","amount":4,"target":"CURRENT_ATTACK"},{"op":"OVERRIDE_STREAK_RESET","ignoreFirstFailure":true}]
- Value: {"activationStreak":3,"bonusDamage":4,"protectedFailures":1}; cap: {"bonusPerTurn":1,"protectedFailuresPerCombat":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE, MODIFY_STREAK_RESET; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: Stage 4 +4를 두 번의 준비 성공과 전투당 1회 실패 보호에 묶는다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-073 회수용 와이어 · 도적 / 독 묻은 칼날 / Stage 2

- 원본 의미: 낮은 숫자로 맹독을 부여하면 해당 카드를 조건부로 회수.
- BETA v0.1: 숫자 1 또는 3으로 맹독을 부여하면 해당 카드 1장 복구. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 1 또는 3 카드로 단독 최저에 성공해 맹독을 부여하면, 그 물리 카드를 SPENT에서 복구합니다. 사이클당 1회입니다.
- Trigger: POST_COLLISION → ON_VALID → ON_RECOVER_CARD
- Condition: 전투에서 자신의 FINAL_NUMBER 1 또는 3 카드가 단독 최저 유효 공격으로 적에게 맹독을 실제 1 이상 부여한다. 제출 카드가 SPENT에 들어간 뒤 같은 BASE 물리 카드 ID를 REMAINING으로 복구한다.
- Effect: [{"op":"RECOVER_CARD","selector":"CURRENT_POISON_APPLYING_PHYSICAL_CARD","preserveInstanceId":true,"after":"CARD_MOVED_TO_SPENT"}]
- Value: {"eligibleFinalNumbers":[1,3],"cardsRecovered":1}; cap: {"recoveriesPerCycle":1}
- Once: "ONCE_PER_CYCLE"; reset: CYCLE; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: RECOVER_CARD; telemetry: triggerCount, successCount, recoveryCount
- 설계 근거: 맹독 부여의 실제 성공과 동일 physical card recovery를 결합한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-080 끝없는 독니 · 도적 / 독 묻은 칼날 / Stage 4

- 원본 의미: 단독 최저로 맹독을 부여할 때 낮은 카드 회수를 강화하고 독 소비 후 일부 중첩 유지.
- BETA v0.1: 단독 최저로 맹독 부여 시 낮은 카드 1장 복구; 맹독 폭발 후 1중첩 유지. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 단독 최저로 맹독을 부여하면 사용한 낮은 기본 카드(1~3) 1장을 복구합니다. 가장 낮은 숫자, 동률이면 가장 최근에 사용한 카드를 고릅니다. 사이클당 1회입니다. 맹독 폭발로 마지막 중첩이 사라질 때 턴당 1회 맹독 1을 남깁니다.
- Trigger: ON_VALID → ON_RECOVER_CARD → POST_DAMAGE
- Condition: 전투에서 단독 최저 유효 공격으로 맹독을 실제 부여하면 자신의 SPENT에 있는 BASE 물리 카드 중 baseNumber 1~3인 카드 1장을 복구한다. 후보는 baseNumber가 가장 낮은 카드, 동률이면 가장 최근 SPENT 순서. 맹독 폭발로 마지막 스택이 소비될 때 1을 남긴다.
- Effect: [{"op":"RECOVER_CARD","selector":"LOWEST_BASE_NUMBER_1_TO_3_THEN_MOST_RECENT_SPENT","physicalOnly":true,"preserveInstanceId":true},{"op":"SET_STACK","status":"POISON","amount":1,"when":"DETONATION_WOULD_REDUCE_TO_ZERO"}]
- Value: {"cardsRecovered":1,"poisonFloorAfterDetonation":1}; cap: {"recoveriesPerCycle":1,"poisonStacks":3,"retentionPerTurn":1}
- Once: {"recovery":"ONCE_PER_CYCLE","retention":"ONCE_PER_TURN"}; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: RECOVER_CARD, ADD_STACK; telemetry: triggerCount, successCount, recoveryCount, resourceDelta
- 설계 근거: 두 효과의 발동과 제한을 분리하고 복구 대상 및 중첩 유지 순서를 결정한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-082 높은 곳으로 · 도적 / 그림자 도약 / Stage 2

- 원본 의미: 낮은 숫자→높은 숫자 도약의 공격 보너스 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +1. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 직전 카드가 1~2이고 현재 4~5 유효 공격으로 숫자 차이 3 이상의 도약에 성공하면 그 공격 피해가 1 증가합니다.
- Trigger: ON_VALID → PRE_DAMAGE
- Condition: 직전 자신의 제출 FINAL_NUMBER가 1~2이고 현재 유효 공격 FINAL_NUMBER가 4~5이며 두 숫자 차이가 3 이상이라 기본 그림자 도약이 성립한다. 직전 제출이 무효였어도 숫자 차이는 기본 도약 규칙을 따른다.
- Effect: [{"op":"ADD_DAMAGE","amount":1,"target":"CURRENT_ATTACK"}]
- Value: {"lowRange":[1,2],"highRange":[4,5],"minimumDifference":3,"bonusDamage":1}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: Stage 1 도약의 실제 차이 3 이상 기준을 유지한다. 2→4처럼 차이 2는 제외한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-086 착지 없는 발걸음 · 도적 / 그림자 도약 / Stage 3

- 원본 의미: 도약 중 실패해도 조건부로 연속 도약 기록 일부 유지.
- BETA v0.1: 도약 연속 기록이 끊길 상황에서 기록을 유지. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 사이클당 첫 도약 실패 1회는 연속 도약 기록을 끊지 않습니다. 실패한 카드 자체는 무효로 처리되고 새 도약으로 세지 않습니다.
- Trigger: ON_INVALID → POST_COLLISION
- Condition: 전투에서 그림자 도약 연속 기록이 자신의 현재 제출 실패(충돌·무효 또는 도약 불성립)로 0이 될 때, 사이클당 최초 1회에 한해 직전 기록값을 그대로 보존한다. 실패한 제출은 유효 공격·도약 성공으로 세지 않는다.
- Effect: [{"op":"OVERRIDE_STREAK_RESET","status":"SHADOW_LEAP_STREAK","preservePrevious":true}]
- Value: {"protectedBreaks":1}; cap: {"protectedBreaksPerCycle":1}
- Once: "ONCE_PER_CYCLE"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: MODIFY_STREAK_RESET; telemetry: triggerCount, successCount
- 설계 근거: 방 적용 미결을 COMBAT 전용으로 설계한다. Event·Reward의 숫자 판정은 유지하지만 이 전투 도약 연속 효과는 적용하지 않는다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-102 생명 공명 · 마법사 / 백마도사 / Stage 2

- 원본 의미: HP 1 아군을 백마법으로 회복하면 추가 보너스.
- BETA v0.1: 해당 회복 효과는 HP 1 회복. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 백마법으로 HP 1인 아군을 실제로 회복시키면 그 아군의 다음 직접 피해를 1 줄입니다. 백마법의 HP 1 회복은 그대로이며 전투당 1회입니다.
- Trigger: ON_HEAL
- Condition: 백마법으로 자신을 제외한 HP 1 아군 1명을 실제로 HP 1 이상 회복시켜 HP 2 이상이 된 경우. 회복량 0인 과잉 회복은 해당하지 않는다.
- Effect: [{"op":"APPLY_STATUS","status":"LIFE_RESONANCE_GUARD","amount":1,"target":"ACTUALLY_HEALED_HP1_ALLY","expiry":"NEXT_DIRECT_DAMAGE_OR_COMBAT_END"}]
- Value: {"whiteMagicBaseHeal":1,"nextDamageReduction":1}; cap: {"protectionGrantsPerCombat":1,"statusStacksPerTarget":1}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: APPLY_STATUS; telemetry: triggerCount, successCount, healAmount, resourceDelta
- 설계 근거: 저체력 아군 회복 후의 생존 보너스로 구체화하여 aug-103의 마나 환급과 역할을 분리한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-103 마력 순환술 · 마법사 / 백마도사 / Stage 2

- 원본 의미: 백마법 성공 시 마나 1 환급.
- BETA v0.1: 마나 1 환급/추가 회복. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 백마법으로 아군을 실제로 회복시키면 마나 1을 돌려받습니다. 과잉 회복에는 발동하지 않으며 턴당 1회입니다.
- Trigger: ON_HEAL
- Condition: 백마법 대상이 실제 HP를 1 이상 회복했다. 회복량 0인 과잉 회복 또는 자기 자신은 제외한다.
- Effect: [{"op":"GAIN_RESOURCE","resource":"mana","amount":1,"target":"SELF"}]
- Value: {"manaRefund":1,"minimumActualHeal":1}; cap: {"refundPerTurn":1,"mana":"CLASS_EFFECTIVE_MAX"}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: GAIN_RESOURCE; telemetry: triggerCount, successCount, healAmount, resourceDelta
- 설계 근거: 백마법의 실제 회복 이벤트에만 마나 환급을 연결한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-104 전투 축복 · 마법사 / 백마도사 / Stage 2

- 원본 의미: 회복된 아군의 다음 유효 공격 강화.
- BETA v0.1: 해당 회복 효과는 HP 1 회복. (SUPERSEDED_TO_PRESERVE_ORIGINAL_EFFECT)
- **BETA v0.2:** 백마법으로 아군을 실제로 회복시키면 그 아군의 다음 유효 공격 피해가 2 증가합니다. 같은 대상의 축복은 중첩되지 않으며 전투당 1회 부여합니다.
- Trigger: ON_HEAL → ON_VALID → PRE_DAMAGE
- Condition: 백마법으로 아군의 HP를 실제로 1 이상 회복하면 그 아군에게 축복 1을 부여한다. 대상의 다음 전투 유효 공격에서 축복을 소모해 피해 +2. 같은 대상의 기존 축복은 갱신만 하고 쌓이지 않는다.
- Effect: [{"op":"APPLY_STATUS","status":"BATTLE_BLESSING","target":"ACTUALLY_HEALED_ALLY","stacks":1,"expiry":"NEXT_VALID_ATTACK_OR_COMBAT_END"},{"op":"ADD_DAMAGE","amount":2,"target":"BLESSED_ALLY_NEXT_VALID_ATTACK"}]
- Value: {"baseWhiteMagicHeal":1,"blessedAttackDamage":2}; cap: {"blessGrantPerCombat":1,"blessingStacksPerTarget":1}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: APPLY_STATUS, ADD_DAMAGE; telemetry: triggerCount, successCount, healAmount, bonusDamage
- 설계 근거: Q03=A. HP 1 회복만으로 효과를 대체하지 않고 원본의 회복된 아군 공격 강화까지 명시한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-107 정화 공식 · 마법사 / 백마도사 / Stage 3

- 원본 의미: 회복 대상의 몬스터 유래 해로운 상태 하나를 제거/약화.
- BETA v0.1: 백마법 회복 대상의 몬스터 유래 해로운 상태 1개 제거. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 백마법으로 아군을 실제 회복시키면 그 아군에게 가장 먼저 적용된 몬스터 유래 해로운 상태 1개를 제거합니다. 전투당 1회입니다.
- Trigger: ON_HEAL
- Condition: 백마법 대상 아군이 실제로 HP를 1 이상 회복했고 몬스터가 부여한 해로운 상태가 하나 이상 남아 있다. 상태 선택은 appliedAt 오름차순, 동률이면 statusId 사전순이다.
- Effect: [{"op":"REMOVE_STATUS","selector":"EARLIEST_MONSTER_ORIGIN_HARMFUL_STATUS","target":"HEALED_ALLY","count":1}]
- Value: {"statusesRemoved":1}; cap: {"cleansesPerCombat":1}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: REMOVE_STATUS; telemetry: triggerCount, successCount, healAmount, resourceDelta
- 설계 근거: 상태가 여러 개일 때 재현 가능한 선택 순서를 고정한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-112 잔차 회수 · 마법사 / 역산술 / Stage 2

- 원본 의미: 하향 역산술 카드가 유효 성공하면 마나 1 환급.
- BETA v0.1: 마나 1 환급/추가 회복. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 역산술로 숫자를 낮춘 카드가 유효하면 마나 1을 돌려받습니다. 턴당 1회이며 마나 최대치를 넘지 않습니다.
- Trigger: ON_VALID
- Condition: 역산술 사용으로 FINAL_NUMBER를 실제로 1 또는 2 낮춘 카드가 전투에서 유효하게 처리된다. 역산술을 쓰지 않은 낮은 카드나 충돌 무효 카드는 제외한다.
- Effect: [{"op":"GAIN_RESOURCE","resource":"mana","amount":1,"target":"SELF","timing":"AFTER_VALIDITY"}]
- Value: {"manaRefund":1,"downwardMagnitude":[1,2]}; cap: {"refundPerTurn":1,"mana":"CLASS_EFFECTIVE_MAX"}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: GAIN_RESOURCE; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: 기본 역산술의 -1/-2만 대상이며 비용 지불 후 유효 판정에 환급한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-114 교대 공식 · 마법사 / 역산술 / Stage 2

- 원본 의미: 직전 역산술과 반대 방향(+↔-)을 사용하면 마나 효율/효과 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +1. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 직전 유효 역산술과 반대 방향으로 역산술 공격에 성공하면 그 공격 피해가 1 증가합니다. 무효 카드는 방향 기록을 바꾸지 않습니다.
- Trigger: ON_VALID → PRE_DAMAGE
- Condition: 이번 전투에서 직전에 유효 성공한 역산술 방향과 현재 유효 역산술 방향이 반대(+↔-)다. 충돌·무효 역산술은 방향 기록을 갱신하지 않는다.
- Effect: [{"op":"ADD_DAMAGE","amount":1,"target":"CURRENT_ATTACK"}]
- Value: {"bonusDamage":1}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: 원문의 교대 방향을 유효 성공 이력으로 정의하고 v0.1 +1 피해를 사용한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-116 보존 법칙 · 마법사 / 역산술 / Stage 3

- 원본 의미: 숫자를 2 이상 바꾸고 유효 성공하면 다음 턴 마나 회복 증가.
- BETA v0.1: 해당 회복 효과는 HP 1 회복. (SUPERSEDED_TO_PRESERVE_ORIGINAL_EFFECT)
- **BETA v0.2:** 마나 4를 써 역산술로 숫자를 2 바꾼 카드가 유효하면 다음 턴 시작 마나 자연 회복량이 1 증가합니다. 전투당 1회입니다.
- Trigger: ON_VALID → TURN_START
- Condition: 역산술로 카드 숫자를 2 낮추거나 2 높이기 위해 마나 4를 실제 소비하고 그 카드가 유효 성공했다. 바로 다음 전투 턴 시작의 자연 마나 회복에 +1을 더한다; 턴이 바뀌기 전에 전투가 끝나면 소멸한다.
- Effect: [{"op":"SCHEDULE_EFFECT","at":"NEXT_TURN_START","operation":{"op":"GAIN_RESOURCE","resource":"mana","amount":1},"cancel":"COMBAT_END"}]
- Value: {"requiredMagnitude":2,"requiredManaSpend":4,"nextTurnExtraManaRecovery":1}; cap: {"pendingRecovery":1,"triggerPerCombat":1,"mana":"CLASS_EFFECTIVE_MAX"}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: DELAY_EFFECT; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: Q03=A. 원본의 숫자 변경 후 다음 턴 마나 회복을 유지하며 v0.1 HP 1 회복은 폐기한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-119 수식의 반전 · 마법사 / 역산술 / Stage 4

- 원본 의미: 하향 조정량이 클수록 추가 피해 또는 마나 보너스를 얻어 내림도 공격 자원화.
- BETA v0.1: 조건 달성 시 추가 피해 +3. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 마나 4를 써 숫자를 2 낮춘 역산술 공격이 유효하면 그 공격 피해가 3 증가합니다. 턴당 1회입니다.
- Trigger: ON_VALID → PRE_DAMAGE
- Condition: 역산술에서 마나 4를 실제 소비해 FINAL_NUMBER를 정확히 2 낮추고 전투에서 유효 공격에 성공한다.
- Effect: [{"op":"ADD_DAMAGE","amount":3,"target":"CURRENT_ATTACK"}]
- Value: {"requiredDownshift":2,"requiredManaSpend":4,"bonusDamage":3}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: 기본 역산술에서 실제 가능한 최대 하향 조정 -2를 강한 조건으로 사용한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-120 무한 대칭식 · 마법사 / 역산술 / Stage 4

- 원본 의미: +/- 성공을 교대로 이어가면 대칭이 누적되어 마나 효율과 공격력 증가. 실패 시 일부 감소.
- BETA v0.1: 조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 역산술을 +와 -로 번갈아 유효 성공할 때마다 대칭 1을 얻습니다(최대 4). 유효 공격 피해가 대칭 1당 1 증가합니다. 같은 방향 반복이나 무효 역산술은 대칭을 1 잃습니다.
- Trigger: ON_VALID → ON_INVALID → PRE_DAMAGE
- Condition: 전투에서 유효 성공한 역산술 방향이 직전 유효 성공 방향과 반대면 대칭 1 획득(최대 4). 같은 방향을 연속 유효 성공하거나 역산술이 무효면 대칭 1 감소(최소 0); 무효는 마지막 유효 방향을 바꾸지 않는다. 현재 유효 공격에는 변경된 대칭이 적용된다.
- Effect: [{"op":"ADD_STACK","status":"SYMMETRY","amount":1,"when":"ALTERNATING_VALID_REVERSE_MATH"},{"op":"CONSUME_STACK","status":"SYMMETRY","amount":1,"when":"SAME_DIRECTION_OR_INVALID"},{"op":"ADD_DAMAGE","amountPerStack":1,"status":"SYMMETRY","target":"CURRENT_VALID_ATTACK"}]
- Value: {"stackGain":1,"stackLoss":1,"damagePerStack":1}; cap: {"symmetryStacks":4}
- Once: "NONE"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_STACK, ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage, resourceDelta
- 설계 근거: 방향 교대 보상과 실패 감쇠를 수치화한다. 전투 후 스택과 이력을 지운다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-124 전투의 식사 · 광전사 / 피의 광전 / Stage 2

- 원본 의미: 전투 중 HP가 회복되면 다음 HP 비용 공격 강화.
- BETA v0.1: 해당 회복 효과는 HP 1 회복. (SUPERSEDED_TO_PRESERVE_ORIGINAL_EFFECT)
- **BETA v0.2:** 전투에서 HP를 실제로 회복하면 다음 HP 비용을 실제로 지불한 유효 공격 피해가 2 증가합니다. 전투당 1회 준비할 수 있습니다.
- Trigger: ON_HEAL → ON_VALID → PRE_DAMAGE
- Condition: 전투에서 자신의 HP가 실제 1 이상 회복되면 다음 자신의 'HP 비용이 실제 1 발생한 유효 공격'에 식사 1을 적용한다. 회복량 0은 제외하며 식사는 공격 성공 또는 전투 종료 시 소멸한다.
- Effect: [{"op":"APPLY_STATUS","status":"BLOOD_MEAL_READY","stacks":1,"expiry":"NEXT_ACTUAL_HP_COST_VALID_ATTACK_OR_COMBAT_END"},{"op":"ADD_DAMAGE","amount":2,"target":"NEXT_ACTUAL_HP_COST_ATTACK"}]
- Value: {"minimumActualHeal":1,"nextAttackBonusDamage":2}; cap: {"readyStacks":1,"grantPerCombat":1}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: APPLY_STATUS, ADD_DAMAGE; telemetry: triggerCount, successCount, healAmount, bonusDamage
- 설계 근거: Q03=A. HP 1 회복으로 효과를 교체하지 않고 회복 후 공격 강화 정체성을 유지한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-126 붉은 추격 · 광전사 / 피의 광전 / Stage 3

- 원본 의미: HP 비용 공격 후 다음 턴 더 높은 숫자로 유효 성공하면 추가 피해.
- BETA v0.1: 조건 달성 시 추가 피해 +2. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** HP 1을 실제로 소비한 유효 공격 바로 다음 턴에 더 높은 숫자로 유효 공격하면 피해가 2 증가합니다. 다음 턴을 놓치면 기회가 사라집니다.
- Trigger: ON_VALID → PRE_DAMAGE → TURN_END
- Condition: 턴 N에 자신의 유효 공격으로 HP 비용을 실제 1 지불했고, 바로 다음 턴 N+1에 이전 공격보다 높은 FINAL_NUMBER로 유효 공격에 성공한다. N+1이 무효·미제출이면 기회 종료.
- Effect: [{"op":"ADD_DAMAGE","amount":2,"target":"CURRENT_ATTACK"}]
- Value: {"bonusDamage":2,"windowTurns":1}; cap: {"bonusPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: 실제 HP 감소와 정확히 다음 턴이라는 원문 조건을 보존한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-128 피의 폭풍 · 광전사 / 피의 광전 / Stage 4

- 원본 의미: 연속 HP 비용 공격의 누적 보너스를 크게 강화하고 최대 단계에서 추가 타격.
- BETA v0.1: 조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** HP 비용을 실제로 지불한 유효 공격을 연속 성공할 때마다 혈폭풍 1을 얻습니다(최대 4). 그 공격은 혈폭풍 1당 피해 +1을 받고, 처음 4에 도달하면 별도 추가 타격 2를 줍니다. 흐름이 끊기면 혈폭풍이 초기화됩니다.
- Trigger: ON_VALID → PRE_DAMAGE → ON_INVALID
- Condition: 자신의 유효 공격에서 HP 비용이 실제 1 발생하면 혈폭풍 연속 수와 스택을 1 올린다(최대 4). HP 비용 없는 공격 또는 무효 제출은 연속 수를 0으로 하고 스택도 0으로 한다. 현재 공격에는 새 스택 1당 피해 +1. 스택 4에 처음 도달한 공격에는 별도 피해 이벤트 2를 한 번 추가한다.
- Effect: [{"op":"ADD_STACK","status":"BLOOD_STORM","amount":1,"when":"ACTUAL_HP_COST_VALID_ATTACK"},{"op":"ADD_DAMAGE","amountPerStack":1,"status":"BLOOD_STORM","target":"CURRENT_ATTACK"},{"op":"EXTRA_DAMAGE_COMPONENT","amount":2,"when":"FIRST_REACH_STACK_4","source":"OWNER"}]
- Value: {"stackGain":1,"damagePerStack":1,"extraHitDamage":2}; cap: {"stormStacks":4,"extraHitPerCombat":1}
- Once: {"stack":"NONE","extraHit":"ONCE_PER_COMBAT"}; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_STACK, ADD_DAMAGE, MODIFY_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: Stage 4 누적 피해와 최대 단계 추가 타격을 별도 packet·처치 귀속으로 명시한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-129 붉은 기관 · 광전사 / 피의 광전 / Stage 4

- 원본 의미: 회복 때마다 혈기를 저장하고 다음 HP 비용 공격이 혈기를 소비해 크게 강화.
- BETA v0.1: 해당 회복 효과는 HP 1 회복. (SUPERSEDED_TO_PRESERVE_ORIGINAL_EFFECT)
- **BETA v0.2:** 전투에서 HP를 실제로 회복할 때마다 혈기 1을 저장합니다(최대 3). 다음 HP 비용을 실제로 지불한 유효 공격은 혈기를 모두 소모해 혈기 1당 피해 +2를 얻습니다.
- Trigger: ON_HEAL → ON_VALID → PRE_DAMAGE
- Condition: 전투에서 자신의 HP가 실제 1 이상 회복될 때 혈기 1을 저장한다(최대 3). 다음 자신의 HP 비용이 실제 발생한 유효 공격에서 저장한 혈기 전부를 소비해 혈기 1당 피해 +2를 준다. 회복량 0은 저장하지 않는다.
- Effect: [{"op":"ADD_STACK","status":"BLOOD_VIGOR","amount":1,"when":"ACTUAL_SELF_HEAL"},{"op":"ADD_DAMAGE","amountPerStack":2,"status":"BLOOD_VIGOR","target":"NEXT_ACTUAL_HP_COST_ATTACK"},{"op":"CONSUME_STACK","status":"BLOOD_VIGOR","amount":"ALL","when":"AFTER_BONUS_DAMAGE"}]
- Value: {"vigorPerHealEvent":1,"damagePerVigor":2}; cap: {"vigorStacks":3,"maximumBonusDamage":6}
- Once: "NONE"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_STACK, ADD_DAMAGE; telemetry: triggerCount, successCount, healAmount, bonusDamage, resourceDelta
- 설계 근거: Q03=A. 원본의 회복→혈기 저장→HP 비용 공격 소비 구조를 복원한다. v0.1의 단순 HP 1 회복은 폐기한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-130 끝없는 광전 · 광전사 / 피의 광전 / Stage 4

- 원본 의미: HP 비용 공격 성공 시 조건부로 HP/공격 자원 일부 환급하여 순환 유지.
- BETA v0.1: 해당 자원 1 환급. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** HP 1을 실제로 소비한 유효 공격이 성공하면 피해 처리 후 HP 1을 회복합니다. 턴당 1회이며 기본 회복 상한은 HP 2입니다(불사 투사는 최대 HP).
- Trigger: ON_VALID → ON_HEAL
- Condition: 자신의 유효 공격에서 HP 비용 1이 실제로 지불됐고 공격이 성공했다. 공격 피해 확정 후 HP 1을 환급한다. 기본 회복 상한은 min(maxHP,2)이며 aug-131이 있으면 maxHP까지 허용한다.
- Effect: [{"op":"HEAL","amount":1,"target":"SELF","timing":"AFTER_SUCCESSFUL_HP_COST_ATTACK","healCap":"BERSERKER_BASE_2_UNLESS_AUG_131"}]
- Value: {"actualCostRequired":1,"hpRefund":1}; cap: {"refundPerTurn":1,"healCap":"HP_2_OR_AUG_131_MAX_HP"}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: HEAL; telemetry: triggerCount, successCount, healAmount, resourceDelta
- 설계 근거: 별도 공격 자원이 없는 기본 광전사에서는 원본의 자원 환급을 HP 환급으로 설계하되 고정 HP 2 상한을 존중한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-136 상처의 기억 · 광전사 / 불사 투사 / Stage 3

- 원본 의미: 직접 피해를 받을 때마다 해당 전투 복수 효과가 점차 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +2. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 몬스터의 직접 피해로 HP를 잃으면 상처 기억 1을 얻습니다(최대 3). 다음 복수 유효 공격은 기억 1당 피해 +1을 얻고 기억을 모두 소모합니다. 턴당 1회 축적합니다.
- Trigger: ON_DAMAGE_TAKEN → ON_VALID → PRE_DAMAGE
- Condition: 몬스터가 준 직접 피해로 자신의 HP가 실제 1 이상 감소할 때 상처 기억 1을 얻는다(최대 3). 다음 복수 적용 유효 공격에서 기억 전부를 소비해 기억 1당 추가 피해 +1을 준다. 피해 감소로 HP 손실 0이면 발동하지 않는다.
- Effect: [{"op":"ADD_STACK","status":"WOUND_MEMORY","amount":1,"when":"ACTUAL_MONSTER_DIRECT_DAMAGE"},{"op":"ADD_DAMAGE","amountPerStack":1,"status":"WOUND_MEMORY","target":"NEXT_REVENGE_VALID_ATTACK"},{"op":"CONSUME_STACK","status":"WOUND_MEMORY","amount":"ALL","when":"AFTER_BONUS_DAMAGE"}]
- Value: {"stackPerDamageEvent":1,"damagePerStack":1}; cap: {"memoryStacks":3,"triggerPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_STACK, ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage, resourceDelta
- 설계 근거: 원본의 피격 누적 강화와 v0.1 +2 상당을 2스택 시점에 맞춘다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-137 피로 갚는다 · 광전사 / 불사 투사 / Stage 3

- 원본 의미: 복수가 적용된 공격이 성공하면 조건부 HP 회복.
- BETA v0.1: 해당 회복 효과는 HP 1 회복. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 복수를 소모한 유효 공격이 성공하면 HP 1을 회복합니다. 전투당 1회이며 기본 회복 상한은 HP 2입니다(불사 투사는 최대 HP).
- Trigger: ON_VALID → ON_HEAL
- Condition: 기본 불사 투사의 복수 1이 적용된 자신의 유효 공격이 성공하고 복수가 실제 소비됐다. 피해 처리 후 HP 1 회복. 기본 회복 상한은 min(maxHP,2), aug-131 보유 시 maxHP.
- Effect: [{"op":"HEAL","amount":1,"target":"SELF","timing":"AFTER_REVENGE_ATTACK","healCap":"BERSERKER_BASE_2_UNLESS_AUG_131"}]
- Value: {"healAmount":1}; cap: {"healsPerCombat":1,"healCap":"HP_2_OR_AUG_131_MAX_HP"}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: HEAL; telemetry: triggerCount, successCount, healAmount
- 설계 근거: 복수 공격 후 회복을 실제 소비 이벤트에 묶고 기존 광전사 회복 상한을 보존한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-139 난전의 왕 · 광전사 / 불사 투사 / Stage 4

- 원본 의미: 중복 회복과 직접 피격이 번갈아 발생할수록 난전이 쌓여 공격/방어 동시 강화.
- BETA v0.1: 해당 회복 효과는 HP 1 회복. (SUPERSEDED_TO_PRESERVE_ORIGINAL_EFFECT)
- **BETA v0.2:** 전투에서 실제 회복과 몬스터 직접 피격이 번갈아 일어날 때마다 난전 1을 얻습니다(최대 4). 유효 공격 피해가 난전 1당 1 증가하고, 난전 2 이상이면 다음 직접 피해를 1 줄이며 난전 1을 소비합니다.
- Trigger: ON_HEAL → ON_DAMAGE_TAKEN → ON_VALID → PRE_DAMAGE
- Condition: 전투에서 실제 자기 HP 회복 이벤트와 몬스터 직접 피해 이벤트가 번갈아 발생할 때마다 난전 1을 얻는다(최대 4). 같은 종류 연속 이벤트는 난전을 올리지 않고 마지막 종류만 갱신한다. 유효 공격은 난전 1당 피해 +1. 난전 2 이상에서 다음 직접 피해 1 감소 후 난전 1 소비.
- Effect: [{"op":"ADD_STACK","status":"BRAWL","amount":1,"when":"ALTERNATING_ACTUAL_HEAL_AND_DIRECT_DAMAGE"},{"op":"ADD_DAMAGE","amountPerStack":1,"status":"BRAWL","target":"CURRENT_VALID_ATTACK"},{"op":"MODIFY_INCOMING_DAMAGE","amount":-1,"when":"BRAWL_STACKS_AT_LEAST_2","consumeStacks":1}]
- Value: {"stackGain":1,"damagePerStack":1,"directDamageReduction":1}; cap: {"brawlStacks":4,"protectionPerTurn":1}
- Once: {"stack":"NONE","protection":"ONCE_PER_TURN"}; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_STACK, ADD_DAMAGE, MODIFY_INCOMING_DAMAGE; telemetry: triggerCount, successCount, bonusDamage, healAmount, resourceDelta
- 설계 근거: Q03=A. 회복·피격 교대에 따른 공격/방어 동시 강화 정체성을 유지한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-140 광기의 반격 · 광전사 / 불사 투사 / Stage 4

- 원본 의미: 직접 피해 후 복수 공격이 크게 강화되고 성공 시 다음 피해를 막는 효과까지 획득.
- BETA v0.1: 조건 달성 시 추가 피해 +4. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 몬스터의 직접 피해를 받은 뒤 복수 공격에 성공하면 그 공격 피해가 4 증가하고, 다음 직접 피해를 1 줄입니다. 보호는 중첩되지 않습니다.
- Trigger: ON_DAMAGE_TAKEN → ON_VALID → PRE_DAMAGE
- Condition: 몬스터 직접 피해로 HP를 실제 잃은 뒤 기본 복수 상태를 얻었다. 그 복수를 소모하는 다음 유효 공격에 피해 +4. 이 공격 성공 후 다음 직접 피해 1회를 1 감소하는 비중첩 보호를 얻는다.
- Effect: [{"op":"ADD_DAMAGE","amount":4,"target":"NEXT_REVENGE_ATTACK"},{"op":"APPLY_STATUS","status":"REVENGE_GUARD","target":"SELF","amount":1,"expiry":"NEXT_DIRECT_DAMAGE_OR_COMBAT_END"}]
- Value: {"revengeBonusDamage":4,"nextDamageReduction":1}; cap: {"bonusPerTurn":1,"guardStacks":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE, APPLY_STATUS; telemetry: triggerCount, successCount, bonusDamage, resourceDelta
- 설계 근거: 원문의 큰 반격과 성공 후 작은 보호를 한 번의 복수 소비에 묶는다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-143 살육 본능 · 광전사 / 최후의 격노 / Stage 2

- 원본 의미: HP 1에서 연속 유효 공격 성공 시 격노가 점차 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +1. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** HP 1에서 유효 공격을 연속 성공할 때마다 격노 1을 얻습니다(최대 3). 그 공격 피해가 격노 1당 1 증가합니다. 회복하거나 공격이 무효가 되면 격노가 사라집니다.
- Trigger: ON_VALID → ON_INVALID → PRE_DAMAGE
- Condition: HP가 정확히 1인 상태에서 자신의 유효 공격을 연속 성공할 때 격노 1을 얻는다(최대 3). 현재 공격에는 새 격노 1당 피해 +1. HP가 2 이상이 되거나 자신의 제출이 무효면 격노를 0으로 한다.
- Effect: [{"op":"ADD_STACK","status":"RAGE","amount":1,"when":"HP_1_VALID_ATTACK"},{"op":"ADD_DAMAGE","amountPerStack":1,"status":"RAGE","target":"CURRENT_ATTACK"}]
- Value: {"stackGain":1,"damagePerStack":1}; cap: {"rageStacks":3,"stackGainPerTurn":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_STACK, ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage, resourceDelta
- 설계 근거: Stage 2의 HP1 위험 플레이에 점진적 +1 피해를 연결한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-145 폭주 · 광전사 / 최후의 격노 / Stage 3

- 원본 의미: HP 1에서 일정 횟수 연속 성공 시 잠시 폭주 보너스 획득.
- BETA v0.1: 조건 달성 시 추가 피해 +2. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** HP 1에서 유효 공격을 2회 연속 성공하면 폭주합니다. 이후 유효 공격 2회의 피해가 각각 2 증가합니다. 회복하거나 전투가 끝나면 사라지며 전투당 1회입니다.
- Trigger: ON_VALID → PRE_DAMAGE → ON_INVALID
- Condition: HP 1에서 유효 공격을 2회 연속 성공하면 폭주를 얻는다. 그 뒤 자신의 다음 유효 공격 2회에 각각 피해 +2를 주고 사용 횟수를 소비한다. HP가 2 이상이 되거나 전투가 끝나면 즉시 소멸한다. 전투당 1회만 발동.
- Effect: [{"op":"APPLY_STATUS","status":"RAMPAGE","charges":2,"expiry":"TWO_VALID_ATTACKS_OR_HP_ABOVE_1_OR_COMBAT_END"},{"op":"ADD_DAMAGE","amount":2,"target":"NEXT_TWO_VALID_ATTACKS"}]
- Value: {"requiredStreak":2,"durationValidAttacks":2,"bonusDamage":2}; cap: {"activationPerCombat":1,"bonusPerAttack":2}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: APPLY_STATUS, ADD_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: Stage 3 +2를 두 번의 성공 준비와 2회 지속에 묶는다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-146 피 묻은 미소 · 광전사 / 최후의 격노 / Stage 3

- 원본 의미: HP 1에서 중복 회복이 발생하면 일부를 HP 대신 '격노 보호' 자원으로 전환 가능.
- BETA v0.1: 해당 회복 효과는 HP 1 회복. (SUPERSEDED_TO_PRESERVE_ORIGINAL_EFFECT)
- **BETA v0.2:** HP 1에서 중복으로 회복할 때 전투당 1회 HP 1 회복 대신 격노 보호를 얻습니다. HP는 1에 머물고, 다음 몬스터 직접 피해를 1 줄입니다.
- Trigger: POST_COLLISION → ON_HEAL
- Condition: HP 1인 광전사가 중복으로 얻을 기본 HP 1 회복이 실제 발생할 예정일 때 전투당 최초 1회 그 회복 1을 취소하고 격노 보호 1로 전환한다. HP는 1에 머문다. 보호는 다음 몬스터 직접 피해에 적용되고 전투 종료 시 소멸한다.
- Effect: [{"op":"OVERRIDE_HEAL","from":1,"to":0,"source":"BERSERKER_COLLISION_HEAL"},{"op":"APPLY_STATUS","status":"RAGE_PROTECTION","amount":1,"expiry":"NEXT_MONSTER_DIRECT_DAMAGE_OR_COMBAT_END"}]
- Value: {"convertedHeal":1,"nextDamageReduction":1}; cap: {"conversionsPerCombat":1,"protectionStacks":1}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: OVERRIDE_BASE_RULE, HEAL, APPLY_STATUS; telemetry: triggerCount, successCount, healAmount, resourceDelta
- 설계 근거: Q03=A. 회복을 보호로 전환한다는 원본을 유지한다. 별도 플레이어 선택 없이 자동 전환으로 고정한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-147 죽음과 춤을 · 광전사 / 최후의 격노 / Stage 3

- 원본 의미: HP 1에서 높은 숫자로 유효 성공할수록 다음 몬스터 공격 대비용 작은 방어 획득.
- BETA v0.1: 조건 달성 시 추가 피해 +1. (SUPERSEDED_TO_PRESERVE_ORIGINAL_EFFECT)
- **BETA v0.2:** HP 1에서 4 또는 5의 유효 공격에 성공하면 다음 몬스터 직접 피해를 1 줄입니다. 보호는 중첩되지 않으며 턴당 1회입니다.
- Trigger: ON_VALID
- Condition: HP가 정확히 1이고 자신의 FINAL_NUMBER가 4 또는 5인 유효 공격에 성공했다. 다음 몬스터 직접 피해를 1 줄이는 비중첩 보호를 얻는다.
- Effect: [{"op":"APPLY_STATUS","status":"LAST_DANCE_GUARD","amount":1,"expiry":"NEXT_MONSTER_DIRECT_DAMAGE_OR_COMBAT_END"}]
- Value: {"highFinalNumbers":[4,5],"nextDamageReduction":1}; cap: {"grantsPerTurn":1,"guardStacks":1}
- Once: "ONCE_PER_TURN"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: APPLY_STATUS; telemetry: triggerCount, successCount, resourceDelta
- 설계 근거: 원문의 저체력 고숫자 방어 정체성을 선택한다. v0.1 피해 +1은 보호 수치로 재설계한다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-148 살아있는 재앙 · 광전사 / 최후의 격노 / Stage 4

- 원본 의미: HP 1 공격 보너스를 크게 강화하고 연속 성공 시 추가 타격.
- BETA v0.1: 조건 달성 시 추가 피해 +4. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** HP 1에서 유효 공격을 3회 연속 성공하면 세 번째 공격 피해가 4 증가하고, 별도 추가 타격 2를 줍니다. 전투당 1회입니다.
- Trigger: ON_VALID → PRE_DAMAGE
- Condition: HP 1에서 자신의 유효 공격을 연속 3회 성공한 바로 그 세 번째 공격. 전투당 최초 1회에 피해 +4와 별도 추가 타격 2를 준다. 이후 공격은 이 폭발 보너스를 재발동하지 않는다.
- Effect: [{"op":"ADD_DAMAGE","amount":4,"target":"CURRENT_ATTACK"},{"op":"EXTRA_DAMAGE_COMPONENT","amount":2,"source":"OWNER","separateEvent":true}]
- Value: {"requiredStreak":3,"bonusDamage":4,"extraHitDamage":2}; cap: {"burstPerCombat":1}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: ADD_DAMAGE, MODIFY_DAMAGE; telemetry: triggerCount, successCount, bonusDamage
- 설계 근거: Stage 4의 +4와 추가 타격을 세 번의 위험한 연속 성공 및 전투당 1회에 묶는다.
- 구현 보완: 005B 카드별 런타임 구현 대기

### aug-149 마지막 불꽃 · 광전사 / 최후의 격노 / Stage 4

- 원본 의미: 전투에서 처음 HP 1이 되는 순간 일정 턴 '대격노'로 공격/생존 보조 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +3. (NUMBER_OR_MECHANIC_REUSED_WHERE_APPLICABLE)
- **BETA v0.2:** 전투에서 처음 HP 1이 되면 다음 턴부터 2턴간 각 턴 첫 유효 공격 피해가 3 증가합니다. 그동안 첫 몬스터 직접 피해 1회도 1 줄입니다. 전투당 1회입니다.
- Trigger: ON_DAMAGE_TAKEN → TURN_START → ON_VALID → PRE_DAMAGE
- Condition: 이번 전투에서 처음으로 실제 HP가 2 이상에서 1로 내려가면 대격노를 예약한다. 다음 전투 턴 시작부터 2턴 동안 각 턴 첫 유효 공격 피해 +3. 해당 기간 첫 몬스터 직접 피해 1회를 1 감소한다. HP 1 재진입해도 재발동하지 않는다.
- Effect: [{"op":"APPLY_STATUS","status":"GREAT_RAGE","durationTurns":2,"start":"NEXT_TURN_START"},{"op":"ADD_DAMAGE","amount":3,"target":"FIRST_VALID_ATTACK_EACH_ACTIVE_TURN"},{"op":"MODIFY_INCOMING_DAMAGE","amount":-1,"uses":1,"source":"MONSTER_DIRECT"}]
- Value: {"durationTurns":2,"bonusDamagePerTurn":3,"nextDamageReduction":1}; cap: {"activationPerCombat":1,"attackBonusPerTurn":1,"protectionUses":1}
- Once: "ONCE_PER_COMBAT"; reset: COMBAT; persistence: COMBAT
- Rooms: Combat true, Event false, Reward false, Shop false, Rest false; visibility: PUBLIC
- Primitives: APPLY_STATUS, ADD_DAMAGE, MODIFY_INCOMING_DAMAGE; telemetry: triggerCount, successCount, bonusDamage, resourceDelta
- 설계 근거: Stage 4 대격노를 2턴으로 제한하고 무적 대신 작은 보호만 준다.
- 구현 보완: 005B 카드별 런타임 구현 대기

## 남은 구현 작업

- 설계 대상 52장은 SPEC_COMPLETE이며 실제 카드 효과는 아직 실행되지 않는다.
- 기존 005B 런타임 불일치: aug-041 Reward 적용, aug-061 값·방 분기. 이번 변경에서 수정하지 않았다.
- 새 계약이 요구하는 별도 어댑터: aug-049 추가 호위 표식 전가, aug-052 적 방어 적용 전 관통. 52장 전체의 카드별 실행 연결은 005B에서 진행한다.

## 검증 기준

- 정확히 52개 고유 ID, BETA v0.1 원본 보존, v0.2 발동/조건/값/상한/방/툴팁/telemetry 존재를 테스트한다.
- 005B 150장 모두 설계 미결 항목이 없는지 확인한다.
- 런타임, Stress golden/fixture, BETA v0.1 원본 파일은 수정하지 않는다.
