import { MONSTERS, ROOMS } from './content.js';
import { selectableCards } from './characters.js';

export function chooseAI(player, publicState, aiType, rng = Math.random, knownChoices = {}) {
  const others = Object.values(publicState.players).filter(p => p.memberId !== player.memberId);
  const stage = publicState.currentStage;
  const original = MONSTERS[stage.contentId] || ROOMS[stage.contentId];
  const remade={overload_device:{resolver:'range',min:0,max:9},balance_vault:{resolver:'range',min:10,max:10},ancient_gate:{resolver:'range',min:7,max:7},collapsing_bridge:{resolver:'lowest'},healing_spring:{resolver:'lowest'},field_clinic:{resolver:'extremes'},suspicious_offer:{resolver:publicState.roomInfo?'lowest':'highest',cost:0},truce_offer:{resolver:'distinct'},gamblers_altar:{resolver:'highest'}};
  const definition=publicState.remakeVersion&&!publicState.monster?{...original,...remade[stage.contentId],cost:0}:original;
  const leader = [...others].sort((a, b) => b.score - a.score)[0];
  const imminent = publicState.monster?.attackIn === 1 && !(stage.category==='boss'&&publicState.monster.nextAction==='special');
  const target = definition.target;
  const choices = (player.skillId==='acrobatics'?selectableCards(player).map(c=>c.value):player.remainingCards).map(value => {
    const collision = 1 - others.reduce((p, other) => p * (1 - (Object.hasOwn(knownChoices, other.memberId) ? Number(knownChoices[other.memberId] === value) : other.remainingCards.filter(v => v === value).length / other.remainingCards.length)), 1);
    let risk = 0;
    if (imminent) {
      if (target === 'high') risk = value >= 4 ? 1 : 0;
      if (target === 'low') risk = value <= 2 ? 1 : 0;
      if (target === 'odd') risk = value % 2;
      if (target === 'even') risk = value % 2 === 0 ? 1 : 0;
      if (target === 'duplicates') risk = collision;
      if (target === 'highest') risk = value / 5 * (1 - collision);
      if (target === 'lowest') risk = (6 - value) / 5 * (1 - collision);
      if (target === 'leader') risk = player.score >= Math.max(...others.map(p => p.score)) ? 1 : 0;
      if (target==='leader'&&publicState.monster?.greedTargets?.length)risk=publicState.monster.greedTargets.includes(player.memberId)?1:0;
    }
    if (definition.resolver === 'individual') risk = value < definition.min ? 1 : collision;
    if (definition.resolver === 'offer' || definition.cost) risk = value >= 4 ? 1 : 0;
    const pending=publicState.monster?.pending;
    const sealed=pending?.kind==='seal'&&value===pending.number;
    const penalty=pending?.kind==='echo'&&pending.numbers.includes(value)||pending?.kind==='curse'&&value%2===pending.parity?1:0;
    const effective = (sealed?0:Math.max(0,value-penalty + (publicState.monster && player.skillId === 'blood_heat' && !player.knockedOut ? 1 : 0))) * (1 - collision);
    let utility = effective;
    if (player.skillId === 'number_steal') utility += others.filter(p=>p.skillId!=='number_steal').reduce((sum,p)=>sum+(Object.hasOwn(knownChoices,p.memberId)?Number(knownChoices[p.memberId]===value):p.remainingCards.filter(v=>v===value).length/p.remainingCards.length),0)*2;
    if (player.skillId === 'low_card_gold' && !['monster','boss'].includes(stage.category)) utility += (8 - value) * (1-collision) * .7;
    if(player.skillId==='blood_heat'){
      if(player.hp<player.maxHp)utility+=collision*(player.hp===1?4:2);
      if(publicState.monster && player.hp>1 && !sealed)utility-=(1-collision)*.8;
    }
    if (definition.resolver === 'lowest') utility = (6 - value) * (1 - collision) * 1.5;
    if (definition.resolver === 'heal') utility = (player.maxHp - player.hp + 1) * (1 - collision) * 3;
    if (definition.resolver === 'range' || definition.resolver === 'truce') {
      const expectedOthers = others.reduce((sum, p) => sum + p.remainingCards.reduce((a, b) => a + b, 0) / p.remainingCards.length * .45, 0);
      const ideal = ((definition.min || 1) + definition.max) / 2;
      utility = 5 - Math.abs(effective + expectedOthers - ideal);
    }
    if (definition.resolver === 'distinct') utility=(1-collision)*6;
    if (definition.resolver === 'extremes') utility=Math.max(value,6-value)*(1-collision);
    if (definition.resolver === 'count') utility = 3 - Math.abs(1 - collision + others.length * .5 - definition.count);
    if (publicState.monster && effective >= publicState.monster.hp) utility += 3;
    const emergency = publicState.partyKnockouts >= 7;
    const fragile=player.hp<=1||(player.skillId==='blood_heat'&&player.hp===2&&effective>0);
    let score = utility - risk * (fragile ? 5 : 1.5) - value * .12;
    if (aiType === 'greedy') score = utility + effective * .7 - risk * .5;
    if (aiType === 'cautious' || emergency) score = utility * .6 - risk * (fragile || emergency ? 14 : 6);
    if (aiType === 'blocker' && !emergency && leader) {
      const last = publicState.eventLog.filter(e => e.type === 'turn_result').slice(-3).flatMap(e => e.cards).filter(c => c.memberId === leader.memberId).map(c => c.value);
      const predicted = leader.remainingCards.includes(last.at(-1)) ? last.at(-1) : Math.max(...leader.remainingCards);
      score += value === predicted ? 5 : 0;
    }
    if (aiType === 'chaotic' && !emergency) score = -(player.hp === 1 ? risk * 1.5 : 0);
    return { value, weight: Math.exp(Math.max(-20, Math.min(10, score)) / (aiType === 'chaotic' ? 2 : 1.4)) };
  });
  let roll = rng() * choices.reduce((sum, c) => sum + c.weight, 0);
  return (choices.find(c => (roll -= c.weight) <= 0) || choices.at(-1)).value;
}

