import {EVENT_RULES,rhythmOrder,beginEchoStage,echoList,activeEcho,removeEcho,echoCardRules,echoCountdown,echoFirstTurn,finishEchoStage,eventResult,summaryDeltas,chooseRoomReward} from './room-remake.js';
import { CONFIG } from './config.js';
import {settleGamblerHand} from './gambler-deck.js';
import {stealCardNumbers} from './imp-steal.js';
import { compactHistory } from './history.js';
import { MONSTERS, ROOMS } from './content.js';
import { chooseAI } from './ai.js';
import { replenishHand, startCycle, ensureCharacterState, syncCardViews, selectedCard, selectableCards } from './characters.js';
import { activateAcrobatics } from './twins.js';
import { amplifyLevel, submissionValue, beginTurnResources, grantGold, resolveClashSkills, resolveCardEffectModifiers, resolveIncomingDamage, resolveHealingSkills, resolveRewardSkills, resolveTurnEndSkills, privateKnowledge, activateRevelation } from './skills.js';
import { chooseActiveSkill } from './ai.js';
import { needsTwoCards,updateMonsterIntent,applyBossCardEffects,finishBossCardEffects,castBossSpecial } from './boss-patterns.js';
import { settleExpedition } from './settlement.js';

const pick = (items, rng) => items[Math.floor(rng() * items.length)];
const shuffle = (items, rng) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
export function createStageOrder(rng = Math.random) {
  const monsterIds = shuffle(Object.keys(MONSTERS), rng);
  const stages = monsterIds.slice(0, 4).map(contentId => ({ category: 'monster', contentId }));
  const counts = { trap: 0, treasure: 0, recovery: 0, event: 0 };
  for (let i = 0; i < 5; i++) {
    const categories = Object.keys(counts).filter(k => counts[k] < 2);
    const total = categories.reduce((n, k) => n + 1 / (1 + counts[k]) ** 2, 0);
    let roll = rng() * total;
    const category = categories.find(k => (roll -= 1 / (1 + counts[k]) ** 2) <= 0) || categories.at(-1);
    counts[category]++;
    const available = Object.keys(ROOMS).filter(id => ROOMS[id].category === category && !stages.some(s => s.contentId === id));
    stages.push({ category, contentId: pick(available, rng) });
  }
  const boss={ category:'boss',contentId:pick(monsterIds,rng) };
  return [...rhythmOrder(stages,boss,rng),boss];
}
function enterStage(session) {
  const s = session.state;
  const stage = s.stageOrder[session.stage_index - 1];
  const d = MONSTERS[stage.contentId] || ROOMS[stage.contentId];
  s.currentStage = { ...stage, name: d.name, rule: d.rule || (stage.category === 'boss' ? d.bossTell : d.tell), color: d.color, shape: d.shape, subtitle: d.subtitle };
  if(s.remakeVersion&&EVENT_RULES[stage.contentId]){s.currentStage.name=EVENT_RULES[stage.contentId][0];s.currentStage.rule=EVENT_RULES[stage.contentId][1];}
  s.stageTurn = 0;
  s.stageScore = Object.fromEntries(Object.keys(s.players).map(id => [id, 0]));
  s.monster = null;
  if (MONSTERS[stage.contentId]) {
    const hp = Math.round(CONFIG.BASE_MONSTER_HP * (1 + CONFIG.MONSTER_STAGE_HP_GROWTH * (session.stage_index - 1)) * d.hp_multiplier * (stage.category === 'boss' ? CONFIG.DEFAULT_BOSS_HP_MULTIPLIER : 1));
    s.monster = { id: stage.contentId, hp, maxHp: hp, attackIn: stage.category === 'boss' ? 2 : 3, nextAction:'normal', previousDuplicates:[], intent:d.tell };
    updateMonsterIntent(session);
  }
  if(s.remakeVersion)beginEchoStage(session);
}
export function createSession(roomId, members, characters, rng = Math.random, remakeVersion = 1) {
  const players = Object.fromEntries(members.map(m => {
    const character = characters[m.character_id];
    if (!character?.enabled) throw new Error('캐릭터 정의를 확인해 주세요.');
    const player = { memberId: m.id, characterId: m.character_id, hp: CONFIG.PLAYER_MAX_HP, maxHp: CONFIG.PLAYER_MAX_HP, remainingCards: [], discardedCards: [], knockedOut: false, score: 0, gold: 0 };
    ensureCharacterState(player, character); player.cycleIndex = 0; startCycle(player, character, rng);
    return [m.id, player];
  }));
  const session = { rewards_committed: false, id: crypto.randomUUID(), room_id: roomId, status: 'active', stage_index: 1, turn_index: 1, party_knockouts: 0, started_at: new Date().toISOString(), finished_at: null,
    state: { remakeVersion:remakeVersion>=2?2:null, stageOrder: createStageOrder(rng), currentStage: {}, monster: null, players, stageScore: {}, totalScore: {}, gold: {}, turnPhase: 'selecting', lockedMembers: [], eventLog: [], characterDefinitions: structuredClone(characters), partyKnockouts: 0 } };
  enterStage(session);
  return session;
}
export function openTurn(session, members, rng = Math.random) {
  if(session.state.entryLoading)return [];
  if(session.state.roomSummary)return [];
  if(session.state.remakeVersion){
    session.state.selectionHolds={};
    for(const m of members)if(m.member_type==='human'&&!session.state.players[m.id].knockedOut){const e=activeEcho(session,'dice',m.id)||(session.state.stageTurn===0&&activeEcho(session,'lead',m.id));if(e)session.state.selectionHolds[m.id]=e.id;}
  }
  session.state.lockedMembers = [];
  session.state.turnPhase = 'selecting';
  const submissions = [];
  fillAutomaticSubmissions(session, members, submissions, rng);
  return submissions;
}
export function fillAutomaticSubmissions(session, members, submissions, rng = Math.random) {
  if(session.state.entryLoading)return false;
  if (session.status !== 'active' || session.state.roomSummary) return false;
  let changed = beginTurnResources(session);
  for(const m of members)if((m.member_type==='ai'||session.state.players[m.id].knockedOut)&&session.state.selectionHolds?.[m.id]){delete session.state.selectionHolds[m.id];changed=true;}
  const automatic = members.filter(m => m.member_type === 'ai' || session.state.players[m.id].knockedOut)
    .sort((a,b) => {
      const priority = id => session.state.players[id].knockedOut ? 0 : session.state.players[id].skillId === 'revelation' ? 2 : 1;
      return priority(a.id) - priority(b.id) || a.id.localeCompare(b.id);
    });
  for (const m of automatic) {
    if (submissions.some(s => s.turn_index === session.turn_index && s.member_id === m.id)) continue;
    const p = session.state.players[m.id];
    ensureCharacterState(p, session.state.characterDefinitions[p.characterId]);
    if(!p.knockedOut&&p.skillId==='acrobatics'&&p.activeSkillState.available&&p.discardedCards.length>=2&&rng()<.25)changed=activateAcrobatics(session,p,rng)||changed;
    if (!p.knockedOut && p.skillId === 'revelation' && (p.characterRuntimeState.revelationStacks || 0) >= 1) changed = activateRevelation(session, p, rng) || changed;
    const knowledge = privateKnowledge(session, m.id, submissions);
    // Only an entitled seer waits for revealed human choices. Ordinary AI is
    // still committed at turn opening before any human private selection.
    const visibleToWaitingHuman = members.some(x => x.member_type === 'human' && !session.state.players[x.id].knockedOut && !submissions.some(s => s.turn_index === session.turn_index && s.member_id === x.id) && privateKnowledge(session, x.id, submissions).revealTargets.includes(m.id));
    if (!p.knockedOut && !visibleToWaitingHuman && !knowledge.publicRevealTargets?.includes(m.id) && knowledge.revealTargets.some(id => id!==m.id && members.some(x => x.id === id && x.member_type === 'human' && !session.state.players[x.id].knockedOut) && !submissions.some(s => s.turn_index === session.turn_index && s.member_id === id))) continue;
    const known = Object.fromEntries(knowledge.revealedCards.map(c => [c.memberId, c.value]));
    const value = p.knockedOut ? pick(selectableCards(p), rng).value : chooseAI(p, session.state, m.ai_type, rng, known);
    let card = p.cycleCards.find(c => !c.used && c.value === value);
    if(needsTwoCards(session)){
      const other=selectableCards(p).filter(c=>c.id!==card.id);
      if(other.length)card=pick([card,pick(other,rng)],rng);
    }
    const useSkill=!p.knockedOut&&chooseActiveSkill(p,session.state,card.value,known,rng);
    const level=useSkill&&p.skillId==='amplify'?((p.characterRuntimeState.mana||0)>=4?2:1):0;
    session.state.lockedMembers.push(m.id);
    submissions.push({ id: crypto.randomUUID(), session_id: session.id, turn_index: session.turn_index, member_id: m.id, card_value: card.value+level, card_id: card.id, use_skill: Boolean(useSkill), amplify_level: level, is_ai: m.member_type === 'ai', submitted_at: new Date().toISOString() });
    changed = true;
  }
  return changed;
}
export function activateSkill(session, member, userId, body, submissions) {
  if(session.state.entryLoading)throw new Error('원정대의 이미지 준비를 기다리고 있습니다.');
  if (!member || member.user_id !== userId || member.member_type !== 'human') throw new Error('자신의 스킬만 사용할 수 있습니다.');
  if (session.status !== 'active' || session.state.roomSummary || body.session_id !== session.id || body.turn_index !== session.turn_index) throw new Error('턴이 변경되었습니다. 상태를 새로 불러옵니다.');
  const player = session.state.players[member.id];
  ensureCharacterState(player, session.state.characterDefinitions[player.characterId]);
  if (player.skillId === 'revelation' && player.characterRuntimeState.revealExpiresTurn === session.turn_index) return false;
  if (player.skillId === 'acrobatics' && player.characterRuntimeState.acrobatTurn === session.turn_index) return false;
  if (submissions.some(s => s.member_id === member.id && s.turn_index === session.turn_index)) throw new Error('카드 제출 전에 스킬을 사용해 주세요.');
  if(player.skillId==='acrobatics')return activateAcrobatics(session,player);
  return activateRevelation(session, player);
}
export function validateSubmission(session, member, userId, body, submissions, rng=Math.random) {
  if(session.state.entryLoading)throw new Error('원정대의 이미지 준비를 기다리고 있습니다.');
  if (!member || member.user_id !== userId || member.member_type !== 'human') throw new Error('자신의 카드만 제출할 수 있습니다.');
  if (session.status !== 'active' || session.state.roomSummary) throw new Error('카드를 제출할 수 없는 상태입니다.');
  if (body.session_id !== session.id || body.turn_index !== session.turn_index) throw new Error('턴이 변경되었습니다. 상태를 새로 불러옵니다.');
  if (submissions.some(s => s.member_id === member.id && s.turn_index === session.turn_index)) throw new Error('이미 선택을 완료했습니다.');
  const p = session.state.players[member.id];
  ensureCharacterState(p, session.state.characterDefinitions[p.characterId]);
  if (p.knockedOut) throw new Error('기절 중에는 서버가 카드를 선택합니다.');
  let card;
  if(needsTwoCards(session)){
    const count=Math.min(2,selectableCards(p).length);
    if(!Array.isArray(body.card_ids)||body.card_ids.length!==count||new Set(body.card_ids).size!==count)throw new Error(`뒤죽박죽: 서로 다른 카드 ${count}장을 선택해 주세요.`);
    const choices=body.card_ids.map(id=>selectableCards(p).find(c=>c.id===id));
    if(choices.some(c=>!c))throw new Error('남아 있는 카드만 선택할 수 있습니다.');
    card=pick(choices,rng);
  }else{
    if(body.card_ids!==undefined)throw new Error('이번 턴은 카드 한 장을 선택해 주세요.');
    card=selectedCard(p,body);
  }
  if (!card || (body.card_value !== undefined && body.card_value !== card.value)) throw new Error('남아 있는 카드 인스턴스를 선택해 주세요.');
  if (body.use_skill !== undefined && typeof body.use_skill !== 'boolean') throw new Error('잘못된 스킬 요청입니다.');
  if(body.use_skill&&p.skillId==='acrobatics')throw new Error('곡예 버튼으로 먼저 홀짝과 손패를 변경해 주세요.');
  if (body.use_skill && ((p.skillType !== 'active' && !['full_burst','amplify','blood_command','soul_slash'].includes(p.skillId)) || !p.activeSkillState.available)) throw new Error('사용할 수 없는 스킬입니다.');
  if (body.use_skill && p.skillId === 'blood_command' && (!p.characterRuntimeState.thrallId || !session.state.players[p.characterRuntimeState.thrallId] || session.state.players[p.characterRuntimeState.thrallId].knockedOut)) throw new Error('카드를 제출할 수 있는 권속이 필요합니다.');
  if (body.use_skill && p.skillId === 'soul_slash' && !session.state.monster) throw new Error('귀참은 몬스터 전투에서만 사용할 수 있습니다.');
  const level=amplifyLevel(p,body);
  if(body.amplify_level!==undefined&&(!Number.isInteger(body.amplify_level)||body.amplify_level<0||body.amplify_level>2))throw new Error('잘못된 증폭 단계입니다.');
  if(body.amplify_level&&(!body.use_skill||p.skillId!=='amplify'))throw new Error('증폭을 사용할 수 없습니다.');
  if(p.skillId==='amplify'&&body.use_skill&&(!level||(p.characterRuntimeState.mana||0)<level*2))throw new Error('마나가 부족합니다.');
  return card;
}

