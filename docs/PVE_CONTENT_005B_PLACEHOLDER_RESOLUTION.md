# PVE CONTENT-005B — BETA 임시 문구 11장 보완 명세

원본 효과 의미와 기존 BETA 수치를 기준으로 11장의 발동 조건, 수치, 횟수 및 초기화 시점을 정했다. 이 문서는 런타임 구현 완료를 뜻하지 않는다.

## aug-004 경험자의 감각

- 원본: 전투 첫 충돌 이후 다음 유효 성공에 추가 성장 EXP 보너스.
- BETA v0.1: 조건 달성 시 EXP +1.
- BETA v0.2 툴팁: 전투에서 첫 충돌 후 다음 유효 공격에 성공하면 성장 EXP 1을 추가로 얻습니다. 전투당 1회입니다.
- 실행 조건: 전투에서 자신의 첫 충돌 무효가 발생한 뒤 다음 자신의 유효 공격 1회. 그 유효 공격에서 EXP 1을 추가 지급하고 준비 상태를 소비한다.
- 작업: [{"op":"ARM_ON_FIRST_COLLISION","scope":"COMBAT"},{"op":"ADD_EXP","amount":1,"target":"SELF","timing":"NEXT_VALID_ATTACK"}]
- 수치: {"extraExp":1}; 상한: {"procsPerCombat":1}
- Trigger: POST_COLLISION → ON_VALID; 횟수: ONCE_PER_COMBAT; reset: COMBAT; 적용 방: Combat

## aug-015 재빠른 장비 교체

- 원본: 직전 숫자와 차이가 2 이상이면 이번 장비 효과 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +2.
- BETA v0.2 툴팁: 직전 제출과 숫자 차이가 2 이상인 유효 장비는 강화됩니다. 방어는 다음 피해 감소 +1, 탐험은 EXP +1(전투 상한 2), 무기는 피해 +2입니다.
- 실행 조건: 현재 유효 장비 카드의 FINAL_NUMBER와 직전 제출 카드의 FINAL_NUMBER 차이가 2 이상이다. 같은 전투의 직전 제출이 없으면 발동하지 않는다.
- 작업: [{"op":"ENHANCE_EQUIPMENT","LOW":{"nextDirectDamageReduction":1},"UTILITY":{"extraExp":1,"totalEquipmentExpPerCombat":2},"WEAPON":{"bonusDamage":2}}]
- 수치: {"requiredNumberDifference":2,"weaponBonusDamage":2,"lowAdditionalReduction":1,"utilityAdditionalExp":1}; 상한: {"procsPerTurn":1,"equipmentExpPerCombat":2}
- Trigger: ON_VALID → PRE_DAMAGE; 횟수: ONCE_PER_TURN; reset: COMBAT; 적용 방: Combat

## aug-016 준비 만전

- 원본: 한 사이클 안에 방어·탐험·공격 장비를 모두 발동하면 준비 완료 보너스.
- BETA v0.1: 조건 달성 시 추가 피해 +2.
- BETA v0.2 툴팁: 한 사이클에서 방어·탐험·무기 장비를 모두 유효하게 사용하면 세 번째 장비의 공격 피해가 2 증가합니다. 사이클당 1회입니다.
- 실행 조건: 같은 물리 카드 사이클에서 LOW, UTILITY, WEAPON 장비가 각각 한 번 이상 실제 발동했다. 세 번째로 빠진 종류가 발동한 유효 카드에만 피해 +2를 준다.
- 작업: [{"op":"ADD_DAMAGE","amount":2,"target":"CURRENT_ATTACK"}]
- 수치: {"bonusDamage":2,"requiredCategories":3}; 상한: {"procsPerCycle":1}
- Trigger: ON_VALID → PRE_DAMAGE; 횟수: ONCE_PER_CYCLE; reset: CYCLE; 적용 방: Combat

## aug-062 발목 베기

- 원본: 숫자 1로 단독 최저 성공 시 비열한 일격 추가 효과 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +1.
- BETA v0.2 툴팁: 숫자 1로 단독 최저 유효 공격에 성공하면 그 공격의 피해가 1 증가합니다.
- 실행 조건: FINAL_NUMBER 1의 카드가 유효하고 모든 유효 카드 중 엄격한 단독 최저다.
- 작업: [{"op":"ADD_DAMAGE","amount":1,"target":"CURRENT_ATTACK"}]
- 수치: {"bonusDamage":1,"requiredFinalNumber":1}; 상한: {"procsPerTurn":1}
- Trigger: ON_VALID → PRE_DAMAGE; 횟수: ONCE_PER_TURN; reset: COMBAT; 적용 방: Combat

## aug-084 벽 차기

- 원본: 도약 성공 후 다음 카드도 큰 숫자 차이를 만들면 연속 도약 보너스.
- BETA v0.1: 조건 달성 시 추가 피해 +1.
- BETA v0.2 툴팁: 그림자 도약에 성공한 바로 다음 제출도 유효 도약이면 그 공격의 피해가 1 증가합니다.
- 실행 조건: 직전 자신의 제출로 그림자 도약(직전 숫자와 현재 FINAL_NUMBER 차이 3 이상)을 유효 성공했고, 바로 다음 자신의 제출도 유효 도약에 성공한다. 중간 무효·미제출은 연속을 끊는다.
- 작업: [{"op":"ADD_DAMAGE","amount":1,"target":"CURRENT_ATTACK"}]
- 수치: {"bonusDamage":1,"requiredJumpDifference":3}; 상한: {"procsPerTurn":1}
- Trigger: ON_VALID → PRE_DAMAGE; 횟수: ONCE_PER_TURN; reset: COMBAT; 적용 방: Combat

