import { GAMBLER_DECK,drawGamblerHand,ensureGamblerDeck } from './gambler-deck.js';
const define = (id, display_name, deck, skillId, skillName, description, role, icon, color, attackFx, active = false) => ({
  id, display_name, deck, enabled: true, definition: {
    deckType: 'fixed', role, icon, color, attackFx, attackSfx: `sfx_attack_${id}`,
    skill: { id: skillId, name: skillName, type: active ? 'active' : 'passive', description },
  },
});
export const CHARACTER_CATALOG = {
  twins: define('twins', '쌍둥이', [1,2,3,4], 'acrobatics', '교대 · 곡예', '첫 턴 홀짝 무작위, 이후 매 턴 교대. 해당 홀짝 카드만 선택할 수 있습니다. 유효 몬스터 공격의 피해 +2. 곡예는 즉시 손패를 초기화하고 홀짝을 반전하며, 새 사이클을 끝까지 완주하면 다시 사용 가능합니다.', '교대와 곡예로 예측을 뒤집는 쌍둥이', '♊', '#f0c184', 'twin_thrust', true),
  vampire: define('vampire', '흡혈귀', [1,2,3,4,5], 'blood_command', '흡혈의 낙인 · 피의 명령', '카드가 겹치면 최고 점수의 상대 한 명에게 권속 표식. 권속의 선택을 보고, 피의 명령으로 중복 판정 전에 두 카드의 최종 숫자를 교환합니다.', '권속의 운명을 바꾸는 흡혈귀', '♜', '#e85b79', 'vampire_bite', true),
  demonsword: define('demonsword', '귀검사', [1,2,3,4,4], 'soul_slash', '포식 · 귀참', '몬스터 유효 공격 또는 이벤트 유효 카드로 포식 +1, 처치 턴 기여 시 총 +4, 공동 최고 피해면 총 +8. 포식 8마다 귀참 레벨 +1. 레벨업하면 사용한 귀참도 즉시 재활성화됩니다. 귀참은 현재 레벨+1의 추가 피해를 줍니다.', '막타를 거듭하며 강해지는 귀검사', '⚔', '#dc586b', 'demon_sword', true),
  gunner: define('gunner', '총잡이', [1,2,3], 'full_burst', '전탄발사', '사이클당 1회 전탄발사. 선택 카드가 통과하면 남은 손패를 합산해 사용하고 새 사이클로 진입합니다. 중복 실패 시 HP −1(기절 가능).', '세 발의 탄환을 쏟아내는 사수', '⌖', '#ffd08a', 'bullet', true),
  fighter: define('fighter', '무투가', [1,2,3,4,5], 'combo', '연격', '몬스터 전투에서 직전 카드보다 높은 카드로 공격 성공 시 연격 +1(최대 3). 공격에 연격만큼 추가 피해. 중복 또는 몬스터 처치 시 중첩이 초기화됩니다. 전투 중 중복 실패 시 -1점.', '이어지는 권격으로 적을 압도하는 격투가', '✊', '#ffac78', 'fist'),
  adventurer: define('adventurer', '모험가', [1,2,3,4,5], 'gold_bonus', '노련한 수완', '골드를 받는 각 보상마다 +1G. 몬스터 전투에서 중복 없이 통과하면 피해와 별도로 점수 +1.', '균형 잡힌 탐험가', '⚔', '#e7dcc3', 'sword'),
  warrior: define('warrior', '기사', [2,3,4,5,5], 'toughness', '강인함', '사이클 시작마다 강인함 +1충전(최대 2). 1충전을 사용하면 중복되어도 자신의 행동은 유효하며 상대 카드는 제거됩니다.', '중복을 버티고 행동하는 기사', '➶', '#d6b77a', 'spear', true),
  rogue: define('rogue', '도적', [1,1,3,4,5], 'low_card_gold', '손버릇', '단독 최저 유효 카드: 비전투에서 손버릇으로 +5점·+2G, 전투에서 비열한 일격으로 피해 5. 봉인·장갑 등 공격 무효 효과는 유지됩니다.', '낮은 카드로 보상을 노리는 전문가', '🗡', '#8ad6b1', 'dagger'),
  mage: define('mage', '마법사', [1,2,3,4,4], 'amplify', '증폭', '매 턴 마나 +1(최대 4). 증폭으로 마나 2/4를 소모하여 카드 숫자 자체를 +1/+2. 중복·피해·이벤트 모두 변경된 숫자로 판정합니다.', '카드의 힘을 증폭하는 마법사', '✺', '#b895ff', 'magic', true),
  berserker: define('berserker', '광전사', [1,2,4,4,5], 'blood_heat', '피의 열기', '중복 시 HP 1 회복(이 회복은 HP 2까지만). 기절 시 추가 -3점. 유효 공격 효과 +1, 명중 시 HP 1 소모(최소 HP 1). 중복 판정은 원래 숫자이며 비전투 효과에는 +1이 적용되지 않습니다.', '위험할수록 강해지는 공격수', '⚒', '#ff766d', 'axe'),
  seer: define('seer', '예언가', [1,2,3,4,5], 'revelation', '계시', '중복 시 계시 1 획득(최대 1). 카드 선택 전 계시 1을 소비해 상대 선택을 확인하고 현재 사이클의 사용 카드 1장을 무작위 복구합니다. 발동한 턴에도 중복 시 다시 획득하며, 통과 시에는 획득하지 않습니다.', '선택을 꿰뚫어 보는 예언가', '✧', '#8bd9ff', 'starlight'),
  imp: define('imp', '임프', [1,2,3,4,5], 'number_steal', '슬쩍', '중복 판정 직전, 나와 같은 숫자를 낸 모든 비임프 플레이어에게서 카드 숫자 1을 빼앗습니다. 대상은 최소 0까지 감소하고 임프는 실제로 빼앗은 만큼 증가합니다. 변경된 숫자로 모든 판정을 진행합니다.', '카드 숫자를 뒤틀어 판정을 바꾸는 방해꾼', '♆', '#ee8cd7', 'imp_magic'),
  gambler: define('gambler', '도박사', [...GAMBLER_DECK], 'random_hand', '운명의 패', '1~5 각 2장과 6 한 장, 총 11장 덱에서 매 턴 2장을 뽑습니다. 사용한 6·7만 소멸합니다. 서로 다른 1~5 숫자 3종 제출 시 6, 5종 제출 시 7을 충전해 버린 덱에 넣습니다(각 최대 2장). 뽑을 덱이 비면 버린 덱을 섞습니다.', '매 턴 새로운 두 장으로 승부하는 도박사', '⚄', '#ffd078', 'dice'),
};
CHARACTER_CATALOG.gambler.definition.deckType = 'continuous';
CHARACTER_CATALOG.twins.definition.skill.type = 'hybrid';
CHARACTER_CATALOG.seer.definition.skill.type = 'hybrid';
CHARACTER_CATALOG.gunner.definition.skill.type = 'hybrid';
CHARACTER_CATALOG.mage.definition.skill.type = 'hybrid';
CHARACTER_CATALOG.vampire.definition.skill.type = 'hybrid';
CHARACTER_CATALOG.demonsword.definition.skill.type = 'hybrid';
for (const id of ['warrior','seer']) CHARACTER_CATALOG[id].definition.balanceRevision = 2;
for (const id of ['gambler','gunner','fighter','berserker']) CHARACTER_CATALOG[id].definition.balanceRevision = 3;

