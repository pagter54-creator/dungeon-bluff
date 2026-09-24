// Public, static guide snapshot. Keep in sync with game-api/characters.js.
const define = (id, display_name, deck, skillId, skillName, description, role, icon, color, attackFx, active = false) => ({
  id, display_name, deck, enabled: true, definition: {
    deckType: 'fixed', role, icon, color, attackFx, attackSfx: `sfx_attack_${id}`,
    skill: { id: skillId, name: skillName, type: active ? 'active' : 'passive', description },
  },
});
export const CHARACTER_CATALOG = {
  vampire: define('vampire', '흡혈귀', [1,2,3,4,5], 'blood_command', '흡혈의 낙인 · 피의 명령', '카드가 겹치면 최고 점수의 상대 한 명에게 권속 표식. 권속의 선택을 보고, 피의 명령으로 중복 판정 전에 두 카드의 최종 숫자를 교환합니다.', '권속의 운명을 바꾸는 흡혈귀', '♜', '#e85b79', 'vampire_bite', true),
  demonsword: define('demonsword', '귀검사', [1,2,3,4,4], 'soul_slash', '포식 · 귀참', '몬스터 처치 턴에 유효 피해를 주면 포식 +1, 최고 피해면 +2. 사이클당 한 번 귀참으로 포식 단계에 따라 추가 피해를 줍니다.', '막타를 거듭하며 강해지는 귀검사', '⚔', '#dc586b', 'demon_sword', true),
  gunner: define('gunner', '총잡이', [1,2,3], 'full_burst', '전탄발사', '사이클당 1회 전탄발사. 선택 카드가 통과하면 남은 손패를 합산해 사용하고 새 사이클로 진입합니다. 중복 실패 시 HP −1(기절 가능).', '세 발의 탄환을 쏟아내는 사수', '⌖', '#ffd08a', 'bullet', true),
  fighter: define('fighter', '무투가', [1,2,3,4,5], 'combo', '연격', '몬스터 전투에서 직전 카드보다 높은 카드로 공격 성공 시 연격 +1(최대 3). 공격에 연격만큼 추가 피해. 중복 또는 몬스터 처치 시 중첩이 초기화됩니다. 전투 중 중복 실패 시 -1점.', '이어지는 권격으로 적을 압도하는 격투가', '✊', '#ffac78', 'fist'),
  adventurer: define('adventurer', '모험가', [1,2,3,4,5], 'gold_bonus', '노련한 수완', '골드를 받는 각 보상마다 +1G. 몬스터 전투에서 중복 없이 통과하면 피해와 별도로 점수 +1.', '균형 잡힌 탐험가', '⚔', '#e7dcc3', 'sword'),
  warrior: define('warrior', '기사', [2,3,4,5,5], 'toughness', '강인함', '사이클 시작마다 강인함 +1충전(최대 2). 1충전을 사용하면 중복되어도 자신의 행동은 유효하며 상대 카드는 제거됩니다.', '중복을 버티고 행동하는 기사', '➶', '#d6b77a', 'spear', true),
  rogue: define('rogue', '도적', [1,1,3,4,5], 'low_card_gold', '손버릇', '단독 최저 유효 카드: 비전투에서 손버릇으로 +5점·+2G, 전투에서 비열한 일격으로 피해 5. 봉인·장갑 등 공격 무효 효과는 유지됩니다.', '낮은 카드로 보상을 노리는 전문가', '🗡', '#8ad6b1', 'dagger'),
  mage: define('mage', '마법사', [1,2,3,4,4], 'amplify', '증폭', '매 턴 마나 +1(최대 4). 증폭으로 마나 2/4를 소모하여 카드 숫자 자체를 +1/+2. 중복·피해·이벤트 모두 변경된 숫자로 판정합니다.', '카드의 힘을 증폭하는 마법사', '✺', '#b895ff', 'magic', true),
  berserker: define('berserker', '광전사', [1,2,4,4,5], 'blood_heat', '피의 열기', '중복 시 HP 1 회복(이 회복은 HP 2까지만). 기절 시 추가 -3점. 유효 공격 효과 +1, 명중 시 HP 1 소모(최소 HP 1). 중복 판정은 원래 숫자이며 비전투 효과에는 +1이 적용되지 않습니다.', '위험할수록 강해지는 공격수', '⚒', '#ff766d', 'axe'),
  seer: define('seer', '예언가', [1,2,3,4,5], 'revelation', '계시', '계시 최대 3칸. 평소 중복 시 +1, 계시 사용 턴에는 통과 시만 +1. 제출 전 2칸을 소모해 상대 선택을 보고 이번 사이클의 사용 카드 1장을 무작위 복구합니다.', '선택을 꿰뚫어 보는 예언가', '✧', '#8bd9ff', 'starlight'),
  imp: define('imp', '임프', [1,2,3,4,5], 'score_steal', '슬쩍', '중복 시 함께 겹친 모든 상대에게서 각각 1점 강탈. 양수 점수만 강탈합니다.', '충돌을 이득으로 바꾸는 방해꾼', '♆', '#ee8cd7', 'imp_magic'),
  gambler: define('gambler', '도박사', [], 'random_hand', '운명의 패', '매 턴 1~7 두 장. 6·7 제출 후 관망: 1~4 한 장, 직전 관망 숫자 제외. 관망에서 두 번 통과하면 다음 턴 운명의 패로 복귀. 중복은 진행도를 유지합니다.', '매 턴 새로운 두 장으로 승부하는 도박사', '⚄', '#ffd078', 'dice'),
};
CHARACTER_CATALOG.gambler.definition.deckType = 'continuous';
CHARACTER_CATALOG.gambler.definition.randomDeck = { min: 1, max: 7, count: 2 };
CHARACTER_CATALOG.seer.definition.skill.type = 'hybrid';
CHARACTER_CATALOG.gunner.definition.skill.type = 'hybrid';
CHARACTER_CATALOG.mage.definition.skill.type = 'hybrid';
CHARACTER_CATALOG.vampire.definition.skill.type = 'hybrid';
CHARACTER_CATALOG.demonsword.definition.skill.type = 'hybrid';
for (const id of ['warrior','seer']) CHARACTER_CATALOG[id].definition.balanceRevision = 2;
for (const id of ['gambler','gunner','fighter','berserker']) CHARACTER_CATALOG[id].definition.balanceRevision = 3;

for (const id of ['seer','gambler','gunner','rogue','mage','warrior','adventurer']) CHARACTER_CATALOG[id].definition.balanceRevision = 4;
