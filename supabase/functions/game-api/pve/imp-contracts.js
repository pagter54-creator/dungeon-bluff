// Generated from DESIGN-C; do not tune values here.
export const IMP_CONTRACTS=Object.freeze({
  "aug-181": {
    "augmentId": "aug-181",
    "name": "대담한 슬쩍",
    "classId": "imp",
    "archetype": "대담한 슬쩍",
    "stage": 1,
    "trigger": [
      "PRE_COLLISION",
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "One PRE_COLLISION_STEAL steals positive amount from >=2 distinct victims and owner attack valid.",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "한 턴에 2명 이상에게서 슬쩍에 성공하면 해당 턴 추가 피해 +2. 숫자 강탈로 증가한 카드 피해와 별도; 턴당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-181: satisfy '한 턴에 2명 이상에게서 슬쩍에 성공하면 해당 턴 추가 피해 +2' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-181: fail one condition/room/scope predicate and assert no effect or consumption.",
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
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "대담한 슬쩍",
      "stage": 1
    }
  },
  "aug-182": {
    "augmentId": "aug-182",
    "name": "두 손 가득",
    "classId": "imp",
    "archetype": "대담한 슬쩍",
    "stage": 2,
    "trigger": [
      "PRE_COLLISION",
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "One PRE_COLLISION_STEAL steals positive amount from at least 2 distinct victims.",
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
    "tooltip": "One PRE_COLLISION_STEAL steals positive amount from at least 2 distinct victims.일 때 추가 피해 +2 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-182: satisfy 'One PRE_COLLISION_STEAL steals positive amount from at least 2 distinct victims.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-182: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "대담한 슬쩍",
      "stage": 2
    }
  },
  "aug-183": {
    "augmentId": "aug-183",
    "name": "손이 빠르네?",
    "classId": "imp",
    "archetype": "대담한 슬쩍",
    "stage": 2,
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "이번 턴 PRE_COLLISION_STEAL에서 실제 숫자를 1 이상 훔친 뒤 자신의 공격이 유효하다.",
    "effectType": "DELAYED_ATTACK_BUFF",
    "effectValue": {
      "bonusDamage": 1,
      "uses": 1,
      "expiry": "NEXT_TURN_END"
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
    "tooltip": "숫자를 실제로 1 이상 훔친 턴에 공격까지 유효하면 다음 턴 첫 유효 공격 피해가 1 증가합니다.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-183: satisfy '슬쩍 후 자신의 공격이 유효하면 다음 턴 작은 보너스.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-183: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "대담한 슬쩍",
      "stage": 2
    }
  },
  "aug-184": {
    "augmentId": "aug-184",
    "name": "잔돈까지",
    "classId": "imp",
    "archetype": "대담한 슬쩍",
    "stage": 2,
    "trigger": [
      "PRE_COLLISION",
      "ON_VALID"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "숫자 1 또는 2인 대상에게 슬쩍 성공하면 탐욕 보너스 +1 피해 상당 추가",
    "effectType": "MODIFY_DAMAGE",
    "effectValue": {
      "text": "숫자 1 또는 2인 대상에게 슬쩍 성공하면 탐욕 보너스 +1 피해 상당 추가.",
      "numericHints": [
        1,
        2,
        1
      ]
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
    "tooltip": "숫자 1 또는 2인 대상에게 슬쩍 성공하면 탐욕 보너스 +1 피해 상당 추가. 턴당 1회.",
    "runtimePrimitivesRequired": [
      "MODIFY_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-184: satisfy '숫자 1 또는 2인 대상에게 슬쩍 성공하면 탐욕 보너스 +1 피해 상당 추가' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-184: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "대담한 슬쩍",
      "stage": 2
    }
  },
  "aug-185": {
    "augmentId": "aug-185",
    "name": "욕심쟁이",
    "classId": "imp",
    "archetype": "대담한 슬쩍",
    "stage": 3,
    "trigger": [
      "PRE_COLLISION",
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "Total actual stolen amount in current PRE_COLLISION_STEAL is at least 2.",
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
    "tooltip": "Total actual stolen amount in current PRE_COLLISION_STEAL is at least 2.일 때 추가 피해 +2 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-185: satisfy 'Total actual stolen amount in current PRE_COLLISION_STEAL is at least 2.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-185: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "대담한 슬쩍",
      "stage": 3
    }
  },
  "aug-186": {
    "augmentId": "aug-186",
    "name": "훔친 힘",
    "classId": "imp",
    "archetype": "대담한 슬쩍",
    "stage": 3,
    "trigger": [
      "PRE_COLLISION",
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "After PRE_COLLISION_STEAL owner FINAL_NUMBER >=5 and attack valid.",
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
    "tooltip": "After PRE_COLLISION_STEAL owner FINAL_NUMBER >=5 and attack valid.일 때 추가 피해 +2 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-186: satisfy 'After PRE_COLLISION_STEAL owner FINAL_NUMBER >=5 and attack valid.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-186: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "대담한 슬쩍",
      "stage": 3
    }
  },
  "aug-187": {
    "augmentId": "aug-187",
    "name": "또 가져갈게!",
    "classId": "imp",
    "archetype": "대담한 슬쩍",
    "stage": 3,
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "PRE_COLLISION_STEAL로 실제 숫자를 1 이상 훔친 공격이 유효하게 끝난다.",
    "effectType": "DELAYED_ATTACK_BUFF",
    "effectValue": {
      "bonusDamage": 2,
      "uses": 1,
      "expiry": "NEXT_CYCLE_END"
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "숫자를 훔친 공격이 유효하면 다음 사이클의 첫 유효 공격 피해가 2 증가합니다. 사이클당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-187: satisfy '슬쩍 공격 성공 시 다음 사이클 첫 슬쩍 강화.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-187: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "대담한 슬쩍",
      "stage": 3
    }
  },
  "aug-188": {
    "augmentId": "aug-188",
    "name": "싹쓸이",
    "classId": "imp",
    "archetype": "대담한 슬쩍",
    "stage": 4,
    "trigger": [
      "PRE_COLLISION",
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "Owner steals positive amount from every eligible same-number non-Imp victim and at least 2 victims exist.",
    "effectType": "DELAYED_ATTACK_BUFF",
    "effectValue": {
      "targets": "ALL_LIVING_PLAYERS",
      "bonusDamage": 3,
      "usesPerTarget": 1
    },
    "targetRule": "ALL_LIVING_ALLIES_INCLUDING_SELF",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_188_delayed_attack_buff",
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
    "reconnectRule": "Persist aug_188_delayed_attack_buff and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "대상 전원의 다음 유효 공격 추가 피해 +3. 각 대상 1회 발동 후 소멸.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-188: satisfy 'Owner steals positive amount from every eligible same-number non-Imp victim and at least 2 victims exist.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-188: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "대담한 슬쩍",
      "stage": 4
    }
  },
  "aug-189": {
    "augmentId": "aug-189",
    "name": "욕심은 끝이 없어",
    "classId": "imp",
    "archetype": "대담한 슬쩍",
    "stage": 4,
    "trigger": [
      "PRE_COLLISION",
      "ON_VALID"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "A PRE_COLLISION_STEAL steals at least 1 actual point.",
    "effectType": "ADD_STACK",
    "effectValue": {
      "state": "greed",
      "amount": 1,
      "cap": 4,
      "bonusDamagePerStack": 1
    },
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_189_add_stack",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_189_add_stack and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당. 전투 종료 시 초기화; 별도 유지 카드 제외.",
    "runtimePrimitivesRequired": [
      "ADD_STACK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-189: satisfy 'A PRE_COLLISION_STEAL steals at least 1 actual point.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-189: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "대담한 슬쩍",
      "stage": 4
    }
  },
  "aug-190": {
    "augmentId": "aug-190",
    "name": "대도둑 임프",
    "classId": "imp",
    "archetype": "대담한 슬쩍",
    "stage": 4,
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Total actual stolen amount this turn >=2 and owner attack valid.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "formula": "floor(FINAL_NUMBER/2)",
      "cap": 3
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
    "tooltip": "한 턴에 총 2 이상 훔치면 추가 피해 = 최종 숫자의 절반(내림), 최대 +3. 턴당 1회.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "MODIFY_NUMBER"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-190: satisfy 'Total actual stolen amount this turn >=2 and owner attack valid.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-190: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "대담한 슬쩍",
      "stage": 4
    }
  },
  "aug-191": {
    "augmentId": "aug-191",
    "name": "소매치기 악동",
    "classId": "imp",
    "archetype": "소매치기 악동",
    "stage": 1,
    "trigger": [
      "PRE_COLLISION"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "슬쩍으로 빼앗은 숫자를 즉시 더하는 대신 저장 가능",
    "effectType": "MODIFY_NUMBER",
    "effectValue": {
      "text": "슬쩍으로 빼앗은 숫자를 즉시 더하는 대신 저장 가능. '훔친 숫자' 최대 3, 카드 제출 전 1당 최종 숫자 +1.",
      "numericHints": [
        3,
        1,
        1
      ]
    },
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
    "resetScope": "NEVER_WITHIN_RUN",
    "persistenceScope": "RUN",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": true,
      "REWARD": true,
      "SHOP": false,
      "REST": false
    },
    "visibility": "SERVER_ONLY",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "슬쩍으로 빼앗은 숫자를 즉시 더하는 대신 저장 가능. '훔친 숫자' 최대 3, 카드 제출 전 1당 최종 숫자 +1. 한 턴 소비 상한 2.",
    "runtimePrimitivesRequired": [
      "MODIFY_NUMBER",
      "OVERRIDE_BASE_RULE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-191: satisfy '슬쩍으로 빼앗은 숫자를 즉시 더하는 대신 저장 가능' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-191: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "소매치기 악동",
      "stage": 1
    }
  },
  "aug-192": {
    "augmentId": "aug-192",
    "name": "비밀 주머니",
    "classId": "imp",
    "archetype": "소매치기 악동",
    "stage": 2,
    "trigger": [
      "PRE_COLLISION"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "Owned whenever stolen-number storage cap is queried.",
    "effectType": "MODIFY_RESOURCE_CAP",
    "effectValue": {
      "resource": "stolenNumber",
      "from": 3,
      "to": 5
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_192_modify_resource_cap",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to declared cap; derived effects do not recursively retrigger.",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "NONE",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_192_modify_resource_cap and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "훔친 숫자 최대 저장량 3→5.",
    "runtimePrimitivesRequired": [
      "MODIFY_RESOURCE_CAP"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-192: satisfy 'Owned whenever stolen-number storage cap is queried.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-192: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "소매치기 악동",
      "stage": 2
    }
  },
  "aug-193": {
    "augmentId": "aug-193",
    "name": "조금만 쓸게",
    "classId": "imp",
    "archetype": "소매치기 악동",
    "stage": 2,
    "trigger": [
      "PRE_SELECT"
    ],
    "timingPhase": "PRE_SELECT",
    "condition": "Owner has stored stolenNumber >0 before submit.",
    "effectType": "SPEND_RESOURCE",
    "effectValue": {
      "resource": "stolenNumber",
      "min": 1,
      "max": "ALL_STORED",
      "step": 1
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_193_spend_resource",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to [object Object]; derived effects do not recursively retrigger.",
    "stackCap": {
      "text": "상한 2",
      "source": "BETA_VALUE_OR_LIMIT"
    },
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_193_spend_resource and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "한 턴 소비 상한 2→저장량 전부. 1씩 나누어 소비 가능.",
    "runtimePrimitivesRequired": [
      "SPEND_RESOURCE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-193: satisfy 'Owner has stored stolenNumber >0 before submit.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-193: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "소매치기 악동",
      "stage": 2
    }
  },
  "aug-194": {
    "augmentId": "aug-194",
    "name": "고이 모아두기",
    "classId": "imp",
    "archetype": "소매치기 악동",
    "stage": 2,
    "trigger": [
      "TURN_END",
      "PRE_DAMAGE"
    ],
    "timingPhase": "TURN_END",
    "condition": "턴 종료 시 훔친 숫자 3 이상이면 다음 턴 첫 저장 숫자 소비 공격 추가 피해 +2",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "턴 종료 시 훔친 숫자 3 이상이면 다음 턴 첫 저장 숫자 소비 공격 추가 피해 +2.",
      "numericHints": [
        3,
        2
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
    "tooltip": "턴 종료 시 훔친 숫자 3 이상이면 다음 턴 첫 저장 숫자 소비 공격 추가 피해 +2. 1회 발동 후 소멸.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "SPEND_RESOURCE",
      "MODIFY_NUMBER",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-194: satisfy '턴 종료 시 훔친 숫자 3 이상이면 다음 턴 첫 저장 숫자 소비 공격 추가 피해 +2' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-194: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "소매치기 악동",
      "stage": 2
    }
  },
  "aug-195": {
    "augmentId": "aug-195",
    "name": "장물 거래",
    "classId": "imp",
    "archetype": "소매치기 악동",
    "stage": 3,
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "Before submit owner has at least 2 stolenNumber and chooses ATTACK or DEFENSE.",
    "effectType": "CHOICE_SPEND_RESOURCE",
    "effectValue": {
      "cost": 2,
      "choices": [
        {
          "mode": "ATTACK",
          "nextValidBonusDamage": 2
        },
        {
          "mode": "DEFENSE",
          "nextDirectDamageReduction": 1
        }
      ]
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_195_choice_spend_resource",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to declared cap; derived effects do not recursively retrigger.",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_195_choice_spend_resource and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "훔친 숫자 2 소비: 다음 유효 공격 +2 피해 또는 다음 직접 피해 1 감소 중 선택. 턴당 1회.",
    "runtimePrimitivesRequired": [
      "MODIFY_INCOMING_DAMAGE",
      "SPEND_RESOURCE",
      "MODIFY_NUMBER",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-195: satisfy 'Before submit owner has at least 2 stolenNumber and chooses ATTACK or DEFENSE.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-195: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "소매치기 악동",
      "stage": 3
    }
  },
  "aug-196": {
    "augmentId": "aug-196",
    "name": "밑천 굴리기",
    "classId": "imp",
    "archetype": "소매치기 악동",
    "stage": 3,
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "저장 숫자를 2 이상 소비한 공격이 유효하면 훔친 숫자 1 환급",
    "effectType": "GAIN_RESOURCE",
    "effectValue": {
      "text": "저장 숫자를 2 이상 소비한 공격이 유효하면 훔친 숫자 1 환급.",
      "numericHints": [
        2,
        1
      ]
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_196_gain_resource",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to declared cap; derived effects do not recursively retrigger.",
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
    "reconnectRule": "Persist aug_196_gain_resource and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "저장 숫자를 2 이상 소비한 공격이 유효하면 훔친 숫자 1 환급. 턴당 1회.",
    "runtimePrimitivesRequired": [
      "GAIN_RESOURCE",
      "SPEND_RESOURCE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-196: satisfy '저장 숫자를 2 이상 소비한 공격이 유효하면 훔친 숫자 1 환급' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-196: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "소매치기 악동",
      "stage": 3
    }
  },
  "aug-197": {
    "augmentId": "aug-197",
    "name": "큰손",
    "classId": "imp",
    "archetype": "소매치기 악동",
    "stage": 3,
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Owner spends at least 3 stolenNumber in one action.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 2
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
    "tooltip": "Owner spends at least 3 stolenNumber in one action.일 때 추가 피해 +2 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-197: satisfy 'Owner spends at least 3 stolenNumber in one action.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-197: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "소매치기 악동",
      "stage": 3
    }
  },
  "aug-198": {
    "augmentId": "aug-198",
    "name": "끝없는 주머니",
    "classId": "imp",
    "archetype": "소매치기 악동",
    "stage": 4,
    "trigger": [
      "COMBAT_START"
    ],
    "timingPhase": "COMBAT_START",
    "condition": "훔친 숫자 최대 7, 전투 시작 시 1 보유",
    "effectType": "MODIFY_RESOURCE_CAP",
    "effectValue": {
      "text": "훔친 숫자 최대 7, 전투 시작 시 1 보유.",
      "numericHints": [
        7,
        1
      ]
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_198_modify_resource_cap",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to [object Object]; derived effects do not recursively retrigger.",
    "stackCap": {
      "text": "최대 7",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_198_modify_resource_cap and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "훔친 숫자 최대 7, 전투 시작 시 1 보유.",
    "runtimePrimitivesRequired": [
      "MODIFY_RESOURCE_CAP",
      "GAIN_RESOURCE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-198: satisfy '훔친 숫자 최대 7, 전투 시작 시 1 보유' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-198: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "소매치기 악동",
      "stage": 4
    }
  },
  "aug-199": {
    "augmentId": "aug-199",
    "name": "암시장 큰손",
    "classId": "imp",
    "archetype": "소매치기 악동",
    "stage": 4,
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Owner spends at least 4 stolenNumber in one action before a valid Combat attack.",
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
    "tooltip": "Owner spends at least 4 stolenNumber in one action before a valid Combat attack.일 때 추가 피해 +4 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-199: satisfy 'Owner spends at least 4 stolenNumber in one action before a valid Combat attack.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-199: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "소매치기 악동",
      "stage": 4
    }
  },
  "aug-200": {
    "augmentId": "aug-200",
    "name": "돌고 도는 장물",
    "classId": "imp",
    "archetype": "소매치기 악동",
    "stage": 4,
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "저장 숫자를 소비한 공격이 유효하면 소비량의 절반(내림) 환급",
    "effectType": "GAIN_RESOURCE",
    "effectValue": {
      "text": "저장 숫자를 소비한 공격이 유효하면 소비량의 절반(내림) 환급.",
      "numericHints": []
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_200_gain_resource",
    "stateType": "INTEGER",
    "stackRule": "Apply on declared trigger; clamp to [object Object]; derived effects do not recursively retrigger.",
    "stackCap": {
      "text": "최대 2",
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
    "visibility": "SERVER_ONLY",
    "reconnectRule": "Persist aug_200_gain_resource and physical IDs/counters through RUN scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "저장 숫자를 소비한 공격이 유효하면 소비량의 절반(내림) 환급. 턴당 최대 2 환급.",
    "runtimePrimitivesRequired": [
      "GAIN_RESOURCE",
      "SPEND_RESOURCE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-200: satisfy '저장 숫자를 소비한 공격이 유효하면 소비량의 절반(내림) 환급' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-200: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "소매치기 악동",
      "stage": 4
    }
  },
  "aug-201": {
    "augmentId": "aug-201",
    "name": "장난의 연쇄",
    "classId": "imp",
    "archetype": "장난의 연쇄",
    "stage": 1,
    "trigger": [
      "PRE_COLLISION",
      "ON_VALID",
      "ON_DAMAGE_TAKEN"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "Steal applies Mischief to ally; their first next-turn valid attack consumes it; repeat steal while active removes buff and deals one damage",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "슬쩍당한 아군에게 장난 부여. 다음 턴 그 아군의 첫 유효 공격 추가 피해 +2. 장난이 남은 채 다시 슬쩍당하면 버프 소멸 + 피해 1.",
      "numericHints": [
        2,
        1
      ]
    },
    "targetRule": "SOURCE_SPECIFIED_ALLY_OR_EARLIEST_SEAT_TIE",
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
    "visibility": "PUBLIC",
    "reconnectRule": "No mutable state beyond ownership; replay/reconnect cannot duplicate source action.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "슬쩍당한 아군에게 장난 부여. 다음 턴 그 아군의 첫 유효 공격 추가 피해 +2. 장난이 남은 채 다시 슬쩍당하면 버프 소멸 + 피해 1. 장난은 1턴 지속.",
    "runtimePrimitivesRequired": [
      "MODIFY_INCOMING_DAMAGE",
      "HEAL",
      "DOWN_RESOLVE_WINDOW",
      "ROOT_ACTION_GUARD"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-201: satisfy 'Steal applies Mischief to ally; their first next-turn valid attack consumes it; repeat steal while active removes buff and deals one damage' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-201: fail one condition/room/scope predicate and assert no effect or consumption.",
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
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "장난의 연쇄",
      "stage": 1
    }
  },
  "aug-202": {
    "augmentId": "aug-202",
    "name": "신나는 장난",
    "classId": "imp",
    "archetype": "장난의 연쇄",
    "stage": 2,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_VALID",
    "condition": "장난 상태의 다음 유효 공격 강화 효과 증가.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "text": "다음 유효 공격 추가 피해 +1.",
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
    "tooltip": "다음 유효 공격 추가 피해 +1. 1회 발동 후 소멸; 동일 효과 중첩 불가.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-202: satisfy '장난 상태의 다음 유효 공격 강화 효과 증가.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-202: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "장난의 연쇄",
      "stage": 2
    }
  },
  "aug-203": {
    "augmentId": "aug-203",
    "name": "안전장치",
    "classId": "imp",
    "archetype": "장난의 연쇄",
    "stage": 2,
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "Mischief repeat-steal explosion would deal HP damage to the protected owner.",
    "effectType": "PREVENT_DAMAGE",
    "effectValue": {
      "preventExplosionDamage": true,
      "removeMischiefBuff": true
    },
    "targetRule": "CURRENT_ENEMY",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_203_prevent_damage",
    "stateType": "STATUS",
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
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_203_prevent_damage and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "장난 폭발 피해를 막고 장난 버프만 제거. 전투당 1회.",
    "runtimePrimitivesRequired": [
      "APPLY_STATUS"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-203: satisfy 'Mischief repeat-steal explosion would deal HP damage to the protected owner.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-203: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "장난의 연쇄",
      "stage": 2
    }
  },
  "aug-204": {
    "augmentId": "aug-204",
    "name": "여럿이 놀자",
    "classId": "imp",
    "archetype": "장난의 연쇄",
    "stage": 2,
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "At least 2 distinct allies receive Mischief from owner in same turn.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 1,
      "target": "OWNER_NEXT_VALID_ATTACK"
    },
    "targetRule": "SOURCE_SPECIFIED_ALLY_OR_EARLIEST_SEAT_TIE",
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
    "tooltip": "At least 2 distinct allies receive Mischief from owner in same turn.일 때 추가 피해 +1 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-204: satisfy 'At least 2 distinct allies receive Mischief from owner in same turn.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-204: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "장난의 연쇄",
      "stage": 2
    }
  },
  "aug-205": {
    "augmentId": "aug-205",
    "name": "기대감",
    "classId": "imp",
    "archetype": "장난의 연쇄",
    "stage": 3,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_VALID",
    "condition": "A Mischief-marked ally resolves valid with FINAL_NUMBER >=4.",
    "effectType": "ADD_DAMAGE",
    "effectValue": {
      "bonusDamage": 2,
      "target": "THAT_ALLY_ATTACK"
    },
    "targetRule": "SOURCE_SPECIFIED_ALLY_OR_EARLIEST_SEAT_TIE",
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
    "tooltip": "A Mischief-marked ally resolves valid with FINAL_NUMBER >=4.일 때 추가 피해 +2 효과를 적용합니다. 제한: ONCE_PER_TURN.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-205: satisfy 'A Mischief-marked ally resolves valid with FINAL_NUMBER >=4.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-205: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "장난의 연쇄",
      "stage": 3
    }
  },
  "aug-206": {
    "augmentId": "aug-206",
    "name": "폭발도 재밌어!",
    "classId": "imp",
    "archetype": "장난의 연쇄",
    "stage": 3,
    "trigger": [
      "PRE_DAMAGE"
    ],
    "timingPhase": "PRE_DAMAGE",
    "condition": "자신이 부여한 Mischief가 반복 절도로 폭발한다.",
    "effectType": "DELAYED_ATTACK_BUFF",
    "effectValue": {
      "bonusDamage": 1,
      "uses": 1,
      "target": "OWNER_NEXT_VALID_ATTACK"
    },
    "targetRule": "SOURCE_SPECIFIED_ALLY_OR_EARLIEST_SEAT_TIE",
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
    "tooltip": "자신이 부여한 장난이 폭발하면 자신의 다음 유효 공격 피해가 1 증가합니다. 장난 폭발의 원래 피해는 그대로 적용됩니다.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-206: satisfy '장난 폭발 시 임프가 작은 보너스를 얻음. 아군 피해는 유지.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-206: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "장난의 연쇄",
      "stage": 3
    }
  },
  "aug-207": {
    "augmentId": "aug-207",
    "name": "장난 전염",
    "classId": "imp",
    "archetype": "장난의 연쇄",
    "stage": 3,
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "장난이 정상 발동하면 장난이 없는 무작위 아군 1명에게 약한 장난 부여: 다음 유효 공격 +1 피해",
    "effectType": "APPLY_STATUS",
    "effectValue": {
      "text": "장난이 정상 발동하면 장난이 없는 무작위 아군 1명에게 약한 장난 부여: 다음 유효 공격 +1 피해.",
      "numericHints": [
        1,
        1
      ]
    },
    "targetRule": "SOURCE_SPECIFIED_ALLY_OR_EARLIEST_SEAT_TIE",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_207_apply_status",
    "stateType": "STATUS",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
    "onceScope": "ONCE_PER_CYCLE",
    "resetScope": "CYCLE_END",
    "persistenceScope": "COMBAT",
    "roomApplicability": {
      "COMBAT": true,
      "EVENT": false,
      "REWARD": false,
      "SHOP": false,
      "REST": false
    },
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_207_apply_status and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "장난이 정상 발동하면 장난이 없는 무작위 아군 1명에게 약한 장난 부여: 다음 유효 공격 +1 피해. 사이클당 1회.",
    "runtimePrimitivesRequired": [
      "APPLY_STATUS",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-207: satisfy '장난이 정상 발동하면 장난이 없는 무작위 아군 1명에게 약한 장난 부여: 다음 유효 공격 +1 피해' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-207: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "장난의 연쇄",
      "stage": 3
    }
  },
  "aug-208": {
    "augmentId": "aug-208",
    "name": "대소동",
    "classId": "imp",
    "archetype": "장난의 연쇄",
    "stage": 4,
    "trigger": [
      "ON_VALID",
      "PRE_DAMAGE"
    ],
    "timingPhase": "ON_VALID",
    "condition": "At least 2 Mischief-marked players resolve valid in same turn.",
    "effectType": "DELAYED_ATTACK_BUFF",
    "effectValue": {
      "targets": "ALL_LIVING_PLAYERS",
      "bonusDamage": 2,
      "usesPerTarget": 1
    },
    "targetRule": "ALL_LIVING_ALLIES_INCLUDING_SELF",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_208_delayed_attack_buff",
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
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_208_delayed_attack_buff and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "대상 전원의 다음 유효 공격 추가 피해 +2. 각 대상 1회 발동 후 소멸.",
    "runtimePrimitivesRequired": [
      "ADD_DAMAGE",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-208: satisfy 'At least 2 Mischief-marked players resolve valid in same turn.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-208: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "장난의 연쇄",
      "stage": 4
    }
  },
  "aug-209": {
    "augmentId": "aug-209",
    "name": "위험한 장난감",
    "classId": "imp",
    "archetype": "장난의 연쇄",
    "stage": 4,
    "trigger": [
      "PRE_COLLISION",
      "ON_VALID"
    ],
    "timingPhase": "PRE_COLLISION",
    "condition": "장난 성공 시 다음 유효 공격 +5 피해",
    "effectType": "APPLY_STATUS",
    "effectValue": {
      "text": "장난 성공 시 다음 유효 공격 +5 피해. 재슬쩍 폭발 시 피해 2.",
      "numericHints": [
        5,
        2
      ]
    },
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_209_apply_status",
    "stateType": "STATUS",
    "stackRule": "NOT_APPLICABLE",
    "stackCap": "NOT_APPLICABLE",
    "consumeRule": "Consume/move exactly as effectValue; physical cards preserve cardInstanceId.",
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
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_209_apply_status and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "장난 성공 시 다음 유효 공격 +5 피해. 재슬쩍 폭발 시 피해 2. 장난 1턴 지속.",
    "runtimePrimitivesRequired": [
      "APPLY_STATUS",
      "DELAY_EFFECT"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-209: satisfy '장난 성공 시 다음 유효 공격 +5 피해' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-209: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "장난의 연쇄",
      "stage": 4
    }
  },
  "aug-210": {
    "augmentId": "aug-210",
    "name": "장난의 달인",
    "classId": "imp",
    "archetype": "장난의 연쇄",
    "stage": 4,
    "trigger": [
      "ON_VALID"
    ],
    "timingPhase": "ON_VALID",
    "condition": "장난 성공마다 신남을 쌓고 신남이 높을수록 이후 장난과 임프 공격 강화.",
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
    "targetRule": "OWNER_OR_CURRENT_ACTION",
    "tieRule": "EARLIEST_LOBBY_SEAT_THEN_PLAYER_ID_WHEN_TARGET_TIE; SEEDED_RNG_ONLY_WHERE_EXPLICIT",
    "stateKey": "aug_210_add_stack",
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
    "visibility": "PUBLIC",
    "reconnectRule": "Persist aug_210_add_stack and physical IDs/counters through COMBAT scope; reconstruct identical projection.",
    "idempotencyRule": "Key mutation by rootActionId + sourceAugmentId + effect instance; same action identity applies at most once.",
    "tooltip": "조건 1회당 스택 +1(최대 4); 스택 1당 관련 효과 +1 피해 상당. 전투 종료 시 초기화; 별도 유지 카드 제외.",
    "runtimePrimitivesRequired": [
      "ADD_STACK"
    ],
    "testCasesRequired": {
      "minimumPositiveCase": "aug-210: satisfy '장난 성공마다 신남을 쌓고 신남이 높을수록 이후 장난과 임프 공격 강화.' and assert effect exactly once within declared scope.",
      "minimumNegativeCase": "aug-210: fail one condition/room/scope predicate and assert no effect or consumption.",
      "edgeCases": []
    },
    "designStatus": "SPEC_COMPLETE",
    "runtimeReady": true,
    "executable": true,
    "source": "BETA_v0.2",
    "runtimeHandler": "IMP_V02",
    "candidatePool": {
      "classId": "imp",
      "archetype": "장난의 연쇄",
      "stage": 4
    }
  }
});
export const IMP_CONTRACT_IDS=Object.freeze(Object.keys(IMP_CONTRACTS).sort());
