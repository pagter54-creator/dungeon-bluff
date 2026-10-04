// Generated runtime contract projection from immutable docs/PVE_CONTENT_005Q_DESIGN_C.json.
// Do not edit DESIGN-C to accommodate runtime; update runtime adapters instead.
export const GAMBLER_CONTRACTS=Object.freeze({
  "aug-211": {
    "augmentId": "aug-211",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "운명의 승부사",
    "stage": 1,
    "name": "운명의 승부사",
    "sourceIntent": "6·7 유효 성공 시 '행운'을 얻고 다음 일반 공격 또는 다음 특수 카드 생성에 보너스.",
    "sourceValueV01": "6 또는 7 유효 성공 시 행운 1 획득. 다음 일반 카드 유효 공격에 추가 피해 +1 또는 다음 특수 카드 충전 진행 +1 중 선택 후 소모.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 212,
        "number": 211,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "6/7 고점/정석",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "SOURCE_EXPLICIT_OR_005R_RESOLVED",
      "decisions": [
        {
          "decisionId": "Q07",
          "selectedOption": "B",
          "selectionScope": "OPERATIONAL_POLICY"
        }
      ]
    },
    "trigger": [
      "ON_VALID",
      "ON_DRAW"
    ],
    "timingPhase": "REWARD_PRESENTED_BEFORE_FINAL_CONFIRM",
    "condition": "Reward options already presented and final confirmation not yet made; Luck available.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "6 또는 7 유효 성공 시 행운 1 획득. 다음 일반 카드 유효 공격에 추가 피해 +1 또는 다음 특수 카드 충전 진행 +1 중 선택 후 소모.",
      "numericHints": [
        6,
        7,
        1,
        1,
        1
      ]
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "최대 1",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "NONE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": false,
      "EVENT": false,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "PUBLIC",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "6 또는 7 유효 성공 시 행운 1 획득. 다음 일반 카드 유효 공격에 추가 피해 +1 또는 다음 특수 카드 충전 진행 +1 중 선택 후 소모. 행운 최대 1.",
    "runtimePrimitivesRequired": [
      "REWARD_PRE_CONFIRM_HOOK",
      "GAIN_RESOURCE",
      "SPEND_RESOURCE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-211: satisfy 'Valid 6 or 7 grants one Luck; consume on next normal valid attack or special-card charge' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-211: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": [
        "same rootActionId retry idempotent",
        "reconnect before/after trigger preserves state",
        "room/collision ordering",
        "no recursive derived trigger"
      ]
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-212": {
    "augmentId": "aug-212",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "운명의 승부사",
    "stage": 2,
    "name": "행운의 숫자 6",
    "sourceIntent": "6의 유효 공격 강화, 성공 시 다음 특수 카드 충전에 보너스.",
    "sourceValueV01": "숫자 6 유효 공격 추가 피해 +2, 특수 카드 충전 진행 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 213,
        "number": 212,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "6/7 고점/정석",
        "reviewTag": "판정순서",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_VALID",
    "condition": "A physical number-6 card is used and valid.",
    "effectType": "MULTI_EFFECT",
    "effectValue": {
      "bonusDamage": 2,
      "specialChargeProgress": 1
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "TURN_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "숫자 6 유효 공격 추가 피해 +2, 특수 카드 충전 진행 +1. 턴당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "GAIN_RESOURCE",
      "MODIFY_NUMBER"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-212: satisfy 'A physical number-6 card is used and valid.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-212: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-213": {
    "augmentId": "aug-213",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "운명의 승부사",
    "stage": 2,
    "name": "대박의 숫자 7",
    "sourceIntent": "7의 유효 공격을 크게 강화. 생성 난도는 유지.",
    "sourceValueV01": "숫자 7 유효 공격 추가 피해 +4.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 214,
        "number": 213,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 2,
        "direction": "6/7 고점/정석",
        "reviewTag": "판정순서",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_VALID",
    "condition": "A physical number-7 card is used and valid.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 4
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "consumeRule": "NONE",
    "onceScope": "NONE",
    "resetScope": "NEVER_WITHIN_RUN",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "숫자 7 유효 공격 추가 피해 +4.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "MODIFY_NUMBER"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-213: satisfy 'A physical number-7 card is used and valid.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-213: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-214": {
    "augmentId": "aug-214",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "운명의 승부사",
    "stage": 2,
    "name": "좋은 흐름",
    "sourceIntent": "1~5 서로 다른 숫자를 연속 유효 사용하면 특수 카드 충전 가속.",
    "sourceValueV01": "서로 다른 일반 숫자 3개를 연속 유효 사용하면 특수 카드 충전 진행 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 215,
        "number": 214,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 3,
        "direction": "6/7 고점/정석",
        "reviewTag": "판정순서",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "서로 다른 일반 숫자 3개를 연속 유효 사용하면 특수 카드 충전 진행 +1",
    "effectType": "GAIN_RESOURCE",
    "effectValue": {
      "text": "서로 다른 일반 숫자 3개를 연속 유효 사용하면 특수 카드 충전 진행 +1.",
      "numericHints": [
        3,
        1
      ]
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_214_gain_resource",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to declared cap; derived effects do not recursively retrigger.",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_SHUFFLE",
    "resetScope": "ON_SHUFFLE",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_214_gain_resource and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "서로 다른 일반 숫자 3개를 연속 유효 사용하면 특수 카드 충전 진행 +1. 한 셔플 주기당 1회.",
    "runtimePrimitivesRequired": [
      "GAIN_RESOURCE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-214: satisfy '서로 다른 일반 숫자 3개를 연속 유효 사용하면 특수 카드 충전 진행 +1' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-214: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-215": {
    "augmentId": "aug-215",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "운명의 승부사",
    "stage": 3,
    "name": "연승 행진",
    "sourceIntent": "특수 카드 사용 후 다음 일반 공격이 유효하면 행운 유지/강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +2.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 216,
        "number": 215,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "6/7 고점/정석",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "직전에 유효하게 사용한 physical special card가 6 또는 7이고, 그 다음 ordinary 1~5 카드가 유효하다.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 2
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "최대 3스택",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "TURN_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "PUBLIC",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "6 또는 7을 유효하게 사용한 뒤 다음 일반 카드(1~5) 공격이 유효하면 그 공격 피해가 2 증가합니다.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-215: satisfy '특수 카드 사용 후 다음 일반 공격이 유효하면 행운 유지/강화.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-215: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-216": {
    "augmentId": "aug-216",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "운명의 승부사",
    "stage": 3,
    "name": "두 번 오는 행운",
    "sourceIntent": "6·7 생성 조건 달성 시 조건부로 생성량 또는 다음 생성 진행도 추가.",
    "sourceValueV01": "해당 재사용/충전 진행 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 217,
        "number": 216,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 2,
        "direction": "6/7 고점/정석",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": [
        {
          "decisionId": "Q18",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "A valid physical 6 or 7 completes a special-card generation progress step.",
    "effectType": "GAIN_RESOURCE",
    "effectValue": {
      "resource": "nextSpecialChargeProgress",
      "amount": 1
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_216_gain_resource",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to declared cap; derived effects do not recursively retrigger.",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_CYCLE",
    "resetScope": "CYCLE_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_216_gain_resource and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "해당 재사용/충전 진행 +1. 사이클당 1회.",
    "runtimePrimitivesRequired": [
      "GAIN_RESOURCE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-216: satisfy 'A valid physical 6 or 7 completes a special-card generation progress step.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-216: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-217": {
    "augmentId": "aug-217",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "운명의 승부사",
    "stage": 3,
    "name": "운명의 연속",
    "sourceIntent": "6 성공 후 7, 혹은 7 성공 후 6을 성공시키면 강력한 연계 보너스.",
    "sourceValueV01": "조건 달성 시 추가 피해 +3.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 218,
        "number": 217,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 3,
        "direction": "6/7 고점/정석",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": [
        {
          "decisionId": "Q18",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_VALID",
    "condition": "Previous valid special number was 6 and current 7, or previous 7 and current 6.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 3
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "최대 3스택",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "TURN_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "Previous valid special number was 6 and current 7, or previous 7 and current 6.일 때 추가 피해 +3 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-217: satisfy 'Previous valid special number was 6 and current 7, or previous 7 and current 6.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-217: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-218": {
    "augmentId": "aug-218",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "운명의 승부사",
    "stage": 4,
    "name": "황금의 6",
    "sourceIntent": "6을 반복 사용 가능한 핵심 공격 자원으로 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +3.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 219,
        "number": 218,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "6/7 고점/정석",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": [
        {
          "decisionId": "Q18",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "A physical number-6 card is valid.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 3
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "최대 3스택",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "TURN_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "A physical number-6 card is valid.일 때 추가 피해 +3 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-218: satisfy 'A physical number-6 card is valid.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-218: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-219": {
    "augmentId": "aug-219",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "운명의 승부사",
    "stage": 4,
    "name": "잭팟 7",
    "sourceIntent": "7 유효 공격에 매우 강력한 추가 효과.",
    "sourceValueV01": "숫자 7 유효 공격 추가 피해 +7.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 220,
        "number": 219,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 2,
        "direction": "6/7 고점/정석",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_VALID",
    "condition": "The first valid physical number-7 card in this combat.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 7
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "숫자 7 유효 공격 추가 피해 +7. 한 전투 첫 7 성공에만 추가 +7 적용.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "MODIFY_NUMBER"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-219: satisfy 'The first valid physical number-7 card in this combat.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-219: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-220": {
    "augmentId": "aug-220",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "운명의 승부사",
    "stage": 4,
    "name": "운명은 내 편",
    "sourceIntent": "6·7 교대 성공과 일반 숫자 다양성을 유지하면 대운 누적으로 전투 화력 상승.",
    "sourceValueV01": "조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 221,
        "number": 220,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 3,
        "direction": "6/7 고점/정석",
        "reviewTag": "판정순서",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "6·7 교대 성공과 일반 숫자 다양성을 유지하면 대운 누적으로 전투 화력 상승.",
    "effectType": "ADD_STACK",
    "effectValue": {
      "text": "조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당.",
      "numericHints": [
        1,
        1,
        4,
        1,
        1
      ]
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_220_add_stack",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to [object Object]; derived effects do not recursively retrigger.",
    "stackCap": {
      "text": "최대 4",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "NONE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_220_add_stack and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당. 전투 종료 시 초기화; 별도 유지 카드 제외.",
    "runtimePrimitivesRequired": [
      "ADD_STACK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-220: satisfy '6·7 교대 성공과 일반 숫자 다양성을 유지하면 대운 누적으로 전투 화력 상승.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-220: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-221": {
    "augmentId": "aug-221",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "카드 카운터",
    "stage": 1,
    "name": "카드 카운터",
    "sourceIntent": "Owner-only exact deck/history information; ally projection only aggregate counts/composition.",
    "sourceValueV01": "이번 셔플 주기에서 아직 사용하지 않은 1~5 숫자를 유효하게 쓰면 카운트 +1(최대 3). 3 도달 시 다음 유효 공격 추가 피해 +2 후 0.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 222,
        "number": 221,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "확률 계산/조합",
        "reviewTag": "판정순서 · UI/구현",
        "reviewPriority": "중간",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "SOURCE_EXPLICIT_OR_005R_RESOLVED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID",
      "ON_DRAW"
    ],
    "timingPhase": "ON_VALID",
    "condition": "Valid use of a number 1-5 not previously used in current shuffle cycle",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "이번 셔플 주기에서 아직 사용하지 않은 1~5 숫자를 유효하게 쓰면 카운트 +1(최대 3). 3 도달 시 다음 유효 공격 추가 피해 +2 후 0.",
      "numericHints": [
        1,
        5,
        1,
        3,
        3,
        2,
        0
      ]
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "최대 3",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "NONE",
    "resetScope": "CYCLE_END",
    "persistenceScope": "CYCLE",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "OWNER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "이번 셔플 주기에서 아직 사용하지 않은 1~5 숫자를 유효하게 쓰면 카운트 +1(최대 3). 3 도달 시 다음 유효 공격 추가 피해 +2 후 0. 본인에게 덱/버린 덱 상세 UI 공개.",
    "runtimePrimitivesRequired": [
      "OWNER_PRIVATE_DECK_PROJECTION",
      "DRAW_CARD",
      "MODIFY_DECK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-221: satisfy 'Valid use of a number 1-5 not previously used in current shuffle cycle' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-221: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": [
        "same rootActionId retry idempotent",
        "reconnect before/after trigger preserves state",
        "room/collision ordering",
        "no recursive derived trigger"
      ]
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-222": {
    "augmentId": "aug-222",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "카드 카운터",
    "stage": 2,
    "name": "남은 패 계산",
    "sourceIntent": "덱에 특정 숫자가 얼마나 남았는지에 따라 그 숫자 사용 시 보너스.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 223,
        "number": 222,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "확률 계산/조합",
        "reviewTag": "판정순서 · 전용상태",
        "reviewPriority": "중간",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": [
        {
          "decisionId": "Q18",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Submitted printed number has at least 2 matching copies remaining across DECK+HAND before settlement.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 1
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "최대 3스택",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "TURN_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "OWNER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "Submitted printed number has at least 2 matching copies remaining across DECK+HAND before settlement.일 때 추가 피해 +1 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-222: satisfy 'Submitted printed number has at least 2 matching copies remaining across DECK+HAND before settlement.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-222: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-223": {
    "augmentId": "aug-223",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "카드 카운터",
    "stage": 2,
    "name": "버린 패 기억",
    "sourceIntent": "버린 덱에 같은 숫자가 많이 쌓일수록 다음 셔플 후 해당 숫자 효과 강화.",
    "sourceValueV01": "조건 충족 시 다음 드로우 보정 또는 예상 범위 적중 시 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 224,
        "number": 223,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 2,
        "direction": "확률 계산/조합",
        "reviewTag": "판정순서",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_DRAW",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_DRAW",
    "condition": "버린 덱에 같은 숫자가 많이 쌓일수록 다음 셔플 후 해당 숫자 효과 강화.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "조건 충족 시 다음 드로우 보정 또는 예상 범위 적중 시 추가 피해 +1.",
      "numericHints": [
        1
      ]
    },
    "damageTaxonomy": "ADD",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "OWNER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "조건 충족 시 다음 드로우 보정 또는 예상 범위 적중 시 추가 피해 +1. 턴당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "DRAW_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-223: satisfy '버린 덱에 같은 숫자가 많이 쌓일수록 다음 셔플 후 해당 숫자 효과 강화.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-223: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-224": {
    "augmentId": "aug-224",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "카드 카운터",
    "stage": 2,
    "name": "확률 읽기",
    "sourceIntent": "다음 드로우의 유력 숫자군을 UI로 요약하고 예상 범위 숫자를 사용하면 보너스.",
    "sourceValueV01": "조건 충족 시 다음 드로우 보정 또는 예상 범위 적중 시 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 225,
        "number": 224,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 3,
        "direction": "확률 계산/조합",
        "reviewTag": "판정순서 · UI/구현",
        "reviewPriority": "중간",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_DRAW",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_DRAW",
    "condition": "다음 드로우의 유력 숫자군을 UI로 요약하고 예상 범위 숫자를 사용하면 보너스.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "조건 충족 시 다음 드로우 보정 또는 예상 범위 적중 시 추가 피해 +1.",
      "numericHints": [
        1
      ]
    },
    "damageTaxonomy": "ADD",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "조건 충족 시 다음 드로우 보정 또는 예상 범위 적중 시 추가 피해 +1. 턴당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "DRAW_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-224: satisfy '다음 드로우의 유력 숫자군을 UI로 요약하고 예상 범위 숫자를 사용하면 보너스.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-224: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-225": {
    "augmentId": "aug-225",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "카드 카운터",
    "stage": 3,
    "name": "연속 수열",
    "sourceIntent": "1→2→3 등 연속된 숫자 흐름을 완성하면 강한 보너스. 오름/내림 모두 가능.",
    "sourceValueV01": "서로 연속된 숫자 3개를 오름/내림 순서로 유효 사용하면 다음 유효 공격 +3 피해.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 226,
        "number": 225,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "확률 계산/조합",
        "reviewTag": "파티시너지 · 판정순서",
        "reviewPriority": "중간",
        "implementationDifficulty": "중간",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "서로 연속된 숫자 3개를 오름/내림 순서로 유효 사용하면 다음 유효 공격 +3 피해",
    "effectType": "DELAY_EFFECT",
    "effectValue": {
      "text": "서로 연속된 숫자 3개를 오름/내림 순서로 유효 사용하면 다음 유효 공격 +3 피해.",
      "numericHints": [
        3,
        3
      ]
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "NONE",
    "onceScope": "NONE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "서로 연속된 숫자 3개를 오름/내림 순서로 유효 사용하면 다음 유효 공격 +3 피해. 완성 후 기록 초기화.",
    "runtimePrimitivesRequired": [
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-225: satisfy '서로 연속된 숫자 3개를 오름/내림 순서로 유효 사용하면 다음 유효 공격 +3 피해' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-225: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-226": {
    "augmentId": "aug-226",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "카드 카운터",
    "stage": 3,
    "name": "풀하우스",
    "sourceIntent": "같은 숫자군과 다른 숫자군을 정해진 단순 조합으로 사용하면 특수 보너스.",
    "sourceValueV01": "조건 달성 시 추가 피해 +2.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 227,
        "number": 226,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 2,
        "direction": "확률 계산/조합",
        "reviewTag": "판정순서",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": [
        {
          "decisionId": "Q18",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Across last 5 successful ordinary 1-5 cards, counts form one pair plus three other distinct numbers.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 2
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "최대 3스택",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "TURN_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "Across last 5 successful ordinary 1-5 cards, counts form one pair plus three other distinct numbers.일 때 추가 피해 +2 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-226: satisfy 'Across last 5 successful ordinary 1-5 cards, counts form one pair plus three other distinct numbers.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-226: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-227": {
    "augmentId": "aug-227",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "카드 카운터",
    "stage": 3,
    "name": "다섯 숫자의 기억",
    "sourceIntent": "1~5를 모두 한 번씩 사용한 뒤 다음 특수 카드 크게 강화.",
    "sourceValueV01": "1~5를 모두 한 번씩 유효 사용하면 다음 6 또는 7 공격 추가 피해 +4.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 228,
        "number": 227,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 3,
        "direction": "확률 계산/조합",
        "reviewTag": "파티시너지 · 판정순서",
        "reviewPriority": "중간",
        "implementationDifficulty": "중간",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_VALID",
    "condition": "1~5를 모두 한 번씩 유효 사용하면 다음 6 또는 7 공격 추가 피해 +4",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "1~5를 모두 한 번씩 유효 사용하면 다음 6 또는 7 공격 추가 피해 +4.",
      "numericHints": [
        1,
        5,
        6,
        7,
        4
      ]
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_SHUFFLE",
    "resetScope": "ON_SHUFFLE",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "1~5를 모두 한 번씩 유효 사용하면 다음 6 또는 7 공격 추가 피해 +4. 한 셔플 주기당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-227: satisfy '1~5를 모두 한 번씩 유효 사용하면 다음 6 또는 7 공격 추가 피해 +4' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-227: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-228": {
    "augmentId": "aug-228",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "카드 카운터",
    "stage": 4,
    "name": "완전 계산",
    "sourceIntent": "남은 덱 분포를 이용해 특정 조건에서 다음 드로우를 제한적으로 보정.",
    "sourceValueV01": "셔플 직후 첫 드로우에 1~3 또는 3~5 중 선택한 범위 카드가 최소 1장 포함되도록 보정.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 229,
        "number": 228,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "확률 계산/조합",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": [
        {
          "decisionId": "Q18",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "ON_DRAW"
    ],
    "timingPhase": "ON_DRAW",
    "condition": "First draw after shuffle: owner chooses 1-3 or 3-5; guarantee >=1 eligible drawn card in range.",
    "effectType": "MODIFY_DRAW",
    "effectValue": {
      "guaranteedMatches": 1,
      "ranges": [
        [
          1,
          2,
          3
        ],
        [
          3,
          4,
          5
        ]
      ]
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_228_modify_draw",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": "ONCE_PER_SHUFFLE",
    "resetScope": "ON_SHUFFLE",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "OWNER_ONLY",
    "reconnectRule": "Persist aug_228_modify_draw and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "셔플 직후 첫 드로우에 1~3 또는 3~5 중 선택한 범위 카드가 최소 1장 포함되도록 보정. 셔플당 1회.",
    "runtimePrimitivesRequired": [
      "DRAW_CARD",
      "MODIFY_DECK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-228: satisfy 'First draw after shuffle: owner chooses 1-3 or 3-5; guarantee >=1 eligible drawn card in range.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-228: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-229": {
    "augmentId": "aug-229",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "카드 카운터",
    "stage": 4,
    "name": "카드 카운팅의 달인",
    "sourceIntent": "조합 완성마다 다음 조합 보너스 강화, 서로 다른 조합 연계 시 추가 보상.",
    "sourceValueV01": "조건 달성 시 추가 피해 +3.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 230,
        "number": 229,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 2,
        "direction": "확률 계산/조합",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "낮음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": [
        {
          "decisionId": "Q18",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Owner completes a recognized counting combination different from immediately previous combination.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 3
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "최대 3스택",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "TURN_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "Owner completes a recognized counting combination different from immediately previous combination.일 때 추가 피해 +3 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-229: satisfy 'Owner completes a recognized counting combination different from immediately previous combination.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-229: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-230": {
    "augmentId": "aug-230",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "카드 카운터",
    "stage": 4,
    "name": "필연의 패",
    "sourceIntent": "덱/버린 덱 조건이 맞으면 다음 드로우에 원하는 숫자 범위가 등장할 확률을 크게 높임.",
    "sourceValueV01": "조건 충족 시 다음 드로우에 지정한 3개 숫자 범위 중 최소 1장 보장.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 231,
        "number": 230,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 3,
        "direction": "확률 계산/조합",
        "reviewTag": "판정순서 · UI/구현",
        "reviewPriority": "높음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": [
        {
          "decisionId": "Q18",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "ON_DRAW"
    ],
    "timingPhase": "ON_DRAW",
    "condition": "After shuffle before next draw choose any 3 ordinary numbers; if eligible, next draw contains >=1 chosen number.",
    "effectType": "MODIFY_DRAW",
    "effectValue": {
      "chooseOrdinaryNumbers": 3,
      "guaranteedMatches": 1
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_230_modify_draw",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": "ONCE_PER_SHUFFLE",
    "resetScope": "ON_SHUFFLE",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "OWNER_ONLY",
    "reconnectRule": "Persist aug_230_modify_draw and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "조건 충족 시 다음 드로우에 지정한 3개 숫자 범위 중 최소 1장 보장. 셔플당 1회.",
    "runtimePrimitivesRequired": [
      "DRAW_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-230: satisfy 'After shuffle before next draw choose any 3 ordinary numbers; if eligible, next draw contains >=1 chosen number.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-230: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-231": {
    "augmentId": "aug-231",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "올인",
    "stage": 1,
    "name": "올인",
    "sourceIntent": "All-In chooses one of two physical hand cards as judgment number; only it enters collision/validity. Valid attack damage is exactly sum of both consumed numbers before later explicit modifiers.",
    "sourceValueV01": "현재 드로우 2장 중 1장을 판정 숫자로 지정. 유효하면 피해는 두 카드 숫자 합으로 처리하고 두 장 모두 소비.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 232,
        "number": 231,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "미래 자원 차입/한방",
        "reviewTag": "파티시너지",
        "reviewPriority": "낮음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "SOURCE_EXPLICIT_OR_005R_RESOLVED",
      "decisions": []
    },
    "trigger": [
      "PRE_SELECT",
      "ON_SUBMIT",
      "ON_VALID"
    ],
    "timingPhase": "PRE_SELECT",
    "condition": "Choose one of two drawn cards for validity; consume both, use their sum for successful damage",
    "effectType": "SET_DAMAGE",
    "effectValue": {
      "text": "현재 드로우 2장 중 1장을 판정 숫자로 지정. 유효하면 피해는 두 카드 숫자 합으로 처리하고 두 장 모두 소비.",
      "numericHints": [
        2,
        1
      ]
    },
    "damageTaxonomy": "SET",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_231_spend_resource",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to declared cap; derived effects do not recursively retrigger.",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Both physical cards consumed. Ordinary -> DISCARD; used 6/7 -> VANISHED. Collision failure still settles both, no sum damage.",
    "onceScope": "NONE",
    "resetScope": "TURN_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "OWNER_ONLY",
    "reconnectRule": "Persist aug_231_spend_resource and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "현재 드로우 2장 중 1장을 판정 숫자로 지정. 유효하면 피해는 두 카드 숫자 합으로 처리하고 두 장 모두 소비. 다음 턴 드로우 1장. 중복이면 피해 0, 두 장 모두 소비.",
    "runtimePrimitivesRequired": [
      "ALL_IN_RESOLUTION",
      "MOVE_CARD_ZONE",
      "SET_DAMAGE",
      "PHYSICAL_CARD_IDENTITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-231: satisfy 'Choose one of two drawn cards for validity; consume both, use their sum for successful damage' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-231: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": [
        "same rootActionId retry idempotent",
        "reconnect before/after trigger preserves state",
        "room/collision ordering",
        "no recursive derived trigger"
      ]
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-232": {
    "augmentId": "aug-232",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "올인",
    "stage": 2,
    "name": "판돈 올리기",
    "sourceIntent": "올인 두 카드 숫자 합이 높을수록 추가 효과 증가.",
    "sourceValueV01": "올인 두 카드 합이 8 이상이면 추가 피해 +2, 10 이상이면 +4.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 233,
        "number": 232,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "미래 자원 차입/한방",
        "reviewTag": "판정순서",
        "reviewPriority": "낮음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "All-In succeeds; evaluate two consumed printed-number sum.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "tiers": [
        {
          "sumGte": 10,
          "bonusDamage": 4
        },
        {
          "sumGte": 8,
          "bonusDamage": 2
        }
      ],
      "stack": false
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "TURN_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "올인 두 카드 합이 8 이상이면 추가 피해 +2, 10 이상이면 +4. 단계 중복 안 됨.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-232: satisfy 'All-In succeeds; evaluate two consumed printed-number sum.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-232: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-233": {
    "augmentId": "aug-233",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "올인",
    "stage": 2,
    "name": "보험 배팅",
    "sourceIntent": "올인이 중복/무효로 실패했을 때 후속 페널티 일부 완화.",
    "sourceValueV01": "올인 실패 시 다음 턴 드로우 패널티 제거.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 234,
        "number": 233,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 2,
        "direction": "미래 자원 차입/한방",
        "reviewTag": "판정순서",
        "reviewPriority": "낮음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "POST_COLLISION",
      "ON_DRAW"
    ],
    "timingPhase": "POST_COLLISION",
    "condition": "올인 실패 시 다음 턴 드로우 패널티 제거",
    "effectType": "DRAW_CARD",
    "effectValue": {
      "text": "올인 실패 시 다음 턴 드로우 패널티 제거.",
      "numericHints": []
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_233_draw_card",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_233_draw_card and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "올인 실패 시 다음 턴 드로우 패널티 제거. 전투당 1회.",
    "runtimePrimitivesRequired": [
      "DRAW_CARD",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-233: satisfy '올인 실패 시 다음 턴 드로우 패널티 제거' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-233: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-234": {
    "augmentId": "aug-234",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "올인",
    "stage": 2,
    "name": "낮은 패 블러핑",
    "sourceIntent": "낮은 카드 두 장으로 올인하면 합계는 낮지만 별도 보너스.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 235,
        "number": 234,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 3,
        "direction": "미래 자원 차입/한방",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": [
        {
          "decisionId": "Q18",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "All-In succeeds using two cards both <=3.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 1
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "최대 3스택",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "TURN_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "All-In succeeds using two cards both <=3.일 때 추가 피해 +1 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-234: satisfy 'All-In succeeds using two cards both <=3.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-234: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-235": {
    "augmentId": "aug-235",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "올인",
    "stage": 3,
    "name": "더블 다운",
    "sourceIntent": "올인 성공 직후 조건부로 다음 턴도 강화 승부 가능. 실패 페널티 증가.",
    "sourceValueV01": "올인 성공 후 다음 턴 올인 재사용 가능. 두 번째 올인은 추가 피해 +2, 실패 시 그 다음 턴 드로우 0장 대신 자동 랜덤 1장 제출.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 236,
        "number": 235,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "미래 자원 차입/한방",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID",
      "ON_DRAW",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_VALID",
    "condition": "올인 성공 후 다음 턴 올인 재사용 가능",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "올인 성공 후 다음 턴 올인 재사용 가능. 두 번째 올인은 추가 피해 +2, 실패 시 그 다음 턴 드로우 0장 대신 자동 랜덤 1장 제출.",
      "numericHints": [
        2,
        0,
        1
      ]
    },
    "damageTaxonomy": "ADD",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "consumeRule": "NONE",
    "onceScope": "NONE",
    "resetScope": "TURN_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "올인 성공 후 다음 턴 올인 재사용 가능. 두 번째 올인은 추가 피해 +2, 실패 시 그 다음 턴 드로우 0장 대신 자동 랜덤 1장 제출. 연속 2회까지만.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "DRAW_CARD",
      "DELAY_EFFECT",
      "OVERRIDE_BASE_RULE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-235: satisfy '올인 성공 후 다음 턴 올인 재사용 가능' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-235: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-236": {
    "augmentId": "aug-236",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "올인",
    "stage": 3,
    "name": "빚내서 승부",
    "sourceIntent": "다음 드로우 카드 한 장의 가치를 미리 당겨 올인에 추가. 이후 실제 드로우 약화.",
    "sourceValueV01": "조건 충족 시 다음 드로우 보정 또는 예상 범위 적중 시 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 237,
        "number": 236,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 2,
        "direction": "미래 자원 차입/한방",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_DRAW",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_DRAW",
    "condition": "다음 드로우 카드 한 장의 가치를 미리 당겨 올인에 추가. 이후 실제 드로우 약화.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "조건 충족 시 다음 드로우 보정 또는 예상 범위 적중 시 추가 피해 +1.",
      "numericHints": [
        1
      ]
    },
    "damageTaxonomy": "ADD",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "조건 충족 시 다음 드로우 보정 또는 예상 범위 적중 시 추가 피해 +1. 턴당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "DRAW_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-236: satisfy '다음 드로우 카드 한 장의 가치를 미리 당겨 올인에 추가. 이후 실제 드로우 약화.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-236: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-237": {
    "augmentId": "aug-237",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "올인",
    "stage": 3,
    "name": "승자의 배당",
    "sourceIntent": "올인으로 큰 피해/처치 기여 시 이후 드로우 페널티를 빠르게 회복.",
    "sourceValueV01": "해당 회복 효과는 HP 1 회복.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 238,
        "number": 237,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 3,
        "direction": "미래 자원 차입/한방",
        "reviewTag": "HP/생존",
        "reviewPriority": "낮음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": [
        {
          "decisionId": "Q03",
          "selectedOption": "A",
          "selectionScope": "DIRECTION_ONLY_PENDING_BETA_V0_2"
        }
      ]
    },
    "trigger": [
      "ON_KILL",
      "ON_DRAW"
    ],
    "timingPhase": "ON_KILL",
    "condition": "After a successful All-In attack deals at least 8 actual damage.",
    "effectType": "MODIFY_DRAW_PENALTY",
    "effectValue": {
      "nextPenaltyTurnsDelta": -1,
      "minPenaltyTurns": 0
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_237_modify_draw_penalty",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "MAX_HP",
      "source": "GLOBAL_POLICY"
    },
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_237_modify_draw_penalty and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "해당 회복 효과는 HP 1 회복. 전투당 기본 1회; 전용 힐러 계통만 카드 설명의 별도 제한 적용.",
    "runtimePrimitivesRequired": [
      "HEAL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-237: satisfy 'After a successful All-In attack deals at least 8 actual damage.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-237: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-238": {
    "augmentId": "aug-238",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "올인",
    "stage": 4,
    "name": "전 재산",
    "sourceIntent": "현재 패뿐 아니라 축적 특수 카드/일부 미래 자원까지 한 번에 올인. 초대형 피해 후 긴 회복 구간.",
    "sourceValueV01": "현재 2장 + 보유 특수 카드 1장까지 소비. 판정 숫자는 지정 1장, 유효 시 세 카드 숫자 합 +4 피해.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 239,
        "number": 238,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 1,
        "direction": "미래 자원 차입/한방",
        "reviewTag": "HP/생존",
        "reviewPriority": "높음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": [
        {
          "decisionId": "Q18",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "Once/combat owner has two normal hand cards and at least one owned 6/7 special card; choose one judgment card.",
    "effectType": "ALL_IN_OVERRIDE",
    "effectValue": {
      "consumeCards": 3,
      "includeSpecialMax": 1,
      "damage": "SUM_OF_THREE_PLUS_4",
      "judgmentCardCount": 1,
      "nextDrawCount": 1,
      "nextDrawTurns": 2
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_238_all_in_override",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_238_all_in_override and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "현재 2장 + 보유 특수 카드 1장까지 소비. 판정 숫자는 지정 1장, 유효 시 세 카드 숫자 합 +4 피해. 전투당 1회; 다음 2턴 드로우 1장.",
    "runtimePrimitivesRequired": [
      "SPEND_RESOURCE",
      "MODIFY_NUMBER"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-238: satisfy 'Once/combat owner has two normal hand cards and at least one owned 6/7 special card; choose one judgment card.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-238: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-239": {
    "augmentId": "aug-239",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "올인",
    "stage": 4,
    "name": "연승 도박",
    "sourceIntent": "올인 연속 성공 시 배당이 기하급수적으로 증가. 실패 시 누적 보너스 상실.",
    "sourceValueV01": "조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 240,
        "number": 239,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 2,
        "direction": "미래 자원 차입/한방",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "올인 연속 성공 시 배당이 기하급수적으로 증가. 실패 시 누적 보너스 상실.",
    "effectType": "ADD_STACK",
    "effectValue": {
      "text": "조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당.",
      "numericHints": [
        1,
        1,
        4,
        1,
        1
      ]
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_239_add_stack",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to [object Object]; derived effects do not recursively retrigger.",
    "stackCap": {
      "text": "최대 4",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "NONE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_239_add_stack and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당. 전투 종료 시 초기화; 별도 유지 카드 제외.",
    "runtimePrimitivesRequired": [
      "ADD_STACK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-239: satisfy '올인 연속 성공 시 배당이 기하급수적으로 증가. 실패 시 누적 보너스 상실.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-239: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-240": {
    "augmentId": "aug-240",
    "characterId": "gambler",
    "classDisplay": "Gambler",
    "runtimeBatch": "005C-C",
    "archetype": "올인",
    "stage": 4,
    "name": "하우스를 이겨라",
    "sourceIntent": "전투당 1회 극단적 올인 선언. 성공 시 큰 보너스, 실패 시 강한 후유증.",
    "sourceValueV01": "올인 선언 시 유효 성공하면 추가 피해 +8, 실패하면 HP1 감소 및 다음 턴 드로우 1장.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 241,
        "number": 240,
        "className": "도박사",
        "baseCardPool": "연속 덱: 1~5 각 2장 + 6 한 장",
        "option": 3,
        "direction": "미래 자원 차입/한방",
        "reviewTag": "일반",
        "reviewPriority": "낮음",
        "implementationDifficulty": "높음",
        "sourceStatus": "기획안 완료 / 수치 미정",
        "betaStatus": "BETA v0.1"
      },
      "sourcePrecedence": [
        "USER_CONFIRMED_005Q_DECISIONS",
        "005Q_DESIGN_OVERLAYS",
        "005R_RESOLVED_CONTRACT",
        "BETA_V0.1_SOURCE",
        "CANONICAL_CLASS_MECHANICS",
        "EXISTING_RUNTIME_REFERENCE_ONLY"
      ],
      "valueSource": "BETA_V02_INFERRED",
      "decisions": []
    },
    "trigger": [
      "ON_VALID",
      "ON_DRAW",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_VALID",
    "condition": "올인 선언 시 유효 성공하면 추가 피해 +8, 실패하면 HP1 감소 및 다음 턴 드로우 1장",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "올인 선언 시 유효 성공하면 추가 피해 +8, 실패하면 HP1 감소 및 다음 턴 드로우 1장.",
      "numericHints": [
        8,
        1,
        1
      ]
    },
    "damageTaxonomy": "ADD",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "NONE",
      "source": "GLOBAL_POLICY"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "orderingBefore": "DAMAGE_APPLY_OR_TURN_END_AS_APPLICABLE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Use DECK/HAND/DISCARD/VANISHED adapters, not standard SPENT recovery."
    ],
    "tooltipBetaV02": "올인 선언 시 유효 성공하면 추가 피해 +8, 실패하면 HP1 감소 및 다음 턴 드로우 1장. 전투당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "DRAW_CARD",
      "DELAY_EFFECT",
      "DAMAGE_SELF"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-240: satisfy '올인 선언 시 유효 성공하면 추가 피해 +8, 실패하면 HP1 감소 및 다음 턴 드로우 1장' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-240: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  }
});
export const GAMBLER_CONTRACT_IDS=Object.freeze(Object.keys(GAMBLER_CONTRACTS));