export function chooseActiveSkill(player, state, value, knownChoices = {}, rng = Math.random) {
  if(player.skillId==='blood_command')return !!player.characterRuntimeState.thrallId&&!state.players[player.characterRuntimeState.thrallId]?.knockedOut&&Object.hasOwn(knownChoices,player.characterRuntimeState.thrallId)&&(knownChoices[player.characterRuntimeState.thrallId]>=value||rng()<.25);
  if(player.skillId==='soul_slash')return !!state.monster&&!!player.activeSkillState.available&&(state.monster.hp<=value+1+Math.floor((player.characterRuntimeState.predation||0)/8)||rng()<.55);
  if (player.skillId === 'full_burst') return player.activeSkillState.available && !Object.values(knownChoices).includes(value) && rng()<.7;
  if (player.skillId === 'toughness' && player.activeSkillState.available) {
    return Object.values(knownChoices).includes(value) || player.remainingCards.length === 1 || (value >= 3 && rng() < .55);
  }
  if (player.skillId !== 'amplify' || !player.activeSkillState.available) return false;
  value += (player.characterRuntimeState.mana||0)>=4?2:1;
  if (Object.values(knownChoices).includes(value)) return false;
  const others = Object.values(state.players).filter(p => p.memberId !== player.memberId);
  const safe = others.reduce((prob, p) => prob * (1 - p.remainingCards.filter(v => v === value).length / p.remainingCards.length), 1);
  const rule = ROOMS[state.currentStage.contentId];
  if (rule && ['truce','lowest','range'].includes(rule.resolver)) return false;
  return (player.remainingCards.length === 1 || value >= 4 || state.monster?.hp <= value + 2) && rng() < Math.max(.2, safe);
}
