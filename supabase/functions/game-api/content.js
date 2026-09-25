// The database characters table is the runtime source. This definition also seeds tests.
export const CHARACTERS = {
  default_001: { id: 'default_001', display_name: '기본 캐릭터', deck: [1, 2, 3, 4, 5], enabled: true },
};

// Pattern selectors are implemented in the engine, never in the client.
export const MONSTERS = {
  armored_boar: { name: '철갑 멧돼지', subtitle: 'THE IRON TUSK', hp_multiplier: 1.05, interval: 3, target: 'highest', tell: '유효 카드 중 가장 높은 숫자를 공격 · 피해 1', special: 'charge', specialName: '돌진 준비', bossTell: '다음 턴 피해 합계 8 미만이면 장갑 획득 · 그다음 턴 첫 유효 공격 차단', color: '#f69861', shape: 'boar' },
  echo_bat: { name: '메아리 박쥐', subtitle: 'ECHO OF THE VOID', hp_multiplier: .9, interval: 3, target: 'duplicates', tell: '중복으로 무효화된 플레이어를 공격 · 피해 1', special: 'echo', specialName: '잔향', bossTell: '직전 턴 중복 숫자를 기록 · 다음 턴 해당 숫자의 효과값 -1', color: '#be8bff', shape: 'bat' },
  coward_hunter: { name: '비겁한 사냥꾼', subtitle: 'THE HOLLOW HUNTER', hp_multiplier: 1, interval: 3, target: 'lowest', tell: '유효 카드 중 가장 낮은 숫자를 공격 · 피해 1', special: 'mark', specialName: '표적 지정', bossTell: '현재 점수 1위에게 표식 · 다음 턴 제출 숫자 전체 공개', color: '#79d9aa', shape: 'hunter' },
  execution_golem: { name: '처형 골렘', subtitle: 'THE LAST SENTENCE', hp_multiplier: 1.15, interval: 3, target: 'high', tell: '4 이상을 낸 모든 플레이어를 공격 · 피해 1', special: 'seal', specialName: '봉인 명령', bossTell: '숫자 하나를 지정 · 다음 턴 해당 숫자의 효과 0 · 중복 판정과 소비는 유지', color: '#f78086', shape: 'golem' },
  cursed_seer: { name: '저주받은 예언자', subtitle: 'THE BLIND ORACLE', hp_multiplier: .95, interval: 3, target: 'odd', tell: '홀수 카드를 낸 플레이어를 공격 · 피해 1', special: 'curse', specialName: '뒤틀린 예언', bossTell: '홀수 또는 짝수를 미리 저주 · 다음 턴 해당 유효 카드 효과값 -1', color: '#bc94ff', shape: 'seer' },
  hungry_slime: { name: '굶주린 슬라임', subtitle: 'AN ENDLESS APPETITE', hp_multiplier: 1, interval: 3, target: 'low', tell: '2 이하를 낸 플레이어를 공격 · 피해 1', special: 'devour', specialName: '포식', bossTell: '다음 턴 가장 낮은 유효 카드 무효화 · 그 숫자만큼 회복(최대 3)', color: '#9ce776', shape: 'slime' },
  chaos_goblin: { name: '혼돈 고블린', subtitle: 'A CROOKED LITTLE SMILE', hp_multiplier: .9, interval: 3, target: 'even', tell: '짝수 카드를 낸 플레이어를 공격 · 피해 1', special: 'shuffle', specialName: '뒤죽박죽', bossTell: '다음 턴 카드 2장 선택 · 무작위 1장만 제출·소비(남은 카드 1장이면 그대로 제출)', color: '#ffcc78', shape: 'goblin' },
  greed_mimic: { name: '탐욕의 미믹', subtitle: 'NOT ALL GOLD IS GOLD', hp_multiplier: 1.1, interval: 3, target: 'leader', tell: '점수 1위 공격 · 동점 포함 · 피해 1(탐욕 표식 우선)', special: 'bait', specialName: '황금 미끼', bossTell: '다음 턴 최고 유효 카드에 골드 +3 · 다음 기본 공격의 우선 대상', color: '#ffbe59', shape: 'mimic' },
};

