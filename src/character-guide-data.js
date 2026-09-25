// Static guide snapshot; tests verify parity with the server catalog.
export const CHARACTER_CATALOG = {
  "twins": {
    "id": "twins",
    "display_name": "쌍둥이",
    "deck": [
      1,
      2,
      3,
      4
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "교대와 곡예로 예측을 뒤집는 쌍둥이",
      "icon": "♊",
      "color": "#f0c184",
      "attackFx": "twin_thrust",
      "attackSfx": "sfx_attack_twins",
      "skill": {
        "id": "acrobatics",
        "name": "교대 · 곡예",
        "type": "hybrid",
        "description": "첫 턴 홀짝 무작위, 이후 매 턴 교대. 해당 홀짝 카드만 선택할 수 있습니다. 유효 몬스터 공격의 피해 +2. 곡예는 즉시 손패를 초기화하고 홀짝을 반전하며, 새 사이클을 끝까지 완주하면 다시 사용 가능합니다."
      }
    }
  },
  "vampire": {
    "id": "vampire",
    "display_name": "흡혈귀",
    "deck": [
      1,
      2,
      3,
      4,
      5
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "권속의 운명을 바꾸는 흡혈귀",
      "icon": "♜",
      "color": "#e85b79",
      "attackFx": "vampire_bite",
      "attackSfx": "sfx_attack_vampire",
      "skill": {
        "id": "blood_command",
        "name": "흡혈의 낙인 · 피의 명령",
        "type": "hybrid",
        "description": "카드가 겹치면 최고 점수의 상대 한 명에게 권속 표식. 권속의 선택을 보고, 피의 명령으로 중복 판정 전에 두 카드의 최종 숫자를 교환합니다."
      }
    }
  },
  "demonsword": {
    "id": "demonsword",
    "display_name": "귀검사",
    "deck": [
      1,
      2,
      3,
      4,
      4
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "막타를 거듭하며 강해지는 귀검사",
      "icon": "⚔",
      "color": "#dc586b",
      "attackFx": "demon_sword",
      "attackSfx": "sfx_attack_demonsword",
      "skill": {
        "id": "soul_slash",
        "name": "포식 · 귀참",
        "type": "hybrid",
        "description": "몬스터 유효 공격 또는 이벤트 유효 카드로 포식 +1, 처치 턴 기여 시 총 +3, 공동 최고 피해면 총 +5. 포식 8마다 귀참 레벨 +1. 레벨업하면 사용한 귀참도 즉시 재활성화됩니다. 귀참은 현재 레벨+1의 추가 피해를 줍니다."
      },
      "balanceRevision": 6
    }
  },
  "gunner": {
    "id": "gunner",
    "display_name": "총잡이",
    "deck": [
      1,
      2,
      3
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "세 발의 탄환을 쏟아내는 사수",
      "icon": "⌖",
      "color": "#ffd08a",
      "attackFx": "bullet",
      "attackSfx": "sfx_attack_gunner",
      "skill": {
        "id": "full_burst",
        "name": "전탄발사",
        "type": "hybrid",
        "description": "사이클당 1회 전탄발사. 선택 카드가 통과하면 남은 손패를 합산해 사용하고 새 사이클로 진입합니다. 중복 실패 시 HP −1(기절 가능)."
      },
      "balanceRevision": 4
    }
  },
  "fighter": {
    "id": "fighter",
    "display_name": "무투가",
    "deck": [
      1,
      2,
      3,
      4,
      5
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "이어지는 권격으로 적을 압도하는 격투가",
      "icon": "✊",
      "color": "#ffac78",
      "attackFx": "fist",
      "attackSfx": "sfx_attack_fighter",
      "skill": {
        "id": "combo",
        "name": "연격",
        "type": "passive",
        "description": "몬스터 전투에서 직전 카드보다 높은 카드로 공격 성공 시 연격 +1(최대 3). 공격에 연격만큼 추가 피해. 중복 또는 몬스터 처치 시 중첩이 초기화됩니다. 전투 중 중복 실패 시 -1점."
      },
      "balanceRevision": 3
    }
  },
  "adventurer": {
    "id": "adventurer",
    "display_name": "모험가",
    "deck": [
      1,
      2,
      3,
      4,
      5
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "균형 잡힌 탐험가",
      "icon": "⚔",
      "color": "#e7dcc3",
      "attackFx": "sword",
      "attackSfx": "sfx_attack_adventurer",
      "skill": {
        "id": "gold_bonus",
        "name": "노련한 수완",
        "type": "passive",
        "description": "골드를 받는 각 보상마다 +1G. 몬스터 전투에서 중복 없이 통과하면 피해와 별도로 점수 +1."
      },
      "balanceRevision": 4
    }
  },
  "warrior": {
    "id": "warrior",
    "display_name": "기사",
    "deck": [
      2,
      3,
      4,
      5,
      5
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "중복을 버티고 행동하는 기사",
      "icon": "➶",
      "color": "#d6b77a",
      "attackFx": "spear",
      "attackSfx": "sfx_attack_warrior",
      "skill": {
        "id": "toughness",
        "name": "강인함",
        "type": "active",
        "description": "사이클 시작마다 강인함 +1충전(최대 2). 1충전을 사용하면 중복되어도 자신의 행동은 유효하며 상대 카드는 제거됩니다."
      },
      "balanceRevision": 4
    }
  },
  "rogue": {
    "id": "rogue",
    "display_name": "도적",
    "deck": [
      1,
      1,
      3,
      4,
      5
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "낮은 카드로 보상을 노리는 전문가",
      "icon": "🗡",
      "color": "#8ad6b1",
      "attackFx": "dagger",
      "attackSfx": "sfx_attack_rogue",
      "skill": {
        "id": "low_card_gold",
        "name": "손버릇",
        "type": "passive",
        "description": "단독 최저 유효 카드: 비전투에서 손버릇으로 +5점·+2G, 전투에서 비열한 일격으로 피해 5. 봉인·장갑 등 공격 무효 효과는 유지됩니다."
      },
      "balanceRevision": 4
    }
  },
  "mage": {
    "id": "mage",
    "display_name": "마법사",
    "deck": [
      1,
      2,
      3,
      4,
      4
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "카드의 힘을 증폭하는 마법사",
      "icon": "✺",
      "color": "#b895ff",
      "attackFx": "magic",
      "attackSfx": "sfx_attack_mage",
      "skill": {
        "id": "amplify",
        "name": "증폭",
        "type": "hybrid",
        "description": "매 턴 마나 +1(최대 4). 증폭으로 마나 2/4를 소모하여 카드 숫자 자체를 +1/+2. 중복·피해·이벤트 모두 변경된 숫자로 판정합니다."
      },
      "balanceRevision": 4
    }
  },
  "berserker": {
    "id": "berserker",
    "display_name": "광전사",
    "deck": [
      1,
      2,
      4,
      4,
      5
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "위험할수록 강해지는 공격수",
      "icon": "⚒",
      "color": "#ff766d",
      "attackFx": "axe",
      "attackSfx": "sfx_attack_berserker",
      "skill": {
        "id": "blood_heat",
        "name": "피의 열기",
        "type": "passive",
        "description": "중복 시 HP 1 회복(이 회복은 HP 2까지만). 기절 시 추가 -3점. 유효 공격 효과 +1, 명중 시 HP 1 소모(최소 HP 1). 중복 판정은 원래 숫자이며 비전투 효과에는 +1이 적용되지 않습니다."
      },
      "balanceRevision": 3
    }
  },
  "seer": {
    "id": "seer",
    "display_name": "예언가",
    "deck": [
      1,
      2,
      3,
      4,
      5
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "선택을 꿰뚫어 보는 예언가",
      "icon": "✧",
      "color": "#8bd9ff",
      "attackFx": "starlight",
      "attackSfx": "sfx_attack_seer",
      "skill": {
        "id": "revelation",
        "name": "계시",
        "type": "hybrid",
        "description": "중복 시 계시 1 획득(최대 1). 카드 선택 전 계시 1을 소비해 상대 선택을 확인하고 현재 사이클의 사용 카드 1장을 무작위 복구합니다. 발동한 턴에도 중복 시 다시 획득하며, 통과 시에는 획득하지 않습니다."
      },
      "balanceRevision": 5
    }
  },
  "imp": {
    "id": "imp",
    "display_name": "임프",
    "deck": [
      1,
      2,
      3,
      4,
      5
    ],
    "enabled": true,
    "definition": {
      "deckType": "fixed",
      "role": "충돌을 이득으로 바꾸는 방해꾼",
      "icon": "♆",
      "color": "#ee8cd7",
      "attackFx": "imp_magic",
      "attackSfx": "sfx_attack_imp",
      "skill": {
        "id": "score_steal",
        "name": "슬쩍",
        "type": "passive",
        "description": "중복 시 함께 겹친 모든 상대에게서 각각 1점 강탈. 양수 점수만 강탈합니다."
      }
    }
  },
  "gambler": {
    "id": "gambler",
    "display_name": "도박사",
    "deck": [
      1,
      1,
      2,
      2,
      3,
      3,
      4,
      4,
      5,
      5,
      6,
      7
    ],
    "enabled": true,
    "definition": {
      "deckType": "continuous",
      "role": "매 턴 새로운 두 장으로 승부하는 도박사",
      "icon": "⚄",
      "color": "#ffd078",
      "attackFx": "dice",
      "attackSfx": "sfx_attack_gambler",
      "skill": {
        "id": "random_hand",
        "name": "운명의 패",
        "type": "passive",
        "description": "12장 덱에서 매 턴 2장을 뽑고 나머지도 턴 종료 시 버립니다. 사용한 6·7만 소멸. 서로 다른 1~5 숫자 3종 제출 시 6 충전, 5종 제출 시 7 충전(각 최대 2장). 덱이 비면 버린 덱을 섞어 이어 뽑습니다."
      },
      "balanceRevision": 5
    }
  }
};