## aug-088 그림자 무희

- 원본: 상승 도약과 하강 도약을 번갈아 성공할수록 전투 중 도약 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +3.
- BETA v0.2 툴팁: 상승 도약과 하강 도약을 번갈아 유효 성공하면 두 번째부터 해당 공격의 피해가 3 증가합니다.
- 실행 조건: 전투에서 직전 유효 도약 방향과 현재 유효 도약 방향이 서로 반대(상승↔하강)다. 무효 제출은 마지막 성공 방향을 바꾸지 않지만 바로 다음 연속 도약 조건은 끊는다.
- 작업: [{"op":"ADD_DAMAGE","amount":3,"target":"CURRENT_ATTACK"}]
- 수치: {"bonusDamage":3,"requiredJumpDifference":3}; 상한: {"procsPerTurn":1}
- Trigger: ON_VALID → PRE_DAMAGE; 횟수: ONCE_PER_TURN; reset: COMBAT; 적용 방: Combat

## aug-095 마력 범람

- 원본: 턴 시작에 마나가 최대라면 그 턴 증폭 보너스 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +2.
- BETA v0.2 툴팁: 턴 시작 회복 후 마나가 최대치였고 그 턴의 증폭 공격이 유효하면 피해가 2 증가합니다.
- 실행 조건: 현재 턴 시작의 자연 마나 회복이 끝난 시점에 마나가 유효 최대치였고, 같은 턴에 마나를 실제 소비한 증폭 카드가 유효 공격이 된다.
- 작업: [{"op":"ADD_DAMAGE","amount":2,"target":"CURRENT_ATTACK"}]
- 수치: {"bonusDamage":2}; 상한: {"procsPerTurn":1}
- Trigger: TURN_START → ON_VALID → PRE_DAMAGE; 횟수: ONCE_PER_TURN; reset: COMBAT; 적용 방: Combat

## aug-122 끓어오르는 피

- 원본: HP 비용이 발생한 공격의 추가 피해 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +1.
- BETA v0.2 툴팁: 유효 공격에서 HP 비용 1을 실제로 지불하면 그 공격의 피해가 1 증가합니다. HP 비용이 0이면 발동하지 않습니다.
- 실행 조건: 자신의 유효 공격으로 기본 광전사 HP 비용 1이 실제 발생한다. HP가 이미 1이라 비용 0이면 발동하지 않는다.
- 작업: [{"op":"ADD_DAMAGE","amount":1,"target":"CURRENT_ATTACK"}]
- 수치: {"bonusDamage":1,"requiredActualHpCost":1}; 상한: {"procsPerTurn":1}
- Trigger: ON_VALID → PRE_DAMAGE; 횟수: ONCE_PER_TURN; reset: COMBAT; 적용 방: Combat

## aug-125 상처 벌리기

- 원본: 연속으로 HP 비용을 지불한 유효 공격 성공 시 추가 피해 단계 상승.
- BETA v0.1: 조건 달성 시 추가 피해 +2.
- BETA v0.2 툴팁: HP 비용 1을 실제로 지불한 유효 공격을 2회 이상 연속 성공하면 두 번째부터 공격 피해가 2 증가합니다.
- 실행 조건: 같은 전투에서 실제 HP 비용 1을 낸 유효 공격을 연속으로 2회 이상 성공한다. 무효 제출 또는 HP 비용 0인 공격은 연속 수를 0으로 한다.
- 작업: [{"op":"ADD_DAMAGE","amount":2,"target":"CURRENT_ATTACK"}]
- 수치: {"bonusDamage":2,"requiredStreak":2}; 상한: {"procsPerTurn":1}
- Trigger: ON_VALID → PRE_DAMAGE → ON_INVALID; 횟수: ONCE_PER_TURN; reset: COMBAT; 적용 방: Combat

## aug-133 되갚아주마

- 원본: 직접 피해 후 복수 공격 보너스 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +1.
- BETA v0.2 툴팁: 몬스터 직접 피해로 얻은 복수를 유효 공격에서 소비하면 기본 복수 피해와 별개로 피해가 1 더 증가합니다.
- 실행 조건: 몬스터 직접 피해로 얻은 기본 복수 1이 현재 유효 공격에서 실제 소비된다.
- 작업: [{"op":"ADD_DAMAGE","amount":1,"target":"CURRENT_ATTACK"}]
- 수치: {"bonusDamage":1}; 상한: {"procsPerTurn":1}
- Trigger: ON_VALID → PRE_DAMAGE; 횟수: ONCE_PER_TURN; reset: COMBAT; 적용 방: Combat

## aug-142 죽음의 문턱

- 원본: HP 1 상태의 격노 공격 추가 피해 강화.
- BETA v0.1: 조건 달성 시 추가 피해 +1.
- BETA v0.2 툴팁: 현재 HP가 정확히 1일 때 유효 공격 피해가 1 증가합니다.
- 실행 조건: 현재 authoritative HP가 정확히 1이고 자신의 현재 공격이 유효하다. pendingDown 상태는 HP 1로 취급하지 않는다.
- 작업: [{"op":"ADD_DAMAGE","amount":1,"target":"CURRENT_ATTACK"}]
- 수치: {"bonusDamage":1}; 상한: {"procsPerTurn":1}
- Trigger: ON_VALID → PRE_DAMAGE; 횟수: ONCE_PER_TURN; reset: COMBAT; 적용 방: Combat