export const ROOMS = {
  pressure_plate: { category: 'trap', name: '압력 발판', rule: '유효 카드 합계 8 이상이면 통과. 실패하면 전원 피해 1.', resolver: 'threshold', threshold: 8, reward: 2, color: '#ff826e' },
  overload_device: { category: 'trap', name: '과부하 장치', rule: '유효 카드 합계 6~10이면 해제. 실패하면 전원 피해 1.', resolver: 'range', min: 6, max: 10, reward: 3, color: '#ff826e' },
  twin_statues: { category: 'trap', name: '쌍둥이 석상', rule: '유효 카드가 정확히 2장이면 통과. 실패하면 전원 피해 1.', resolver: 'count', count: 2, reward: 3, color: '#ff826e' },
  collapsing_bridge: { category: 'trap', name: '무너지는 다리', rule: '유효 카드 3 이상은 안전. 나머지는 피해 1.', resolver: 'individual', min: 3, reward: 2, color: '#ff826e' },
  greedy_chest: { category: 'treasure', name: '탐욕의 상자', rule: '가장 높은 유효 카드가 골드 8, 점수 5 획득.', resolver: 'highest', gold: 8, reward: 5, color: '#ffd078' },
  humble_chest: { category: 'treasure', name: '겸손의 상자', rule: '가장 낮은 유효 카드가 골드 8, 점수 5 획득.', resolver: 'lowest', gold: 8, reward: 5, color: '#ffd078' },
  balance_vault: { category: 'treasure', name: '균형의 금고', rule: '유효 합계 8~12이면 유효 카드 모두 골드 5, 점수 3.', resolver: 'range', min: 8, max: 12, gold: 5, reward: 3, color: '#ffd078' },
  cursed_safe: { category: 'treasure', name: '저주 금고', rule: '가장 높은 유효 카드가 골드 12, 점수 6 획득하고 피해 1.', resolver: 'highest', gold: 12, reward: 6, cost: 1, color: '#ffd078' },
  healing_spring: { category: 'recovery', name: '치유의 샘', rule: '유효 카드를 낸 플레이어는 HP 1 회복.', resolver: 'heal', heal: 1, color: '#7ae3bd' },
  shared_supplies: { category: 'recovery', name: '공유 보급품', rule: '유효 합계 8 이상이면 전원 HP 1 회복.', resolver: 'partyHeal', threshold: 8, heal: 1, color: '#7ae3bd' },
  field_clinic: { category: 'recovery', name: '야전 진료소', rule: '가장 낮은 유효 카드를 낸 플레이어는 HP 2 회복.', resolver: 'lowest', heal: 2, color: '#7ae3bd' },
  suspicious_merchant: { category: 'event', name: '수상한 상인', rule: '유효 카드마다 카드 숫자 × 2 골드, 점수 1 획득.', resolver: 'trade', reward: 1, color: '#b79bff' },
  gamblers_altar: { category: 'event', name: '도박사의 제단', rule: '유효 합계가 홀수면 골드 6, 점수 4. 짝수면 유효 카드 플레이어 피해 1.', resolver: 'odd', gold: 6, reward: 4, color: '#b79bff' },
  ancient_gate: { category: 'event', name: '고대의 문', rule: '유효 합계 10 이상이면 유효 카드 모두 점수 6. 실패하면 전원 피해 1.', resolver: 'threshold', threshold: 10, reward: 6, damage: true, color: '#b79bff' },
  suspicious_offer: { category: 'event', name: '수상한 제안', rule: '4 이상의 유효 카드는 골드 8, 점수 4와 피해 1. 나머지는 안전.', resolver: 'offer', min: 4, gold: 8, reward: 4, color: '#b79bff' },
  truce_offer: { category: 'event', name: '휴전 제안', rule: '유효 합계 7 이하이고 유효 카드가 있으면 전원 HP 1 회복. 초과하면 전원 피해 1.', resolver: 'truce', max: 7, heal: 1, color: '#b79bff' },
};