function targetsFor(selector, cards, players) {
  const valid = cards.filter(c => c.valid);
  if (selector === 'highest' || selector === 'lowest') {
    const value = (selector === 'highest' ? Math.max : Math.min)(...valid.map(c => c.value));
    return valid.filter(c => c.value === value);
  }
  if (selector === 'leader') { const max = Math.max(...Object.values(players).map(p => p.score)); return cards.filter(c => players[c.memberId].score === max); }
  return cards.filter(c => ({ duplicates: !c.valid, high: c.value >= 4, low: c.value <= 2, odd: c.value % 2 === 1, even: c.value % 2 === 0 })[selector]);
}

export function resolveTurn(session, submissions, rng = Math.random) {
  if(session.state.entryLoading)throw new Error('원정대의 이미지 준비를 기다리고 있습니다.');
  const s = session.state;
  if(s.roomSummary || Object.keys(s.selectionHolds||{}).length)throw new Error('준비 또는 카드 확정을 기다리고 있습니다.');
  const current = submissions.filter(x => x.turn_index === session.turn_index).map(x=>x.use_skill&&x.amplify_level==null&&s.players[x.member_id]?.skillId==='amplify'?{...x,legacyAmplify:true}:x);
  const ids = Object.keys(s.players);
  if (current.length !== ids.length || new Set(current.map(c => c.member_id)).size !== ids.length || current.some(c => !ids.includes(c.member_id))) throw new Error('전원 제출이 필요합니다.');
  for (const id of ids) ensureCharacterState(s.players[id], s.characterDefinitions[s.players[id].characterId]);
  for (const sub of current) {
    const card = selectedCard(s.players[sub.member_id], sub);
    if (!card || submissionValue(s.players[sub.member_id],card,sub) !== sub.card_value) throw new Error('보유하지 않은 카드 인스턴스입니다.');
  }
  const cards = current.map(c => ({ memberId: c.member_id, cardId: selectedCard(s.players[c.member_id], c).id, value: c.card_value, valid: true, clashed: false }));
  const beforePlayers = structuredClone(s.players);
  const recovering = ids.filter(id => s.players[id].knockedOut);
  const effects = [];
  // Exchange effective values after personal amplification, before any duplicate check.
  // Original card IDs remain untouched so the actual card consumed is unchanged.
  for (const id of ids) {
    const player=s.players[id], targetId=player.characterRuntimeState.thrallId;
    if(player.skillId!=='blood_command'||player.knockedOut||!current.find(x=>x.member_id===id)?.use_skill||!targetId||s.players[targetId]?.knockedOut)continue;
    const source=cards.find(c=>c.memberId===id),target=cards.find(c=>c.memberId===targetId);
    if(!source||!target)continue;
    for(const card of [source,target])card.exchangeFrom??=card.value;
    const sourceValue=source.value,targetValue=target.value;
    source.value=targetValue;target.value=sourceValue;
    source.skillUsed=true;source.skillId='blood_command';source.didBloodCommand=true;
    delete player.characterRuntimeState.thrallId;
    effects.push({type:'vampire_swap',sourceId:id,targetId,sourceValue,targetValue});
  }
  stealCardNumbers(cards,s.players,effects,ids);
  const counts=cards.reduce((a,c)=>(a[c.value]=(a[c.value]||0)+1,a),{});
  for(const card of cards){card.valid=counts[card.value]===1;card.clashed=!card.valid;}
  const result = { type: 'turn_result', turnIndex: session.turn_index, stageIndex: session.stage_index, stage: structuredClone(s.currentStage), monsterBefore: structuredClone(s.monster), beforePlayers, cards, effects, totalDamage: 0, success: false, stageCleared: false };
  const context = { players: s.players, cards, effects, category: s.currentStage.category, turnIndex: session.turn_index, stageScore: s.stageScore, rng };
  context.grantGold = (id, amount, reason) => grantGold(context, id, amount, reason);
  echoCardRules(session,cards);
  for(const card of cards){
    const player=s.players[card.memberId];
    if(player.skillId!=='blood_command'||player.knockedOut||card.didBloodCommand||player.characterRuntimeState.thrallId||!card.clashed)continue;
    const peers=cards.filter(c=>c.memberId!==card.memberId&&c.value===card.value&&!s.players[c.memberId].knockedOut);
    if(!peers.length)continue;
    const highest=Math.max(...peers.map(c=>s.players[c.memberId].score));
    const ties=peers.filter(c=>s.players[c.memberId].score===highest);
    const thrall=pick(ties,rng).memberId;
    player.characterRuntimeState.thrallId=thrall;
    effects.push({type:'skill',skillId:'blood_command',phase:'clash',memberId:card.memberId,targetId:thrall,label:'흡혈의 낙인 · 권속 표식'});
  }
  resolveClashSkills(context);
  for (const card of cards) resolveCardEffectModifiers(s.players[card.memberId], card, current.find(c => c.member_id === card.memberId), !!s.monster);
  // A recovering player's card still participates in collisions, but cannot
  // attack during the automatic knockout turn.
  if(s.monster)for(const card of cards)if(recovering.includes(card.memberId))card.damageValue=0;
  applyBossCardEffects(session,cards,effects);
  // A damage-only trait: exchanged numbers retain their normal collision and
  // high/low rules. Fully blocked attacks and knockout submissions stay at zero.
  if(s.monster)for(const card of cards){
    if(s.players[card.memberId].skillId==='acrobatics'&&card.valid&&!recovering.includes(card.memberId)&&!['봉인','포식','장갑'].includes(card.bossModifier)){
      card.damageValue+=2;card.empowered=true;
    }
  }
  const lowest=cards.filter(c=>c.valid).sort((a,b)=>a.value-b.value)[0];
  for(const c of cards){const p=s.players[c.memberId],r=p.characterRuntimeState;
    if(s.monster&&p.skillId==='low_card_gold'&&!p.knockedOut&&c===lowest&&cards.filter(x=>x.valid&&x.value===c.value).length===1){c.damageValue=5;effects.push({type:'skill',skillId:'low_card_gold',phase:'attack',memberId:p.memberId,label:'비열한 일격 · 피해 5'});}
  }
  for (const c of cards) {
    const p=s.players[c.memberId], r=p.characterRuntimeState;
    if (p.skillId !== 'combo') continue;
    if (!s.monster) { r.comboStacks=0; delete r.comboPrevious; continue; }
    if (c.clashed && !c.valid) {
      r.comboStacks=0;
      if (!p.knockedOut) {p.score--;s.stageScore[c.memberId]=(s.stageScore[c.memberId]||0)-1;effects.push({type:'penalty',memberId:c.memberId,score:-1,gold:0,reason:'combo_clash'});}
    }
    if (c.valid && !p.knockedOut) {
      if (r.comboPrevious != null && c.value>r.comboPrevious) r.comboStacks=Math.min(3,(r.comboStacks||0)+1);
      c.damageValue+=r.comboStacks||0;
      if (r.comboStacks) effects.push({type:'skill',skillId:'combo',phase:'attack',memberId:c.memberId,stacks:r.comboStacks,label:`연격 · 추가 피해 +${r.comboStacks}`});
    }
    r.comboPrevious=c.value;
  }
  const valid = cards.filter(c => c.valid);
  function damage(id, amount = 1, selfDamage = false) {
    const p = s.players[id];
    if (p.knockedOut || session.status === 'failed') return;
    const shield=!selfDamage&&s.remakeVersion&&s.monster&&activeEcho(session,'shield',id);
    if(shield){removeEcho(s,shield,'발동');effects.push({type:'shield',memberId:id,label:'철제 부적 · 피해 무효'});return;}
    amount = resolveIncomingDamage(p, amount, effects);
    if (!amount) return;
    const actual = Math.min(p.hp, amount);
    p.hp -= actual; effects.push({ type: 'damage', memberId: id, amount: actual, ...(selfDamage?{reason:'burst_misfire'}:{}) });
    if (p.hp === 0) {
      p.knockedOut = true;
      session.party_knockouts++;
      s.partyKnockouts = session.party_knockouts;
      effects.push({ type: 'knockout', memberId: id });
      const scorePenalty=CONFIG.KNOCKOUT_SCORE_PENALTY+(p.skillId==='blood_heat'?3:0);
      p.score -= scorePenalty;
      p.gold -= CONFIG.KNOCKOUT_GOLD_PENALTY;
      s.stageScore[id] = (s.stageScore[id] || 0) - scorePenalty;
      effects.push({ type: 'penalty', memberId: id, score: -scorePenalty, gold: -CONFIG.KNOCKOUT_GOLD_PENALTY });
      if (session.party_knockouts >= CONFIG.PARTY_KNOCKOUT_LIMIT) session.status = 'failed';
    }
  }
  function reward(id, score = 0, gold = 0) {
    s.players[id].score += score; s.stageScore[id] = (s.stageScore[id] || 0) + score;
    if (score) effects.push({ type: 'reward', memberId: id, score, gold: 0 });
    context.grantGold(id, gold, s.currentStage.contentId);
  }
  function gainPredation(card,gain){
    const player=s.players[card.memberId],previousStacks=player.characterRuntimeState.predation||0;
    const stacks=previousStacks+gain;
    player.characterRuntimeState.predation=stacks;
    if(Math.floor(stacks/8)>Math.floor(previousStacks/8))player.activeSkillState.available=true;
    effects.push({type:'skill',skillId:'predation',phase:'attack',memberId:card.memberId,previousStacks,stacks,gain,label:`포식 +${gain}`});
  }
  function heal(id, amount) {
    const p = s.players[id];
    if (p.knockedOut) return;
    const actual = Math.min(p.maxHp - p.hp, amount); p.hp += actual;
    resolveHealingSkills(p);
    if (actual) effects.push({ type: 'heal', memberId: id, amount: actual });
  }
  for(const c of cards)if(c.skillId==='full_burst'&&c.skillUsed&&c.clashed&&!c.valid){effects.push({type:'skill',skillId:'full_burst',phase:'clash',memberId:c.memberId,label:'전탄발사 오발 · HP −1'});damage(c.memberId,1,true);}
  const d = MONSTERS[s.currentStage.contentId] || ROOMS[s.currentStage.contentId];
  s.stageTurn++;
  if (s.monster) {
    echoFirstTurn(session,cards,heal,context.grantGold);
    // Every valid card deals its full damage, even after lethal damage this turn.
    for (const c of [...valid].sort((a, b) => a.value - b.value)) {
      if(recovering.includes(c.memberId))continue;
      const attacker=s.players[c.memberId];
      if(attacker.skillId==='blood_heat' && c.empowered && c.damageValue>0 && !attacker.knockedOut){
        const cost=attacker.hp>1?1:0;attacker.hp-=cost;
        effects.push({type:'skill',skillId:'blood_heat',phase:'attack',memberId:c.memberId,hp:attacker.hp,hpDelta:-cost,label:`피의 열기 · 효과 +1${cost?' / HP −1':''}`});
      }
      s.monster.hp -= c.damageValue; result.totalDamage += c.damageValue;
      const def = s.players[c.memberId].character.definition || {};
      effects.push({ type: 'attack', memberId: c.memberId, amount: c.damageValue, hits:c.burstCards?.length || (attacker.skillId==='combo'?1+(attacker.characterRuntimeState.comboStacks||0):1), characterId: s.players[c.memberId].characterId, attackFx: def.attackFx || 'sword', attackSfx: def.attackSfx || 'sfx_attack_adventurer', amplified: !!c.amplified, empowered: !!c.empowered });
      reward(c.memberId, c.damageValue, 0);
      if(attacker.skillId==='gold_bonus'&&!c.clashed&&!attacker.knockedOut){reward(c.memberId,1,0);effects.push({type:'skill',skillId:'gold_bonus',phase:'attack',memberId:c.memberId,label:'노련한 수완 · 점수 +1'});}
    }
    result.success = result.totalDamage > 0;
    finishBossCardEffects(session,cards,result.totalDamage,effects,context.grantGold);
    result.stageCleared = s.monster.hp <= 0;
    if (result.stageCleared) {
      s.monster.hp = 0;
      const greatestDamage = Math.max(...valid.map(c => c.damageValue));
      const winners = valid.filter(c => c.damageValue === greatestDamage);
      result.winnerMemberIds=winners.map(c=>c.memberId);
      if(winners.length)result.winnerMemberId=winners[0].memberId;
      const killScore=s.currentStage.category==='boss'?20:CONFIG.KILL_WINNER_SCORE;
      const goldWinner=winners.length?pick(winners,rng):null;
      for(const winner of winners) {
        reward(winner.memberId, killScore, winner===goldWinner?CONFIG.KILL_WINNER_GOLD:0);
        effects.push({type:'kill_bonus',memberId:winner.memberId,score:killScore,damage:winner.damageValue});
      }
    }
    // Grow only after all damage and kill leadership have been decided.
    const greatestDamage=Math.max(0,...valid.map(c=>c.damageValue));
    for(const card of valid.filter(c=>s.players[c.memberId].skillId==='soul_slash'&&!recovering.includes(c.memberId)&&!['봉인','포식','장갑'].includes(c.bossModifier))){
      const gain=result.stageCleared?(card.damageValue===greatestDamage?8:4):1;
      gainPredation(card,gain);
    }
    if (!result.stageCleared) {
      s.monster.attackIn-=echoCountdown(session,cards);
      if (s.monster.attackIn <= 0) {
        const boss = s.currentStage.category === 'boss';
        if(boss&&s.monster.nextAction==='special'){
          castBossSpecial(session,cards,effects,rng);s.monster.nextAction='normal';
        }else{
          const priority=boss&&d.special==='bait'&&s.monster.greedTargets?.length?s.monster.greedTargets:null;
          let targets=priority?cards.filter(c=>priority.includes(c.memberId)):targetsFor(d.target,cards,s.players);
          const hearty=s.remakeVersion&&activeEcho(session,'hearty');
          if(hearty){const eligible=targets.filter(c=>!s.players[c.memberId].knockedOut);const spared=eligible.length?pick(eligible,rng):null;targets=targets.filter(c=>c!==spared);removeEcho(s,hearty,'발동');}
          for(const c of targets)damage(c.memberId,1);
          if(boss){delete s.monster.greedTargets;s.monster.nextAction='special';}
        }
        s.monster.attackIn = boss ? 2 : 3;
      }
    } else for (const id of ids) reward(id, 2, s.currentStage.category === 'boss' ? 10 : 2);
    s.monster.previousDuplicates=[...new Set(cards.filter(c=>c.clashed).map(c=>c.value))];
  } else if(s.remakeVersion){
    result.success=eventResult(session,cards,{damage,heal,gold:context.grantGold,rng});result.stageCleared=true;
  } else {
    const sum = valid.reduce((n, c) => n + c.effectValue, 0);
    let recipients = valid;
    let ok = valid.length > 0;
    if (d.resolver === 'threshold' || d.resolver === 'partyHeal') ok = sum >= d.threshold;
    if (d.resolver === 'range') ok = sum >= d.min && sum <= d.max;
    if (d.resolver === 'count') ok = valid.length === d.count;
    if (d.resolver === 'highest' || d.resolver === 'lowest') {
      const best = (d.resolver === 'highest' ? Math.max : Math.min)(...valid.map(c => c.effectValue));
      recipients = valid.filter(c => c.effectValue === best);
    }
    if (d.resolver === 'odd') ok = sum % 2 === 1;
    if (d.resolver === 'truce') ok = valid.length > 0 && sum <= d.max;
    if (d.resolver === 'individual' || d.resolver === 'offer') {
      recipients = valid.filter(c => c.effectValue >= d.min);
      ok = recipients.length > 0;
      if (d.resolver === 'individual') for (const c of cards.filter(c => !recipients.includes(c))) damage(c.memberId);
    }
    if (ok) {
      if (d.resolver === 'partyHeal' || d.resolver === 'truce') for (const id of ids) heal(id, d.heal);
      for (const c of recipients) {
        reward(c.memberId, d.reward || 0, d.resolver === 'trade' ? c.effectValue * 2 : d.gold || 0);
        if (d.heal && !['partyHeal', 'truce'].includes(d.resolver)) heal(c.memberId, d.heal);
        if (d.cost || d.resolver === 'offer') damage(c.memberId, d.cost || 1);
      }
    } else if ((d.category === 'trap' && d.resolver !== 'individual') || d.damage || d.resolver === 'truce') {
      for (const id of ids) damage(id);
    } else if (d.resolver === 'odd') for (const c of valid) damage(c.memberId);
    result.success = ok;
    result.stageCleared = true;
  }
  if(!s.monster)for(const card of valid)if(s.players[card.memberId].skillId==='soul_slash'&&!recovering.includes(card.memberId))gainPredation(card,1);
  if (session.status !== 'failed') resolveRewardSkills(context);
  if (result.stageCleared) for (const p of Object.values(s.players)) if(p.skillId==='combo') {p.characterRuntimeState.comboStacks=0;delete p.characterRuntimeState.comboPrevious;}
  for (const c of cards) {
    const p = s.players[c.memberId];
    p.cycleCards.find(card => card.id === c.cardId).used = true;
    if (c.burstCards) for (const card of p.cycleCards) card.used=true;
    syncCardViews(p);
    if (p.character.definition?.deckType === 'continuous') {
      const previousCards = structuredClone(p.cycleCards);
      settleGamblerHand(p,c.cardId,rng,effects,c.value);
      replenishHand(p, rng);
      effects.push({ type: 'refill', memberId: c.memberId, random: true, continuous: true, replaceAll: true, previousCards, cards: structuredClone(p.cycleCards), cycleIndex: 0 });
    } else if (!p.remainingCards.length) {
      const previousCards = structuredClone(p.cycleCards);
      startCycle(p, s.characterDefinitions[p.characterId], rng);
      effects.push({ type: 'refill', memberId: c.memberId, random: p.character.definition?.deckType === 'random', previousCards, cards: structuredClone(p.cycleCards), cycleIndex: p.cycleIndex });
    }
  }
  resolveTurnEndSkills(s.players, session.turn_index);
  if (session.status !== 'failed') for (const id of recovering) { s.players[id].hp = Math.min(CONFIG.PLAYER_REVIVE_HP, s.players[id].maxHp); s.players[id].knockedOut = false; effects.push({ type: 'revive', memberId: id, hp: s.players[id].hp }); }
  if(s.remakeVersion){
    if(result.stageCleared)finishEchoStage(session,context.grantGold);
    else if(s.stageTurn===1)for(const e of [...echoList(s)])if(e.activeStage===session.stage_index&&['power','lead','twins','balance','truce','curse'].includes(e.id))removeEcho(s,e,'소멸');
  }
  result.monsterAfter = structuredClone(s.monster);
  result.afterPlayers = structuredClone(s.players);
  if (session.status !== 'failed' && result.stageCleared) {
    if (session.stage_index === CONFIG.STAGE_COUNT) session.status = 'completed';
    else if(!s.remakeVersion){ session.stage_index++; enterStage(session); }
  }
  if(s.remakeVersion&&result.stageCleared&&session.status!=='failed'){s.roomSummary={stageIndex:session.stage_index,name:s.currentStage.name,success:result.success,deltas:summaryDeltas(s),echoes:structuredClone(s.echoLog||[]),ready:[],decisions:{}};s.turnPhase='room_result';}
  if(session.status!=='active')settleExpedition(session);
  s.totalScore = Object.fromEntries(ids.map(id => [id, s.players[id].score]));
  s.gold = Object.fromEntries(ids.map(id => [id, s.players[id].gold]));
  s.eventLog.push(result); s.eventLog = s.eventLog.slice(-CONFIG.EVENT_LOG_LIMIT);
  compactHistory(s);
  s.lastResult = result;
  s.lockedMembers = [];
  session.turn_index++;
  updateMonsterIntent(session);
  if (session.status !== 'active') { session.finished_at = new Date().toISOString(); s.turnPhase = 'finished'; }
  return result;
}

