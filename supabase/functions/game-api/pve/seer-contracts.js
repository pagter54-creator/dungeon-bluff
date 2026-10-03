// Generated runtime contract overlay from docs/PVE_CONTENT_005Q_DESIGN_C.json.
// DESIGN-C remains the immutable source of truth; this file is the executable mapping for 005C-A.
export const SEER_CONTRACTS=Object.freeze({
  "aug-151": {
    "augmentId": "aug-151",
    "name": "완전한 계시",
    "classId": "prophet",
    "archetype": "완전한 계시",
    "stage": 1,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "A physical card recovered by Revelation is used valid in Combat and refund unused this combat.",
    "effectType": "GAIN_RESOURCE",
    "effectValue": {
      "resource": "revelation",
      "amount": 1
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_151_refund_used",
    "stateType": "BOOLEAN",
    "stackRule": "Apply on declared trigger; clamp to declared cap; derived effects do not recursively retrigger.",
    "stackCap": "NOT_APPLICABLE",
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
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_151_gain_resource and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "계시로 복구한 카드를 유효하게 사용하면 전투당 1회 계시 1을 즉시 다시 획득. 즉시 재획득은 전투당 1회.",
    "runtimePrimitivesRequired": [
      "GAIN_RESOURCE",
      "RECOVERED_CARD_PROVENANCE",
      "BASE_RULE_OVERRIDE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-151: satisfy 'Valid use of a card recovered by Revelation' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-151: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": [
        "same rootActionId retry idempotent",
        "reconnect before/after trigger preserves state",
        "room/collision ordering",
        "no recursive derived trigger"
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "완전한 계시",
      "stage": 1
    }
  },
  "aug-152": {
    "augmentId": "aug-152",
    "name": "선명한 환영",
    "classId": "prophet",
    "archetype": "완전한 계시",
    "stage": 2,
    "trigger": [
      "ON_RECOVER_CARD"
    ],
    "condition": "계시 복구 시 무작위 사용 카드 2장을 후보로 제시하고 1장 선택",
    "effectType": "RECOVER_CARD_SELECTOR",
    "effectValue": {
      "text": "계시 복구 시 무작위 사용 카드 2장을 후보로 제시하고 1장 선택.",
      "numericHints": [
        2,
        1
      ]
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_152_recover_card_selector",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": "NONE",
    "resetScope": "NEVER_WITHIN_RUN",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_152_recover_card_selector and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "계시 복구 시 무작위 사용 카드 2장을 후보로 제시하고 1장 선택. 후보가 1장이면 그대로 복구.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD_SELECTOR"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-152: satisfy '계시 복구 시 무작위 사용 카드 2장을 후보로 제시하고 1장 선택' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-152: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "완전한 계시",
      "stage": 2
    }
  },
  "aug-153": {
    "augmentId": "aug-153",
    "name": "되풀이되는 미래",
    "classId": "prophet",
    "archetype": "완전한 계시",
    "stage": 2,
    "trigger": [
      "ON_VALID",
      "ON_RECOVER_CARD"
    ],
    "condition": "A card recovered by Revelation is later used successfully and no recovery has been granted by this augment in the current cycle.",
    "effectType": "RECOVER_CARD",
    "effectValue": {
      "count": 1,
      "zoneFrom": "SPENT",
      "zoneTo": "REMAINING"
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_153_recover_card",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Recover most-recent eligible own BASE card except the just-resolved card; preserve cardInstanceId.",
    "onceScope": "ONCE_PER_CYCLE",
    "resetScope": "CYCLE_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_153_recover_card and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "사용 카드 1장 복구. 기본 사이클당 1회; 특수/임시 카드는 복구 불가.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-153: satisfy 'A card recovered by Revelation is later used successfully and no recovery has been granted by this augment in the current cycle.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-153: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "완전한 계시",
      "stage": 2
    }
  },
  "aug-154": {
    "augmentId": "aug-154",
    "name": "별의 기억",
    "classId": "prophet",
    "archetype": "완전한 계시",
    "stage": 2,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "계시로 복구된 자신의 physical card가 전투에서 유효하게 사용된다.",
    "effectType": "MODIFY_EXP",
    "effectValue": {
      "exp": 1
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "계시로 복구한 자신의 카드를 전투에서 유효하게 사용하면 EXP를 1 얻습니다. 턴당 1회.",
    "runtimePrimitivesRequired": [
      "MODIFY_EXP"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-154: satisfy '복구한 카드의 유효 공격에 작은 추가 피해 또는 성장 보너스.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-154: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "완전한 계시",
      "stage": 2
    }
  },
  "aug-155": {
    "augmentId": "aug-155",
    "name": "두 번째 계시",
    "classId": "prophet",
    "archetype": "완전한 계시",
    "stage": 3,
    "trigger": [
      "ON_VALID",
      "ON_RECOVER_CARD"
    ],
    "condition": "계시 사용 후 복구한 카드를 2턴 이내 유효하게 사용하면 계시 1 재획득",
    "effectType": "GAIN_RESOURCE",
    "effectValue": {
      "text": "계시 사용 후 복구한 카드를 2턴 이내 유효하게 사용하면 계시 1 재획득.",
      "numericHints": [
        2,
        1
      ]
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_155_gain_resource",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to declared cap; derived effects do not recursively retrigger.",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_155_gain_resource and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "계시 사용 후 복구한 카드를 2턴 이내 유효하게 사용하면 계시 1 재획득. 전투당 1회.",
    "runtimePrimitivesRequired": [
      "GAIN_RESOURCE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-155: satisfy '계시 사용 후 복구한 카드를 2턴 이내 유효하게 사용하면 계시 1 재획득' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-155: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "완전한 계시",
      "stage": 3
    }
  },
  "aug-156": {
    "augmentId": "aug-156",
    "name": "미래의 잔상",
    "classId": "prophet",
    "archetype": "완전한 계시",
    "stage": 3,
    "trigger": [
      "ON_VALID",
      "ON_RECOVER_CARD",
      "PRE_DAMAGE"
    ],
    "condition": "복구한 카드가 유효 성공하면 다음 턴 첫 유효 공격 추가 피해 +1",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "복구한 카드가 유효 성공하면 다음 턴 첫 유효 공격 추가 피해 +1.",
      "numericHints": [
        1
      ]
    },
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "복구한 카드가 유효 성공하면 다음 턴 첫 유효 공격 추가 피해 +1. 1회 후 소멸.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-156: satisfy '복구한 카드가 유효 성공하면 다음 턴 첫 유효 공격 추가 피해 +1' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-156: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "완전한 계시",
      "stage": 3
    }
  },
  "aug-157": {
    "augmentId": "aug-157",
    "name": "운명의 반복",
    "classId": "prophet",
    "archetype": "완전한 계시",
    "stage": 3,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "The same printed number has been recovered by Revelation and used valid at least twice this combat.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 2
    },
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
    "resetScope": "COMBAT_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "The same printed number has been recovered by Revelation and used valid at least twice this combat.일 때 추가 피해 +2 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-157: satisfy 'The same printed number has been recovered by Revelation and used valid at least twice this combat.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-157: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "완전한 계시",
      "stage": 3
    }
  },
  "aug-158": {
    "augmentId": "aug-158",
    "name": "천개의 미래",
    "classId": "prophet",
    "archetype": "완전한 계시",
    "stage": 4,
    "trigger": [
      "ON_SKILL_USE"
    ],
    "condition": "계시 사용 시 자신의 사용 카드 중 1장을 직접 지정해 복구",
    "effectType": "RECOVER_CARD_SELECTOR",
    "effectValue": {
      "text": "계시 사용 시 자신의 사용 카드 중 1장을 직접 지정해 복구.",
      "numericHints": [
        1
      ]
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_158_recover_card_selector",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": "ONCE_PER_REVELATION_USE",
    "resetScope": "NEVER_WITHIN_RUN",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_158_recover_card_selector and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "계시 사용 시 자신의 사용 카드 중 1장을 직접 지정해 복구. 계시 1회당 1장.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD_SELECTOR"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-158: satisfy '계시 사용 시 자신의 사용 카드 중 1장을 직접 지정해 복구' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-158: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "완전한 계시",
      "stage": 4
    }
  },
  "aug-159": {
    "augmentId": "aug-159",
    "name": "끝없는 계시",
    "classId": "prophet",
    "archetype": "완전한 계시",
    "stage": 4,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "A Revelation-recovered own card is used valid and this turn began with at least 1 Revelation.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 4
    },
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
    "visibility": "PUBLIC",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "A Revelation-recovered own card is used valid and this turn began with at least 1 Revelation.일 때 추가 피해 +4 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-159: satisfy 'A Revelation-recovered own card is used valid and this turn began with at least 1 Revelation.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-159: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "완전한 계시",
      "stage": 4
    }
  },
  "aug-160": {
    "augmentId": "aug-160",
    "name": "이미 본 결말",
    "classId": "prophet",
    "archetype": "완전한 계시",
    "stage": 4,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "During a turn in which Revelation was activated, the selected/recovered own card resolves valid.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "amount": 3
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
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
    "visibility": "PUBLIC",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "사용 카드 2장 복구. 기본 사이클당 1회; 특수/임시 카드는 복구 불가.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-160: satisfy 'During a turn in which Revelation was activated, the selected/recovered own card resolves valid.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-160: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "완전한 계시",
      "stage": 4
    }
  },
  "aug-161": {
    "augmentId": "aug-161",
    "name": "운명 조작자",
    "classId": "prophet",
    "archetype": "운명 조작자",
    "stage": 1,
    "trigger": [
      "ON_SKILL_USE",
      "ON_RECOVER_CARD"
    ],
    "condition": "Spend 1 Revelation in SELECTION_OPEN and choose living ally with eligible BASE SPENT card; exclude TEMPORARY/TRANSFORMED/SPECIAL and selected/submitted.",
    "effectType": "RECOVER_CARD",
    "effectValue": {
      "count": 1,
      "zoneFrom": "SPENT",
      "zoneTo": "REMAINING",
      "selection": "MOST_RECENT_SPENT_THEN_LOWEST_CARD_ID"
    },
    "targetRule": "OWNER_SELECTS_ONE_LIVING_ALLY_BEFORE_CONFIRMED_SUBMIT",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_161_recover_card",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": {
      "perRevelation": "ONCE_PER_REVELATION_USE",
      "genericRecovery": "ONCE_PER_CYCLE"
    },
    "resetScope": "CYCLE_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_161_recover_card and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "계시 사용 시 아군 1명을 지정해 그 아군의 사용 카드 중 무작위 1장을 복구할 수 있음. 계시 1회당 카드 1장; 특수/임시 카드는 복구 불가.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD",
      "ALLY_RECOVERY_SELECTOR",
      "PHYSICAL_CARD_IDENTITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-161: satisfy 'Revelation spent with explicit ally target; random eligible spent base card of that ally' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-161: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": [
        "same rootActionId retry idempotent",
        "reconnect before/after trigger preserves state",
        "room/collision ordering",
        "no recursive derived trigger"
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "운명 조작자",
      "stage": 1
    }
  },
  "aug-162": {
    "augmentId": "aug-162",
    "name": "별빛 인도",
    "classId": "prophet",
    "archetype": "운명 조작자",
    "stage": 2,
    "trigger": [
      "ON_RECOVER_CARD"
    ],
    "condition": "When Fate Manipulator would recover an ally card and at least 2 eligible BASE SPENT cards exist.",
    "effectType": "RECOVER_CARD_SELECTOR",
    "effectValue": {
      "candidateCount": 2,
      "selectCount": 1
    },
    "targetRule": "EXPLICIT_ALLY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_162_recover_card_selector",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": "ONCE_PER_CYCLE",
    "resetScope": "CYCLE_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "OWNER_ONLY",
    "reconnectRule": "Persist aug_162_recover_card_selector and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "사용 카드 1장 복구. 기본 사이클당 1회; 특수/임시 카드는 복구 불가.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-162: satisfy 'When Fate Manipulator would recover an ally card and at least 2 eligible BASE SPENT cards exist.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-162: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "운명 조작자",
      "stage": 2
    }
  },
  "aug-163": {
    "augmentId": "aug-163",
    "name": "나누어진 운명",
    "classId": "prophet",
    "archetype": "운명 조작자",
    "stage": 2,
    "trigger": [
      "ON_RECOVER_CARD"
    ],
    "condition": "After Seer recovers an ally card, Seer has at least 1 eligible own BASE SPENT card.",
    "effectType": "RECOVER_CARD",
    "effectValue": {
      "count": 1,
      "zoneFrom": "SPENT",
      "zoneTo": "REMAINING"
    },
    "targetRule": "SOURCE_SPECIFIED_ALLY_OR_EARLIEST_SEAT_TIE",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_163_recover_card",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": "ONCE_PER_CYCLE",
    "resetScope": "CYCLE_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_163_recover_card and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "사용 카드 1장 복구. 기본 사이클당 1회; 특수/임시 카드는 복구 불가.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-163: satisfy 'After Seer recovers an ally card, Seer has at least 1 eligible own BASE SPENT card.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-163: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "운명 조작자",
      "stage": 2
    }
  },
  "aug-164": {
    "augmentId": "aug-164",
    "name": "축복받은 패",
    "classId": "prophet",
    "archetype": "운명 조작자",
    "stage": 2,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "An ally card recovered by the Seer is next used successfully in Combat.",
    "effectType": "DELAYED_ATTACK_BUFF",
    "effectValue": {
      "bonusDamage": 2,
      "uses": 1
    },
    "targetRule": "RECOVERED_ALLY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_164_delayed_attack_buff",
    "stateType": "STATUS",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": "NONE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_164_delayed_attack_buff and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "사용 카드 1장 복구. 기본 사이클당 1회; 특수/임시 카드는 복구 불가.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-164: satisfy 'An ally card recovered by the Seer is next used successfully in Combat.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-164: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "운명 조작자",
      "stage": 2
    }
  },
  "aug-165": {
    "augmentId": "aug-165",
    "name": "운명의 실",
    "classId": "prophet",
    "archetype": "운명 조작자",
    "stage": 3,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "예언가가 복구해준 아군 카드가 유효 성공하면 계시 1 재획득",
    "effectType": "GAIN_RESOURCE",
    "effectValue": {
      "text": "예언가가 복구해준 아군 카드가 유효 성공하면 계시 1 재획득.",
      "numericHints": [
        1
      ]
    },
    "targetRule": "SOURCE_SPECIFIED_ALLY_OR_EARLIEST_SEAT_TIE",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_165_gain_resource",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to declared cap; derived effects do not recursively retrigger.",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_COMBAT",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_165_gain_resource and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "예언가가 복구해준 아군 카드가 유효 성공하면 계시 1 재획득. 전투당 1회.",
    "runtimePrimitivesRequired": [
      "GAIN_RESOURCE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-165: satisfy '예언가가 복구해준 아군 카드가 유효 성공하면 계시 1 재획득' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-165: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "운명 조작자",
      "stage": 3
    }
  },
  "aug-166": {
    "augmentId": "aug-166",
    "name": "엇갈린 미래",
    "classId": "prophet",
    "archetype": "운명 조작자",
    "stage": 3,
    "trigger": [
      "POST_COLLISION"
    ],
    "condition": "An ally card recovered by the Seer is submitted; owner chooses -1 or +1 before collision.",
    "effectType": "MODIFY_NUMBER",
    "effectValue": {
      "deltaChoices": [
        -1,
        1
      ],
      "uses": 1,
      "phase": "SELF_MODIFY"
    },
    "targetRule": "RECOVERED_ALLY_CARD",
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
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "OWNER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "사용 카드 1장 복구. 기본 사이클당 1회; 특수/임시 카드는 복구 불가.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-166: satisfy 'An ally card recovered by the Seer is submitted; owner chooses -1 or +1 before collision.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-166: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "운명 조작자",
      "stage": 3
    }
  },
  "aug-167": {
    "augmentId": "aug-167",
    "name": "공동의 예지",
    "classId": "prophet",
    "archetype": "운명 조작자",
    "stage": 3,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "Whenever the Seer successfully recovers an ally BASE card.",
    "effectType": "ADD_STACK",
    "effectValue": {
      "state": "sharedForesight",
      "amount": 1,
      "cap": 3
    },
    "targetRule": "ALL_LIVING_ALLIES_INCLUDING_SELF",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_167_add_stack",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to 3; derived effects do not recursively retrigger.",
    "stackCap": 3,
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_167_add_stack and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "사용 카드 1장 복구. 기본 사이클당 1회; 특수/임시 카드는 복구 불가.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-167: satisfy 'Whenever the Seer successfully recovers an ally BASE card.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-167: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "운명 조작자",
      "stage": 3
    }
  },
  "aug-168": {
    "augmentId": "aug-168",
    "name": "운명 공동체",
    "classId": "prophet",
    "archetype": "운명 조작자",
    "stage": 4,
    "trigger": [
      "ON_SKILL_USE",
      "ON_RECOVER_CARD"
    ],
    "condition": "계시 1회로 서로 다른 아군 2명에게서 사용 카드 1장씩 무작위 복구",
    "effectType": "RECOVER_CARD",
    "effectValue": {
      "text": "계시 1회로 서로 다른 아군 2명에게서 사용 카드 1장씩 무작위 복구.",
      "numericHints": [
        1,
        2,
        1
      ]
    },
    "targetRule": "SOURCE_SPECIFIED_ALLY_OR_EARLIEST_SEAT_TIE",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_168_recover_card",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "2 allied cards from two different allies",
      "source": "BETA_VALUE"
    },
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": {
      "perRevelation": "ONCE_PER_REVELATION_USE",
      "perCombat": "ONCE_PER_COMBAT"
    },
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_168_recover_card and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "계시 1회로 서로 다른 아군 2명에게서 사용 카드 1장씩 무작위 복구. 전투당 1회.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-168: satisfy '계시 1회로 서로 다른 아군 2명에게서 사용 카드 1장씩 무작위 복구' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-168: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "운명 조작자",
      "stage": 4
    }
  },
  "aug-169": {
    "augmentId": "aug-169",
    "name": "별들이 선택한 패",
    "classId": "prophet",
    "archetype": "운명 조작자",
    "stage": 4,
    "trigger": [
      "ON_VALID",
      "ON_RECOVER_CARD"
    ],
    "condition": "아군 복구 시 그 아군의 사용 카드 중 무작위 2장 제시, 대상이 1장 선택",
    "effectType": "RECOVER_CARD_SELECTOR",
    "effectValue": {
      "text": "아군 복구 시 그 아군의 사용 카드 중 무작위 2장 제시, 대상이 1장 선택. 복구 카드 첫 유효 공격 +1 피해.",
      "numericHints": [
        2,
        1,
        1
      ]
    },
    "targetRule": "SOURCE_SPECIFIED_ALLY_OR_EARLIEST_SEAT_TIE",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_169_recover_card_selector",
    "stateType": "CARD_ZONE_STATE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": "ONCE_PER_REVELATION_USE",
    "resetScope": "NEVER_WITHIN_RUN",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_169_recover_card_selector and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "아군 복구 시 그 아군의 사용 카드 중 무작위 2장 제시, 대상이 1장 선택. 복구 카드 첫 유효 공격 +1 피해. 계시 1회당 1장.",
    "runtimePrimitivesRequired": [
      "RECOVER_CARD_SELECTOR"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-169: satisfy '아군 복구 시 그 아군의 사용 카드 중 무작위 2장 제시, 대상이 1장 선택' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-169: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "운명 조작자",
      "stage": 4
    }
  },
  "aug-170": {
    "augmentId": "aug-170",
    "name": "함께 쓰는 미래",
    "classId": "prophet",
    "archetype": "운명 조작자",
    "stage": 4,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "복구해준 아군 카드가 유효 성공하면 그 아군 +2 피해, 예언가의 다음 유효 공격 +2 피해",
    "effectType": "DELAY_EFFECT",
    "effectValue": {
      "text": "복구해준 아군 카드가 유효 성공하면 그 아군 +2 피해, 예언가의 다음 유효 공격 +2 피해.",
      "numericHints": [
        2,
        2
      ]
    },
    "targetRule": "SOURCE_SPECIFIED_ALLY_OR_EARLIEST_SEAT_TIE",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_REVELATION_USE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "복구해준 아군 카드가 유효 성공하면 그 아군 +2 피해, 예언가의 다음 유효 공격 +2 피해. 계시 1회당 1회.",
    "runtimePrimitivesRequired": [
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-170: satisfy '복구해준 아군 카드가 유효 성공하면 그 아군 +2 피해, 예언가의 다음 유효 공격 +2 피해' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-170: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "운명 조작자",
      "stage": 4
    }
  },
  "aug-171": {
    "augmentId": "aug-171",
    "name": "불길한 예언",
    "classId": "prophet",
    "archetype": "불길한 예언",
    "stage": 1,
    "trigger": [
      "ON_SKILL_USE",
      "POST_REVEAL",
      "ON_VALID"
    ],
    "condition": "Spend Revelation to declare one next-turn prediction; compare declared collision/no-collision/specified-number-valid result",
    "effectType": "DELAY_EFFECT",
    "effectValue": {
      "state": "prediction",
      "originCombatId": "REQUIRED",
      "originRoomId": "REQUIRED",
      "expiry": "NEXT_TURN_END",
      "cancelRule": "COMBAT_END_OR_SOURCE_INVALIDATED"
    },
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "최대 2",
      "source": "BETA_VALUE_OR_LIMIT"
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
    "visibility": "PUBLIC",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "계시 사용 시 다음 턴 예언 1개 선언. 적중 시 '예지' 1(최대 2); 예지 1당 예언가의 다음 유효 공격 추가 피해 +1 후 전부 소모. 예언 종류: 중복 발생/무중복/지정 숫자 유효.",
    "runtimePrimitivesRequired": [
      "DELAY_EFFECT",
      "PREDICTION_STATE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-171: satisfy 'Spend Revelation to declare one next-turn prediction; compare declared collision/no-collision/specified-number-valid result' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-171: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": [
        "same rootActionId retry idempotent",
        "reconnect before/after trigger preserves state",
        "room/collision ordering",
        "no recursive derived trigger"
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "불길한 예언",
      "stage": 1
    }
  },
  "aug-172": {
    "augmentId": "aug-172",
    "name": "흉조",
    "classId": "prophet",
    "archetype": "불길한 예언",
    "stage": 2,
    "trigger": [
      "POST_COLLISION"
    ],
    "condition": "이번 턴에 충돌이 발생한다고 선언한 예언이 실제 충돌 결과와 일치한다.",
    "effectType": "DELAYED_ATTACK_BUFF",
    "effectValue": {
      "bonusDamage": 1,
      "uses": 1,
      "target": "OWNER_NEXT_VALID_ATTACK"
    },
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "이번 턴의 충돌 발생을 정확히 예언하면 자신의 다음 유효 공격 피해가 1 증가합니다. 턴당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-172: satisfy '중복 발생 예언 적중 보상 강화.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-172: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "불길한 예언",
      "stage": 2
    }
  },
  "aug-173": {
    "augmentId": "aug-173",
    "name": "길조",
    "classId": "prophet",
    "archetype": "불길한 예언",
    "stage": 2,
    "trigger": [
      "POST_COLLISION",
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "Declared positive prediction resolves with no collision among living players and at least 2 valid allies.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 1
    },
    "targetRule": "ALL_LIVING_ALLIES_INCLUDING_SELF",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "Declared positive prediction resolves with no collision among living players and at least 2 valid allies.일 때 추가 피해 +1 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-173: satisfy 'Declared positive prediction resolves with no collision among living players and at least 2 valid allies.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-173: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "불길한 예언",
      "stage": 2
    }
  },
  "aug-174": {
    "augmentId": "aug-174",
    "name": "숫자의 별자리",
    "classId": "prophet",
    "archetype": "불길한 예언",
    "stage": 2,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "The number declared before submissions matches Seer's final valid number.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 1
    },
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "The number declared before submissions matches Seer's final valid number.일 때 추가 피해 +1 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-174: satisfy 'The number declared before submissions matches Seer's final valid number.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-174: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "불길한 예언",
      "stage": 2
    }
  },
  "aug-175": {
    "augmentId": "aug-175",
    "name": "연속 적중",
    "classId": "prophet",
    "archetype": "불길한 예언",
    "stage": 3,
    "trigger": [
      "POST_COLLISION",
      "ON_VALID"
    ],
    "condition": "A declared prediction succeeds consecutively; failed prediction sets foresightStreak to 0.",
    "effectType": "ADD_STACK",
    "effectValue": {
      "state": "foresightStreak",
      "amount": 1,
      "cap": 3,
      "bonusDamagePerStack": 1
    },
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_175_add_stack",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_175_add_stack and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "조건 1회당 스택 +1(최대 3); 스택 1당 관련 효과 +1 피해 상당. 전투 종료 시 초기화; 별도 유지 카드 제외.",
    "runtimePrimitivesRequired": [
      "ADD_STACK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-175: satisfy 'A declared prediction succeeds consecutively; failed prediction sets foresightStreak to 0.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-175: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "불길한 예언",
      "stage": 3
    }
  },
  "aug-176": {
    "augmentId": "aug-176",
    "name": "불길한 확신",
    "classId": "prophet",
    "archetype": "불길한 예언",
    "stage": 3,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "Choose HIGH_DIFFICULTY prediction: exact final number of one named living player; it matches after collision resolution.",
    "effectType": "GAIN_RESOURCE",
    "effectValue": {
      "resource": "revelation",
      "amount": 3,
      "temporaryCap": 3
    },
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_176_gain_resource",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to [object Object]; derived effects do not recursively retrigger.",
    "stackCap": {
      "text": "최대 2",
      "source": "BETA_VALUE_OR_LIMIT"
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_176_gain_resource and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "고난도 예언 선택 가능. 적중 시 예지 3 획득(기본 최대 2를 일시 초과 가능). 전투당 1회.",
    "runtimePrimitivesRequired": [
      "GAIN_RESOURCE",
      "MODIFY_RESOURCE_CAP"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-176: satisfy 'Choose HIGH_DIFFICULTY prediction: exact final number of one named living player; it matches after collision resolution.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-176: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "불길한 예언",
      "stage": 3
    }
  },
  "aug-177": {
    "augmentId": "aug-177",
    "name": "자기충족적 예언",
    "classId": "prophet",
    "archetype": "불길한 예언",
    "stage": 3,
    "trigger": [
      "PRE_SELECT"
    ],
    "condition": "Immediately after prediction declaration and before owner confirms a card; at least one other READY ally exists.",
    "effectType": "REVEAL_PRIVATE_INFO",
    "effectValue": {
      "count": 1,
      "selection": "SEEDED_RNG_READY_ALLY_CURRENT_NUMBER"
    },
    "targetRule": "SOURCE_SPECIFIED_ALLY_OR_EARLIEST_SEAT_TIE",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "NONE",
    "onceScope": "ONCE_PER_PREDICTION",
    "resetScope": "TURN_END",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "OWNER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "예언 선언 후 카드 선택 전에 무작위 아군 1명의 현재 선택 숫자를 확인. 예언 1회당 1명.",
    "runtimePrimitivesRequired": [
      "REVEAL_PRIVATE_INFO"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-177: satisfy 'Immediately after prediction declaration and before owner confirms a card; at least one other READY ally exists.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-177: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "불길한 예언",
      "stage": 3
    }
  },
  "aug-178": {
    "augmentId": "aug-178",
    "name": "대예언",
    "classId": "prophet",
    "archetype": "불길한 예언",
    "stage": 4,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "고난도 예언 적중 시 예지 3 획득 및 전원 다음 유효 공격 +1 피해",
    "effectType": "DELAY_EFFECT",
    "effectValue": {
      "text": "고난도 예언 적중 시 예지 3 획득 및 전원 다음 유효 공격 +1 피해.",
      "numericHints": [
        3,
        1
      ]
    },
    "targetRule": "ALL_LIVING_ALLIES_INCLUDING_SELF",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "고난도 예언 적중 시 예지 3 획득 및 전원 다음 유효 공격 +1 피해. 전투당 1회.",
    "runtimePrimitivesRequired": [
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-178: satisfy '고난도 예언 적중 시 예지 3 획득 및 전원 다음 유효 공격 +1 피해' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-178: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "불길한 예언",
      "stage": 4
    }
  },
  "aug-179": {
    "augmentId": "aug-179",
    "name": "운명은 정해졌다",
    "classId": "prophet",
    "archetype": "불길한 예언",
    "stage": 4,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "condition": "After 3 consecutive successful predictions in the same combat.",
    "effectType": "DELAYED_ATTACK_BUFF",
    "effectValue": {
      "targets": "ALL_LIVING_PLAYERS",
      "bonusDamage": 2,
      "usesPerTarget": 1
    },
    "targetRule": "ALL_LIVING_ALLIES_INCLUDING_SELF",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_179_delayed_attack_buff",
    "stateType": "STATUS",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": {
      "text": "NONE",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_179_delayed_attack_buff and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "대상 전원의 다음 유효 공격 추가 피해 +2. 각 대상 1회 발동 후 소멸.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-179: satisfy 'After 3 consecutive successful predictions in the same combat.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-179: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "불길한 예언",
      "stage": 4
    }
  },
  "aug-180": {
    "augmentId": "aug-180",
    "name": "예언의 성취",
    "classId": "prophet",
    "archetype": "불길한 예언",
    "stage": 4,
    "trigger": [
      "ON_VALID"
    ],
    "condition": "한 전투에서 서로 다른 예언 3종을 모두 적중하면 전원 EXP +2, 예언가의 다음 유효 공격 +4 피해",
    "effectType": "MODIFY_EXP",
    "effectValue": {
      "text": "한 전투에서 서로 다른 예언 3종을 모두 적중하면 전원 EXP +2, 예언가의 다음 유효 공격 +4 피해.",
      "numericHints": [
        3,
        2,
        4
      ]
    },
    "targetRule": "ALL_LIVING_ALLIES_INCLUDING_SELF",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "NONE",
    "stateType": "NONE",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "한 전투에서 서로 다른 예언 3종을 모두 적중하면 전원 EXP +2, 예언가의 다음 유효 공격 +4 피해. 전투당 1회.",
    "runtimePrimitivesRequired": [
      "MODIFY_EXP",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-180: satisfy '한 전투에서 서로 다른 예언 3종을 모두 적중하면 전원 EXP +2, 예언가의 다음 유효 공격 +4 피해' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-180: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "SEER_V02",
    "candidatePool": {
      "classId": "prophet",
      "archetype": "불길한 예언",
      "stage": 4
    }
  }
});
export const SEER_CONTRACT_IDS=Object.freeze(Object.keys(SEER_CONTRACTS).sort());
