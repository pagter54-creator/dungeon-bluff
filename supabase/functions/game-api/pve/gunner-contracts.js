// Immutable DESIGN-C projection plus explicit USER_CONFIRMED_005C_D_PATCH execution overlays.
export const GUNNER_CONTRACTS=Object.freeze({
  "aug-241": {
    "augmentId": "aug-241",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "전탄 난사",
    "stage": 1,
    "name": "전탄 난사",
    "sourceIntent": "사이클 카드 수 3→4(잠정 1/2/2/3). 전탄발사 시 더 많은 잔탄을 쏟아붓는 탄창 확장형.",
    "sourceValueV01": "사이클 카드풀을 1/2/2/3의 4장으로 변경. 전탄발사 성공 시 기존처럼 남은 카드 전부 추가 사용.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 242,
        "number": 241,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "탄창 확장/전탄",
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
      "decisions": []
    },
    "trigger": [
      "ON_ACQUIRE",
      "ON_SKILL_USE",
      "ON_VALID"
    ],
    "timingPhase": "ON_ACQUIRE",
    "condition": "While owned use 1/2/2/3 four-card cycle; on valid Full Burst use remaining cards",
    "effectType": "BASE_RULE_OVERRIDE",
    "effectValue": {
      "magazine": [
        1,
        2,
        2,
        3
      ],
      "size": 4
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "gunner_magazine",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Full Burst success consumes selected plus every remaining magazine card; preserve physical IDs.",
    "onceScope": "NONE",
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
    "reconnectRule": "Persist aug_241_modify_deck and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "사이클 카드풀을 1/2/2/3의 4장으로 변경. 전탄발사 성공 시 기존처럼 남은 카드 전부 추가 사용. 전탄발사 기본 재사용 규칙은 유지.",
    "runtimePrimitivesRequired": [
      "BASE_RULE_OVERRIDE",
      "MAGAZINE_ADAPTER",
      "FULL_BURST"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-241: satisfy 'While owned use 1/2/2/3 four-card cycle; on valid Full Burst use remaining cards' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-241: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": [
        "same rootActionId retry idempotent",
        "reconnect before/after trigger preserves state",
        "room/collision ordering",
        "no recursive derived trigger"
      ]
    },
    "existingRuntimeComparison": "MATCH_REFERENCE_ONLY",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-242": {
    "augmentId": "aug-242",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "전탄 난사",
    "stage": 2,
    "name": "대용량 탄창",
    "sourceIntent": "추가된 네 번째 카드의 전탄발사 기여도 강화.",
    "sourceValueV01": "전탄발사로 추가 사용되는 잔탄 각각의 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 243,
        "number": 242,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "탄창 확장/전탄",
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
      "ON_SKILL_USE"
    ],
    "timingPhase": "ON_SKILL_USE",
    "condition": "Full Burst succeeds; per remaining magazine card additionally used.",
    "effectType": "EXTRA_DAMAGE_COMPONENT",
    "effectValue": {
      "bonusPerExtraCard": 1,
      "cap": 3
    },
    "damageTaxonomy": "EXTRA_DAMAGE_COMPONENT",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_BURST",
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "전탄발사로 추가 사용되는 잔탄 각각의 피해 +1. 전탄발사 1회당 최대 +3.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "MODIFY_FULL_BURST"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-242: satisfy 'Full Burst succeeds; per remaining magazine card additionally used.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-242: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-243": {
    "augmentId": "aug-243",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "전탄 난사",
    "stage": 2,
    "name": "급속 장전",
    "sourceIntent": "전탄발사 성공 후 새 사이클 첫 유효 공격 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 244,
        "number": 243,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 2,
        "direction": "탄창 확장/전탄",
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
    "condition": "Full Burst가 성공해 새 사이클에 진입한 뒤 그 사이클의 첫 유효 공격이다.",
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "전탄발사 성공으로 새 사이클에 진입하면 그 사이클의 첫 유효 공격 피해가 1 증가합니다.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-243: satisfy '전탄발사 성공 후 새 사이클 첫 유효 공격 강화.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-243: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-244": {
    "augmentId": "aug-244",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "전탄 난사",
    "stage": 2,
    "name": "화약 증량",
    "sourceIntent": "전탄발사로 추가 소모되는 잔탄 수가 많을수록 보너스 피해 증가.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 245,
        "number": 244,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 3,
        "direction": "탄창 확장/전탄",
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
          "decisionId": "Q19",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Full Burst succeeds with at least 2 remaining magazine cards additionally used.",
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
    "onceScope": "ONCE_PER_BURST",
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "Full Burst succeeds with at least 2 remaining magazine cards additionally used.일 때 추가 피해 +1 효과를 적용합니다. 제한: ONCE_PER_BURST.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-244: satisfy 'Full Burst succeeds with at least 2 remaining magazine cards additionally used.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-244: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-245": {
    "augmentId": "aug-245",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "전탄 난사",
    "stage": 3,
    "name": "탄띠 급탄",
    "sourceIntent": "전탄발사 성공 후 새 사이클 일부 탄환에 일시 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 246,
        "number": 245,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "탄창 확장/전탄",
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
          "decisionId": "Q19",
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
    "condition": "After Full Burst succeeds, first valid attack of newly entered cycle.",
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "After Full Burst succeeds, first valid attack of newly entered cycle.일 때 추가 피해 +1 효과를 적용합니다. 제한: ONCE_PER_CYCLE.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-245: satisfy 'After Full Burst succeeds, first valid attack of newly entered cycle.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-245: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-246": {
    "augmentId": "aug-246",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "전탄 난사",
    "stage": 3,
    "name": "완전 연소",
    "sourceIntent": "손에 카드가 많이 남은 상태에서 전탄발사 성공 시 잔탄 효율 크게 증가.",
    "sourceValueV01": "잔탄 3장 상태에서 전탄발사 성공 시 추가 피해 +4.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 247,
        "number": 246,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 2,
        "direction": "탄창 확장/전탄",
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
    "condition": "잔탄 3장 상태에서 전탄발사 성공 시 추가 피해 +4",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "잔탄 3장 상태에서 전탄발사 성공 시 추가 피해 +4.",
      "numericHints": [
        3,
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "잔탄 3장 상태에서 전탄발사 성공 시 추가 피해 +4. 사이클당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "MODIFY_FULL_BURST"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-246: satisfy '잔탄 3장 상태에서 전탄발사 성공 시 추가 피해 +4' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-246: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-247": {
    "augmentId": "aug-247",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "전탄 난사",
    "stage": 3,
    "name": "마지막 한 발까지",
    "sourceIntent": "카드가 거의 남지 않은 상태에서 전탄발사하면 선택 카드 자체를 크게 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +3.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 248,
        "number": 247,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 3,
        "direction": "탄창 확장/전탄",
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
          "decisionId": "Q19",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Full Burst activated when exactly 1 other magazine card remains, and activation card succeeds.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 3,
      "target": "SELECTED_CARD_HIT"
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
    "onceScope": "ONCE_PER_BURST",
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "Full Burst activated when exactly 1 other magazine card remains, and activation card succeeds.일 때 추가 피해 +3 효과를 적용합니다. 제한: ONCE_PER_BURST.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-247: satisfy 'Full Burst activated when exactly 1 other magazine card remains, and activation card succeeds.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-247: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-248": {
    "augmentId": "aug-248",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "전탄 난사",
    "stage": 4,
    "name": "탄막 지배",
    "sourceIntent": "잔탄이 많은 전탄발사를 크게 강화하고 일정 수 이상이면 추가 포격.",
    "sourceValueV01": "잔탄 3장 상태의 전탄발사 성공 시 추가 포격 피해 5.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 249,
        "number": 248,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "탄창 확장/전탄",
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
      "FULL_BURST_REMAINING_CARD_RESOLVED"
    ],
    "timingPhase": "FULL_BURST_REMAINING_CARD_RESOLUTION",
    "condition": "Combat: activation selected card final VALID, exactly 3 other magazine cards at Burst activation; after remaining-card damage, before cycle advance.",
    "effectType": "ADD_EXTRA_DAMAGE_COMPONENT",
    "effectValue": {
      "damage": 5,
      "source": "aug-248",
      "attachTo": "FULL_BURST_ROOT_ACTION",
      "createsSeparateHit": false,
      "retriggerOnHit": false
    },
    "damageTaxonomy": "EXTRA_DAMAGE_COMPONENT",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
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
    "orderingBefore": "CYCLE_ADVANCE",
    "orderingAfter": "FULL_BURST_REMAINING_CARD_RESOLUTION",
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "잔탄 3장 상태의 전탄발사 성공 시 추가 포격 피해 5. 사이클당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_EXTRA_DAMAGE_COMPONENT",
      "ROOT_ACTION_GUARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-248: satisfy '잔탄 3장 상태의 전탄발사 성공 시 추가 포격 피해 5' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-248: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false,
    "executionRuleSource": "USER_CONFIRMED_005C_D_PATCH",
    "ordering": [
      "FULL_BURST_REMAINING_CARD_RESOLUTION",
      "AUG_248_EXTRA_BARRAGE",
      "CYCLE_ADVANCE"
    ]
  },
  "aug-249": {
    "augmentId": "aug-249",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "전탄 난사",
    "stage": 4,
    "name": "전쟁 기계",
    "sourceIntent": "전탄발사 성공→새 사이클 첫 공격→다음 전탄발사로 이어지는 장기 화력 엔진 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +3.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 250,
        "number": 249,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 2,
        "direction": "탄창 확장/전탄",
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
          "decisionId": "Q19",
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
    "condition": "After successful Full Burst, first valid new-cycle attack succeeds; arm next Full Burst bonus.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 3,
      "target": "NEXT_FULL_BURST_SELECTED_HIT"
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "After successful Full Burst, first valid new-cycle attack succeeds; arm next Full Burst bonus.일 때 추가 피해 +3 효과를 적용합니다. 제한: ONCE_PER_CYCLE.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-249: satisfy 'After successful Full Burst, first valid new-cycle attack succeeds; arm next Full Burst bonus.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-249: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-250": {
    "augmentId": "aug-250",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "전탄 난사",
    "stage": 4,
    "name": "최후통첩",
    "sourceIntent": "사이클 마지막 카드에서 발동하는 전탄발사가 강력한 특수 사격으로 변화.",
    "sourceValueV01": "사이클 마지막 카드에서 전탄발사를 사용하면 잔탄 없이도 특수 사격 추가 피해 +5, 성공 후 즉시 새 사이클.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 251,
        "number": 250,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 3,
        "direction": "탄창 확장/전탄",
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
      "ON_SKILL_USE",
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_SKILL_USE",
    "condition": "사이클 마지막 카드에서 전탄발사를 사용하면 잔탄 없이도 특수 사격 추가 피해 +5, 성공 후 즉시 새 사이클",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "사이클 마지막 카드에서 전탄발사를 사용하면 잔탄 없이도 특수 사격 추가 피해 +5, 성공 후 즉시 새 사이클.",
      "numericHints": [
        5
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "사이클 마지막 카드에서 전탄발사를 사용하면 잔탄 없이도 특수 사격 추가 피해 +5, 성공 후 즉시 새 사이클. 사이클당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "MODIFY_FULL_BURST"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-250: satisfy '사이클 마지막 카드에서 전탄발사를 사용하면 잔탄 없이도 특수 사격 추가 피해 +5, 성공 후 즉시 새 사이클' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-250: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-251": {
    "augmentId": "aug-251",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "정밀 사수",
    "stage": 1,
    "name": "정밀 사수",
    "sourceIntent": "Precision Shot Stage1 uses a boolean runtime-checkable precision predicate; no abstract aim placeholder.",
    "sourceValueV01": "전탄발사를 정밀 조준으로 교체. 사이클 내 이미 소비한 카드 수가 0/1/2일 때 현재 유효 공격 추가 피해 +0/+1/+3.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 252,
        "number": 251,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "단발/사이클 후반 저격",
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
      "decisions": []
    },
    "trigger": [
      "ON_ACQUIRE",
      "ON_SKILL_USE",
      "ON_VALID"
    ],
    "timingPhase": "ON_ACQUIRE",
    "condition": "Replace Full Burst with Precision Shot; scale current valid attack by already spent cycle cards",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "전탄발사를 정밀 조준으로 교체. 사이클 내 이미 소비한 카드 수가 0/1/2일 때 현재 유효 공격 추가 피해 +0/+1/+3.",
      "numericHints": [
        0,
        1,
        2,
        0,
        1,
        3
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "전탄발사를 정밀 조준으로 교체. 사이클 내 이미 소비한 카드 수가 0/1/2일 때 현재 유효 공격 추가 피해 +0/+1/+3. 남은 카드는 추가 소비하지 않음.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "SPEND_RESOURCE",
      "MODIFY_FULL_BURST",
      "OVERRIDE_BASE_RULE",
      "PRECISION_SHOT_PREDICATE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-251: satisfy 'Replace Full Burst with Precision Shot; scale current valid attack by already spent cycle cards' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-251: fail one condition/room/scope predicate and assert no effect or consumption.",
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
  "aug-252": {
    "augmentId": "aug-252",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "정밀 사수",
    "stage": 2,
    "name": "영점 조정",
    "sourceIntent": "사이클 첫 유효 공격이 적을 조준해 이후 정밀 사격 효과 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 253,
        "number": 252,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "단발/사이클 후반 저격",
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
    "condition": "현재 사이클의 첫 유효 공격이 성공해 precision setup을 획득한 뒤, 그 사이클의 다음 Precision Shot이 유효하다.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 1,
      "requiresState": "precisionSetup"
    },
    "damageTaxonomy": "ADD",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "최대 3스택",
      "source": "BETA_VALUE_OR_LIMIT"
    },
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "사이클의 첫 유효 공격에 성공하면 조준을 잡습니다. 그 사이클의 다음 정밀 사격 피해가 1 증가합니다.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-252: satisfy '사이클 첫 유효 공격이 적을 조준해 이후 정밀 사격 효과 강화.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-252: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-253": {
    "augmentId": "aug-253",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "정밀 사수",
    "stage": 2,
    "name": "침착한 호흡",
    "sourceIntent": "사이클 후반 카드일수록 중복 실패에 따른 정밀 조준 손실 완화.",
    "sourceValueV01": "다음 직접 피해 1 감소.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 254,
        "number": 253,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 2,
        "direction": "단발/사이클 후반 저격",
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
          "decisionId": "Q02",
          "selectedOption": "A",
          "selectionScope": "DIRECTION_ONLY_PENDING_BETA_V0_2"
        }
      ]
    },
    "trigger": [
      "POST_COLLISION"
    ],
    "timingPhase": "POST_COLLISION",
    "condition": "If Precision Shot state would be lost because the activation card collides.",
    "effectType": "PRESERVE_PRECISION_SHOT_ACTIVATION",
    "effectValue": {
      "status": "precisionShot",
      "preserveUses": 1
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_253_preserve_status",
    "stateType": "STATUS",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Prevent one collision-caused activation consumption; preserved activation expires at CYCLE_END.",
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
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_253_preserve_status and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "정밀 사격 활성화 카드가 충돌하면 사용권을 한 번 보존합니다. 같은 사이클에서만 재사용 가능하며 전투당 1회입니다.",
    "runtimePrimitivesRequired": [
      "PRESERVE_PRECISION_SHOT_ACTIVATION",
      "ROOT_ACTION_GUARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-253: satisfy 'If Precision Shot state would be lost because the activation card collides.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-253: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false,
    "executionRuleSource": "USER_CONFIRMED_005C_D_PATCH",
    "secondaryExpiry": "CYCLE_END"
  },
  "aug-254": {
    "augmentId": "aug-254",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "정밀 사수",
    "stage": 2,
    "name": "대구경 탄환",
    "sourceIntent": "마지막 카드의 정밀 조준 피해 크게 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +2.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 255,
        "number": 254,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 3,
        "direction": "단발/사이클 후반 저격",
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
          "decisionId": "Q19",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Current selected card is last remaining magazine card and resolves valid under Precision Shot.",
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "Current selected card is last remaining magazine card and resolves valid under Precision Shot.일 때 추가 피해 +2 효과를 적용합니다. 제한: ONCE_PER_CYCLE.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-254: satisfy 'Current selected card is last remaining magazine card and resolves valid under Precision Shot.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-254: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-255": {
    "augmentId": "aug-255",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "정밀 사수",
    "stage": 3,
    "name": "탄도 계산",
    "sourceIntent": "직전 카드와 현재 카드 숫자 차이가 클수록 정밀 사격 보너스 증가.",
    "sourceValueV01": "조건 달성 시 추가 피해 +2.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 256,
        "number": 255,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "단발/사이클 후반 저격",
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
          "decisionId": "Q19",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Precision Shot valid and abs(previous FINAL_NUMBER-current FINAL_NUMBER)>=2.",
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
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "Precision Shot valid and abs(previous FINAL_NUMBER-current FINAL_NUMBER)>=2.일 때 추가 피해 +2 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-255: satisfy 'Precision Shot valid and abs(previous FINAL_NUMBER-current FINAL_NUMBER)>=2.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-255: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-256": {
    "augmentId": "aug-256",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "정밀 사수",
    "stage": 3,
    "name": "약점 포착",
    "sourceIntent": "같은 적에게 정밀 사격 반복 성공 시 약점 누적으로 이후 저격 강화.",
    "sourceValueV01": "조건 1회당 스택 +1(최대 3); 스택 1당 관련 효과 +1 피해 상당.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 257,
        "number": 256,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 2,
        "direction": "단발/사이클 후반 저격",
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
    "condition": "같은 적에게 정밀 사격 반복 성공 시 약점 누적으로 이후 저격 강화.",
    "effectType": "ADD_STACK",
    "effectValue": {
      "text": "조건 1회당 스택 +1(최대 3); 스택 1당 관련 효과 +1 피해 상당.",
      "numericHints": [
        1,
        1,
        3,
        1,
        1
      ]
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_256_add_stack",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to [object Object]; derived effects do not recursively retrigger.",
    "stackCap": {
      "text": "최대 3",
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
    "reconnectRule": "Persist aug_256_add_stack and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "조건 1회당 스택 +1(최대 3); 스택 1당 관련 효과 +1 피해 상당. 전투 종료 시 초기화; 별도 유지 카드 제외.",
    "runtimePrimitivesRequired": [
      "ADD_STACK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-256: satisfy '같은 적에게 정밀 사격 반복 성공 시 약점 누적으로 이후 저격 강화.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-256: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-257": {
    "augmentId": "aug-257",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "정밀 사수",
    "stage": 3,
    "name": "관통탄",
    "sourceIntent": "충분히 준비된 마지막 한 발이 적 방어·피해 감소 일부를 무시.",
    "sourceValueV01": "다음 직접 피해 1 감소.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 258,
        "number": 257,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 3,
        "direction": "단발/사이클 후반 저격",
        "reviewTag": "보스기믹",
        "reviewPriority": "중간",
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
          "decisionId": "Q01",
          "selectedOption": "A",
          "selectionScope": "DIRECTION_ONLY_PENDING_BETA_V0_2"
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "A Precision Shot attack is valid in Combat.",
    "effectType": "ENEMY_DEFENSE_PENETRATION",
    "effectValue": {
      "ignoreDefense": 1
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
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
    "orderingBefore": "DOWN_RESOLVE",
    "orderingAfter": "TRIGGER_SOURCE_EVENT",
    "visibility": "PUBLIC",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "전투에서 유효한 정밀 사격은 적 방어를 1 관통합니다. 턴당 1회.",
    "runtimePrimitivesRequired": [
      "MODIFY_INCOMING_DAMAGE",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-257: satisfy 'A Precision Shot attack is valid in Combat.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-257: fail one condition/room/scope predicate and assert no effect or consumption.",
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
  "aug-258": {
    "augmentId": "aug-258",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "정밀 사수",
    "stage": 4,
    "name": "데드아이",
    "sourceIntent": "마지막 카드 정밀 사격 대폭 강화. 조준이 충분하면 강력한 추가 피해.",
    "sourceValueV01": "사이클 마지막 카드 정밀 조준 추가 피해를 기본 +3 대신 +6으로 변경.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 259,
        "number": 258,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "단발/사이클 후반 저격",
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
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Last magazine card resolves valid under Precision Shot; if aim active add rider.",
    "effectType": "SET_DAMAGE_BONUS",
    "effectValue": {
      "precisionBonusFrom": 3,
      "precisionBonusTo": 6,
      "aimExtraDamage": 2
    },
    "damageTaxonomy": "SET",
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
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "사이클 마지막 카드 정밀 조준 추가 피해를 기본 +3 대신 +6으로 변경. 조준 상태면 추가 +2.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "MODIFY_FULL_BURST",
      "OVERRIDE_BASE_RULE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-258: satisfy 'Last magazine card resolves valid under Precision Shot; if aim active add rider.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-258: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-259": {
    "augmentId": "aug-259",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "정밀 사수",
    "stage": 4,
    "name": "백발백중",
    "sourceIntent": "정밀 사격 연속 성공 시 조준 보너스 누적. 중복 실패 1회 정도는 일부 보존.",
    "sourceValueV01": "조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 260,
        "number": 259,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 2,
        "direction": "단발/사이클 후반 저격",
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
          "decisionId": "Q19",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "POST_COLLISION",
      "ON_VALID"
    ],
    "timingPhase": "POST_COLLISION",
    "condition": "Precision Shot valid: +1 accuracy. First collision reduces accuracy by1 instead of clearing; second collision before next valid clears.",
    "effectType": "ADD_STACK",
    "effectValue": {
      "state": "accuracy",
      "amount": 1,
      "cap": 4,
      "bonusDamagePerStack": 1,
      "softFailPreserve": 1
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_259_add_stack",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to 4; derived effects do not recursively retrigger.",
    "stackCap": 4,
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
    "reconnectRule": "Persist aug_259_add_stack and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당. 전투 종료 시 초기화; 별도 유지 카드 제외.",
    "runtimePrimitivesRequired": [
      "ADD_STACK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-259: satisfy 'Precision Shot valid: +1 accuracy. First collision reduces accuracy by1 instead of clearing; second collision before next valid clears.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-259: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-260": {
    "augmentId": "aug-260",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "정밀 사수",
    "stage": 4,
    "name": "사형 선고",
    "sourceIntent": "약점이 충분한 적에게 마지막 탄환 적중 시 강력한 처형 보너스.",
    "sourceValueV01": "약점 3중첩 적에게 마지막 카드 정밀 사격 성공 시 추가 피해 +7, 약점 전부 소모.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 261,
        "number": 260,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 3,
        "direction": "단발/사이클 후반 저격",
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
    "condition": "약점 3중첩 적에게 마지막 카드 정밀 사격 성공 시 추가 피해 +7, 약점 전부 소모",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "약점 3중첩 적에게 마지막 카드 정밀 사격 성공 시 추가 피해 +7, 약점 전부 소모.",
      "numericHints": [
        3,
        7
      ]
    },
    "damageTaxonomy": "ADD",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "DEFAULT_STACK_CAP=3",
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
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "약점 3중첩 적에게 마지막 카드 정밀 사격 성공 시 추가 피해 +7, 약점 전부 소모. 전투당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "SPEND_RESOURCE",
      "ADD_STACK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-260: satisfy '약점 3중첩 적에게 마지막 카드 정밀 사격 성공 시 추가 피해 +7, 약점 전부 소모' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-260: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-261": {
    "augmentId": "aug-261",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "과열 기관",
    "stage": 1,
    "name": "과열 기관",
    "sourceIntent": "전탄발사 재사용 제약을 크게 완화. 사용할 때마다 과열 +1, 실패 시 과열 추가 상승. 미사용 턴에 냉각.",
    "sourceValueV01": "전탄발사를 매 사이클 1회 사용 가능. 사용 시 과열 +1, 중복 실패 시 추가 +1. 전탄발사 미사용 턴 종료 시 과열 -1. 과열 3이면 다음 턴 전탄발사 사용 불가 후 과열 1로 감소.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 262,
        "number": 261,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "과열/연속 전탄",
        "reviewTag": "전용상태",
        "reviewPriority": "낮음",
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
      "valueSource": "SOURCE_EXPLICIT_OR_005R_RESOLVED",
      "decisions": []
    },
    "trigger": [
      "ON_SKILL_USE",
      "POST_COLLISION",
      "TURN_END"
    ],
    "timingPhase": "ON_SKILL_USE",
    "condition": "Full Burst use adds Heat; collision failure adds another; unused turn cools; at Heat 3 block next turn then set to 1",
    "effectType": "ADD_STACK",
    "effectValue": {
      "resource": "overheat",
      "gain": "source-declared heat event",
      "cap": 3
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "gunner_overheat",
    "stateType": "INTEGER",
    "stackRule": "Overheat 0..3; clamp at3; same Full Burst triggers only explicitly declared heat event once unless card says per-extra-card.",
    "stackCap": 3,
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_CYCLE",
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
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_261_gain_resource and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "전탄발사를 매 사이클 1회 사용 가능. 사용 시 과열 +1, 중복 실패 시 추가 +1. 전탄발사 미사용 턴 종료 시 과열 -1. 과열 3이면 다음 턴 전탄발사 사용 불가 후 과열 1로 감소. 과열 범위 0~3.",
    "runtimePrimitivesRequired": [
      "ADD_STACK",
      "OVERHEAT_ADAPTER",
      "FULL_BURST_ORDERING"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-261: satisfy 'Full Burst use adds Heat; collision failure adds another; unused turn cools; at Heat 3 block next turn then set to 1' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-261: fail one condition/room/scope predicate and assert no effect or consumption.",
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
  "aug-262": {
    "augmentId": "aug-262",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "과열 기관",
    "stage": 2,
    "name": "고압 기관",
    "sourceIntent": "과열이 있는 동안 전탄발사 피해 증가.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 263,
        "number": 262,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "과열/연속 전탄",
        "reviewTag": "전용상태",
        "reviewPriority": "낮음",
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
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Overheat가 1 이상인 상태에서 Full Burst의 선택 카드가 유효하다.",
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
    "onceScope": "ONCE_PER_BURST",
    "resetScope": "CYCLE_END",
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
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "과열이 1 이상인 상태에서 전탄발사가 성공하면 선택 카드 공격 피해가 1 증가합니다.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-262: satisfy '과열이 있는 동안 전탄발사 피해 증가.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-262: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-263": {
    "augmentId": "aug-263",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "과열 기관",
    "stage": 2,
    "name": "냉각핀",
    "sourceIntent": "전탄발사를 사용하지 않은 턴의 과열 감소량 증가.",
    "sourceValueV01": "전탄발사를 사용하지 않은 턴 종료 시 과열 -2.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 264,
        "number": 263,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 2,
        "direction": "과열/연속 전탄",
        "reviewTag": "전용상태",
        "reviewPriority": "낮음",
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
      "TURN_END",
      "ON_SKILL_USE"
    ],
    "timingPhase": "TURN_END",
    "condition": "전탄발사를 사용하지 않은 턴 종료 시 과열 -2",
    "effectType": "MODIFY_FULL_BURST",
    "effectValue": {
      "text": "전탄발사를 사용하지 않은 턴 종료 시 과열 -2.",
      "numericHints": [
        -2
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
    "visibility": "PUBLIC",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "전탄발사를 사용하지 않은 턴 종료 시 과열 -2. 최소 0.",
    "runtimePrimitivesRequired": [
      "MODIFY_FULL_BURST"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-263: satisfy '전탄발사를 사용하지 않은 턴 종료 시 과열 -2' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-263: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-264": {
    "augmentId": "aug-264",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "과열 기관",
    "stage": 2,
    "name": "붉은 배기관",
    "sourceIntent": "높은 과열에서 전탄발사 성공 시 추가 보너스.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 265,
        "number": 264,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 3,
        "direction": "과열/연속 전탄",
        "reviewTag": "전용상태",
        "reviewPriority": "낮음",
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
      "decisions": [
        {
          "decisionId": "Q19",
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
    "condition": "Full Burst succeeds while Overheat >=2 before burst resolution.",
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
    "onceScope": "ONCE_PER_BURST",
    "resetScope": "CYCLE_END",
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
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "Full Burst succeeds while Overheat >=2 before burst resolution.일 때 추가 피해 +1 효과를 적용합니다. 제한: ONCE_PER_BURST.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-264: satisfy 'Full Burst succeeds while Overheat >=2 before burst resolution.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-264: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-265": {
    "augmentId": "aug-265",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "과열 기관",
    "stage": 3,
    "name": "임계 출력",
    "sourceIntent": "과열이 임계치 직전일 때 전탄발사 공격력 크게 증가.",
    "sourceValueV01": "조건 달성 시 추가 피해 +3.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 266,
        "number": 265,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "과열/연속 전탄",
        "reviewTag": "전용상태",
        "reviewPriority": "낮음",
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
      "decisions": [
        {
          "decisionId": "Q19",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Overheat==2 when Full Burst selected-card hit resolves valid.",
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
    "onceScope": "ONCE_PER_BURST",
    "resetScope": "CYCLE_END",
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
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "Overheat==2 when Full Burst selected-card hit resolves valid.일 때 추가 피해 +3 효과를 적용합니다. 제한: ONCE_PER_BURST.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-265: satisfy 'Overheat==2 when Full Burst selected-card hit resolves valid.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-265: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-266": {
    "augmentId": "aug-266",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "과열 기관",
    "stage": 3,
    "name": "폭주 실린더",
    "sourceIntent": "전탄발사 연속 성공 시 과열과 함께 출력 누적, 피해 상승. 실패 시 출력 크게 감소.",
    "sourceValueV01": "조건 1회당 스택 +1(최대 3); 스택 1당 관련 효과 +1 피해 상당.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 267,
        "number": 266,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 2,
        "direction": "과열/연속 전탄",
        "reviewTag": "전용상태",
        "reviewPriority": "낮음",
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
      "decisions": [
        {
          "decisionId": "Q19",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "Consecutive successful Full Burst +1 output; failed Full Burst -2 output min0.",
    "effectType": "ADD_STACK",
    "effectValue": {
      "state": "burstOutput",
      "amountOnSuccess": 1,
      "amountOnFailure": -2,
      "cap": 3,
      "bonusDamagePerStack": 1
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_266_add_stack",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to 3; derived effects do not recursively retrigger.",
    "stackCap": 3,
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
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_266_add_stack and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "조건 1회당 스택 +1(최대 3); 스택 1당 관련 효과 +1 피해 상당. 전투 종료 시 초기화; 별도 유지 카드 제외.",
    "runtimePrimitivesRequired": [
      "ADD_STACK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-266: satisfy 'Consecutive successful Full Burst +1 output; failed Full Burst -2 output min0.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-266: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-267": {
    "augmentId": "aug-267",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "과열 기관",
    "stage": 3,
    "name": "비상 냉각",
    "sourceIntent": "과열 상태 도달 시 전투당 제한적으로 즉시 일부 냉각하고 재사용 가능.",
    "sourceValueV01": "과열 3 도달 시 즉시 과열 1로 낮춤.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 268,
        "number": 267,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 3,
        "direction": "과열/연속 전탄",
        "reviewTag": "전용상태",
        "reviewPriority": "낮음",
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
      "decisions": [
        {
          "decisionId": "Q19",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "ON_SKILL_USE"
    ],
    "timingPhase": "ON_SKILL_USE",
    "condition": "After an action raises Overheat to3 for first eligible time this combat.",
    "effectType": "SET_RESOURCE",
    "effectValue": {
      "resource": "overheat",
      "value": 1
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_267_set_resource",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to declared cap; derived effects do not recursively retrigger.",
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
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_267_set_resource and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "과열 3 도달 시 즉시 과열 1로 낮춤. 전투당 1회.",
    "runtimePrimitivesRequired": [
      "SET_RESOURCE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-267: satisfy 'After an action raises Overheat to3 for first eligible time this combat.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-267: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-268": {
    "augmentId": "aug-268",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "과열 기관",
    "stage": 4,
    "name": "레드존",
    "sourceIntent": "임계 과열 유지 동안 전탄발사 크게 강화. 상한 초과 시 강제 냉각.",
    "sourceValueV01": "조건 달성 시 추가 피해 +4.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 269,
        "number": 268,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 1,
        "direction": "과열/연속 전탄",
        "reviewTag": "전용상태",
        "reviewPriority": "낮음",
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
      "decisions": [
        {
          "decisionId": "Q19",
          "selectedOption": null,
          "selectionScope": null
        }
      ]
    },
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Full Burst selected-card hit valid while Overheat==3.",
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
      "text": "최대 3스택",
      "source": "BETA_VALUE_OR_LIMIT"
    },
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_BURST",
    "resetScope": "CYCLE_END",
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
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "Full Burst selected-card hit valid while Overheat==3.일 때 추가 피해 +4 효과를 적용합니다. 제한: ONCE_PER_BURST.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-268: satisfy 'Full Burst selected-card hit valid while Overheat==3.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-268: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-269": {
    "augmentId": "aug-269",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "과열 기관",
    "stage": 4,
    "name": "멈추지 않는 포화",
    "sourceIntent": "전탄발사 연속 성공 시 다음 사이클에서도 즉시 활성화되고 출력 지속 상승.",
    "sourceValueV01": "전탄발사 성공 시 다음 사이클에도 즉시 전탄발사 사용 가능. 연속 성공마다 출력 +1(최대3), 출력 1당 전탄발사 추가 피해 +1.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 270,
        "number": 269,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 2,
        "direction": "과열/연속 전탄",
        "reviewTag": "전용상태",
        "reviewPriority": "낮음",
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
      "ON_SKILL_USE",
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_SKILL_USE",
    "condition": "전탄발사 성공 시 다음 사이클에도 즉시 전탄발사 사용 가능",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "전탄발사 성공 시 다음 사이클에도 즉시 전탄발사 사용 가능. 연속 성공마다 출력 +1(최대3), 출력 1당 전탄발사 추가 피해 +1.",
      "numericHints": [
        1,
        3,
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
      "text": "최대3",
      "source": "BETA_VALUE_OR_LIMIT"
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
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "전탄발사 성공 시 다음 사이클에도 즉시 전탄발사 사용 가능. 연속 성공마다 출력 +1(최대3), 출력 1당 전탄발사 추가 피해 +1. 실패 시 출력 0.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "MODIFY_FULL_BURST"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-269: satisfy '전탄발사 성공 시 다음 사이클에도 즉시 전탄발사 사용 가능' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-269: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  },
  "aug-270": {
    "augmentId": "aug-270",
    "characterId": "gunner",
    "classDisplay": "Gunslinger",
    "runtimeBatch": "005C-D",
    "archetype": "과열 기관",
    "stage": 4,
    "name": "기관 폭주",
    "sourceIntent": "전투당 제한적으로 과열 상한을 무시하고 강행. 성공 시 초고화력, 실패 시 큰 페널티.",
    "sourceValueV01": "과열 3에서도 전탄발사 강행 가능. 성공 시 추가 피해 +8, 실패 시 HP1 감소·과열3 유지.",
    "provenance": {
      "sourceWorkbook": {
        "workbook": "눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx",
        "sheet": "전체 증강",
        "row": 271,
        "number": 270,
        "className": "총잡이",
        "baseCardPool": "1/2/3 (3장 사이클)",
        "option": 3,
        "direction": "과열/연속 전탄",
        "reviewTag": "보스기믹 · 전용상태",
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
      "decisions": []
    },
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_VALID",
    "condition": "과열 3에서도 전탄발사 강행 가능",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "과열 3에서도 전탄발사 강행 가능. 성공 시 추가 피해 +8, 실패 시 HP1 감소·과열3 유지.",
      "numericHints": [
        3,
        8,
        1,
        3
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
    "visibility": "PUBLIC",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "interactionNotes": [
      "005B semantics immutable; insert only at declared phase.",
      "Full Burst derived card uses keep parent/root action linkage."
    ],
    "tooltipBetaV02": "과열 3에서도 전탄발사 강행 가능. 성공 시 추가 피해 +8, 실패 시 HP1 감소·과열3 유지. 전투당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "MODIFY_FULL_BURST"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-270: satisfy '과열 3에서도 전탄발사 강행 가능' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-270: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "existingRuntimeComparison": "NO_EXECUTABLE_RUNTIME_EXPECTED",
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": false
  }
});
export const GUNNER_CONTRACT_IDS=Object.freeze(Object.keys(GUNNER_CONTRACTS));