export function advanceAutomaticTurns(session, members, submissions, rng = Math.random) {
  if(session.state.entryLoading)return [];
  const events = [];
  if(prepareNextRoom(session,members,rng))events.push({event:'room_updated'});
  if(session.state.roomSummary)return events;
  if(session.state.needsOpenTurn&&session.status==='active'){delete session.state.needsOpenTurn;submissions.push(...openTurn(session,members,rng));}
  // Knocked-out humans may cause an entirely automatic turn. Bound server work.
  for (let i = 0; session.status === 'active' && i < 8; i++) {
    if(Object.keys(session.state.selectionHolds||{}).length)break;
    const turn = submissions.filter(x => x.turn_index === session.turn_index);
    if (turn.length !== members.length) break;
    const result = resolveTurn(session, turn, rng);
    events.push({ event: 'turn_result', turnIndex: result.turnIndex });
    for (const effect of result.effects.filter(e => e.type === 'knockout')) events.push({ event: 'player_knocked_out', memberId: effect.memberId });
    if(session.state.roomSummary)prepareNextRoom(session,members,rng);
    if (session.status !== 'active') { events.push({ event: session.status === 'failed' ? 'game_failed' : 'game_completed' }); break; }
    if (session.state.roomSummary)break;
    delete session.state.needsOpenTurn;
    if (result.stageCleared) events.push({ event: 'stage_started' });
    submissions.push(...openTurn(session, members, rng));
    events.push({ event: 'turn_started' });
  }
  return events;
}

