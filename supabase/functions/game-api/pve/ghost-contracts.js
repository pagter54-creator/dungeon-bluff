export const GHOST_CONTRACTS=Object.freeze({
  "aug-331": {
    "augmentId": "aug-331",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "포식 귀참",
    "stage": 1,
    "name": "포식 귀참",
    "sourceIntent": "기존 런 장기 성장 구조를 안정 강화. 귀참 유효 성공이 다시 포식 성장에 기여해 순환을 부드럽게 함.",
    "sourceValueV01": "귀참 유효 성공 시 포식 +1 추가 획득.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 332,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_GHOST_SLASH",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "VALID_GHOST_SLASH",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "GAIN_DEVOUR",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_DEVOUR",
          "value": 1,
          "extra": true
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
    "stateKey": "designD.aug-331.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "포식 귀참: VALID_GHOST_SLASH. {\"op\":\"GAIN_DEVOUR\",\"value\":1,\"extra\":true}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "validSlashbasegain1 plus331extra1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "invalidSlash grants0extra",
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
          "givenWhenThen": "validSlashbasegain1 plus331extra1; then invalidSlash grants0extra",
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
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {
      "extraDevourOnValidGhostSlash": 1,
      "levelThreshold": 8
    }
  },
  "aug-332": {
    "augmentId": "aug-332",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "포식 귀참",
    "stage": 2,
    "name": "탐식",
    "sourceIntent": "유효 공격으로 얻는 포식량 증가.",
    "sourceValueV01": "일반 유효 공격 포식 획득 +1 추가.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 333,
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
        "D03"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "NORMAL_VALID_NON_SLASH",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "GAIN_DEVOUR",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_DEVOUR",
          "value": 1,
          "extra": true
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
    "stateKey": "designD.aug-332.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "탐식: NORMAL_VALID_NON_SLASH. {\"op\":\"GAIN_DEVOUR\",\"value\":1,\"extra\":true}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "normalvalidbase1 plus332extra1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "Slashattacknoteligible",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-333": {
    "augmentId": "aug-333",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "포식 귀참",
    "stage": 2,
    "name": "막타 본능",
    "sourceIntent": "처치 턴 기여 시 포식 보너스 증가. 최고 피해까지 달성하면 추가 보너스.",
    "sourceValueV01": "처치 턴 유효 기여 시 포식 +2 추가, 그 턴 최고 피해자면 추가 +1.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 334,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_MONSTER",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "ENEMY_KILLED_THIS_ROOT && OWNER_VALID_CONTRIBUTOR",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_DEVOUR",
          "value": 2,
          "extra": true
        },
        {
          "op": "IF_JOINT_TOP_DAMAGE_GAIN_DEVOUR",
          "value": 1,
          "extra": true
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
        "operation": "IF_JOINT_TOP_DAMAGE_GAIN_DEVOUR",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-333.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Once per enemy key; all equal positive top actual damage contributors qualify. Boss kill follows the same base totals."
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Once per enemy key; all equal positive top actual damage contributors qualify. Boss kill follows the same base totals.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "막타 본능: ENEMY_KILLED_THIS_ROOT && OWNER_VALID_CONTRIBUTOR. {\"op\":\"GAIN_DEVOUR\",\"value\":2,\"extra\":true}; {\"op\":\"IF_JOINT_TOP_DAMAGE_GAIN_DEVOUR\",\"value\":1,\"extra\":true}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL",
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "jointtopkillbase8 plus2+1=11 total; non-topkillbase4+2=6",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "no validcontribution: no gain",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-334": {
    "augmentId": "aug-334",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "포식 귀참",
    "stage": 2,
    "name": "칼날의 기억",
    "sourceIntent": "귀참 유효 성공 시 다음 귀참 레벨업에 필요한 포식 일부를 미리 채움.",
    "sourceValueV01": "귀참 유효 성공 시 다음 레벨업용 포식 +2 추가.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 335,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_GHOST_SLASH",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "VALID_GHOST_SLASH",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "GAIN_DEVOUR",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_DEVOUR",
          "value": 2,
          "extra": true
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
    "stateKey": "designD.aug-334.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "칼날의 기억: VALID_GHOST_SLASH. {\"op\":\"GAIN_DEVOUR\",\"value\":2,\"extra\":true}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "validSlash331+334 givesbase1+1+2=4",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "invalidSlashgives0",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-335": {
    "augmentId": "aug-335",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "포식 귀참",
    "stage": 3,
    "name": "끝없는 포식",
    "sourceIntent": "포식 임계치를 넘긴 초과분 일부를 다음 레벨업으로 이월.",
    "sourceValueV01": "귀참 레벨업 시 임계치를 넘긴 초과 포식을 최대 4까지 다음 레벨로 이월.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 336,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "DEVOUR_THRESHOLD_CONVERSION",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "PRESERVE_DEVOUR_OVERFLOW",
    "effectValue": {
      "operations": [
        {
          "op": "PRESERVE_DEVOUR_OVERFLOW",
          "discard": false,
          "sourceProtectedAmount": 4,
          "userOverride": "D03_ALL_REMAINDER_CARRIED"
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
    "stateKey": "designD.aug-335.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership.",
      "D03 general full overflow carry makes original max4 carry redundant. Preserve all remainder; do not tune or silently discard5+."
    ],
    "tooltipBetaV02": "끝없는 포식: DEVOUR_THRESHOLD_CONVERSION. {\"op\":\"PRESERVE_DEVOUR_OVERFLOW\",\"discard\":false,\"sourceProtectedAmount\":4,\"userOverride\":\"D03_ALL_REMAINDER_CARRIED\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "COMMAND_RESERVE",
      "PRE_COLLISION_SWAP",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "threshold8 input17: gain2levels remainder1, no loss",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "remainder5 is not truncatedto4 becauseD03higherpriority",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "BALANCE_WARNING_DESIGN_D",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-336": {
    "augmentId": "aug-336",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "포식 귀참",
    "stage": 3,
    "name": "피 냄새",
    "sourceIntent": "HP가 낮은 적을 공격할수록 귀참과 포식 획득 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 337,
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
        "D03"
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
      "PRE_DAMAGE_AND_POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "PRE_DAMAGE_AND_POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "OWNER_PRIMARY_VALID && enemyHPBefore * 2 <= enemyMaxHP",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_DEVOUR",
          "value": 1,
          "extra": true
        },
        {
          "op": "IF_VALID_SLASH_ADD_DAMAGE",
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
        "operation": "IF_VALID_SLASH_ADD_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-336.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "피 냄새: OWNER_PRIMARY_VALID && enemyHPBefore * 2 <= enemyMaxHP. {\"op\":\"GAIN_DEVOUR\",\"value\":1,\"extra\":true}; {\"op\":\"IF_VALID_SLASH_ADD_DAMAGE\",\"value\":2}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL",
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "enemyHP50%, validSlash: extraDamage2 andextraDevour1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "enemy51%HP: neitherbonus",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-337": {
    "augmentId": "aug-337",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "포식 귀참",
    "stage": 3,
    "name": "마검 숙련",
    "sourceIntent": "귀참 사용 후 일정 턴 일반 유효 공격도 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 338,
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
        "D03"
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
      "expression": "VALID_GHOST_SLASH",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ARM_NORMAL_ATTACK_WINDOW",
    "effectValue": {
      "operations": [
        {
          "op": "ARM_NORMAL_ATTACK_WINDOW",
          "damage": 2,
          "start": "NEXT_TURN",
          "durationTurns": 2,
          "refresh": "LATEST_EXPIRY"
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
    "stateKey": "designD.aug-337.ownerPlayerId",
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
              "op": "ARM_NORMAL_ATTACK_WINDOW",
              "damage": 2,
              "start": "NEXT_TURN",
              "durationTurns": 2,
              "refresh": "LATEST_EXPIRY"
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "마검 숙련: VALID_GHOST_SLASH. {\"op\":\"ARM_NORMAL_ATTACK_WINDOW\",\"damage\":2,\"start\":\"NEXT_TURN\",\"durationTurns\":2,\"refresh\":\"LATEST_EXPIRY\"}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "DELAYED_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "SlashT thennormalvalidT+1/+2 adds2",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "Slashwithinwindow orT+3normal: no damagebonus",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-338": {
    "augmentId": "aug-338",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "포식 귀참",
    "stage": 4,
    "name": "끝없는 식욕",
    "sourceIntent": "귀참 레벨업 후에도 포식 일부 유지해 다음 성장 가속.",
    "sourceValueV01": "귀참 레벨업 시 요구치 초과 포식 + 추가로 포식 2를 다음 레벨에 유지.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 339,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "DEVOUR_THRESHOLD_CONVERSION && externalGainLevels >= 1",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ADD_LEVEL_CARRY_DEVOUR",
    "effectValue": {
      "operations": [
        {
          "op": "ADD_LEVEL_CARRY_DEVOUR",
          "valuePerExternalLevel": 2,
          "bonusConversionGeneratesFurtherCarry": false
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
    "stateKey": "designD.aug-338.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Compute initial levels from old remainder plus this atomic external gain; add2 per initial level to remaining Devour, then convert any additional thresholds without additional338 grants. All additional real levels still rearmSlash."
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Compute initial levels from old remainder plus this atomic external gain; add2 per initial level to remaining Devour, then convert any additional thresholds without additional338 grants. All additional real levels still rearmSlash.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "끝없는 식욕: DEVOUR_THRESHOLD_CONVERSION && externalGainLevels >= 1. {\"op\":\"ADD_LEVEL_CARRY_DEVOUR\",\"valuePerExternalLevel\":2,\"bonusConversionGeneratesFurtherCarry\":false}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "threshold8 externalinput8 yieldslevel1,carry2; externalinput16 yields2levels,carry4",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "bonuscarryconversion cannot recursivelygenerateanother338bonus",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-339": {
    "augmentId": "aug-339",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "포식 귀참",
    "stage": 4,
    "name": "처형의 귀참",
    "sourceIntent": "적 HP가 낮을수록 귀참 피해 크게 증가, 처치 성공 시 포식 대량 획득.",
    "sourceValueV01": "적 HP 25% 이하에서 귀참 추가 피해 +5. 처치 시 포식 +3.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 340,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "ONCE_PER_MONSTER",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03"
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
      "PRE_DAMAGE_AND_POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "PRE_DAMAGE_AND_POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "VALID_GHOST_SLASH && enemyHPBefore * 4 <= enemyMaxHP",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "ADD_DAMAGE",
          "value": 5
        },
        {
          "op": "IF_THIS_SLASH_ROOT_KILLS_GAIN_DEVOUR",
          "value": 3,
          "extra": true
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
    "stateKey": "designD.aug-339.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Once per enemy reservation shared by damage and its same-root kill attachment. A repeated request cannot repay3."
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Once per enemy reservation shared by damage and its same-root kill attachment. A repeated request cannot repay3.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "처형의 귀참: VALID_GHOST_SLASH && enemyHPBefore * 4 <= enemyMaxHP. {\"op\":\"ADD_DAMAGE\",\"value\":5}; {\"op\":\"IF_THIS_SLASH_ROOT_KILLS_GAIN_DEVOUR\",\"value\":3,\"extra\":true}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "lowHPSlashkill: bonus5 andDevourextra3",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "normalattackkillorHP26%Slash: no effect",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-340": {
    "augmentId": "aug-340",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "포식 귀참",
    "stage": 4,
    "name": "마검의 주인",
    "sourceIntent": "귀참 레벨이 일정 이상이면 일반 공격에도 귀참 일부 효과가 스며듦.",
    "sourceValueV01": "조건 달성 시 추가 피해 +2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 341,
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
        "D03"
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
      "expression": "NORMAL_VALID_NON_SLASH && ghostSlashLevelBefore >= 3",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
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
    "stateKey": "designD.aug-340.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "마검의 주인: NORMAL_VALID_NON_SLASH && ghostSlashLevelBefore >= 3. {\"op\":\"ADD_DAMAGE\",\"value\":2}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "level3normalvalidgets2",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "level2orSlash: no bonus",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-341": {
    "augmentId": "aug-341",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "굶주린 마검",
    "stage": 1,
    "name": "굶주린 마검",
    "sourceIntent": "귀참 레벨업 요구 포식을 감소시키는 대신 일정 기간 포식/유효 공격이 부족하면 귀참 레벨이 하락하는 '굶주림' 도입.",
    "sourceValueV01": "귀참 레벨업 요구 포식 8→6. 3턴 연속 포식을 1도 얻지 못하면 귀참 레벨 -1(최소 0).",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 342,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03"
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
      "ACQUISITION_AND_TURN_END"
    ],
    "timingPhase": "ACQUISITION_AND_TURN_END",
    "condition": {
      "expression": "ON_ACQUIRE_OR_COMBAT_TURN_END",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "SET_DEVOUR_THRESHOLD",
          "value": 6,
          "passive": true
        },
        {
          "op": "HUNGER_LEVEL_DROP_AFTER_NO_GAIN_TURNS",
          "turns": 3,
          "drop": 1,
          "minLevel": 0,
          "resetAfterDrop": true
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
    "stateKey": "designD.aug-341.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "RUN_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "RUN",
          "reset": "RUN_END"
        },
        "noDevourGainTurns": {
          "type": "NON_NEGATIVE_INTEGER",
          "initial": 0,
          "scope": "RUN",
          "reset": "RUN_END",
          "updateRule": "ON_ACQUIRE_OR_COMBAT_TURN_END",
          "cap": "UNBOUNDED_INTEGER"
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.hungerCounters"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": "UNBOUNDED_INTEGER",
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "RUN-persist hunger counter is frozen outsideCOMBAT, never increments in Event/Reward/Shop/Rest. Real positive gains reset it; conversion/reconnect is not a gain. Leveldrop does not recompute level from historical total."
      ],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "NONE",
    "resetScope": "RUN_END",
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "RUN-persist hunger counter is frozen outsideCOMBAT, never increments in Event/Reward/Shop/Rest. Real positive gains reset it; conversion/reconnect is not a gain. Leveldrop does not recompute level from historical total.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "굶주린 마검: ON_ACQUIRE_OR_COMBAT_TURN_END. {\"op\":\"SET_DEVOUR_THRESHOLD\",\"value\":6,\"passive\":true}; {\"op\":\"HUNGER_LEVEL_DROP_AFTER_NO_GAIN_TURNS\",\"turns\":3,\"drop\":1,\"minLevel\":0,\"resetAfterDrop\":true}. 정의된 각 root/receipt에 1회. RUN 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "remainder5 gain1 convertslevel; threezero-gaincombatturnslevel2->1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "anypositiveDevourgain resetsnoGainTurns0",
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
          "givenWhenThen": "remainder5 gain1 convertslevel; threezero-gaincombatturnslevel2->1; then anypositiveDevourgain resetsnoGainTurns0",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-342": {
    "augmentId": "aug-342",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "굶주린 마검",
    "stage": 2,
    "name": "허기",
    "sourceIntent": "레벨업 요구 포식을 더 낮추지만 굶주림 조건도 더 엄격.",
    "sourceValueV01": "귀참 레벨업 요구 포식 6→5. 2턴 연속 포식 미획득 시 레벨 -1.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 343,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03"
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
      "ACQUISITION_AND_TURN_END"
    ],
    "timingPhase": "ACQUISITION_AND_TURN_END",
    "condition": {
      "expression": "ON_ACQUIRE_OR_COMBAT_TURN_END",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "SET_DEVOUR_THRESHOLD",
          "value": 5,
          "priority": 20
        },
        {
          "op": "HUNGER_LEVEL_DROP_AFTER_NO_GAIN_TURNS",
          "turns": 2,
          "drop": 1,
          "minLevel": 0,
          "resetAfterDrop": true,
          "replaces": "aug-341 hunger3"
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
    "stateKey": "designD.aug-342.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "RUN_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "RUN",
          "reset": "RUN_END"
        },
        "noDevourGainTurns": {
          "type": "NON_NEGATIVE_INTEGER",
          "initial": 0,
          "scope": "RUN",
          "reset": "RUN_END",
          "updateRule": "ON_ACQUIRE_OR_COMBAT_TURN_END",
          "cap": "UNBOUNDED_INTEGER"
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.hungerCounters"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": "UNBOUNDED_INTEGER",
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "NONE",
    "resetScope": "RUN_END",
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "허기: ON_ACQUIRE_OR_COMBAT_TURN_END. {\"op\":\"SET_DEVOUR_THRESHOLD\",\"value\":5,\"priority\":20}; {\"op\":\"HUNGER_LEVEL_DROP_AFTER_NO_GAIN_TURNS\",\"turns\":2,\"drop\":1,\"minLevel\":0,\"resetAfterDrop\":true,\"replaces\":\"aug-341 hunger3\"}. 정의된 각 root/receipt에 1회. RUN 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "twozero-gaincombatturnslevel2->1; threshold5",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "positivegainonsecondturn: no drop",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-343": {
    "augmentId": "aug-343",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "굶주린 마검",
    "stage": 2,
    "name": "핏빛 식사",
    "sourceIntent": "귀참 사용 성공 시 굶주림 유지 시간 연장.",
    "sourceValueV01": "귀참 유효 성공 시 굶주림 카운트 0으로 초기화.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 344,
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
        "D03"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "VALID_GHOST_SLASH",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "SET_HUNGER_COUNTER",
    "effectValue": {
      "operations": [
        {
          "op": "SET_HUNGER_COUNTER",
          "value": 0
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
    "stateKey": "designD.aug-343.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.hungerCounters"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "핏빛 식사: VALID_GHOST_SLASH. {\"op\":\"SET_HUNGER_COUNTER\",\"value\":0}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "hunger2 validSlash->0",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "invalidSlash leavescounterunchanged untilturn-endrule",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-344": {
    "augmentId": "aug-344",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "굶주린 마검",
    "stage": 2,
    "name": "포악한 칼날",
    "sourceIntent": "귀참 레벨 상승 때 일정 기간 공격력 추가 상승.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 345,
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
        "D03"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "GHOST_LEVEL_UP",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ARM_VALID_DAMAGE_WINDOW",
    "effectValue": {
      "operations": [
        {
          "op": "ARM_VALID_DAMAGE_WINDOW",
          "damage": 1,
          "start": "NEXT_TURN",
          "durationTurns": 2,
          "refresh": "LATEST_EXPIRY"
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
        "operation": "ARM_VALID_DAMAGE_WINDOW",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-344.ownerPlayerId",
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
              "op": "ARM_VALID_DAMAGE_WINDOW",
              "damage": 1,
              "start": "NEXT_TURN",
              "durationTurns": 2,
              "refresh": "LATEST_EXPIRY"
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.hungerCounters"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "포악한 칼날: GHOST_LEVEL_UP. {\"op\":\"ARM_VALID_DAMAGE_WINDOW\",\"damage\":1,\"start\":\"NEXT_TURN\",\"durationTurns\":2,\"refresh\":\"LATEST_EXPIRY\"}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "DELAYED_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "levelupT arms+1primaryvalidT+1/+2",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "T+3attackno bonus",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-345": {
    "augmentId": "aug-345",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "굶주린 마검",
    "stage": 3,
    "name": "폭식",
    "sourceIntent": "짧은 시간 포식을 여러 번 얻으면 귀참 레벨을 일시적으로 한 단계 높게 취급.",
    "sourceValueV01": "같은 턴/연속 2턴 안에 포식 3 이상 획득하면 다음 귀참을 레벨 +1로 취급.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 346,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "EXTERNAL_DEVOUR_GAIN && gainedThisTurnPlusPreviousCombatTurn >= 3",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ARM_NEXT_SLASH_EFFECTIVE_LEVEL",
    "effectValue": {
      "operations": [
        {
          "op": "ARM_NEXT_SLASH_EFFECTIVE_LEVEL",
          "value": 1,
          "charges": 1,
          "merge": "MAX",
          "actualLevelUnchanged": true
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
    "stateKey": "designD.aug-345.ownerPlayerId",
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
              "op": "ARM_NEXT_SLASH_EFFECTIVE_LEVEL",
              "value": 1,
              "charges": 1,
              "merge": "MAX",
              "actualLevelUnchanged": true
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.hungerCounters"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "폭식: EXTERNAL_DEVOUR_GAIN && gainedThisTurnPlusPreviousCombatTurn >= 3. {\"op\":\"ARM_NEXT_SLASH_EFFECTIVE_LEVEL\",\"value\":1,\"charges\":1,\"merge\":\"MAX\",\"actualLevelUnchanged\":true}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "DELAYED_EFFECT",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "rollingtwo-turngain3: nextvalidSlashleveltreated+1 thenchargegone",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "gains2: noarm; invalidSlashdoesnotconsume",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-346": {
    "augmentId": "aug-346",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "굶주린 마검",
    "stage": 3,
    "name": "기아의 분노",
    "sourceIntent": "귀참 레벨 하락 시 다음 공격에 강한 보너스를 얻어 실패를 일부 활용.",
    "sourceValueV01": "다음 유효 공격 추가 피해 +1.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 347,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03"
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
      "expression": "HUNGER_ACTUAL_LEVEL_DROP",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ARM_NEXT_VALID_DAMAGE",
    "effectValue": {
      "operations": [
        {
          "op": "ARM_NEXT_VALID_DAMAGE",
          "value": 1,
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
    "stateKey": "designD.aug-346.ownerPlayerId",
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
              "value": 1,
              "charges": 1,
              "availableFrom": "NEXT_ROOT_ACTION",
              "merge": "MAX"
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.hungerCounters"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "기아의 분노: HUNGER_ACTUAL_LEVEL_DROP. {\"op\":\"ARM_NEXT_VALID_DAMAGE\",\"value\":1,\"charges\":1,\"availableFrom\":\"NEXT_ROOT_ACTION\",\"merge\":\"MAX\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "DELAYED_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "level2->1armsnextvalid+1",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "level0clamped0isnotactualdropandnoarm",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-347": {
    "augmentId": "aug-347",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "굶주린 마검",
    "stage": 3,
    "name": "마검의 요구",
    "sourceIntent": "귀참을 일정 기간 쓰지 않으면 굶주림 가속, 사용 성공 시 포식 보너스 크게 증가.",
    "sourceValueV01": "조건 달성 시 추가 피해 +3.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 348,
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
        "D03"
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
      "TURN_END_AND_POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "TURN_END_AND_POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "COMBAT_TURN_END_OR_VALID_GHOST_SLASH",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "AFTER_SLASH_IDLE_TURNS_REDUCE_HUNGER_LIMIT",
          "turns": 3,
          "reduce": 1,
          "min": 1
        },
        {
          "op": "ON_VALID_SLASH_GAIN_DEVOUR",
          "value": 3,
          "extra": true
        },
        {
          "op": "ON_VALID_SLASH_RESET_IDLE_TURNS",
          "value": 0
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
    "stateKey": "designD.aug-347.ownerPlayerId",
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
        "slashIdleTurns": {
          "type": "NON_NEGATIVE_INTEGER",
          "initial": 0,
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "updateRule": "COMBAT_TURN_END_OR_VALID_GHOST_SLASH",
          "cap": "UNBOUNDED_INTEGER"
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.hungerCounters"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "마검의 요구: COMBAT_TURN_END_OR_VALID_GHOST_SLASH. {\"op\":\"AFTER_SLASH_IDLE_TURNS_REDUCE_HUNGER_LIMIT\",\"turns\":3,\"reduce\":1,\"min\":1}; {\"op\":\"ON_VALID_SLASH_GAIN_DEVOUR\",\"value\":3,\"extra\":true}; {\"op\":\"ON_VALID_SLASH_RESET_IDLE_TURNS\",\"value\":0}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL",
      "RESOURCE_STACK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "3combatturnsnoSlash reducesbase3hungerlimitto2; validSlashadds3Devour",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "invalidSlashdoesnotresetidleorgrantDevour",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-348": {
    "augmentId": "aug-348",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "굶주린 마검",
    "stage": 4,
    "name": "끝없는 허기",
    "sourceIntent": "레벨업 속도를 극단적으로 높이는 대신 고레벨일수록 굶주림도 강해짐.",
    "sourceValueV01": "귀참 레벨업 요구 포식 5→4. 귀참 레벨 3 이상에서는 포식 미획득 1턴마다 굶주림 1, 굶주림 2면 레벨 -1.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 349,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03"
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
      "ACQUISITION_AND_TURN_END"
    ],
    "timingPhase": "ACQUISITION_AND_TURN_END",
    "condition": {
      "expression": "ON_ACQUIRE_OR_COMBAT_TURN_END",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "SET_DEVOUR_THRESHOLD",
          "value": 4,
          "priority": 30
        },
        {
          "op": "HIGH_LEVEL_HUNGER_OVERRIDE",
          "minimumLevel": 3,
          "noGainTurnsToDrop": 2,
          "drop": 1,
          "resetAfterDrop": true
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
    "stateKey": "designD.aug-348.ownerPlayerId",
    "stateType": {
      "fields": {
        "onceCounter": {
          "type": "INTEGER",
          "initial": 0,
          "cap": "PER_ROOT",
          "scope": "TEMP",
          "reset": "RUN_END"
        },
        "effectJournal": {
          "type": "SET_OF_EFFECT_IDENTITIES",
          "initial": [],
          "scope": "RUN",
          "reset": "RUN_END"
        },
        "noDevourGainTurns": {
          "type": "NON_NEGATIVE_INTEGER",
          "initial": 0,
          "scope": "RUN",
          "reset": "RUN_END",
          "updateRule": "ON_ACQUIRE_OR_COMBAT_TURN_END",
          "cap": "UNBOUNDED_INTEGER"
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.hungerCounters"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": "UNBOUNDED_INTEGER",
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Threshold precedence3484 >3425 >3416 >base8. Exactly one hunger adapter runs;347 reduces the selected limit by1 withminimum1."
      ],
      "resource": "Refer exact per-operation consume, costs and baseCanonicals; ownership remains RUN."
    },
    "onceScope": "NONE",
    "resetScope": "RUN_END",
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Threshold precedence3484 >3425 >3416 >base8. Exactly one hunger adapter runs;347 reduces the selected limit by1 withminimum1.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "끝없는 허기: ON_ACQUIRE_OR_COMBAT_TURN_END. {\"op\":\"SET_DEVOUR_THRESHOLD\",\"value\":4,\"priority\":30}; {\"op\":\"HIGH_LEVEL_HUNGER_OVERRIDE\",\"minimumLevel\":3,\"noGainTurnsToDrop\":2,\"drop\":1,\"resetAfterDrop\":true}. 정의된 각 root/receipt에 1회. RUN 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "threshold4 converts; level3twozero-gainturns->2",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "level2usesowned342limit2or341limit3, notadditionalduplicatecounter",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-349": {
    "augmentId": "aug-349",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "굶주린 마검",
    "stage": 4,
    "name": "먹어치워라",
    "sourceIntent": "귀참으로 큰 피해/처치 시 레벨 하락 위험을 줄이고 포식 대량 획득.",
    "sourceValueV01": "조건 달성 시 추가 피해 +3.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 350,
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
        "D03"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "VALID_GHOST_SLASH && (ownerActualDamage >= 6 || THIS_ROOT_KILLED_ENEMY)",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_DEVOUR",
          "value": 3,
          "extra": true
        },
        {
          "op": "SET_HUNGER_COUNTER",
          "value": 0
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
    "stateKey": "designD.aug-349.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.hungerCounters"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "먹어치워라: VALID_GHOST_SLASH && (ownerActualDamage >= 6 || THIS_ROOT_KILLED_ENEMY). {\"op\":\"GAIN_DEVOUR\",\"value\":3,\"extra\":true}; {\"op\":\"SET_HUNGER_COUNTER\",\"value\":0}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "Slashactual6givesextraDevour3andresetcounter",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "raw6butactual5nonkill: no effect",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-350": {
    "augmentId": "aug-350",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "굶주린 마검",
    "stage": 4,
    "name": "굶주린 왕",
    "sourceIntent": "귀참 레벨이 오르내릴 때마다 광기를 쌓아 레벨 변동 자체가 공격력 증가로 연결.",
    "sourceValueV01": "조건 달성 시 추가 피해 +3.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 351,
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
        "D03"
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
      "POST_KILL_DEVOUR_CONVERSION_AND_TURN_END"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION_AND_TURN_END",
    "condition": {
      "expression": "GHOST_ACTUAL_LEVEL_CHANGED",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_STACK",
          "key": "madness",
          "value": 1,
          "cap": 3,
          "multipleLevelsInSameAtomicGain": "Aggregate actual level change events; at most one madness gain per turn per005R."
        },
        {
          "op": "PASSIVE_VALID_DAMAGE",
          "valueFrom": "madness",
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
    "stateKey": "designD.aug-350.ownerPlayerId",
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
        "madness": {
          "type": "NON_NEGATIVE_INTEGER",
          "initial": 0,
          "cap": 3,
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "transition": {
            "op": "GAIN_STACK",
            "key": "madness",
            "value": 1,
            "cap": 3,
            "multipleLevelsInSameAtomicGain": "Aggregate actual level change events; at most one madness gain per turn per005R."
          }
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.hungerCounters"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 3,
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "굶주린 왕: GHOST_ACTUAL_LEVEL_CHANGED. {\"op\":\"GAIN_STACK\",\"key\":\"madness\",\"value\":1,\"cap\":3,\"multipleLevelsInSameAtomicGain\":\"Aggregate actual level change events; at most one madness gain per turn per005R.\"}; {\"op\":\"PASSIVE_VALID_DAMAGE\",\"valueFrom\":\"madness\",\"eligibleFrom\":\"NEXT_ROOT_ACTION\"}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "levelupgain1madness thennextvalid+1; thirdchange cap3",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "effective-level345bonusnotactualchange anddoesnotgainmadness",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-351": {
    "augmentId": "aug-351",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "해방된 귀검",
    "stage": 1,
    "name": "해방된 귀검",
    "sourceIntent": "귀참을 '귀화'로 교체. 포식은 전투 시작/종료 시 0으로 초기화되며 전투 중 채워 변신. 귀화 중 공격적인 특수 카드풀 사용.",
    "sourceValueV01": "포식은 전투마다 0 시작. 포식 6 도달 시 귀화 가능. 귀화 카드풀 2/4/5/6으로 교체되며 4장 모두 사용하면 원래 카드풀로 복귀.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 352,
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
        "D03",
        "D07"
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
      "SELECTION_OPEN_AND_CYCLE_END"
    ],
    "timingPhase": "SELECTION_OPEN_AND_CYCLE_END",
    "condition": {
      "expression": "TRANSFORMATION_MANUAL_ACTIVATION_OR_EXIT",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "BASE_RULE_OVERRIDE",
          "key": "ghostSlashSkill",
          "value": "MANUAL_TRANSFORMATION"
        },
        {
          "op": "SET_TRANSFORMATION_READY",
          "threshold": 6,
          "automatic": false
        },
        {
          "op": "ACTIVATE_TRANSFORMATION",
          "cost": 6,
          "window": "SELECTION_OPEN_BEFORE_FINAL_SUBMIT",
          "replaceNormalCycle": true,
          "pool": [
            2,
            4,
            5,
            6
          ],
          "event": "OWNER_MANUAL_TRANSFORMATION_ACTIVATION"
        },
        {
          "op": "EXIT_TRANSFORMATION",
          "usedCount": 4,
          "setDevour": 0,
          "newNormalCycle": true,
          "event": "TRANSFORMED_POOL_ALL_USED"
        },
        {
          "op": "COMBAT_BOUNDARY_RESET_TRANSFORM_DEVOUR",
          "value": 0,
          "event": "COMBAT_START_OR_COMBAT_END"
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
    "targetRule": "OWNER_PHYSICAL_POOL",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-351.ownerPlayerId",
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
        "transformationActivationId": {
          "type": "OPTIONAL_STABLE_ID",
          "initial": "ABSENT",
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "rule": "Persist successful manualactivation and reuse itsphysicalIDs onretry/reconnect."
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.transformationState",
        "owner.physicalPool"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 1,
    "consumeRule": {
      "onceGuard": "ROOT_EFFECT_ONCE",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "While351owned, Devour is transformation fuel: normal threshold-to-Slash conversion/rearm is disabled, so threshold6 cannot consume fuel before manual activation. Build-specific gains stillapply; no Slash skill exists.",
        "Combatstart/endsetDevour0 evenifnottransformed. D07takesprecedenceoverD03RUNcarry inthisbuild."
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "While351owned, Devour is transformation fuel: normal threshold-to-Slash conversion/rearm is disabled, so threshold6 cannot consume fuel before manual activation. Build-specific gains stillapply; no Slash skill exists.",
      "Combatstart/endsetDevour0 evenifnottransformed. D07takesprecedenceoverD03RUNcarry inthisbuild.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "해방된 귀검: TRANSFORMATION_MANUAL_ACTIVATION_OR_EXIT. {\"op\":\"BASE_RULE_OVERRIDE\",\"key\":\"ghostSlashSkill\",\"value\":\"MANUAL_TRANSFORMATION\"}; {\"op\":\"SET_TRANSFORMATION_READY\",\"threshold\":6,\"automatic\":false}; {\"op\":\"ACTIVATE_TRANSFORMATION\",\"cost\":6,\"window\":\"SELECTION_OPEN_BEFORE_FINAL_SUBMIT\",\"replaceNormalCycle\":true,\"pool\":[2,4,5,6]}; {\"op\":\"EXIT_TRANSFORMATION\",\"usedCount\":4,\"setDevour\":0,\"newNormalCycle\":true}; {\"op\":\"COMBAT_BOUNDARY_RESET_TRANSFORM_DEVOUR\",\"value\":0}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "TRANSFORMATION_ADAPTER",
      "PHYSICAL_TRANSFORMED_POOL",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "Devour7 pre-submit manualactivation spends6 leaves1,newpool2/4/5/6;4used exitsDevour0/newnormalcycle",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "Devour6duringresolveonlyarmsready; noautomatictransform; aftersubmitactivationrejected",
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
          "givenWhenThen": "Devour7 pre-submit manualactivation spends6 leaves1,newpool2/4/5/6;4used exitsDevour0/newnormalcycle; then Devour6duringresolveonlyarmsready; noautomatictransform; aftersubmitactivationrejected",
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
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {
      "transformThreshold": 6,
      "transformedDeck": [
        2,
        4,
        5,
        6
      ],
      "resetDevourOnCombat": true,
      "returnAfterCardsUsed": 4
    }
  },
  "aug-352": {
    "augmentId": "aug-352",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "해방된 귀검",
    "stage": 2,
    "name": "귀기의 응축",
    "sourceIntent": "포식 획득량 증가로 귀화 진입 가속.",
    "sourceValueV01": "해방된 귀검의 포식 획득량 +1(유효 공격당 총 2).",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 353,
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
        "D03",
        "D07"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "OWNER_PRIMARY_VALID && HAS_AUG_351",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "GAIN_TRANSFORMATION_DEVOUR",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_TRANSFORMATION_DEVOUR",
          "value": 1,
          "extra": true,
          "baseTotalWithoutOtherBonuses": 2
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
    "stateKey": "designD.aug-352.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.transformationState",
        "owner.physicalPool"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "귀기의 응축: OWNER_PRIMARY_VALID && HAS_AUG_351. {\"op\":\"GAIN_TRANSFORMATION_DEVOUR\",\"value\":1,\"extra\":true,\"baseTotalWithoutOtherBonuses\":2}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL",
      "TRANSFORMATION_ADAPTER",
      "PHYSICAL_TRANSFORMED_POOL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "normalortransformedvalidattackbase1+extra1=2fuel",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "invalidattackgives0fuel",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-353": {
    "augmentId": "aug-353",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "해방된 귀검",
    "stage": 2,
    "name": "핏빛 개안",
    "sourceIntent": "귀화 진입 직후 첫 공격 크게 강화.",
    "sourceValueV01": "조건 달성 시 추가 피해 +2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 354,
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
        "D03",
        "D07"
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
      "expression": "TRANSFORMED_VALID && firstValidAfterTransformationPending",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "ADD_DAMAGE",
          "value": 2
        },
        {
          "op": "CONSUME_FIRST_TRANSFORM_VALID_FLAG"
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
    "stateKey": "designD.aug-353.ownerPlayerId",
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
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.transformationState",
        "owner.physicalPool"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "핏빛 개안: TRANSFORMED_VALID && firstValidAfterTransformationPending. {\"op\":\"ADD_DAMAGE\",\"value\":2}; {\"op\":\"CONSUME_FIRST_TRANSFORM_VALID_FLAG\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "ADD_DAMAGE",
      "TRANSFORMATION_ADAPTER",
      "PHYSICAL_TRANSFORMED_POOL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "firsttransformedcardcollisionretainsflag; nextvalidadds2thenconsumes",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "secondvalidgets0",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-354": {
    "augmentId": "aug-354",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "해방된 귀검",
    "stage": 2,
    "name": "억눌린 마검",
    "sourceIntent": "귀화 전 일반 상태에서 유효 공격 연속 성공 시 추가 포식.",
    "sourceValueV01": "조건 달성 시 추가 피해 +1.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 355,
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
        "D03",
        "D07"
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
      "POST_KILL_DEVOUR_CONVERSION"
    ],
    "timingPhase": "POST_KILL_DEVOUR_CONVERSION",
    "condition": {
      "expression": "NORMAL_VALID && HAS_AUG_351 && normalValidStreakAfter >= 2",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "GAIN_TRANSFORMATION_DEVOUR",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_TRANSFORMATION_DEVOUR",
          "value": 1,
          "extra": true
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
    "stateKey": "designD.aug-354.ownerPlayerId",
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
        "normalValidStreak": {
          "type": "NON_NEGATIVE_INTEGER",
          "initial": 0,
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "updateRule": "NORMAL_VALID && HAS_AUG_351 && normalValidStreakAfter >= 2",
          "cap": "UNBOUNDED_INTEGER"
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.transformationState",
        "owner.physicalPool"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": "UNBOUNDED_INTEGER",
    "consumeRule": {
      "onceGuard": "ONCE_PER_TURN",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Reset normal streak on any invalid primary attempt, transformation entry, room/combat transition. Recovery is not an attack and neither increments nor resets it."
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Reset normal streak on any invalid primary attempt, transformation entry, room/combat transition. Recovery is not an attack and neither increments nor resets it.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "억눌린 마검: NORMAL_VALID && HAS_AUG_351 && normalValidStreakAfter >= 2. {\"op\":\"GAIN_TRANSFORMATION_DEVOUR\",\"value\":1,\"extra\":true}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL",
      "TRANSFORMATION_ADAPTER",
      "PHYSICAL_TRANSFORMED_POOL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "secondconsecutivenormalvalidgivesextra1fuel",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "collisionorOTHERinvalidresetsstreak; transformedattackcannotgainthisbonus",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-355": {
    "augmentId": "aug-355",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "해방된 귀검",
    "stage": 3,
    "name": "귀화 연장",
    "sourceIntent": "귀화 지속 시간 또는 전용 카드 사용 횟수 증가.",
    "sourceValueV01": "귀화 카드풀에 3 카드 1장을 추가해 5장(2/3/4/5/6)으로 변경.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 356,
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
        "D03",
        "D07"
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
      "TRANSFORMATION_CREATE"
    ],
    "timingPhase": "TRANSFORMATION_CREATE",
    "condition": {
      "expression": "TRANSFORMATION_CREATE",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "OVERRIDE_TRANSFORM_POOL",
    "effectValue": {
      "operations": [
        {
          "op": "OVERRIDE_TRANSFORM_POOL",
          "value": [
            2,
            3,
            4,
            5,
            6
          ],
          "priority": 20,
          "completionUses": 5
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
    "targetRule": "OWNER_PHYSICAL_POOL",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-355.ownerPlayerId",
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
        "transformationActivationId": {
          "type": "OPTIONAL_STABLE_ID",
          "initial": "ABSENT",
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "rule": "Persist successful manualactivation and reuse itsphysicalIDs onretry/reconnect."
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.transformationState",
        "owner.physicalPool"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "귀화 연장: TRANSFORMATION_CREATE. {\"op\":\"OVERRIDE_TRANSFORM_POOL\",\"value\":[2,3,4,5,6],\"priority\":20,\"completionUses\":5}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "TRANSFORMATION_ADAPTER",
      "PHYSICAL_TRANSFORMED_POOL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "activationcreates5uniquephysicalcards;4usednotexit;5usedexit",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "no standalonePRE_DAMAGEeffect;358owneduses358pool",
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
          "givenWhenThen": "activationcreates5uniquephysicalcards;4usednotexit;5usedexit; then no standalonePRE_DAMAGEeffect;358owneduses358pool",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-356": {
    "augmentId": "aug-356",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "해방된 귀검",
    "stage": 3,
    "name": "악귀의 검무",
    "sourceIntent": "귀화 중 연속 유효 성공 시 공격력 지속 상승.",
    "sourceValueV01": "조건 달성 시 추가 피해 +2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 357,
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
        "D03",
        "D07"
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
      "expression": "TRANSFORMED_VALID",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "GAIN_STACK",
          "key": "transformedDance",
          "value": 1,
          "cap": 3
        },
        {
          "op": "ADD_DAMAGE",
          "formula": "2 * transformedDanceAfter"
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
    "stateKey": "designD.aug-356.ownerPlayerId",
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
        "transformedDance": {
          "type": "NON_NEGATIVE_INTEGER",
          "initial": 0,
          "cap": 3,
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "transition": {
            "op": "GAIN_STACK",
            "key": "transformedDance",
            "value": 1,
            "cap": 3
          }
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.transformationState",
        "owner.physicalPool"
      ]
    },
    "stackRule": "Clamp numeric resources to explicit effective cap; overflow discarded unless Devour D03carry. Shared keys merge by operation priority/MAX; independent cards add only when declared.",
    "stackCap": 3,
    "consumeRule": {
      "onceGuard": "ONCE_PER_TURN",
      "effect": "Consume only specified activation/validity/recovery/receipt conditions in effectValue; failed conditions cause no gain/spend.",
      "exceptions": [
        "Each consecutive valid transformed primaryattack grants1. Reset on invalid, transformexit andcombatend; no permanentstackbetweenactivations."
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Each consecutive valid transformed primaryattack grants1. Reset on invalid, transformexit andcombatend; no permanentstackbetweenactivations.",
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "악귀의 검무: TRANSFORMED_VALID. {\"op\":\"GAIN_STACK\",\"key\":\"transformedDance\",\"value\":1,\"cap\":3}; {\"op\":\"ADD_DAMAGE\",\"formula\":\"2 * transformedDanceAfter\"}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "firstvaliddance1bonus2; secondvaliddance2bonus4; thirdcap3bonus6",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "invalidresetsdance0anddealsnobonus",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-357": {
    "augmentId": "aug-357",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "해방된 귀검",
    "stage": 3,
    "name": "피의 문",
    "sourceIntent": "귀화 종료 후 포식 일부를 남겨 다음 귀화 준비 단축.",
    "sourceValueV01": "귀화 종료 시 포식 2 유지.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 358,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03",
        "D07"
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
      "TRANSFORMATION_EXIT"
    ],
    "timingPhase": "TRANSFORMATION_EXIT",
    "condition": {
      "expression": "NORMAL_TRANSFORMATION_EXIT",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "SET_DEVOUR",
    "effectValue": {
      "operations": [
        {
          "op": "SET_DEVOUR",
          "value": 2,
          "merge": "SET_ONCE_WITH_AUG_360"
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
    "stateKey": "designD.aug-357.ownerPlayerId",
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
        "transformationActivationId": {
          "type": "OPTIONAL_STABLE_ID",
          "initial": "ABSENT",
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "rule": "Persist successful manualactivation and reuse itsphysicalIDs onretry/reconnect."
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.transformationState",
        "owner.physicalPool"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "피의 문: NORMAL_TRANSFORMATION_EXIT. {\"op\":\"SET_DEVOUR\",\"value\":2,\"merge\":\"SET_ONCE_WITH_AUG_360\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "normalallcardsusedexitsetDevour2evenbeforeexit0",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "combatendingmidtransformforces0not2",
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
          "givenWhenThen": "normalallcardsusedexitsetDevour2evenbeforeexit0; then combatendingmidtransformforces0not2",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-358": {
    "augmentId": "aug-358",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "해방된 귀검",
    "stage": 4,
    "name": "완전 귀화",
    "sourceIntent": "귀화 전용 카드풀을 더 공격적으로 만들고 지속력도 강화.",
    "sourceValueV01": "귀화 카드풀을 3/4/5/6/6으로 변경.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 359,
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
        "D03",
        "D07"
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
      "TRANSFORMATION_CREATE"
    ],
    "timingPhase": "TRANSFORMATION_CREATE",
    "condition": {
      "expression": "TRANSFORMATION_CREATE",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "OVERRIDE_TRANSFORM_POOL",
    "effectValue": {
      "operations": [
        {
          "op": "OVERRIDE_TRANSFORM_POOL",
          "value": [
            3,
            4,
            5,
            6,
            6
          ],
          "priority": 30,
          "completionUses": 5
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
    "targetRule": "OWNER_PHYSICAL_POOL",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-358.ownerPlayerId",
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
        "transformationActivationId": {
          "type": "OPTIONAL_STABLE_ID",
          "initial": "ABSENT",
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "rule": "Persist successful manualactivation and reuse itsphysicalIDs onretry/reconnect."
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.transformationState",
        "owner.physicalPool"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "완전 귀화: TRANSFORMATION_CREATE. {\"op\":\"OVERRIDE_TRANSFORM_POOL\",\"value\":[3,4,5,6,6],\"priority\":30,\"completionUses\":5}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "TRANSFORMATION_ADAPTER",
      "PHYSICAL_TRANSFORMED_POOL"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "351+355+358createsexactly3/4/5/6/6fivedistinctIDs",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "noadditive6/7cardsfromcombiningoverrides",
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
          "givenWhenThen": "351+355+358createsexactly3/4/5/6/6fivedistinctIDs; then noadditive6/7cardsfromcombiningoverrides",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-359": {
    "augmentId": "aug-359",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "해방된 귀검",
    "stage": 4,
    "name": "백귀야행",
    "sourceIntent": "귀화 중 유효 공격 연속 성공 시 특수 추가 타격.",
    "sourceValueV01": "조건 달성 시 추가 피해 +3.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 360,
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
        "D03",
        "D07"
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
      "expression": "TRANSFORMED_VALID && transformedValidStreakAfter % 3 == 0",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "ADD_EXTRA_DAMAGE_COMPONENT",
    "effectValue": {
      "operations": [
        {
          "op": "ADD_EXTRA_DAMAGE_COMPONENT",
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
        "operation": "ADD_EXTRA_DAMAGE_COMPONENT",
        "taxonomy": "EXTRA_DAMAGE_COMPONENT"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-359.ownerPlayerId",
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
        "transformedValidStreak": {
          "type": "NON_NEGATIVE_INTEGER",
          "initial": 0,
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "updateRule": "TRANSFORMED_VALID && transformedValidStreakAfter % 3 == 0",
          "cap": "UNBOUNDED_INTEGER"
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.transformationState",
        "owner.physicalPool"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "백귀야행: TRANSFORMED_VALID && transformedValidStreakAfter % 3 == 0. {\"op\":\"ADD_EXTRA_DAMAGE_COMPONENT\",\"value\":3,\"createsSeparateHit\":false}. TURN 범위 제한. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "EXTRA_DAMAGE_COMPONENT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "thirdconsecutivevalidtransformedattackextra3",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "secondvalidorcollisionnoextra",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  },
  "aug-360": {
    "augmentId": "aug-360",
    "characterId": "demon_swordsman",
    "classDisplay": "귀검사",
    "archetype": "해방된 귀검",
    "stage": 4,
    "name": "인귀합일",
    "sourceIntent": "귀화 종료 후 포식 일부 유지, 일반 상태에서도 귀화 일부 효과를 잠시 계승.",
    "sourceValueV01": "귀화 종료 후 포식 2 유지, 이후 일반 상태 첫 2회의 유효 공격에 추가 피해 +2.",
    "provenance": {
      "sourceArtifact": {
        "path": "docs/pve-augment-beta-005d.json",
        "row": 361,
        "classification": "SOURCE_EXPLICIT",
        "workbookSha256": "53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a8e"
      },
      "resolutionArtifact": {
        "path": "docs/pve-augment-resolution-005d.json",
        "classification": "005R_RESOLVED",
        "priorOnceScope": "NONE",
        "priorResetScope": "RUN",
        "priorPersistenceScope": "RUN"
      },
      "userConfirmedArtifact": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
      "userConfirmedDecisionIds": [
        "D03",
        "D07"
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
      "TRANSFORMATION_EXIT_AND_PRE_DAMAGE"
    ],
    "timingPhase": "TRANSFORMATION_EXIT_AND_PRE_DAMAGE",
    "condition": {
      "expression": "NORMAL_TRANSFORMATION_EXIT_OR_NORMAL_VALID",
      "context": "executionModel.conditions + baseCanonicals.demon_swordsman",
      "primaryOnly": true,
      "roomGate": true
    },
    "effectType": "COMPOSITE_EFFECT",
    "effectValue": {
      "operations": [
        {
          "op": "ON_NORMAL_EXIT_SET_DEVOUR",
          "value": 2,
          "merge": "SET_ONCE_WITH_AUG_357",
          "event": "NORMAL_TRANSFORMATION_EXIT",
          "registeredHook": true
        },
        {
          "op": "ON_NORMAL_EXIT_ARM_NORMAL_DAMAGE",
          "charges": 2,
          "value": 2,
          "event": "NORMAL_TRANSFORMATION_EXIT",
          "registeredHook": true
        },
        {
          "op": "CONSUME_CHARGE_ON_NORMAL_VALID_ONLY",
          "event": "NORMAL_VALID",
          "registeredHook": true
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
        "operation": "ON_NORMAL_EXIT_ARM_NORMAL_DAMAGE",
        "taxonomy": "ADD"
      }
    ],
    "defenseTaxonomy": "NOT_APPLICABLE",
    "healTaxonomy": "NOT_APPLICABLE",
    "targetRule": "OWNER_OR_OPERATION_EXPLICIT_TARGET",
    "tieRule": "executionModel.tieRule",
    "stateKey": "designD.aug-360.ownerPlayerId",
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
              "op": "ON_NORMAL_EXIT_SET_DEVOUR",
              "value": 2,
              "merge": "SET_ONCE_WITH_AUG_357"
            },
            {
              "op": "ON_NORMAL_EXIT_ARM_NORMAL_DAMAGE",
              "charges": 2,
              "value": 2
            },
            {
              "op": "CONSUME_CHARGE_ON_NORMAL_VALID_ONLY"
            }
          ],
          "merge": "See explicit operation merge; otherwise replace same owner/card pending effect, neveraddcopies."
        },
        "transformationActivationId": {
          "type": "OPTIONAL_STABLE_ID",
          "initial": "ABSENT",
          "scope": "COMBAT",
          "reset": "COMBAT_END",
          "rule": "Persist successful manualactivation and reuse itsphysicalIDs onretry/reconnect."
        }
      },
      "resourceRefs": [
        "owner.devourRemainder",
        "owner.ghostSlashLevel",
        "owner.ghostSlashReady",
        "owner.transformationState",
        "owner.physicalPool"
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
      "resources": "baseCanonicals.demon_swordsman.visibility",
      "preReveal": "Owner-authorized only; no opponent hidden card/selected value exposure."
    },
    "reconnectRule": "Restore authoritative scoped fields, resources, physical IDs, once guards and receipts; no initialization, RNG, regrant, reconsume or recalculation from historical totals.",
    "idempotencyRule": "executionModel.idempotency; preserve root/source/owner/effectInstance identity. Multi-target operations use targetID subkeys; repeated requests return stored effect outcomes.",
    "interactionNotes": [
      "Apply class base canonical and crossClassMatrix; scope state separately from RUN ownership."
    ],
    "tooltipBetaV02": "인귀합일: NORMAL_TRANSFORMATION_EXIT_OR_NORMAL_VALID. {\"op\":\"ON_NORMAL_EXIT_SET_DEVOUR\",\"value\":2,\"merge\":\"SET_ONCE_WITH_AUG_357\"}; {\"op\":\"ON_NORMAL_EXIT_ARM_NORMAL_DAMAGE\",\"charges\":2,\"value\":2}; {\"op\":\"CONSUME_CHARGE_ON_NORMAL_VALID_ONLY\"}. 정의된 각 root/receipt에 1회. COMBAT 효과 상태.",
    "runtimePrimitivesRequired": [
      "ROOT_ACTION_GUARD",
      "RESOURCE_STACK",
      "DEVOUR_ADAPTER",
      "SLASH_LEVEL",
      "ADD_DAMAGE",
      "DELAYED_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": {
        "givenWhenThen": "normalexitset2arms2charges;collisionuses0charges;next2normalvalid+2each",
        "assertion": "Assert exact resource/zone/damage outcome above; do not substitute a metadata-only check."
      },
      "minimumNegativeCase": {
        "givenWhenThen": "transformedattackdoesnotconsume;combatendclearschargesandfuel0",
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
          "givenWhenThen": "normalexitset2arms2charges;collisionuses0charges;next2normalvalid+2each; then transformedattackdoesnotconsume;combatendclearschargesandfuel0",
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
    "legacyRuntimeStatus": "MISSING",
    "balanceWarning": "NONE",
    "source": "PVE_CONTENT_005Q_DESIGN_D",
    "executionRuleSource": "PVE_CONTENT_005Q_DESIGN_D",
    "effects": [],
    "specialHandlers": [
      "GHOST_V02"
    ],
    "config": {}
  }
});
