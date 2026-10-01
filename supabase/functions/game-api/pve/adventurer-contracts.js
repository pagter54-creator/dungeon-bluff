export const ADVENTURER_CONTRACTS=Object.freeze({
  "aug-001": {
    "augmentId": "aug-001",
    "name": "노련한 탐험가",
    "classId": "adventurer",
    "archetype": "노련한 탐험가",
    "stage": 1,
    "trigger": [
      "POST_COLLISION",
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "전투에서 자신의 연속 유효 공격 횟수가 2 이상이다. 충돌 시 기록은 0으로 초기화한다.",
    "effect": {
      "sourceField": "betaValue",
      "text": "연속 유효 공격 2회째부터 해당 공격에 추가 피해 +1. 충돌 시 연속 기록 0."
    },
    "value": {
      "activationStreak": 2,
      "bonusDamage": 1
    },
    "cap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "노련한 탐험가",
      "stage": 1
    },
    "tooltip": "연속 유효 공격 2회째부터 해당 공격에 추가 피해 +1. 충돌 시 연속 기록 0.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "POST_COLLISION",
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-002": {
    "augmentId": "aug-002",
    "name": "튼튼한 여행복",
    "classId": "adventurer",
    "archetype": "노련한 탐험가",
    "stage": 2,
    "trigger": [
      "ON_ACQUIRE"
    ],
    "condition": "최대 HP +1, 획득 시 HP1 회복",
    "effect": {
      "sourceField": "betaValue",
      "text": "최대 HP +1, 획득 시 HP1 회복."
    },
    "value": {
      "maxHp": 1,
      "heal": 1
    },
    "cap": {
      "text": "MAX_HP",
      "source": "GLOBAL_POLICY"
    },
    "onceScope": "ONCE_PER_RUN",
    "resetScope": "RUN",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": false,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "노련한 탐험가",
      "stage": 2
    },
    "tooltip": "최대 HP +1, 획득 시 HP1 회복.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "ON_ACQUIRE"
    ]
  },
  "aug-003": {
    "augmentId": "aug-003",
    "name": "노련한 검술",
    "classId": "adventurer",
    "archetype": "노련한 탐험가",
    "stage": 2,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE",
      "ON_INVALID",
      "POST_COLLISION"
    ],
    "condition": "전투에서 자신의 유효 공격을 연속으로 3번째 이상 성공한다. 유효 공격이 아닌 자신의 제출(충돌 포함)이 발생하면 연속 수를 0으로 한다.",
    "effect": [
      {
        "op": "ADD_DAMAGE",
        "amount": 1,
        "target": "CURRENT_ATTACK"
      }
    ],
    "value": {
      "bonusDamage": 1,
      "activationStreak": 3
    },
    "cap": {
      "bonusPerTurn": 1
    },
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "노련한 탐험가",
      "stage": 2
    },
    "tooltip": "전투에서 유효 공격을 2회 연속 성공한 뒤, 3번째부터 연속 성공 공격의 피해가 1 증가합니다. 자신의 공격이 무효가 되면 기록이 초기화됩니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "POST_COLLISION",
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-004": {
    "augmentId": "aug-004",
    "name": "경험자의 감각",
    "classId": "adventurer",
    "archetype": "노련한 탐험가",
    "stage": 2,
    "trigger": [
      "POST_COLLISION",
      "ON_VALID"
    ],
    "condition": "전투에서 첫 충돌 후 다음 유효 공격에 성공하면 성장 EXP 1을 추가로 얻습니다. 전투당 1회입니다.",
    "effect": {
      "sourceField": "BETA_V0_2_COMPLETION",
      "text": "전투에서 첫 충돌 후 다음 유효 공격에 성공하면 성장 EXP 1을 추가로 얻습니다. 전투당 1회입니다."
    },
    "value": {
      "extraExp": 1
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "노련한 탐험가",
      "stage": 2
    },
    "tooltip": "전투에서 첫 충돌 후 다음 유효 공격에 성공하면 성장 EXP 1을 추가로 얻습니다. 전투당 1회입니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "POST_COLLISION",
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-005": {
    "augmentId": "aug-005",
    "name": "산전수전",
    "classId": "adventurer",
    "archetype": "노련한 탐험가",
    "stage": 3,
    "trigger": [
      "ON_DAMAGE_TAKEN",
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "전투 첫 직접 피격을 1 줄이고 이후 다음 유효 공격 피해를 1 높입니다. 전투당 1회입니다.",
    "effect": {
      "sourceField": "BETA_V0_2_COMPLETION",
      "text": "전투 첫 직접 피격을 1 줄이고 이후 다음 유효 공격 피해를 1 높입니다. 전투당 1회입니다."
    },
    "value": {
      "directReduction": 1,
      "nextAttackDamage": 1
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "노련한 탐험가",
      "stage": 3
    },
    "tooltip": "전투 첫 직접 피격을 1 줄이고 이후 다음 유효 공격 피해를 1 높입니다. 전투당 1회입니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_PLAYER_DAMAGE",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-006": {
    "augmentId": "aug-006",
    "name": "숙련된 일격",
    "classId": "adventurer",
    "archetype": "노련한 탐험가",
    "stage": 3,
    "trigger": [
      "ON_VALID",
      "ON_INVALID",
      "PRE_DAMAGE"
    ],
    "condition": "연속 유효 공격마다 숙련이 1 증가하며 최대 3입니다. 현재 공격은 숙련당 피해 +1을 얻습니다. 무효 제출과 전투 종료 시 초기화됩니다.",
    "effect": {
      "sourceField": "BETA_V0_2_COMPLETION",
      "text": "연속 유효 공격마다 숙련이 1 증가하며 최대 3입니다. 현재 공격은 숙련당 피해 +1을 얻습니다. 무효 제출과 전투 종료 시 초기화됩니다."
    },
    "value": {
      "stackGain": 1,
      "stackCap": 3,
      "damagePerStack": 1
    },
    "cap": {
      "text": "최대 3",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "onceScope": "NONE",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "노련한 탐험가",
      "stage": 3
    },
    "tooltip": "연속 유효 공격마다 숙련이 1 증가하며 최대 3입니다. 현재 공격은 숙련당 피해 +1을 얻습니다. 무효 제출과 전투 종료 시 초기화됩니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-007": {
    "augmentId": "aug-007",
    "name": "빠른 성장",
    "classId": "adventurer",
    "archetype": "노련한 탐험가",
    "stage": 3,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "모험가 기본 추가 EXP가 3번째 유효 공격마다 1회 추가로 발동해 EXP +1",
    "effect": {
      "sourceField": "betaValue",
      "text": "모험가 기본 추가 EXP가 3번째 유효 공격마다 1회 추가로 발동해 EXP +1."
    },
    "value": {
      "everyValid": 3,
      "extraExp": 1
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "NONE",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "노련한 탐험가",
      "stage": 3
    },
    "tooltip": "모험가 기본 추가 EXP가 3번째 유효 공격마다 1회 추가로 발동해 EXP +1.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-008": {
    "augmentId": "aug-008",
    "name": "백전노장",
    "classId": "adventurer",
    "archetype": "노련한 탐험가",
    "stage": 4,
    "trigger": [
      "ON_ACQUIRE"
    ],
    "condition": "최대 HP +1, 획득 시 HP1 회복",
    "effect": {
      "sourceField": "betaValue",
      "text": "최대 HP +1, 획득 시 HP1 회복."
    },
    "value": {
      "maxHp": 1,
      "heal": 1
    },
    "cap": {
      "text": "MAX_HP",
      "source": "GLOBAL_POLICY"
    },
    "onceScope": "ONCE_PER_RUN",
    "resetScope": "RUN",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": false,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "노련한 탐험가",
      "stage": 4
    },
    "tooltip": "최대 HP +1, 획득 시 HP1 회복.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "ON_ACQUIRE"
    ]
  },
  "aug-009": {
    "augmentId": "aug-009",
    "name": "일당백",
    "classId": "adventurer",
    "archetype": "노련한 탐험가",
    "stage": 4,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE",
      "ON_INVALID",
      "POST_COLLISION"
    ],
    "condition": "같은 전투에서 자신의 유효 공격 연속 수가 4 이상이고 현재 공격이 유효하다. 충돌 또는 다른 무효 제출에서 연속 수가 0이 된다; 몬스터 처치 및 전투 종료에서도 종료한다.",
    "effect": [
      {
        "op": "ADD_DAMAGE",
        "amount": 3,
        "target": "CURRENT_ATTACK"
      }
    ],
    "value": {
      "bonusDamage": 3,
      "activationStreak": 4
    },
    "cap": {
      "bonusPerTurn": 1
    },
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "노련한 탐험가",
      "stage": 4
    },
    "tooltip": "전투에서 유효 공격을 3회 연속 성공하면 4번째부터 연속 성공 공격 피해가 3 증가합니다. 무효 제출이나 전투 종료 시 기록이 초기화됩니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "POST_COLLISION",
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-010": {
    "augmentId": "aug-010",
    "name": "위대한 모험담",
    "classId": "adventurer",
    "archetype": "노련한 탐험가",
    "stage": 4,
    "trigger": [
      "COMBAT_END",
      "ON_VALID"
    ],
    "condition": "전투 종료 시 유효 공격 성공률이 80% 이상이면 EXP +3",
    "effect": {
      "sourceField": "betaValue",
      "text": "전투 종료 시 유효 공격 성공률이 80% 이상이면 EXP +3."
    },
    "value": {
      "requiredSuccessRate": 0.8,
      "extraExp": 3
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "노련한 탐험가",
      "stage": 4
    },
    "tooltip": "전투 종료 시 유효 공격 성공률이 80% 이상이면 EXP +3.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE",
      "COMBAT_END"
    ]
  },
  "aug-011": {
    "augmentId": "aug-011",
    "name": "만능 장비꾼",
    "classId": "adventurer",
    "archetype": "만능 장비꾼",
    "stage": 1,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "직전 제출과 다른 FINAL_NUMBER로 유효 성공하면 장비가 발동합니다. 1~2 방어: 다음 직접 피해 -1, 3 탐험: EXP +1, 4~5 무기: 피해 +1. 종류별 사이클당 1회, 장비 EXP 전투 상한 2입니다.",
    "effect": {
      "sourceField": "BETA_V0_2_COMPLETION",
      "text": "직전 제출과 다른 FINAL_NUMBER로 유효 성공하면 장비가 발동합니다. 1~2 방어: 다음 직접 피해 -1, 3 탐험: EXP +1, 4~5 무기: 피해 +1. 종류별 사이클당 1회, 장비 EXP 전투 상한 2입니다."
    },
    "value": {
      "lowReduction": 1,
      "utilityExp": 1,
      "weaponDamage": 1,
      "equipmentExpCombatCap": 2
    },
    "cap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "onceScope": "ONCE_PER_CYCLE",
    "resetScope": "CYCLE",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "만능 장비꾼",
      "stage": 1
    },
    "tooltip": "직전 제출과 다른 FINAL_NUMBER로 유효 성공하면 장비가 발동합니다. 1~2 방어: 다음 직접 피해 -1, 3 탐험: EXP +1, 4~5 무기: 피해 +1. 종류별 사이클당 1회, 장비 EXP 전투 상한 2입니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-012": {
    "augmentId": "aug-012",
    "name": "튼튼한 야영 장비",
    "classId": "adventurer",
    "archetype": "만능 장비꾼",
    "stage": 2,
    "trigger": [
      "ON_VALID",
      "POST_COLLISION"
    ],
    "condition": "만능 장비꾼의 숫자 1~2 방어 장비 효과가 전투에서 실제로 발동한다. 살아 있는 아군 중 현재 HP가 가장 낮은 1명(자신 포함, 동률이면 로비 좌석순)을 고른다.",
    "effect": [
      {
        "op": "APPLY_STATUS",
        "status": "NEXT_DIRECT_DAMAGE_REDUCTION",
        "amount": 1,
        "target": "LOWEST_HP_ALLY_INCLUDING_SELF",
        "expiry": "NEXT_DIRECT_DAMAGE_OR_COMBAT_END"
      }
    ],
    "value": {
      "damageReduction": 1
    },
    "cap": {
      "statusStacks": 1,
      "grantPerTurn": 1
    },
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "만능 장비꾼",
      "stage": 2
    },
    "tooltip": "전투에서 1~2 방어 장비가 발동하면 HP가 가장 낮은 아군 1명(자신 포함)의 다음 직접 피해를 1 줄입니다. 보호는 중첩되지 않습니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-013": {
    "augmentId": "aug-013",
    "name": "탐험가의 공구함",
    "classId": "adventurer",
    "archetype": "만능 장비꾼",
    "stage": 2,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "전투에서 만능 장비꾼의 FINAL_NUMBER 3 탐험 장비가 유효하게 발동하고 해당 전투의 장비 EXP 총 획득량이 2 미만이다.",
    "effect": [
      {
        "op": "MODIFY_EXP",
        "amount": 1,
        "target": "SELF_EQUIPMENT_EXP_GRANT",
        "timing": "SAME_GRANT"
      }
    ],
    "value": {
      "extraExp": 1,
      "totalEquipmentExpPerCombat": 2
    },
    "cap": {
      "equipmentExpPerCombat": 2
    },
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "만능 장비꾼",
      "stage": 2
    },
    "tooltip": "전투에서 숫자 3 탐험 장비가 처음 발동하면 그 장비의 EXP 보상에 1을 더합니다. 장비 EXP는 전투당 최대 2입니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-014": {
    "augmentId": "aug-014",
    "name": "잘 벼린 여행검",
    "classId": "adventurer",
    "archetype": "만능 장비꾼",
    "stage": 2,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE",
      "ON_INVALID"
    ],
    "condition": "전투에서 자신의 직전 유효한 4~5 무기 장비 숫자와 현재 유효 FINAL_NUMBER가 4↔5로 번갈아 나타난다. 다른 숫자 제출 또는 무효 제출은 교대 기록을 끊는다.",
    "effect": [
      {
        "op": "ADD_DAMAGE",
        "amount": 1,
        "target": "CURRENT_ATTACK"
      }
    ],
    "value": {
      "bonusDamage": 1,
      "eligibleNumbers": [
        4,
        5
      ]
    },
    "cap": {
      "bonusPerTurn": 1
    },
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "만능 장비꾼",
      "stage": 2
    },
    "tooltip": "전투에서 4와 5 무기 장비를 번갈아 유효하게 사용하면 두 번째 무기 공격부터 피해가 1 증가합니다. 다른 숫자나 무효 제출은 기록을 끊습니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-015": {
    "augmentId": "aug-015",
    "name": "재빠른 장비 교체",
    "classId": "adventurer",
    "archetype": "만능 장비꾼",
    "stage": 3,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "직전 제출과 숫자 차이가 2 이상인 유효 장비는 강화됩니다. 방어는 다음 피해 감소 +1, 탐험은 EXP +1(전투 상한 2), 무기는 피해 +2입니다.",
    "effect": {
      "sourceField": "BETA_V0_2_COMPLETION",
      "text": "직전 제출과 숫자 차이가 2 이상인 유효 장비는 강화됩니다. 방어는 다음 피해 감소 +1, 탐험은 EXP +1(전투 상한 2), 무기는 피해 +2입니다."
    },
    "value": {
      "difference": 2,
      "lowExtraReduction": 1,
      "utilityExtraExp": 1,
      "weaponExtraDamage": 2
    },
    "cap": {
      "text": "최대 3스택",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "만능 장비꾼",
      "stage": 3
    },
    "tooltip": "직전 제출과 숫자 차이가 2 이상인 유효 장비는 강화됩니다. 방어는 다음 피해 감소 +1, 탐험은 EXP +1(전투 상한 2), 무기는 피해 +2입니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-016": {
    "augmentId": "aug-016",
    "name": "준비 만전",
    "classId": "adventurer",
    "archetype": "만능 장비꾼",
    "stage": 3,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "한 사이클에서 방어·탐험·무기 장비를 모두 유효하게 사용하면 세 번째 장비의 공격 피해가 2 증가합니다. 사이클당 1회입니다.",
    "effect": {
      "sourceField": "BETA_V0_2_COMPLETION",
      "text": "한 사이클에서 방어·탐험·무기 장비를 모두 유효하게 사용하면 세 번째 장비의 공격 피해가 2 증가합니다. 사이클당 1회입니다."
    },
    "value": {
      "categories": 3,
      "bonusDamage": 2
    },
    "cap": {
      "text": "최대 3스택",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "onceScope": "ONCE_PER_CYCLE",
    "resetScope": "CYCLE",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "만능 장비꾼",
      "stage": 3
    },
    "tooltip": "한 사이클에서 방어·탐험·무기 장비를 모두 유효하게 사용하면 세 번째 장비의 공격 피해가 2 증가합니다. 사이클당 1회입니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-017": {
    "augmentId": "aug-017",
    "name": "현장 개조",
    "classId": "adventurer",
    "archetype": "만능 장비꾼",
    "stage": 3,
    "trigger": [
      "ON_VALID",
      "POST_DAMAGE"
    ],
    "condition": "전투에서 서로 다른 장비 종류 LOW(1/2), UTILITY(3), WEAPON(4/5)를 연속 유효 발동한다. 다른 종류로 바뀔 때 개조 1을 얻고 최대 2; 같은 종류 또는 무효 제출은 개조를 0으로 한다. 개조 2가 된 바로 그 장비에 강화가 적용된다.",
    "effect": [
      {
        "op": "APPLY_STATUS",
        "status": "EQUIPMENT_RETROFIT",
        "stacks": 1,
        "target": "SELF"
      },
      {
        "op": "MODIFY_EQUIPMENT_EFFECT",
        "when": "STACK_REACHES_2",
        "amountByCategory": {
          "LOW": "NEXT_DIRECT_DAMAGE_REDUCTION_PLUS_1",
          "UTILITY": "EXP_PLUS_1_WITH_COMBAT_CAP_2",
          "WEAPON": "CURRENT_ATTACK_DAMAGE_PLUS_2"
        },
        "consumeStacks": 2
      }
    ],
    "value": {
      "stackGain": 1,
      "activationStacks": 2,
      "weaponBonusDamage": 2,
      "lowExtraReduction": 1,
      "utilityExtraExp": 1
    },
    "cap": {
      "retrofitStacks": 2,
      "utilityExpPerCombat": 2,
      "bonusPerTurn": 1
    },
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "만능 장비꾼",
      "stage": 3
    },
    "tooltip": "전투에서 서로 다른 종류의 장비를 3회 연속 유효하게 사용하면 세 번째 장비가 강화됩니다: 방어는 피해 감소 +1, 탐험은 EXP +1(전투 상한 2), 무기는 피해 +2입니다. 같은 종류나 무효 제출 시 기록이 초기화됩니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-018": {
    "augmentId": "aug-018",
    "name": "만물상",
    "classId": "adventurer",
    "archetype": "만능 장비꾼",
    "stage": 4,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "한 사이클에서 방어·탐험·공격 장비를 모두 발동하면 다음 유효 성공에 세 효과를 동시에 적용: 다음 직접 피해 1 감소 + EXP1 + 추가 피해1",
    "effect": {
      "sourceField": "betaValue",
      "text": "한 사이클에서 방어·탐험·공격 장비를 모두 발동하면 다음 유효 성공에 세 효과를 동시에 적용: 다음 직접 피해 1 감소 + EXP1 + 추가 피해1."
    },
    "value": {
      "categories": 3,
      "nextLowReduction": 1,
      "nextExp": 1,
      "nextDamage": 1
    },
    "cap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "onceScope": "ONCE_PER_CYCLE",
    "resetScope": "CYCLE",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "만능 장비꾼",
      "stage": 4
    },
    "tooltip": "한 사이클에서 방어·탐험·공격 장비를 모두 발동하면 다음 유효 성공에 세 효과를 동시에 적용: 다음 직접 피해 1 감소 + EXP1 + 추가 피해1.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-019": {
    "augmentId": "aug-019",
    "name": "전설의 장비 세트",
    "classId": "adventurer",
    "archetype": "만능 장비꾼",
    "stage": 4,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "전투에서 만능 장비꾼의 각 기본 장비 효과가 발동한다. 해당 장비 종류의 사이클당 기본 사용 제한은 그대로 적용한다.",
    "effect": [
      {
        "op": "OVERRIDE_EQUIPMENT_VALUE",
        "values": {
          "LOW": "NEXT_DIRECT_DAMAGE_REDUCTION_2",
          "UTILITY": "EXP_2",
          "WEAPON": "CURRENT_ATTACK_DAMAGE_PLUS_4"
        }
      }
    ],
    "value": {
      "lowDamageReduction": 2,
      "utilityExp": 2,
      "weaponBonusDamage": 4
    },
    "cap": {
      "equipmentUsePerCategoryPerCycle": 1,
      "utilityExpPerCombat": 2
    },
    "onceScope": "ONCE_PER_CYCLE",
    "resetScope": "CYCLE",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "만능 장비꾼",
      "stage": 4
    },
    "tooltip": "전투에서 장비 효과가 강화됩니다. 1~2 방어는 다음 직접 피해 2 감소, 3 탐험은 EXP 2, 4~5 무기는 피해 +4입니다. 종류별 사이클당 1회와 EXP 전투 상한 2는 유지됩니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-020": {
    "augmentId": "aug-020",
    "name": "적재적소",
    "classId": "adventurer",
    "archetype": "만능 장비꾼",
    "stage": 4,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "직전 제출과 다른 FINAL_NUMBER로 유효 성공할 때 방어·탐험·무기 중 선택한 장비를 발동합니다. 종류별 사이클당 1회와 장비 EXP 전투 상한 2는 유지됩니다.",
    "effect": {
      "sourceField": "BETA_V0_2_COMPLETION",
      "text": "직전 제출과 다른 FINAL_NUMBER로 유효 성공할 때 방어·탐험·무기 중 선택한 장비를 발동합니다. 종류별 사이클당 1회와 장비 EXP 전투 상한 2는 유지됩니다."
    },
    "value": {
      "choiceCount": 1,
      "equipmentExpCombatCap": 2
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "ONCE_PER_CYCLE",
    "resetScope": "CYCLE",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "만능 장비꾼",
      "stage": 4
    },
    "tooltip": "직전 제출과 다른 FINAL_NUMBER로 유효 성공할 때 방어·탐험·무기 중 선택한 장비를 발동합니다. 종류별 사이클당 1회와 장비 EXP 전투 상한 2는 유지됩니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-021": {
    "augmentId": "aug-021",
    "name": "기적의 탐험가",
    "classId": "adventurer",
    "archetype": "기적의 탐험가",
    "stage": 1,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "4 players submit distinct final numbers and all are valid",
    "effect": {
      "sourceField": "betaValue",
      "text": "4명이 서로 다른 숫자로 모두 유효 성공하면 '기적의 발견': 전원 EXP +1."
    },
    "value": {
      "distinctValidPlayers": 4,
      "partyExp": 1
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "기적의 탐험가",
      "stage": 1
    },
    "tooltip": "4명이 서로 다른 숫자로 모두 유효 성공하면 '기적의 발견': 전원 EXP +1.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-022": {
    "augmentId": "aug-022",
    "name": "공동 탐사 기록",
    "classId": "adventurer",
    "archetype": "기적의 탐험가",
    "stage": 2,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "전투에서 기적의 탐험가 Stage 1 '기적의 발견'의 네 플레이어 서로 다른 FINAL_NUMBER·전원 유효 성공 조건이 실제 성립하고 해당 전투에서 아직 발동하지 않았다.",
    "effect": [
      {
        "op": "MODIFY_EXP",
        "mode": "REPLACE_MIRACLE_PARTY_REWARD",
        "amountPerPlayer": 2
      }
    ],
    "value": {
      "partyExpPerPlayer": 2,
      "baseRewardReplaced": 1
    },
    "cap": {
      "miraclePerCombat": 1
    },
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "기적의 탐험가",
      "stage": 2
    },
    "tooltip": "전투에서 네 명이 서로 다른 숫자로 모두 유효 성공해 기적의 발견이 발동하면, 보상이 전원 EXP 1 대신 전원 EXP 2가 됩니다. 전투당 1회입니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-023": {
    "augmentId": "aug-023",
    "name": "행운의 동행",
    "classId": "adventurer",
    "archetype": "기적의 탐험가",
    "stage": 2,
    "trigger": [
      "COMBAT_END"
    ],
    "condition": "기적의 발견이 발생한 전투 승리 시 전원 골드 +1G",
    "effect": {
      "sourceField": "betaValue",
      "text": "기적의 발견이 발생한 전투 승리 시 전원 골드 +1G."
    },
    "value": {
      "partyGold": 1
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "ONCE_PER_FLOOR",
    "resetScope": "FLOOR",
    "persistenceScope": "FLOOR",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "기적의 탐험가",
      "stage": 2
    },
    "tooltip": "기적의 발견이 발생한 전투 승리 시 전원 골드 +1G.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE",
      "MONSTER_KILLED"
    ]
  },
  "aug-024": {
    "augmentId": "aug-024",
    "name": "길잡이의 격려",
    "classId": "adventurer",
    "archetype": "기적의 탐험가",
    "stage": 2,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "기적의 발견 후 전원 다음 유효 공격 피해가 1 증가합니다. 발견을 일으킨 현재 공격은 제외하며 전투 종료 시 소멸합니다.",
    "effect": {
      "sourceField": "BETA_V0_2_COMPLETION",
      "text": "기적의 발견 후 전원 다음 유효 공격 피해가 1 증가합니다. 발견을 일으킨 현재 공격은 제외하며 전투 종료 시 소멸합니다."
    },
    "value": {
      "nextAttackDamage": 1
    },
    "cap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "onceScope": "NONE",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "기적의 탐험가",
      "stage": 2
    },
    "tooltip": "기적의 발견 후 전원 다음 유효 공격 피해가 1 증가합니다. 발견을 일으킨 현재 공격은 제외하며 전투 종료 시 소멸합니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-025": {
    "augmentId": "aug-025",
    "name": "대원정 기록지",
    "classId": "adventurer",
    "archetype": "기적의 탐험가",
    "stage": 3,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "엘리트/보스에서 기적의 발견 시 기본 보상 외 전원 EXP +2 추가",
    "effect": {
      "sourceField": "betaValue",
      "text": "엘리트/보스에서 기적의 발견 시 기본 보상 외 전원 EXP +2 추가."
    },
    "value": {
      "partyExtraExp": 2
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "기적의 탐험가",
      "stage": 3
    },
    "tooltip": "엘리트/보스에서 기적의 발견 시 기본 보상 외 전원 EXP +2 추가.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-026": {
    "augmentId": "aug-026",
    "name": "숨겨진 샛길",
    "classId": "adventurer",
    "archetype": "기적의 탐험가",
    "stage": 3,
    "trigger": [
      "ON_VALID",
      "ROOM_END"
    ],
    "condition": "한 층에서 기적의 발견 2회 달성 시 다음 상점 첫 구매 가격 -1G",
    "effect": {
      "sourceField": "betaValue",
      "text": "한 층에서 기적의 발견 2회 달성 시 다음 상점 첫 구매 가격 -1G."
    },
    "value": {
      "floorDiscoveries": 2,
      "firstShopPriceReduction": 1
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "ONCE_PER_FLOOR",
    "resetScope": "FLOOR",
    "persistenceScope": "FLOOR",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": true,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "기적의 탐험가",
      "stage": 3
    },
    "tooltip": "한 층에서 기적의 발견 2회 달성 시 다음 상점 첫 구매 가격 -1G.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-027": {
    "augmentId": "aug-027",
    "name": "행운의 발견",
    "classId": "adventurer",
    "archetype": "기적의 탐험가",
    "stage": 3,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "보상방에서 유효 통과하고 최종 피해 순위 상위 2명이면 공용 유물 후보를 1개 추가 공개합니다. 방당 1회, 기존 선택 순서를 유지합니다.",
    "effect": {
      "sourceField": "BETA_V0_2_COMPLETION",
      "text": "보상방에서 유효 통과하고 최종 피해 순위 상위 2명이면 공용 유물 후보를 1개 추가 공개합니다. 방당 1회, 기존 선택 순서를 유지합니다."
    },
    "value": {
      "rankTop": 2,
      "extraCandidates": 1
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "ONCE_PER_ROOM",
    "resetScope": "ROOM",
    "persistenceScope": "ROOM",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "기적의 탐험가",
      "stage": 3
    },
    "tooltip": "보상방에서 유효 통과하고 최종 피해 순위 상위 2명이면 공용 유물 후보를 1개 추가 공개합니다. 방당 1회, 기존 선택 순서를 유지합니다.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE",
      "REWARD_RANKED"
    ]
  },
  "aug-028": {
    "augmentId": "aug-028",
    "name": "모두의 모험담",
    "classId": "adventurer",
    "archetype": "기적의 탐험가",
    "stage": 4,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "Miracle Discovery; on third discovery in a floor, also grant the stated EXP",
    "effect": {
      "sourceField": "betaValue",
      "text": "기적의 발견 시 전원 EXP +2 추가; 한 층 3회 달성 시 전원 EXP +5 추가."
    },
    "value": {
      "partyExtraExp": 2,
      "thirdFloorDiscoveryExtraExp": 5
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": {
      "onDiscovery": "NONE",
      "thirdDiscovery": "ONCE_PER_FLOOR"
    },
    "resetScope": "FLOOR",
    "persistenceScope": "FLOOR",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "기적의 탐험가",
      "stage": 4
    },
    "tooltip": "기적의 발견 시 전원 EXP +2 추가; 한 층 3회 달성 시 전원 EXP +5 추가.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE"
    ]
  },
  "aug-029": {
    "augmentId": "aug-029",
    "name": "황금 나침반",
    "classId": "adventurer",
    "archetype": "기적의 탐험가",
    "stage": 4,
    "trigger": [
      "ROOM_END"
    ],
    "condition": "한 층에서 기적의 발견 2회 이상이면 보스 클리어 후 전원 +1G",
    "effect": {
      "sourceField": "betaValue",
      "text": "한 층에서 기적의 발견 2회 이상이면 보스 클리어 후 전원 +1G."
    },
    "value": {
      "floorDiscoveries": 2,
      "partyGold": 1
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "ONCE_PER_FLOOR",
    "resetScope": "FLOOR",
    "persistenceScope": "FLOOR",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "기적의 탐험가",
      "stage": 4
    },
    "tooltip": "한 층에서 기적의 발견 2회 이상이면 보스 클리어 후 전원 +1G.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE",
      "BOSS_CLEAR"
    ]
  },
  "aug-030": {
    "augmentId": "aug-030",
    "name": "전설의 발견",
    "classId": "adventurer",
    "archetype": "기적의 탐험가",
    "stage": 4,
    "trigger": [
      "ROOM_END"
    ],
    "condition": "At least three Miracle Discoveries on the floor, then boss clear",
    "effect": {
      "sourceField": "betaValue",
      "text": "한 층에서 기적의 발견 3회 이상 달성 후 보스를 클리어하면 파티용 추가 유물 1개 획득 기회 생성."
    },
    "value": {
      "floorDiscoveries": 3,
      "partyRelicOpportunities": 1,
      "runCap": 1
    },
    "cap": {
      "perResolution": 1
    },
    "onceScope": "ONCE_PER_RUN",
    "resetScope": "RUN",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "runtimeHandler": "ADVENTURER_V02",
    "candidatePool": {
      "classId": "adventurer",
      "archetype": "기적의 탐험가",
      "stage": 4
    },
    "tooltip": "한 층에서 기적의 발견 3회 이상 달성 후 보스를 클리어하면 파티용 추가 유물 1개 획득 기회 생성.",
    "telemetry": [
      "augmentId",
      "triggerCount",
      "successCount",
      "bonusDamage",
      "expGranted",
      "goldGranted",
      "relicGranted",
      "protectionApplied",
      "streakMax"
    ],
    "executable": true,
    "specStatus": "SPEC_COMPLETE",
    "source": "BETA_v0.2",
    "ownershipPersistenceScope": "RUN",
    "runtimeTriggers": [
      "CARD_VALIDATED",
      "BEFORE_DAMAGE",
      "BOSS_CLEAR"
    ]
  }
});