for (const id of ['seer','gambler','gunner','rogue','mage','warrior','adventurer']) CHARACTER_CATALOG[id].definition.balanceRevision = 4;
for (const id of ['seer','gambler','demonsword']) CHARACTER_CATALOG[id].definition.balanceRevision = 5;
CHARACTER_CATALOG.demonsword.definition.balanceRevision = 6;
CHARACTER_CATALOG.demonsword.definition.balanceRevision = 7;
CHARACTER_CATALOG.gambler.definition.balanceRevision = 6;
CHARACTER_CATALOG.imp.definition.balanceRevision = 7;

export function syncCardViews(player) {
  player.remainingCards = player.cycleCards.filter(c => !c.used).map(c => c.value);
  player.discardedCards = player.cycleCards.filter(c => c.used).map(c => c.value);
}
export function replenishHand(player, rng = Math.random) {
  drawGamblerHand(player,rng);
  syncCardViews(player);
}
export function startCycle(player, character, rng = Math.random, resetBySkill = false) {
  character = player.character || character;
  if (character.definition?.deckType === 'continuous') { replenishHand(player, rng); return; }
  const definition = character.definition || {};
  let values = [...character.deck];
  if (definition.deckType === 'random') {
    const rule = definition.randomDeck; values = [];
    for (let i = 0; i < rule.count; i++) {
      const candidates = Array.from({ length: rule.max - rule.min + 1 }, (_, j) => j + rule.min)
        .filter(v => values.filter(x => x === v).length < (v === 7 ? rule.maxSeven : rule.maxDuplicates));
      if (!candidates.length) throw new Error('랜덤 덱 정의를 확인해 주세요.');
      values.push(candidates[Math.floor(rng() * candidates.length)]);
    }
    values.sort((a,b) => a-b);
    player.characterRuntimeState.currentCycleRoll = [...values];
  }
  if (values.length !== (character.id === 'gunner' ? 3 : character.id === 'twins' ? 4 : 5) || values.some(v => !Number.isInteger(v) || v < 1)) throw new Error('캐릭터 카드 정의를 확인해 주세요.');
  player.cycleIndex = (player.cycleIndex || 0) + 1;
  player.cycleCards = values.map((value, slot) => ({ id: `${player.memberId}-cycle-${player.cycleIndex}-card-${slot}`, slot, value, used: false }));
  player.activeSkillState = { available: player.skillType === 'active' || (player.skillId === 'revelation' && (player.characterRuntimeState.revelationStacks || 0) >= 1) };
  if (player.skillId === 'amplify') player.activeSkillState.available = (player.characterRuntimeState.mana||0)>=2;
  if (player.skillId === 'toughness') {player.characterRuntimeState.toughnessCharges=Math.min(2,(player.characterRuntimeState.toughnessCharges||0)+1);player.activeSkillState.available=true;}
  if (player.skillId === 'full_burst') player.activeSkillState.available = player.cycleIndex >= (player.characterRuntimeState.burstReadyCycle || 1);
  if (player.skillId === 'soul_slash') player.activeSkillState.available = true;
  if (player.skillId === 'blood_command') player.activeSkillState.available = true;
  if (player.skillId === 'acrobatics') {
    player.characterRuntimeState.parity ??= rng() < .5 ? 1 : 0;
    player.activeSkillState.available = !resetBySkill;
  }
  syncCardViews(player);
}
export function ensureCharacterState(player, character) {
  player.character ||= structuredClone(character);
  player.skillId ??= character.definition?.skill?.id || null;
  player.skillType ??= character.definition?.skill?.type || null;
  player.characterRuntimeState ||= {};
  player.activeSkillState ||= { available: player.skillType === 'active' };
  const current = CHARACTER_CATALOG[player.characterId];
  if(player.characterId==='imp'&&player.skillId!=='number_steal'){
    player.character=structuredClone(CHARACTER_CATALOG.imp);
    player.skillId='number_steal';player.skillType='passive';
  }
  if (current?.definition.balanceRevision === 2 && player.character.definition?.balanceRevision !== 2) {
    player.character = structuredClone(current); player.skillType = current.definition.skill.type;
    player.activeSkillState = { available: player.skillType === 'active' };
    delete player.characterRuntimeState.toughnessAvailable;
    delete player.characterRuntimeState.revealTargets;
    delete player.characterRuntimeState.revealExpiresTurn;
  }
  if (current?.definition.balanceRevision === 3 && player.character.definition?.balanceRevision !== 3) {player.character=structuredClone(current);player.skillType=current.definition.skill.type;}
  if(current?.definition.balanceRevision===4&&player.character.definition?.balanceRevision!==4){
    player.character=structuredClone(current);player.skillType=current.definition.skill.type;
    if(player.skillId==='toughness')player.characterRuntimeState.toughnessCharges=player.activeSkillState.available?1:0;
    if(player.skillId==='full_burst')delete player.characterRuntimeState.burstReadyCycle;
  }
  if(player.skillId==='amplify')player.characterRuntimeState.mana??=0;
  if(current?.definition.balanceRevision===5&&player.character.definition?.balanceRevision!==5){
    player.character=structuredClone(current);player.skillType=current.definition.skill.type;
    if(player.skillId==='revelation')player.characterRuntimeState.revelationStacks=Math.min(1,player.characterRuntimeState.revelationStacks||0);
    if(player.skillId==='random_hand'&&player.cycleCards?.length)ensureGamblerDeck(player);
  }
  if(player.skillId==='soul_slash'&&player.character.definition?.balanceRevision!==6){player.character=structuredClone(CHARACTER_CATALOG.demonsword);player.skillType=player.character.definition.skill.type;}
  if(player.skillId==='toughness')player.characterRuntimeState.toughnessCharges??=0;
  if (player.skillId === 'revelation') player.characterRuntimeState.revelationStacks ??= 0;
  if (player.skillId === 'soul_slash') player.characterRuntimeState.predation ??= 0;
  if (!player.cycleCards) {
    player.cycleIndex ||= 1;
    const remaining = [...player.remainingCards];
    player.cycleCards = (player.character.definition?.deckType==='continuous'?[]:character.deck).map((value, slot) => {
      const index = remaining.indexOf(value); if (index >= 0) remaining.splice(index, 1);
      return { id: `${player.memberId}-cycle-${player.cycleIndex}-card-${slot}`, slot, value, used: index < 0 };
    });
  }
}
export function selectedCard(player, submission) {
  const cards=selectableCards(player);
  return submission.card_id ? cards.find(c => c.id === submission.card_id) :
    player.characterId === 'default_001' ? cards.find(c => c.value === submission.card_value) : undefined;
}
export function selectableCards(player) {
  return player.cycleCards.filter(c=>!c.used && (player.skillId!=='acrobatics'||c.value%2===player.characterRuntimeState.parity));
}
