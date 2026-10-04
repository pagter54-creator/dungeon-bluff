export const TWINS_CONTRACTS=Object.freeze({
  "aug-361": {
    "augmentId": "aug-361",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "완벽한 교대",
    "stage": 1,
    "name": "완벽한 교대",
    "sourceIntent": "기본 +2 피해 유지. 직전 턴 유효 성공 상태라면 현재 보너스 +3, 충돌 시 연속 성공 흐름이 끊김.",
    "sourceValueV01": "기본 유효 공격 +2 피해 유지. 직전 턴도 유효 성공이었다면 이번 보너스 +3으로 증가.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 362,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "NOT_APPLICABLE",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": {
      "expression": "OWNER_PRIMARY_VALID",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "OVERRIDE_TWINS_BASE_DAMAGE",
    "effectValue": {
      "operations": [
        {
          "op": "OVERRIDE_TWINS_BASE_DAMAGE",
          "base": 2,
          "ifPreviousLogicalValid": 3,
          "replacesBase": true
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "OVERRIDE_TWINS_BASE_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-361.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "TEMP",
          "reset": "TURN_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_TURN",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "완벽한 교대: OWNER_PRIMARY_VALID. {\"op\":\"OVERRIDE_TWINS_BASE_DAMAGE\",\"base\":2,\"ifPreviousLogicalValid\":3,\"replacesBase\":true}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "previouslogicalvalidtruecurrentvalid: bonus3totalnot5",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "unprotectedcollisionclearslogicalvalidandstreak, no bonus",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        },
        {
          "case": "HIGH_RISK_BOUNDARY",
          "givenWhenThen": "previouslogicalvalidtruecurrentvalid: bonus3totalnot5; then unprotectedcollisionclearslogicalvalidandstreak, no bonus",
          "expected": "Respect snapshots, threshold boundary, scoped target and the explicit alternative outcome.",
          "highRiskTest": true
        },
        {
          "case": "MULTI_OWNER_AND_SAME_ROOT",
          "given": "Two owners of this card act in one root with separate stateKey namespaces.",
          "expected": "No cross-owner counter/resource consumption; deterministic seat/playerId ordering, no recursive extra hit."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-362": {
    "augmentId": "aug-362",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "완벽한 교대",
    "stage": 2,
    "name": "쌍인 호흡",
    "sourceIntent": "3회 이상 연속 유효 공격부터 추가 보너스 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 363,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_TURN",
        "priorResetScope": "TURN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": {
      "expression": "OWNER_PRIMARY_VALID && validStreakAfter >= 3",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "operations": [
        {
          "op": "ADD_DAMAGE",
          "value": 1
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ADD_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-362.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "TEMP",
          "reset": "TURN_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_TURN",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "쌍인 호흡: OWNER_PRIMARY_VALID && validStreakAfter >= 3. {\"op\":\"ADD_DAMAGE\",\"value\":1}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "thirdconsecutivevalid: extra1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "Only two consecutive valid primary attacks: validStreakAfter=2, extra damage remains0.",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-363": {
    "augmentId": "aug-363",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "완벽한 교대",
    "stage": 2,
    "name": "안전망",
    "sourceIntent": "사이클당 첫 충돌 1회는 연속 성공 기록을 끊지 않음. 카드는 정상 무효/소비.",
    "sourceValueV01": "사이클당 첫 충돌 1회는 연속 유효 기록을 끊지 않음.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 364,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_CYCLE",
        "priorResetScope": "CYCLE",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "COLLISION_RESOLUTION"
    ],
    "timingPhase": "COLLISION_RESOLUTION",
    "condition": {
      "expression": "OWNER_COLLISION && firstCollisionOfCycle",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "PRESERVE_VALID_STREAK_AND_LOGICAL_PREVIOUS_VALID",
    "effectValue": {
      "operations": [
        {
          "op": "PRESERVE_VALID_STREAK_AND_LOGICAL_PREVIOUS_VALID",
          "cardStillInvalid": true,
          "cardStillSpent": true
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "damageComponents": [],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-363.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "COMBAT",
          "reset": "CYCLE_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_CYCLE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Preserve logical continuity used by361, but do not fabricate a valid attack, charging progress or actual successful-number history. Non-collision invalid resets continuity normally."
      ],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "CYCLE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Preserve logical continuity used by361, but do not fabricate a valid attack, charging progress or actual successful-number history. Non-collision invalid resets continuity normally.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "안전망: OWNER_COLLISION && firstCollisionOfCycle. {\"op\":\"PRESERVE_VALID_STREAK_AND_LOGICAL_PREVIOUS_VALID\",\"cardStillInvalid\":true,\"cardStillSpent\":true}. CYCLE 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "COMMAND_RESERVE",
      "PRE_COLLISION_SWAP",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "streak2firstcyclecollision remains2;cardspentandnoattackdamage",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "secondcollisionresetsstreak0",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-364": {
    "augmentId": "aug-364",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "완벽한 교대",
    "stage": 2,
    "name": "교대 발놀림",
    "sourceIntent": "연속 유효 2회 달성 후 다음 홀짝에 맞는 사용 카드 1장을 랜덤 복구. 사이클당 1회.",
    "sourceValueV01": "연속 유효 2회 달성 시 다음 요구 홀짝에 맞는 사용 카드 1장 무작위 복구.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 365,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_CYCLE",
        "priorResetScope": "CYCLE",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "POST_SPEND_PRE_CYCLE"
    ],
    "timingPhase": "POST_SPEND_PRE_CYCLE",
    "condition": {
      "expression": "OWNER_PRIMARY_VALID && validStreakAfter >= 2 && ELIGIBLE_NEXT_PARITY_SPENT_EXISTS",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "RECOVER_CARD",
    "effectValue": {
      "operations": [
        {
          "op": "RECOVER_CARD",
          "fromZone": "SPENT",
          "toZone": "REMAINING",
          "eligibility": "OWNER_NORMAL_PHYSICAL_CARD_MATCHING_NEXT_REQUIRED_PRINTED_PARITY",
          "selector": "SEEDED_RANDOM_SORTED_CARD_INSTANCE_ID",
          "sameInstance": true,
          "count": 1,
          "ordering": "AFTER_SPEND_BEFORE_CYCLE_ADVANCE"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "damageComponents": [],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_RECOVERABLE_PHYSICAL_CARD",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-364.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "COMBAT",
          "reset": "CYCLE_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_CYCLE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "CYCLE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects.",
      "Evaluate natural cycle completion after recovery."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "교대 발놀림: OWNER_PRIMARY_VALID && validStreakAfter >= 2 && ELIGIBLE_NEXT_PARITY_SPENT_EXISTS. {\"op\":\"RECOVER_CARD\",\"fromZone\":\"SPENT\",\"toZone\":\"REMAINING\",\"eligibility\":\"OWNER_NORMAL_PHYSICAL_CARD_MATCHING_NEXT_REQUIRED_PRINTED_PARITY\",\"selector\":\"SEEDED_RANDOM_SORTED_CARD_INSTANCE_ID\",\"sameInstance\":true,\"count\":1,\"ordering\":\"AFTER_SPEND_BEFORE_CYCLE_ADVANCE\"}. CYCLE 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "PARITY_ELIGIBILITY",
      "SEEDED_CARD_RECOVERY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "streak2withspentprinted2matchingnextEVENrecoverssameIDtoREMAINING",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "emptycandidatepool:noRNGdraw,norecovery,noonceconsumption",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-365": {
    "augmentId": "aug-365",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "완벽한 교대",
    "stage": 3,
    "name": "완벽한 합",
    "sourceIntent": "충분한 연속 성공 후 다음 유효 공격 보너스 강화, 기록은 유지.",
    "sourceValueV01": "다음 유효 공격 추가 피해 +2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 366,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "COMBAT",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "POST_DAMAGE"
    ],
    "timingPhase": "POST_DAMAGE",
    "condition": {
      "expression": "OWNER_PRIMARY_VALID && validStreakAfter >= 3 && !nextValidDamagePending",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ARM_NEXT_VALID_DAMAGE",
    "effectValue": {
      "operations": [
        {
          "op": "ARM_NEXT_VALID_DAMAGE",
          "value": 2,
          "charges": 1,
          "availableFrom": "NEXT_ROOT_ACTION",
          "merge": "MAX"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ARM_NEXT_VALID_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-365.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "TEMP",
          "reset": "TURN_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "ARM_NEXT_VALID_DAMAGE",
              "value": 2,
              "charges": 1,
              "availableFrom": "NEXT_ROOT_ACTION",
              "merge": "MAX"
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_TURN",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "The root that consumed this card's existing pending charge cannot rearm it. A later distinct qualifying root can arm again; continuity remains unchanged."
      ],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "The root that consumed this card's existing pending charge cannot rearm it. A later distinct qualifying root can arm again; continuity remains unchanged.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "완벽한 합: OWNER_PRIMARY_VALID && validStreakAfter >= 3 && !nextValidDamagePending. {\"op\":\"ARM_NEXT_VALID_DAMAGE\",\"value\":2,\"charges\":1,\"availableFrom\":\"NEXT_ROOT_ACTION\",\"merge\":\"MAX\"}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "DELAYED_EFFECT",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "thirdvalidarms+2;fourthvalidconsumesitwithoutarmingnewchargeonsameroot",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "streak2cannotarm",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-366": {
    "augmentId": "aug-366",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "완벽한 교대",
    "stage": 3,
    "name": "교차 찌르기",
    "sourceIntent": "직전 성공 카드와 숫자 차이가 2 이상이면 추가 피해.",
    "sourceValueV01": "조건 달성 시 추가 피해 +2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 367,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_TURN",
        "priorResetScope": "TURN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": {
      "expression": "OWNER_PRIMARY_VALID && previousSuccessfulFINALPresent && abs(FINAL - previousSuccessfulFINAL) >= 2",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "operations": [
        {
          "op": "ADD_DAMAGE",
          "value": 2
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ADD_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-366.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "TEMP",
          "reset": "TURN_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_TURN",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "교차 찌르기: OWNER_PRIMARY_VALID && previousSuccessfulFINALPresent && abs(FINAL - previousSuccessfulFINAL) >= 2. {\"op\":\"ADD_DAMAGE\",\"value\":2}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "previousvalidFINAL1,currentvalidFINAL3:+2",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "previousvalid2,current3:0",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-367": {
    "augmentId": "aug-367",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "완벽한 교대",
    "stage": 3,
    "name": "동시 착지",
    "sourceIntent": "사이클을 무충돌로 완료하면 HP 1 회복 + 다음 사이클 첫 유효 공격 강화.",
    "sourceValueV01": "한 사이클 전부 무충돌 완료 시 HP1 회복, 다음 사이클 첫 유효 공격 +2 피해.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 368,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_CYCLE",
        "priorResetScope": "CYCLE",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "CYCLE_END"
    ],
    "timingPhase": "CYCLE_END",
    "condition": {
      "expression": "NATURAL_CYCLE_COMPLETED && cycleCollisionCount == 0",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "HEAL_OWNER_IF_LIVING_MISSING_HP",
          "value": 1
        },
        {
          "op": "ARM_NEXT_CYCLE_FIRST_VALID_DAMAGE",
          "value": 2,
          "charges": 1
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ARM_NEXT_CYCLE_FIRST_VALID_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "HEAL",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-367.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "COMBAT",
          "reset": "CYCLE_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "HEAL_OWNER_IF_LIVING_MISSING_HP",
              "value": 1
            },
            {
              "op": "ARM_NEXT_CYCLE_FIRST_VALID_DAMAGE",
              "value": 2,
              "charges": 1
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_CYCLE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "CYCLE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "동시 착지: NATURAL_CYCLE_COMPLETED && cycleCollisionCount == 0. {\"op\":\"HEAL_OWNER_IF_LIVING_MISSING_HP\",\"value\":1}; {\"op\":\"ARM_NEXT_CYCLE_FIRST_VALID_DAMAGE\",\"value\":2,\"charges\":1}. CYCLE 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "HEAL",
      "BLOOD_RESOURCE",
      "ADD_DAMAGE",
      "DELAYED_EFFECT",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "nocollisioncompletedcycleheals1andnextcyclefirstvalid+2",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "cyclewithcollision:noeffect;Acrobaticsforcedresetnotnaturalcompletion",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-368": {
    "augmentId": "aug-368",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "완벽한 교대",
    "stage": 4,
    "name": "무결점 공연",
    "sourceIntent": "사이클의 모든 카드가 유효 성공하면 다음 사이클이 충돌 전까지 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +3.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 369,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_TURN",
        "priorResetScope": "TURN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "CYCLE_END"
    ],
    "timingPhase": "CYCLE_END",
    "condition": {
      "expression": "NATURAL_CYCLE_COMPLETED && allCyclePrimaryAttemptsValid",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ARM_NEXT_CYCLE_VALID_DAMAGE_UNTIL_COLLISION",
    "effectValue": {
      "operations": [
        {
          "op": "ARM_NEXT_CYCLE_VALID_DAMAGE_UNTIL_COLLISION",
          "value": 3,
          "armingOncePerCycle": true
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ARM_NEXT_CYCLE_VALID_DAMAGE_UNTIL_COLLISION",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-368.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "TEMP",
          "reset": "TURN_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "ARM_NEXT_CYCLE_VALID_DAMAGE_UNTIL_COLLISION",
              "value": 3,
              "armingOncePerCycle": true
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_TURN",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Next-cycle OTHERinvalid dealsno damage but doesnotexpirethebuff; onlycollisionorcycle/combatendexpires it. Recoverycreatesadditionalattempts; allattemptsmustbevalid."
      ],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Next-cycle OTHERinvalid dealsno damage but doesnotexpirethebuff; onlycollisionorcycle/combatendexpires it. Recoverycreatesadditionalattempts; allattemptsmustbevalid.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "무결점 공연: NATURAL_CYCLE_COMPLETED && allCyclePrimaryAttemptsValid. {\"op\":\"ARM_NEXT_CYCLE_VALID_DAMAGE_UNTIL_COLLISION\",\"value\":3,\"armingOncePerCycle\":true}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "DELAYED_EFFECT",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "all4physicalvalidcompleted:nextcyclevalid+3untilfirstcollision",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "oneOTHERinvalidincompletedcyclepreventsarming",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-369": {
    "augmentId": "aug-369",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "완벽한 교대",
    "stage": 4,
    "name": "쌍인 피날레",
    "sourceIntent": "사이클 마지막 남은 카드가 유효하면 매우 큰 보너스.",
    "sourceValueV01": "조건 달성 시 추가 피해 +4.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 370,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_TURN",
        "priorResetScope": "TURN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": {
      "expression": "OWNER_PRIMARY_VALID && remainingPhysicalCountBeforeSubmission == 1",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "operations": [
        {
          "op": "ADD_DAMAGE",
          "value": 4
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ADD_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-369.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "TEMP",
          "reset": "TURN_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_TURN",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "쌍인 피날레: OWNER_PRIMARY_VALID && remainingPhysicalCountBeforeSubmission == 1. {\"op\":\"ADD_DAMAGE\",\"value\":4}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "lastremainingphysicalcardvalidgets4evenifpostresolveSeerrecoverypreventscompletion",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "2remainingpresubmit:0",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-370": {
    "augmentId": "aug-370",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "완벽한 교대",
    "stage": 4,
    "name": "앙코르!",
    "sourceIntent": "충분한 연속 유효 성공 시 사용 카드 일부 복구, 연속 기록 유지.",
    "sourceValueV01": "연속 유효 4회 달성 시 사용 카드 1장 무작위 복구.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 371,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_CYCLE",
        "priorResetScope": "CYCLE",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "POST_SPEND_PRE_CYCLE"
    ],
    "timingPhase": "POST_SPEND_PRE_CYCLE",
    "condition": {
      "expression": "OWNER_PRIMARY_VALID && validStreakAfter >= 4 && RECOVERABLE_SPENT_EXISTS",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "RECOVER_CARD",
          "fromZone": "SPENT",
          "toZone": "REMAINING",
          "eligibility": "OWNER_NORMAL_RECOVERABLE_PHYSICAL_CARD",
          "selector": "SEEDED_RANDOM_SORTED_CARD_INSTANCE_ID",
          "sameInstance": true,
          "count": 1,
          "ordering": "AFTER_SPEND_BEFORE_CYCLE_ADVANCE"
        },
        {
          "op": "PRESERVE_VALID_STREAK"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "damageComponents": [],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_RECOVERABLE_PHYSICAL_CARD",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-370.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "COMBAT",
          "reset": "CYCLE_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_CYCLE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "CYCLE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects.",
      "Evaluate natural cycle completion after recovery."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "앙코르!: OWNER_PRIMARY_VALID && validStreakAfter >= 4 && RECOVERABLE_SPENT_EXISTS. {\"op\":\"RECOVER_CARD\",\"fromZone\":\"SPENT\",\"toZone\":\"REMAINING\",\"eligibility\":\"OWNER_NORMAL_RECOVERABLE_PHYSICAL_CARD\",\"selector\":\"SEEDED_RANDOM_SORTED_CARD_INSTANCE_ID\",\"sameInstance\":true,\"count\":1,\"ordering\":\"AFTER_SPEND_BEFORE_CYCLE_ADVANCE\"}; {\"op\":\"PRESERVE_VALID_STREAK\"}. CYCLE 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "COMMAND_RESERVE",
      "PRE_COLLISION_SWAP",
      "PARITY_ELIGIBILITY",
      "SEEDED_CARD_RECOVERY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "fourthvalidrecoverssameoneSPENTID,streak4remains",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "emptySPENT:noRNGdrawornoonceconsumption",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-371": {
    "augmentId": "aug-371",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "태양과 달",
    "stage": 1,
    "name": "태양과 달",
    "sourceIntent": "기본 +2 제거. 태양2/달2에서 시작, 합은 항상 4. 홀수 성공 시 태양+1/달-1, 짝수 성공은 반대. 4/0=일식(회복/지원), 0/4=월식(대미지), 특수 상태 종료 후 2/2.",
    "sourceValueV01": "기본 +2 제거. 태양2/달2 시작. 홀수 유효 시 태양+1, 짝수 유효 시 달+1(반대쪽 -1). 4/0 일식: 다음 특수 턴 유효 시 최저 HP 아군 HP1 회복. 0/4 월식: 다음 특수 턴 유효 시 추가 피해 +4. 이후 2/2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 372,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "COMBAT",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "VALIDITY_AND_TURN_END"
    ],
    "timingPhase": "VALIDITY_AND_TURN_END",
    "condition": {
      "expression": "OWNER_PRIMARY_VALID_OR_SPECIAL_TURN_END",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "BASE_RULE_OVERRIDE",
          "key": "twinsBaseDamage",
          "value": 0
        },
        {
          "op": "INIT_SUN_MOON",
          "sun": 2,
          "moon": 2,
          "sum": 4,
          "event": "COMBAT_START_ONCE"
        },
        {
          "op": "NORMAL_VALID_FINAL_PARITY_MOVE",
          "oddSunDelta": 1,
          "evenSunDelta": -1,
          "clamp": [
            0,
            4
          ],
          "moon": "4 - sun",
          "predicate": "OWNER_PRIMARY_VALID && NOT_SPECIAL_TURN"
        },
        {
          "op": "ARM_NEXT_TURN_ECLIPSE_AT_EXTREME",
          "sunExtreme": 4,
          "moonExtreme": 4
        },
        {
          "op": "SUN_SPECIAL_VALID_HEAL",
          "value": 1,
          "predicate": "SUN_ECLIPSE_VALID"
        },
        {
          "op": "MOON_SPECIAL_VALID_ADD_DAMAGE",
          "value": 4,
          "predicate": "MOON_ECLIPSE_VALID"
        },
        {
          "op": "SPECIAL_TURN_END_RESET",
          "sun": 2,
          "moon": 2,
          "regardlessValidity": true,
          "event": "SPECIAL_TURN_END"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "MOON_SPECIAL_VALID_ADD_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "HEAL",
    "targetRule": "OWNER_AND_LOWEST_HP_LIVING_ALLY",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-371.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "BASE_RULE_OVERRIDE",
              "key": "twinsBaseDamage",
              "value": 0
            },
            {
              "op": "INIT_SUN_MOON",
              "sun": 2,
              "moon": 2,
              "sum": 4
            },
            {
              "op": "NORMAL_VALID_FINAL_PARITY_MOVE",
              "oddSunDelta": 1,
              "evenSunDelta": -1,
              "clamp": [
                0,
                4
              ],
              "moon": "4 - sun"
            },
            {
              "op": "ARM_NEXT_TURN_ECLIPSE_AT_EXTREME",
              "sunExtreme": 4,
              "moonExtreme": 4
            },
            {
              "op": "SUN_SPECIAL_VALID_HEAL",
              "value": 1
            },
            {
              "op": "MOON_SPECIAL_VALID_ADD_DAMAGE",
              "value": 4
            },
            {
              "op": "SPECIAL_TURN_END_RESET",
              "sun": 2,
              "moon": 2,
              "regardlessValidity": true
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady",
        "owner.sunMoon",
        "owner.celestialFlow",
        "owner.reincarnation"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Printed parity input restriction remains. Sun/Moon movement uses FINAL parity of a valid card, deliberately a different phase.371 overrides361/base+2 so they neveraddtwice."
      ],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Printed parity input restriction remains. Sun/Moon movement uses FINAL parity of a valid card, deliberately a different phase.371 overrides361/base+2 so they neveraddtwice.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "태양과 달: OWNER_PRIMARY_VALID_OR_SPECIAL_TURN_END. {\"op\":\"BASE_RULE_OVERRIDE\",\"key\":\"twinsBaseDamage\",\"value\":0}; {\"op\":\"INIT_SUN_MOON\",\"sun\":2,\"moon\":2,\"sum\":4}; {\"op\":\"NORMAL_VALID_FINAL_PARITY_MOVE\",\"oddSunDelta\":1,\"evenSunDelta\":-1,\"clamp\":[0,4],\"moon\":\"4 - sun\"}; {\"op\":\"ARM_NEXT_TURN_ECLIPSE_AT_EXTREME\",\"sunExtreme\":4,\"moonExtreme\":4}; {\"op\":\"SUN_SPECIAL_VALID_HEAL\",\"value\":1}; {\"op\":\"MOON_SPECIAL_VALID_ADD_DAMAGE\",\"value\":4}; {\"op\":\"SPECIAL_TURN_END_RESET\",\"sun\":2,\"moon\":2,\"regardlessValidity\":true}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "CELESTIAL_STATE",
      "DELAYED_EFFECT",
      "HEAL",
      "BLOOD_RESOURCE",
      "ADD_DAMAGE",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "oddFINALvalidmoves3/1to4/0, nextturnSunvalidhealslowestHP1;endreset2/2",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "specialcollisionheals0butstillends/reset2/2; noordinarymovementonspecialturn",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        },
        {
          "case": "HIGH_RISK_BOUNDARY",
          "givenWhenThen": "oddFINALvalidmoves3/1to4/0, nextturnSunvalidhealslowestHP1;endreset2/2; then specialcollisionheals0butstillends/reset2/2; noordinarymovementonspecialturn",
          "expected": "Respect snapshots, threshold boundary, scoped target and the explicit alternative outcome.",
          "highRiskTest": true
        },
        {
          "case": "MULTI_OWNER_AND_SAME_ROOT",
          "given": "Two owners of this card act in one root with separate stateKey namespaces.",
          "expected": "No cross-owner counter/resource consumption; deterministic seat/playerId ordering, no recursive extra hit."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-372": {
    "augmentId": "aug-372",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "태양과 달",
    "stage": 2,
    "name": "따스한 코로나",
    "sourceIntent": "일식 회복 강화, 최저 HP 아군에게 추가 도움.",
    "sourceValueV01": "일식 성공 시 최저 HP 아군 HP1 회복 + 그 외 최저 HP 아군 1명의 다음 직접 피해 1 감소.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 373,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "COMBAT",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "POST_DAMAGE_PRE_DOWN"
    ],
    "timingPhase": "POST_DAMAGE_PRE_DOWN",
    "condition": {
      "expression": "SUN_ECLIPSE_VALID",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "ENSURE_BASE_SUN_HEAL",
          "value": 1,
          "replaces": "base heal1 not additive"
        },
        {
          "op": "PROTECT_OTHER_LOWEST_HP_LIVING_ALLY",
          "value": 1,
          "exclude": "PRIMARY_HEAL_TARGET",
          "merge": "MAX"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "damageComponents": [],
    "defenseTaxonomy": "REDUCTION",
    "healTaxonomy": "HEAL",
    "targetRule": "SUN_HEAL_TARGET_AND_OTHER_ALLY",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-372.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady",
        "owner.sunMoon",
        "owner.celestialFlow",
        "owner.reincarnation"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "따스한 코로나: SUN_ECLIPSE_VALID. {\"op\":\"ENSURE_BASE_SUN_HEAL\",\"value\":1,\"replaces\":\"base heal1 not additive\"}; {\"op\":\"PROTECT_OTHER_LOWEST_HP_LIVING_ALLY\",\"value\":1,\"exclude\":\"PRIMARY_HEAL_TARGET\",\"merge\":\"MAX\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "HEAL",
      "BLOOD_RESOURCE",
      "CELESTIAL_STATE",
      "NEXT_DIRECT_PROTECTION",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "Sunhealslowestally1 andprotectsdifferentlowestally1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "nootherlivingally:skipprotectionwithoutduplicatingheal",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-373": {
    "augmentId": "aug-373",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "태양과 달",
    "stage": 2,
    "name": "창백한 월광",
    "sourceIntent": "월식 공격 효과 강화.",
    "sourceValueV01": "월식 성공 추가 피해 +4→+6.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 374,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "NOT_APPLICABLE",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": {
      "expression": "MOON_ECLIPSE_VALID",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "OVERRIDE_MOON_BONUS",
    "effectValue": {
      "operations": [
        {
          "op": "OVERRIDE_MOON_BONUS",
          "value": 6,
          "replaces": 4
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "OVERRIDE_MOON_BONUS",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-373.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady",
        "owner.sunMoon",
        "owner.celestialFlow",
        "owner.reincarnation"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "창백한 월광: MOON_ECLIPSE_VALID. {\"op\":\"OVERRIDE_MOON_BONUS\",\"value\":6,\"replaces\":4}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "CELESTIAL_STATE",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "Moonvalidbonus6not10",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "ordinaryvalidattack: no6",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-374": {
    "augmentId": "aug-374",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "태양과 달",
    "stage": 2,
    "name": "천구의 관성",
    "sourceIntent": "일식/월식 종료 후 첫 스택 이동량을 증가.",
    "sourceValueV01": "조건 1회당 스택 +1(최대 3); 스택 1당 관련 효과 +1 피해 상당.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 375,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "COMBAT",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "TURN_END_AND_VALIDITY"
    ],
    "timingPhase": "TURN_END_AND_VALIDITY",
    "condition": {
      "expression": "ECLIPSE_EXIT_OR_NEXT_NORMAL_VALID",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "ARM_NEXT_NORMAL_SUN_MOON_MOVE",
          "value": 2,
          "charges": 1
        },
        {
          "op": "OVERRIDE_NEXT_MOVE_MAGNITUDE",
          "value": 2,
          "clamp": [
            0,
            4
          ],
          "sum": 4
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "damageComponents": [],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-374.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "ARM_NEXT_NORMAL_SUN_MOON_MOVE",
              "value": 2,
              "charges": 1
            },
            {
              "op": "OVERRIDE_NEXT_MOVE_MAGNITUDE",
              "value": 2,
              "clamp": [
                0,
                4
              ],
              "sum": 4
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady",
        "owner.sunMoon",
        "owner.celestialFlow",
        "owner.reincarnation"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "천구의 관성: ECLIPSE_EXIT_OR_NEXT_NORMAL_VALID. {\"op\":\"ARM_NEXT_NORMAL_SUN_MOON_MOVE\",\"value\":2,\"charges\":1}; {\"op\":\"OVERRIDE_NEXT_MOVE_MAGNITUDE\",\"value\":2,\"clamp\":[0,4],\"sum\":4}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "DELAYED_EFFECT",
      "CELESTIAL_STATE",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "exit2/2thenfirstnormaloddvalidmoves4/0not3/1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "invalidnormaldoesnotconsumeonependingmovement",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-375": {
    "augmentId": "aug-375",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "태양과 달",
    "stage": 3,
    "name": "태양의 잔광",
    "sourceIntent": "일식 종료 후 작은 회복/피해 감소 효과가 일정 시간 잔류.",
    "sourceValueV01": "일식 종료 후 다음 2턴 동안 처음 HP가 감소한 아군 1명의 다음 직접 피해 1 감소.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 376,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_ECLIPSE",
        "priorResetScope": "COMBAT",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "TURN_END_AND_POST_DAMAGE"
    ],
    "timingPhase": "TURN_END_AND_POST_DAMAGE",
    "condition": {
      "expression": "SUN_ECLIPSE_EXIT_OR_FIRST_ALLY_POSITIVE_HP_DAMAGE_IN_WINDOW",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "ARM_HP_DAMAGE_SUPPORT_WINDOW",
          "durationTurns": 2,
          "start": "NEXT_TURN"
        },
        {
          "op": "GRANT_DAMAGED_ALLY_NEXT_DIRECT_PROTECTION",
          "value": 1,
          "afterCurrentDamage": true,
          "merge": "MAX"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ARM_HP_DAMAGE_SUPPORT_WINDOW",
        "taxonomy": "ADD"
      },
      {
        "operation": "GRANT_DAMAGED_ALLY_NEXT_DIRECT_PROTECTION",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "REDUCTION",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "FIRST_HP_DAMAGED_LIVING_ALLY",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-375.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "ARM_HP_DAMAGE_SUPPORT_WINDOW",
              "durationTurns": 2,
              "start": "NEXT_TURN"
            },
            {
              "op": "GRANT_DAMAGED_ALLY_NEXT_DIRECT_PROTECTION",
              "value": 1,
              "afterCurrentDamage": true,
              "merge": "MAX"
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady",
        "owner.sunMoon",
        "owner.celestialFlow",
        "owner.reincarnation"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "태양의 잔광: SUN_ECLIPSE_EXIT_OR_FIRST_ALLY_POSITIVE_HP_DAMAGE_IN_WINDOW. {\"op\":\"ARM_HP_DAMAGE_SUPPORT_WINDOW\",\"durationTurns\":2,\"start\":\"NEXT_TURN\"}; {\"op\":\"GRANT_DAMAGED_ALLY_NEXT_DIRECT_PROTECTION\",\"value\":1,\"afterCurrentDamage\":true,\"merge\":\"MAX\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "DELAYED_EFFECT",
      "NEXT_DIRECT_PROTECTION",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "SunexitT,firstallyHPlossT+1grantsprotectionfornextDIRECTdamage",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "currentdamageisnotretroactivelyreduced;T+3noreceipt",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-376": {
    "augmentId": "aug-376",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "태양과 달",
    "stage": 3,
    "name": "월식의 잔흔",
    "sourceIntent": "월식 종료 후 다음 일반 유효 공격까지 일부 공격 보너스 유지.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 377,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_TURN",
        "priorResetScope": "TURN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "TURN_END"
    ],
    "timingPhase": "TURN_END",
    "condition": {
      "expression": "MOON_ECLIPSE_EXIT",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ARM_NEXT_NORMAL_VALID_DAMAGE",
    "effectValue": {
      "operations": [
        {
          "op": "ARM_NEXT_NORMAL_VALID_DAMAGE",
          "value": 1,
          "charges": 1,
          "availableFrom": "NEXT_ROOT_ACTION"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ARM_NEXT_NORMAL_VALID_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-376.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "TEMP",
          "reset": "TURN_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "ARM_NEXT_NORMAL_VALID_DAMAGE",
              "value": 1,
              "charges": 1,
              "availableFrom": "NEXT_ROOT_ACTION"
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady",
        "owner.sunMoon",
        "owner.celestialFlow",
        "owner.reincarnation"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_TURN",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "월식의 잔흔: MOON_ECLIPSE_EXIT. {\"op\":\"ARM_NEXT_NORMAL_VALID_DAMAGE\",\"value\":1,\"charges\":1,\"availableFrom\":\"NEXT_ROOT_ACTION\"}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "DELAYED_EFFECT",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "Moonexitnextnormalvalid+1thenconsumed",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "nextspecialattackcannotconsume",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-377": {
    "augmentId": "aug-377",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "태양과 달",
    "stage": 3,
    "name": "합삭과 망",
    "sourceIntent": "직전과 반대 종류의 식에 진입하면 천체윤회 스택을 얻어 전투 중 강화.",
    "sourceValueV01": "조건 1회당 스택 +1(최대 3); 스택 1당 관련 효과 +1 피해 상당.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 378,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "COMBAT",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "POST_DAMAGE"
    ],
    "timingPhase": "POST_DAMAGE",
    "condition": {
      "expression": "ENTER_ECLIPSE_OPPOSITE_TO_LAST_KIND",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_STACK",
          "key": "celestialFlow",
          "value": 1,
          "cap": 3
        },
        {
          "op": "PASSIVE_VALID_DAMAGE",
          "valueFrom": "celestialFlow",
          "eligibleFrom": "NEXT_ROOT_ACTION"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "PASSIVE_VALID_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-377.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "celestialFlow": {
          "type": "NON_NEGATIVE_INTEGER",
          "initial": 0,
          "cap": 3,
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "transition": {
            "op": "GAIN_STACK",
            "key": "celestialFlow",
            "value": 1,
            "cap": 3
          }
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady",
        "owner.sunMoon",
        "owner.celestialFlow",
        "owner.reincarnation"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 3,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "celestialFlow and380reincarnation are independent namedcounters, eachincrementsatmostonceperentry. This card doesnotmultiplytheothercounter'sgain."
      ],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "celestialFlow and380reincarnation are independent namedcounters, eachincrementsatmostonceperentry. This card doesnotmultiplytheothercounter'sgain.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "합삭과 망: ENTER_ECLIPSE_OPPOSITE_TO_LAST_KIND. {\"op\":\"GAIN_STACK\",\"key\":\"celestialFlow\",\"value\":1,\"cap\":3}; {\"op\":\"PASSIVE_VALID_DAMAGE\",\"valueFrom\":\"celestialFlow\",\"eligibleFrom\":\"NEXT_ROOT_ACTION\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "ADD_DAMAGE",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "lastSunthenMoonentryflow0->1,nextdistinctvalidgets1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "firsteverentryorrepeatedsamekind:no gain",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-378": {
    "augmentId": "aug-378",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "태양과 달",
    "stage": 4,
    "name": "영원의 일식",
    "sourceIntent": "일식 시 큰 파티 회복, 최대 HP 아군에게 임시 방어 부여.",
    "sourceValueV01": "일식 성공 시 HP가 낮은 아군 최대 2명 각각 HP1 회복. 최대 HP 아군은 다음 직접 피해 1 감소.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 379,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_COMBAT",
        "priorResetScope": "COMBAT",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "POST_DAMAGE_PRE_DOWN"
    ],
    "timingPhase": "POST_DAMAGE_PRE_DOWN",
    "condition": {
      "expression": "SUN_ECLIPSE_VALID",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "OVERRIDE_SUN_HEAL_TARGET_COUNT",
          "value": 2,
          "healEach": 1,
          "replacesBaseHeal": true
        },
        {
          "op": "PROTECT_HIGHEST_CURRENT_HP_LIVING_ALLY",
          "value": 1,
          "merge": "MAX"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "damageComponents": [],
    "defenseTaxonomy": "REDUCTION",
    "healTaxonomy": "HEAL",
    "targetRule": "LOWEST_HP_2_HEALABLE_AND_HIGHEST_CURRENT_HP_LIVING",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-378.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady",
        "owner.sunMoon",
        "owner.celestialFlow",
        "owner.reincarnation"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_COMBAT",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "COMBAT",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "영원의 일식: SUN_ECLIPSE_VALID. {\"op\":\"OVERRIDE_SUN_HEAL_TARGET_COUNT\",\"value\":2,\"healEach\":1,\"replacesBaseHeal\":true}; {\"op\":\"PROTECT_HIGHEST_CURRENT_HP_LIVING_ALLY\",\"value\":1,\"merge\":\"MAX\"}. COMBAT 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "HEAL",
      "BLOOD_RESOURCE",
      "CELESTIAL_STATE",
      "NEXT_DIRECT_PROTECTION",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "firstcombatSunhealsup2lowestmissingHPallies1each,highestcurrentHPgetsprotection1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "secondSunusesbaseheal1;fullHPtargetsnotspentheal",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-379": {
    "augmentId": "aug-379",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "태양과 달",
    "stage": 4,
    "name": "핏빛 월식",
    "sourceIntent": "월식 공격을 크게 강화하고 조건부 추가 공격 효과.",
    "sourceValueV01": "월식 성공 추가 피해 +8. 해당 공격이 5 이상 카드면 추가 타격 3.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 380,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_COMBAT",
        "priorResetScope": "COMBAT",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": {
      "expression": "MOON_ECLIPSE_VALID",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "OVERRIDE_MOON_BONUS",
          "value": 8,
          "replaces": "base4 or3736"
        },
        {
          "op": "IF_FINAL_AT_LEAST_ADD_EXTRA_COMPONENT",
          "threshold": 5,
          "value": 3,
          "createsSeparateHit": false
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "EXTRA_DAMAGE_COMPONENT",
    "damageComponents": [
      {
        "operation": "OVERRIDE_MOON_BONUS",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-379.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady",
        "owner.sunMoon",
        "owner.celestialFlow",
        "owner.reincarnation"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_COMBAT",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "COMBAT",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "핏빛 월식: MOON_ECLIPSE_VALID. {\"op\":\"OVERRIDE_MOON_BONUS\",\"value\":8,\"replaces\":\"base4 or3736\"}; {\"op\":\"IF_FINAL_AT_LEAST_ADD_EXTRA_COMPONENT\",\"threshold\":5,\"value\":3,\"createsSeparateHit\":false}. COMBAT 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "CELESTIAL_STATE",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "firstMoonvalidFINAL5: bonus8+component3;secondusesowned3736orbase4",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "firstMoonFINAL4:8withoutcomponent3",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-380": {
    "augmentId": "aug-380",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "태양과 달",
    "stage": 4,
    "name": "천체윤회",
    "sourceIntent": "일식/월식을 번갈아 진입할수록 윤회 강화. 일식에는 공격 일부, 월식에는 회복 일부가 섞임.",
    "sourceValueV01": "직전과 반대 종류의 식 진입 시 윤회 +1(최대3). 윤회 1당 월식 추가 피해 +1, 일식 후 보호 대상 +1명.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 381,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "COMBAT",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "POST_DAMAGE_AND_PRE_DAMAGE"
    ],
    "timingPhase": "POST_DAMAGE_AND_PRE_DAMAGE",
    "condition": {
      "expression": "ENTER_OPPOSITE_ECLIPSE_OR_ECLIPSE_VALID",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_STACK_ON_OPPOSITE_ENTRY",
          "key": "reincarnation",
          "value": 1,
          "cap": 3
        },
        {
          "op": "MOON_ADD_DAMAGE_PER_STACK",
          "value": 1
        },
        {
          "op": "SUN_PROTECT_ADDITIONAL_DISTINCT_TARGETS",
          "targetsPerStack": 1,
          "protection": 1,
          "merge": "MAX_WITH_AUG_372"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "MOON_ADD_DAMAGE_PER_STACK",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "REDUCTION",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "PARTY_LIVING_DISTINCT_PROTECTION_TARGETS",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-380.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "reincarnation": {
          "type": "NON_NEGATIVE_INTEGER",
          "initial": 0,
          "cap": 3,
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "transition": {
            "op": "GAIN_STACK_ON_OPPOSITE_ENTRY",
            "key": "reincarnation",
            "value": 1,
            "cap": 3
          }
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady",
        "owner.sunMoon",
        "owner.celestialFlow",
        "owner.reincarnation"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 3,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "천체윤회: ENTER_OPPOSITE_ECLIPSE_OR_ECLIPSE_VALID. {\"op\":\"GAIN_STACK_ON_OPPOSITE_ENTRY\",\"key\":\"reincarnation\",\"value\":1,\"cap\":3}; {\"op\":\"MOON_ADD_DAMAGE_PER_STACK\",\"value\":1}; {\"op\":\"SUN_PROTECT_ADDITIONAL_DISTINCT_TARGETS\",\"targetsPerStack\":1,\"protection\":1,\"merge\":\"MAX_WITH_AUG_372\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "ADD_DAMAGE",
      "CELESTIAL_STATE",
      "NEXT_DIRECT_PROTECTION",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "oppositeentryring2->3;nextMoonextra3;Sunprotectsup3lowestdistinctaliveallies",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "samekindentrynogain;372duplicateprotectedtargetreceives1not2",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-381": {
    "augmentId": "aug-381",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "공중 곡예",
    "stage": 1,
    "name": "공중 곡예",
    "sourceIntent": "곡예 재충전 조건을 새 사이클 완료 대신 유효 성공 3회로 변경. 곡예 직후 첫 유효 공격 강화.",
    "sourceValueV01": "곡예 재충전 = 유효 공격 3회. 곡예 직후 첫 유효 공격 추가 피해 +2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 382,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "COMBAT",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "SELECTION_OPEN_AND_VALIDITY"
    ],
    "timingPhase": "SELECTION_OPEN_AND_VALIDITY",
    "condition": {
      "expression": "ACROBATICS_USED_OR_OWNER_PRIMARY_VALID",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "OVERRIDE_ACROBATICS_RECHARGE",
          "validAttacks": 3,
          "naturalCycleRecharge": false
        },
        {
          "op": "ON_ACROBATICS_RESET_PROGRESS",
          "value": 0,
          "predicate": "ACROBATICS_USED"
        },
        {
          "op": "ARM_FIRST_POST_ACROBATICS_VALID_DAMAGE",
          "value": 2,
          "charges": 1,
          "predicate": "ACROBATICS_USED"
        },
        {
          "op": "VALID_ATTACK_PROGRESS",
          "value": 1,
          "cap": 3,
          "predicate": "OWNER_PRIMARY_VALID && !acrobaticsReady"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ARM_FIRST_POST_ACROBATICS_VALID_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-381.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "OVERRIDE_ACROBATICS_RECHARGE",
              "validAttacks": 3,
              "naturalCycleRecharge": false
            },
            {
              "op": "ON_ACROBATICS_RESET_PROGRESS",
              "value": 0
            },
            {
              "op": "ARM_FIRST_POST_ACROBATICS_VALID_DAMAGE",
              "value": 2,
              "charges": 1
            },
            {
              "op": "VALID_ATTACK_PROGRESS",
              "value": 1,
              "cap": 3
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 3,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "공중 곡예: ACROBATICS_USED_OR_OWNER_PRIMARY_VALID. {\"op\":\"OVERRIDE_ACROBATICS_RECHARGE\",\"validAttacks\":3,\"naturalCycleRecharge\":false}; {\"op\":\"ON_ACROBATICS_RESET_PROGRESS\",\"value\":0}; {\"op\":\"ARM_FIRST_POST_ACROBATICS_VALID_DAMAGE\",\"value\":2,\"charges\":1}; {\"op\":\"VALID_ATTACK_PROGRESS\",\"value\":1,\"cap\":3}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "DELAYED_EFFECT",
      "ACROBATICS_RESET",
      "RESOURCE_STACK",
      "ADD_DAMAGE",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "Acrobatics->progress0;firstvalid+2/progress1;thirdvalidreadytrue",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "collisionno progress/no firstvalidchargeconsumption",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        },
        {
          "case": "HIGH_RISK_BOUNDARY",
          "givenWhenThen": "Acrobatics->progress0;firstvalid+2/progress1;thirdvalidreadytrue; then collisionno progress/no firstvalidchargeconsumption",
          "expected": "Respect snapshots, threshold boundary, scoped target and the explicit alternative outcome.",
          "highRiskTest": true
        },
        {
          "case": "MULTI_OWNER_AND_SAME_ROOT",
          "given": "Two owners of this card act in one root with separate stateKey namespaces.",
          "expected": "No cross-owner counter/resource consumption; deterministic seat/playerId ordering, no recursive extra hit."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "EXECUTABLE",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {
      "rechargeValidAttacks": 3,
      "postAcrobaticsFirstValidBonusDamage": 2
    }
  },
  "aug-382": {
    "augmentId": "aug-382",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "공중 곡예",
    "stage": 2,
    "name": "높이 더!",
    "sourceIntent": "곡예 직후 첫 유효 공격 강화 효과 증가.",
    "sourceValueV01": "곡예 직후 첫 유효 공격 추가 피해 +2→+4.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 383,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "NOT_APPLICABLE",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": {
      "expression": "FIRST_VALID_AFTER_ACROBATICS",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "OVERRIDE_FIRST_ACROBATICS_BONUS",
    "effectValue": {
      "operations": [
        {
          "op": "OVERRIDE_FIRST_ACROBATICS_BONUS",
          "value": 4,
          "replaces": 2
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "OVERRIDE_FIRST_ACROBATICS_BONUS",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-382.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "높이 더!: FIRST_VALID_AFTER_ACROBATICS. {\"op\":\"OVERRIDE_FIRST_ACROBATICS_BONUS\",\"value\":4,\"replaces\":2}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "ACROBATICS_RESET",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "firstvalidpostuseadds4not6",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "secondvalidwithout383nobonus",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-383": {
    "augmentId": "aug-383",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "공중 곡예",
    "stage": 2,
    "name": "연속 공중제비",
    "sourceIntent": "곡예 후 첫 두 번의 유효 공격 강화.",
    "sourceValueV01": "곡예 후 첫 2회의 유효 공격 각각 +2 피해.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 384,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "NOT_APPLICABLE",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": {
      "expression": "OWNER_PRIMARY_VALID && ACROBATICS_ACTIVATION_PRESENT && postAcrobaticsValidIndexAfter >= 1 && postAcrobaticsValidIndexAfter <= 2",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "SET_POST_ACROBATICS_DAMAGE_CHARGES",
    "effectValue": {
      "operations": [
        {
          "op": "SET_POST_ACROBATICS_DAMAGE_CHARGES",
          "charges": 2,
          "value": 2,
          "firstWith382": 4
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "SET_POST_ACROBATICS_DAMAGE_CHARGES",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-383.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "SET_POST_ACROBATICS_DAMAGE_CHARGES",
              "charges": 2,
              "value": 2,
              "firstWith382": 4
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 2,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "연속 공중제비: POST_ACROBATICS_VALID_INDEX <= 2. {\"op\":\"SET_POST_ACROBATICS_DAMAGE_CHARGES\",\"charges\":2,\"value\":2,\"firstWith382\":4}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "DELAYED_EFFECT",
      "ACROBATICS_RESET",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "382+383:firstvalid4,secondvalid2,third0",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "invalidattemptdoesnotadvancevalidindex",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-384": {
    "augmentId": "aug-384",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "공중 곡예",
    "stage": 2,
    "name": "안전 착지",
    "sourceIntent": "곡예 직후 첫 카드가 충돌해도 일부 재충전 진행도를 보존.",
    "sourceValueV01": "해당 재사용/충전 진행 +1.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 385,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_CYCLE",
        "priorResetScope": "CYCLE",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "VALIDITY"
    ],
    "timingPhase": "VALIDITY",
    "condition": {
      "expression": "FIRST_SUBMITTED_ATTACK_AFTER_ACROBATICS && OWNER_COLLISION",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "GAIN_ACROBATICS_PROGRESS",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_ACROBATICS_PROGRESS",
          "value": 1,
          "cap": "effectiveRechargeNeed"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "damageComponents": [],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-384.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "COMBAT",
          "reset": "CYCLE_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_CYCLE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "CYCLE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "안전 착지: FIRST_SUBMITTED_ATTACK_AFTER_ACROBATICS && OWNER_COLLISION. {\"op\":\"GAIN_ACROBATICS_PROGRESS\",\"value\":1,\"cap\":\"effectiveRechargeNeed\"}. CYCLE 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "ACROBATICS_RESET",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "firstpostusecardcollisionprogress0->1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "secondpostusecardcollision:no progress",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-385": {
    "augmentId": "aug-385",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "공중 곡예",
    "stage": 3,
    "name": "트리플 악셀",
    "sourceIntent": "곡예 재충전에 필요한 유효 성공 횟수 감소.",
    "sourceValueV01": "곡예 재충전 요구 유효 공격 3→2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 386,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "NOT_APPLICABLE",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "ACQUISITION"
    ],
    "timingPhase": "ACQUISITION",
    "condition": {
      "expression": "ON_ACQUIRE",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "SET_ACROBATICS_RECHARGE_NEED",
    "effectValue": {
      "operations": [
        {
          "op": "SET_ACROBATICS_RECHARGE_NEED",
          "value": 2
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "damageComponents": [],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-385.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "RUN",
          "reset": "NEVER_WITHIN_RUN"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "RUN",
          "reset": "NEVER_WITHIN_RUN"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "RUN",
          "reset": "NEVER_WITHIN_RUN",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "SET_ACROBATICS_RECHARGE_NEED",
              "value": 2
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 2,
    "consumeRule": {
      "onceGuard": "ONCE_AT_ACQUISITION",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "ACQUISITION",
    "resetScope": "NEVER_WITHIN_RUN",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "트리플 악셀: ON_ACQUIRE. {\"op\":\"SET_ACROBATICS_RECHARGE_NEED\",\"value\":2}. ACQUISITION 범위 제한. RUN 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "DELAYED_EFFECT",
      "ACROBATICS_RESET",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "twoeligiblevalidattacksafterAcrobaticsready",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "onevalidnotready",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-386": {
    "augmentId": "aug-386",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "공중 곡예",
    "stage": 3,
    "name": "아슬아슬한 묘기",
    "sourceIntent": "남은 카드가 적을 때 곡예를 쓰면 다음 공격 강화.",
    "sourceValueV01": "다음 유효 공격 추가 피해 +2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 387,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "COMBAT",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "005R_RESOLVED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "SELECTION_OPEN"
    ],
    "timingPhase": "SELECTION_OPEN",
    "condition": {
      "expression": "ACROBATICS_USED && remainingPhysicalBeforeReset <= 2",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ARM_NEXT_VALID_DAMAGE",
    "effectValue": {
      "operations": [
        {
          "op": "ARM_NEXT_VALID_DAMAGE",
          "value": 2,
          "charges": 1,
          "availableFrom": "AFTER_ACROBATICS",
          "merge": "MAX"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ARM_NEXT_VALID_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-386.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "ARM_NEXT_VALID_DAMAGE",
              "value": 2,
              "charges": 1,
              "availableFrom": "AFTER_ACROBATICS",
              "merge": "MAX"
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "아슬아슬한 묘기: ACROBATICS_USED && remainingPhysicalBeforeReset <= 2. {\"op\":\"ARM_NEXT_VALID_DAMAGE\",\"value\":2,\"charges\":1,\"availableFrom\":\"AFTER_ACROBATICS\",\"merge\":\"MAX\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "DELAYED_EFFECT",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "remaining2use:nextvalidextra2",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "remaining3use:no bonus",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-387": {
    "augmentId": "aug-387",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "공중 곡예",
    "stage": 3,
    "name": "공중 교대",
    "sourceIntent": "곡예 후 홀짝 교대 성공을 이어가면 추가 보너스.",
    "sourceValueV01": "조건 달성 시 추가 피해 +2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 388,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_TURN",
        "priorResetScope": "TURN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": {
      "expression": "POST_ACROBATICS_PRIMARY_VALID && postUseAlternatingPrintedParityStreakAfter >= 2",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "operations": [
        {
          "op": "ADD_DAMAGE",
          "value": 2
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ADD_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-387.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "TEMP",
          "reset": "TURN_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "postUseAlternatingPrintedParityStreak": {
          "type": "NON_NEGATIVE_INTEGER",
          "initial": 0,
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "updateRule": "POST_ACROBATICS_PRIMARY_VALID && postUseAlternatingPrintedParityStreakAfter >= 2",
          "cap": "UNBOUNDED_INTEGER"
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": "UNBOUNDED_INTEGER",
    "consumeRule": {
      "onceGuard": "ONCE_PER_TURN",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "TURN",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility.",
      "Final collision protection and VALIDITY resolved."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "공중 교대: POST_ACROBATICS_PRIMARY_VALID && postUseAlternatingPrintedParityStreakAfter >= 2. {\"op\":\"ADD_DAMAGE\",\"value\":2}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "printed1then2validafterAcrobatics:second+2",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "printed1then3valid:resetalternatingstreak1,nobonus",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-388": {
    "augmentId": "aug-388",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "공중 곡예",
    "stage": 4,
    "name": "끝없는 앙코르",
    "sourceIntent": "곡예 후 연속 유효 성공 조건을 만족하면 곡예를 즉시 재활성하고 다음 곡예 공격 강화.",
    "sourceValueV01": "곡예 후 연속 유효 3회 성공 시 곡예 즉시 재활성, 다음 곡예 직후 첫 공격 +2 추가.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 389,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "NOT_APPLICABLE",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "VALIDITY"
    ],
    "timingPhase": "VALIDITY",
    "condition": {
      "expression": "POST_ACROBATICS_CONSECUTIVE_VALID_STREAK_REACHES_3",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "REARM_ACROBATICS",
          "value": true,
          "maxProcsPerCombat": 2
        },
        {
          "op": "ARM_NEXT_ACROBATICS_FIRST_VALID_EXTRA",
          "value": 2,
          "charges": 1,
          "availableFrom": "NEXT_ACROBATICS_ACTIVATION"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "damageComponents": [],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-388.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "REARM_ACROBATICS",
              "value": true,
              "maxProcsPerCombat": 2
            },
            {
              "op": "ARM_NEXT_ACROBATICS_FIRST_VALID_EXTRA",
              "value": 2,
              "charges": 1,
              "availableFrom": "NEXT_ACROBATICS_ACTIVATION"
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        },
        "procCountCombat": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 2,
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "rule": "Gain1atqualifyingactivation'sfirststreak3, regardless alreadyReady; atmostonceactivation."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 2,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Maximum2 distinct procspercombat, atmostoneperAcrobaticsactivation. A failedpostuseattemptresetsstreak; later3consecutivevalidmayproc. Preserve next-useextra pending untilownerusesagain/combatend."
      ],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Maximum2 distinct procspercombat, atmostoneperAcrobaticsactivation. A failedpostuseattemptresetsstreak; later3consecutivevalidmayproc. Preserve next-useextra pending untilownerusesagain/combatend.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "끝없는 앙코르: POST_ACROBATICS_CONSECUTIVE_VALID_STREAK_REACHES_3. {\"op\":\"REARM_ACROBATICS\",\"value\":true,\"maxProcsPerCombat\":2}; {\"op\":\"ARM_NEXT_ACROBATICS_FIRST_VALID_EXTRA\",\"value\":2,\"charges\":1,\"availableFrom\":\"NEXT_ACROBATICS_ACTIVATION\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "DELAYED_EFFECT",
      "ACROBATICS_RESET",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "thirdconsecutivepostusevalidrearmsandarmsnextuseextra2,combatcount1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "thirdcombatprocblocked;rearmdoesnotautomaticallyuseAcrobatics",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-389": {
    "augmentId": "aug-389",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "공중 곡예",
    "stage": 4,
    "name": "낙하 피날레",
    "sourceIntent": "패가 거의 빈 상태에서 곡예를 쓰면 다음 유효 공격 매우 크게 강화.",
    "sourceValueV01": "손에 카드 1장 이하일 때 곡예 사용 후 다음 유효 공격 +6 피해.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 390,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_CYCLE",
        "priorResetScope": "CYCLE",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": []
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "SELECTION_OPEN"
    ],
    "timingPhase": "SELECTION_OPEN",
    "condition": {
      "expression": "ACROBATICS_USED && remainingPhysicalBeforeReset <= 1",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ARM_NEXT_VALID_DAMAGE",
    "effectValue": {
      "operations": [
        {
          "op": "ARM_NEXT_VALID_DAMAGE",
          "value": 6,
          "charges": 1,
          "availableFrom": "AFTER_ACROBATICS"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "ADD",
    "damageComponents": [
      {
        "operation": "ARM_NEXT_VALID_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-389.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": 1,
          "scope": "COMBAT",
          "reset": "CYCLE_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "pendingEffects": {
          "type": "ORDERED_TYPED_RECEIPTS",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "receiptFields": [
            "sourceAugmentId",
            "ownerPlayerId",
            "effectInstanceId",
            "createdRootActionId",
            "availableFrom",
            "targetPlayerIdOrEnemyId",
            "charges",
            "expiryTurnOrCycle"
          ],
          "creationAndConsumption": [
            {
              "op": "ARM_NEXT_VALID_DAMAGE",
              "value": 6,
              "charges": 1,
              "availableFrom": "AFTER_ACROBATICS"
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ONCE_PER_CYCLE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Once cycle uses the pre-reset cycle ID. Repeated requests cannot create charges in the newly reset cycle."
      ],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "CYCLE",
    "resetScope": "COMBAT_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Once cycle uses the pre-reset cycle ID. Repeated requests cannot create charges in the newly reset cycle.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "낙하 피날레: ACROBATICS_USED && remainingPhysicalBeforeReset <= 1. {\"op\":\"ARM_NEXT_VALID_DAMAGE\",\"value\":6,\"charges\":1,\"availableFrom\":\"AFTER_ACROBATICS\"}. CYCLE 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "DELAYED_EFFECT",
      "PARITY_ELIGIBILITY"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "remaining1usesAcrobatics:nextvalid+6;386distinct+2mayadd",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "remaining2:nobonus",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  },
  "aug-390": {
    "augmentId": "aug-390",
    "characterId": "twins",
    "classDisplay": "쌍둥이",
    "archetype": "공중 곡예",
    "stage": 4,
    "name": "하늘을 걷는 쌍둥이",
    "sourceIntent": "곡예 후 첫 여러 공격을 모두 유효하게 만들면 카드 복구와 거의 즉시 곡예 재충전.",
    "sourceValueV01": "곡예 후 첫 3회의 공격을 모두 유효 성공하면 사용 카드 1장 복구, 곡예 재충전 카운트 +1.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 391,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": {
          "perAcrobatics": "ONCE_PER_ACROBATICS_USE",
          "genericRecovery": "ONCE_PER_CYCLE"
        },
        "priorResetScope": "CYCLE",
        "priorPersistenceScope": "COMBAT"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D04"
      ],
      "closeoutAuthority": "PVE_CONTENT_005Q_DESIGN_D_CLOSEOUT_REQUEST",
      "fieldOrigins": {
        "sourceIntent": "SOURCE_EXPLICIT",
        "sourceValueV01": "SOURCE_EXPLICIT",
        "identityAndStage": "SOURCE_EXPLICIT",
        "roomApplicability": "005R_RESOLVED",
        "trigger": "BETA_V02_INFERRED",
        "condition": "BETA_V02_INFERRED",
        "effectValue": [
          "USER_CONFIRMED",
          "BETA_V02_INFERRED"
        ],
        "stateAndTiming": "BETA_V02_INFERRED",
        "onceScope": "BETA_V02_INFERRED",
        "resetAndPersistence": "BETA_V02_INFERRED",
        "visibility": "BETA_V02_INFERRED",
        "tests": "BETA_V02_INFERRED"
      },
      "note": "Original wording and BETA v0.1 values are quoted only as historical source; this overlay does not reclassify old rows. Exact user-confirmed subrules are referenced by ruleId; unprovided predicates/ordering/new numeric resource mappings are explicitly inferred.",
      "priorDecisionIds": [
        "Q08"
      ]
    },
    "sourceClassification": "USER_CONFIRMED",
    "trigger": [
      "POST_SPEND_PRE_CYCLE"
    ],
    "timingPhase": "POST_SPEND_PRE_CYCLE",
    "condition": {
      "expression": "FIRST_3_SUBMITTED_ATTACKS_AFTER_ACROBATICS_ALL_VALID",
      "context": "executionModel.conditions + baseCanonicals.twins",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "RECOVER_CARD",
          "fromZone": "SPENT",
          "toZone": "REMAINING",
          "eligibility": "OWNER_NORMAL_RECOVERABLE_PHYSICAL_CARD",
          "selector": "MOST_RECENT_SPENT_SEQUENCE_DESC_THEN_CARD_INSTANCE_ID_ASC",
          "sameInstance": true,
          "count": 1,
          "ordering": "AFTER_CURRENT_SPEND_BEFORE_CYCLE_ADVANCE"
        },
        {
          "op": "GAIN_ACROBATICS_PROGRESS",
          "value": 1,
          "cap": "effectiveRechargeNeed"
        }
      ],
      "atomic": true,
      "operationOrder": "LIST_ORDER_WITH_DECLARED_PHASE_BRANCHES",
      "noDerivedRetrigger": true,
      "branchRule": "Passive overrides apply while owned. Explicit event/predicate operations use that event independently; pending receipts execute later per executionModel.delayedEffects. Unlabelled immediate operations require the card condition and run in list order."
    },
    "damageTaxonomy": "NOT_APPLICABLE",
    "damageComponents": [],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_RECOVERABLE_PHYSICAL_CARD",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-390.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "COMBAT_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "COMBAT",
          "reset": "COMBAT_END"
        },
        "firstThreeAttemptWindow": {
          "type": "RECORD",
          "initial": {
            "attemptCount": 0,
            "allValid": true,
            "procUsed": false
          },
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "rule": "Reset onlyonnewAcrobaticsactivationId; count primarysubmitted attempts includinginvalid; failurelatchneverreopens."
        }
      },
      "resourceRefs": [
        "owner.requiredParity",
        "owner.physicalPool",
        "owner.acrobaticsReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Once perAcrobaticsactivationId. Eligibility excludes currently selected/submitted/in-flight cards, VANISHED_SOURCE, temporaryderivedcards andotherowners. The thirdjustresolvedcard is eligible after authoritative spend if no longer in-flight.",
        "If no eligibleSPENTcard, recovernone but stillgrantprogress1; do notgeneratea newphysicalcard. Recoverydoesnotcause anotherVALID orchargedattack."
      ],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
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
    "componentRoomApplicability": {
      "ALL_EFFECTS": {
        "COMBAT": true,
        "EVENT": false,
        "REWARD": false,
        "SHOP": false,
        "REST": false
      }
    },
    "orderingBefore": [
      "Capture authoritative owner/target/snapshot and room eligibility."
    ],
    "orderingAfter": [
      "Apply operation branch at its named phase atomically with journal.",
      "Do not retrigger a player submission, collision group, ON_VALID or ON_HIT from derived effects.",
      "Evaluate natural cycle completion after recovery."
    ],
    "visibility": {
      "state": "OWNER_ONLY",
      "resolvedEffect": "PUBLIC",
      "guard": "SERVER_ONLY",
      "resources": "baseCanonicals.twins.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Once perAcrobaticsactivationId. Eligibility excludes currently selected/submitted/in-flight cards, VANISHED_SOURCE, temporaryderivedcards andotherowners. The thirdjustresolvedcard is eligible after authoritative spend if no longer in-flight.",
      "If no eligibleSPENTcard, recovernone but stillgrantprogress1; do notgeneratea newphysicalcard. Recoverydoesnotcause anotherVALID orchargedattack.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "하늘을 걷는 쌍둥이: FIRST_3_SUBMITTED_ATTACKS_AFTER_ACROBATICS_ALL_VALID. {\"op\":\"RECOVER_CARD\",\"fromZone\":\"SPENT\",\"toZone\":\"REMAINING\",\"eligibility\":\"OWNER_NORMAL_RECOVERABLE_PHYSICAL_CARD\",\"selector\":\"MOST_RECENT_SPENT_SEQUENCE_DESC_THEN_CARD_INSTANCE_ID_ASC\",\"sameInstance\":true,\"count\":1,\"ordering\":\"AFTER_CURRENT_SPEND_BEFORE_CYCLE_ADVANCE\"}; {\"op\":\"GAIN_ACROBATICS_PROGRESS\",\"value\":1,\"cap\":\"effectiveRechargeNeed\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "ACROBATICS_RESET",
      "PARITY_ELIGIBILITY",
      "RECOVER_RECENT_SPENT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "thirdpostuseattemptvalidandfirst2valid:recovermostrecenteligibleSPENTsameIDthenprogress+1clamp",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "anyfirst3attemptinvalid:neverprocforactivation;VANISHEDcardsineligible",
        "assertion": "Assert no forbidden gain/spend/protection/new card or extra event."
      },
      "edgeCases": [
        {
          "case": "WRONG_ROOM",
          "given": "Same trigger in a false roomApplicability room.",
          "expected": "No effect, no counter/RNG/consume; never add combat damage to reward ranking."
        },
        {
          "case": "RETRY",
          "given": "Same root/source/owner/effectInstance delivered twice.",
          "expected": "Exactly one effect and identical resource/zone results."
        },
        {
          "case": "RECONNECT",
          "given": "Disconnect after the positive transition.",
          "expected": "Restore exact state/IDs/guards, no initialization or replay."
        },
        {
          "case": "HIGH_RISK_BOUNDARY",
          "givenWhenThen": "thirdpostuseattemptvalidandfirst2valid:recovermostrecenteligibleSPENTsameIDthenprogress+1clamp; then anyfirst3attemptinvalid:neverprocforactivation;VANISHEDcardsineligible",
          "expected": "Respect snapshots, threshold boundary, scoped target and the explicit alternative outcome.",
          "highRiskTest": true
        },
        {
          "case": "MULTI_OWNER_AND_SAME_ROOT",
          "given": "Two owners of this card act in one root with separate stateKey namespaces.",
          "expected": "No cross-owner counter/resource consumption; deterministic seat/playerId ordering, no recursive extra hit."
        }
      ]
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "legacyRuntimeStatus": "DATA_ONLY",
    "balanceWarning": "NONE",
    "specialHandlers": [
      "TWINS_V02"
    ],
    "effects": [],
    "config": {}
  }
});
