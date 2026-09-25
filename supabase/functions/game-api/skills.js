import {syncCardViews} from './characters.js';
import { bossPublicTargets } from './boss-patterns.js';
// Hooks are keyed by skill, not character. New definitions can reuse any handler.
const handlers = {
  soul_slash: { modify(player, card, submission, combat) {
    if (!submission.use_skill || player.knockedOut || !combat) return;
    if (!player.activeSkillState.available) throw new Error('이번 사이클의 귀참을 이미 사용했습니다.');
    player.activeSkillState.available = false;
    card.skillUsed = true; card.skillId = 'soul_slash';
    if (card.valid) {card.effectValue += 1+Math.floor((player.characterRuntimeState.predation||0)/8);card.empowered=true;}
  } },
  full_burst: { modify(player, card, submission) {
    if (!submission.use_skill || player.knockedOut) return;
    if (!player.activeSkillState.available) throw new Error('전탄발사가 아직 재충전되지 않았습니다.');
    player.activeSkillState.available = false;
    player.characterRuntimeState.burstReadyCycle = player.cycleIndex + 1;
    card.skillUsed = true; card.skillId = 'full_burst';
    if (card.valid) {
      card.burstCards = player.cycleCards.filter(c => !c.used).map(c => ({...c}));
      card.effectValue = card.burstCards.reduce((sum,c) => sum+c.value,0);
      card.empowered = true;
    }
  } },
  gold_bonus: { gold: amount => amount > 0 ? amount + 1 : amount },
  toughness: {
    modify(player, card, submission) {
      if (!submission.use_skill || player.knockedOut) return;
      if (!player.activeSkillState.available) throw new Error('이번 사이클의 강인함을 이미 사용했습니다.');
      player.characterRuntimeState.toughnessCharges--;
      player.activeSkillState.available = player.characterRuntimeState.toughnessCharges>0;
      card.skillUsed = true; card.skillId = 'toughness';
      card.resisted = !card.valid; card.valid = true;
    },
  },
  amplify: {
    modify(player, card, submission) {
      // Already-committed submissions from before this migration finish under
      // their old effect-only rule; every new API submission stores a level.
      if(submission.legacyAmplify){card.skillUsed=true;card.skillId='amplify';card.legacyAmplify=true;card.amplifyLevel=2;card.amplified=true;if(card.valid)card.effectValue+=2;return;}
      const level=amplifyLevel(player,submission);if(!level)return;
      if((player.characterRuntimeState.mana||0)<level*2)throw new Error('마나가 부족합니다.');
      player.characterRuntimeState.mana-=level*2;
      player.activeSkillState.available=player.characterRuntimeState.mana>=2;
      card.skillUsed=true;card.skillId='amplify';card.amplifyLevel=level;card.amplified=true;
    },
  },
  blood_heat: { modify(player, card, submission, combat) {
    if(combat && card.valid && !player.knockedOut){card.effectValue++;card.empowered=true;}
  } },
  low_card_gold: {
    reward(player, context) {
      if (['monster','boss'].includes(context.category)) return;
      const lowest = context.cards.filter(c => c.valid).sort((a,b) => a.value-b.value)[0];
      if (lowest?.memberId === player.memberId && context.cards.filter(c=>c.valid&&c.value===lowest.value).length===1) {
        context.grantGold(player.memberId, 2, 'low_card_gold');
        player.score+=5;context.stageScore[player.memberId]=(context.stageScore[player.memberId]||0)+5;
        context.effects.push({type:'reward',memberId:player.memberId,score:5,gold:0,reason:'low_card_gold'});
      }
    },
  },
};
export function grantGold(context, memberId, amount, reason) {
  if (amount <= 0) return 0;
  const player = context.players[memberId];
  const total = handlers[player.skillId]?.gold?.(amount) ?? amount;
  player.gold += total;
  context.effects.push({ type: 'reward', memberId, score: 0, gold: total, reason, bonus: total - amount });
  return total;
}
export function resolveIncomingDamage(player, amount, effects) { return handlers[player.skillId]?.incoming?.(player, amount, effects) ?? amount; }
export function resolveHealingSkills(player) { handlers[player.skillId]?.healed?.(player); }
export function resolveCardEffectModifiers(player, card, submission, combat) {
  card.effectValue = card.value;
  handlers[player.skillId]?.modify?.(player, card, submission, combat);
  card.damageValue = handlers[player.skillId]?.damage?.(player, card, combat) ?? card.effectValue;
  card.empowered = !!card.empowered || card.damageValue > card.effectValue;
}
export function resolveRewardSkills(context) {
  for (const player of Object.values(context.players)) handlers[player.skillId]?.reward?.(player, context);
}
export function resolveClashSkills({ players, cards, effects, turnIndex, stageScore, rng }) {
  for (const card of [...cards].sort((a,b) => a.memberId.localeCompare(b.memberId))) {
    if (card.valid) continue;
    const player = players[card.memberId];
    const peers = cards.filter(c => c.memberId !== card.memberId && c.value === card.value);
    if(player.skillId==='blood_heat' && !player.knockedOut && peers.length && player.hp<Math.min(2,player.maxHp)){
      player.hp=Math.min(2,player.maxHp,player.hp+1);
      effects.push({type:'skill',skillId:'blood_heat',phase:'clash',memberId:player.memberId,hp:player.hp,hpDelta:1,label:'피의 열기 · HP +1'});
    }
    if (player.skillId === 'revelation' && !player.knockedOut && peers.length) {
      const runtime = player.characterRuntimeState;
      const before = runtime.revelationStacks || 0;
      runtime.revelationStacks = Math.min(1, before + 1);
      if (runtime.revelationStacks > before) effects.push({ type: 'skill', skillId:'revelation', phase:'clash', memberId:player.memberId, stacks:runtime.revelationStacks, label:'계시 · 중첩 획득' });
    }
  }
}
export function resolveTurnEndSkills(players, turnIndex) {
  for (const p of Object.values(players)) {
    if(p.skillId==='acrobatics')p.characterRuntimeState.parity=1-p.characterRuntimeState.parity;
    if (p.characterRuntimeState.revealExpiresTurn <= turnIndex) {
      delete p.characterRuntimeState.revealTargets; delete p.characterRuntimeState.revealExpiresTurn;
    }
    if (p.skillId === 'revelation') p.activeSkillState.available = (p.characterRuntimeState.revelationStacks || 0) >= 1;
  }
}
export function activateRevelation(session, player, rng=Math.random) {
  if (player.skillId !== 'revelation' || player.knockedOut) throw new Error('계시를 사용할 수 없습니다.');
  const runtime = player.characterRuntimeState;
  if (runtime.revealExpiresTurn === session.turn_index) return false;
  if ((runtime.revelationStacks || 0) < 1) throw new Error('계시 1칸이 필요합니다.');
  runtime.revelationStacks = 0;
  const used=player.cycleCards.filter(c=>c.used);
  delete runtime.restoredCardId;
  if(used.length){const restored=used[Math.floor(rng()*used.length)];restored.used=false;runtime.restoredCardId=restored.id;syncCardViews(player);}
  runtime.revealExpiresTurn = session.turn_index;
  runtime.revealTargets = Object.keys(session.state.players).filter(id => id !== player.memberId);
  player.activeSkillState.available = false;
  return true;
}
export function privateKnowledge(session, memberId, submissions) {
  const player = session?.state.players[memberId];
  if(session?.status!=='active')return {revealTargets:[],revealedCards:[]};
  const publicTargets=bossPublicTargets(session);
  const seerTargets=player?.skillId==='revelation'&&player.characterRuntimeState.revealExpiresTurn===session.turn_index?player.characterRuntimeState.revealTargets||[]:[];
  const thrall=player?.skillId==='blood_command'?player.characterRuntimeState.thrallId:null;
  const vampireTargets=thrall&&!session.state.players[thrall]?.knockedOut?[thrall]:[];
  const targets=[...new Set([...publicTargets,...seerTargets,...vampireTargets])];
  return { revealTargets:targets, ...(publicTargets.length?{publicRevealTargets:publicTargets}:{}), revealedCards: submissions.filter(s => s.turn_index === session.turn_index && targets.includes(s.member_id)).map(s => ({ memberId: s.member_id, value: s.card_value })) };
}

// A reservation is local until submission. The server validates and charges once during resolution.
export function amplifyLevel(player,submission){return player.skillId==='amplify'&&submission.use_skill?(submission.amplify_level??1):0;}
export function submissionValue(player,card,submission){return card.value+(submission.legacyAmplify?0:amplifyLevel(player,submission));}
export function beginTurnResources(session){
  let changed=false;
  for(const p of Object.values(session.state.players)){
    if(p.skillId!=='amplify'||p.characterRuntimeState.manaTurn===session.turn_index)continue;
    const r=p.characterRuntimeState;r.mana=Math.min(4,(r.mana||0)+1);r.manaTurn=session.turn_index;
    p.activeSkillState.available=r.mana>=2;changed=true;
  }
  return changed;
}