export function prepareNextRoom(session,members,rng=Math.random){
 const s=session.state,summary=s.roomSummary;if(!summary)return false;let changed=false;
 for(const m of members.filter(m=>m.member_type==='ai')){
  if(summary.ready.includes(m.id))continue;
  const offer=s.roomChoices[m.id];if(offer&&!summary.decisions[m.id])chooseRoomReward(session,m.id,offer.kind==='shop'?(s.players[m.id].gold>=offer.price?'buy':'skip'):'cash');
  summary.ready.push(m.id);changed=true;
 }
 if(!members.every(m=>summary.ready.includes(m.id)))return changed;
 if(s.gateOptions?.length){const votes=members.filter(m=>m.member_type==='human').map(m=>summary.decisions[m.id]);const counts=s.gateOptions.map(o=>votes.filter(v=>v===o.kind).length);const max=Math.max(...counts);s.stageOrder=structuredClone(pick(s.gateOptions.filter((o,i)=>counts[i]===max),rng).order);}
 delete s.gateOptions;delete s.roomSummary;
 if(session.status==='active'){session.stage_index++;enterStage(session);s.needsOpenTurn=true;}return true;
}
export function roomReady(session,memberId,stageIndex){
 const s=session.state,summary=s.roomSummary;
 if(!summary||summary.stageIndex!==stageIndex){if(stageIndex<session.stage_index)return false;throw new Error('결산이 변경되었습니다.');}
 if(summary.ready.includes(memberId))return false;
 if((s.roomChoices[memberId]||s.gateOptions?.length)&&!summary.decisions[memberId])throw new Error('먼저 보상 또는 경로를 선택해 주세요.');
 summary.ready.push(memberId);return true;
}
