import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, MONSTERS, ROOMS } from '../supabase/functions/game-api/content.js';
import { AI_TYPES } from '../supabase/functions/game-api/config.js';
import { createSession, createStageOrder, openTurn, validateSubmission, resolveTurn, advanceAutomaticTurns } from '../supabase/functions/game-api/engine.js';
import { chooseAI } from '../supabase/functions/game-api/ai.js';

function random(seed = 1) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function members(aiCount = 0) { return Array.from({ length: 4 }, (_, i) => ({ id: `member-${i}`, user_id: i >= 4 - aiCount ? null : `user-${i}`, member_type: i >= 4 - aiCount ? 'ai' : 'human', ai_type: i >= 4 - aiCount ? AI_TYPES[i] : null, character_id: 'default_001', seat_index: i })); }
function setup(aiCount = 0, definitions = CHARACTERS) { const m = members(aiCount); return { m, g: createSession('room-test', m, definitions, random(1)) }; }
function stage(g, id, category) {
  const d = MONSTERS[id] || ROOMS[id];
  g.state.currentStage = { contentId: id, category: category || d.category || 'monster', name: d.name, rule: d.rule };
  g.state.monster = MONSTERS[id] ? { id, hp: 1000, maxHp: 1000, attackIn: 10 } : null;
}
function submissions(g, values = [1, 2, 3, 4]) { return values.map((card_value, i) => ({ member_id: `member-${i}`, card_value, session_id: g.id, turn_index: g.turn_index })); }
function feed(g, values) {
  for (const [i, v] of values.entries()) if (!g.state.players[`member-${i}`].remainingCards.includes(v)) g.state.players[`member-${i}`].remainingCards.push(v);
  return resolveTurn(g, submissions(g, values));
}

test('dungeon distribution: four monsters, five weighted noncombat rooms, final boss', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const stages = createStageOrder(random(seed));
    assert.equal(stages.length, 10); assert.equal(stages[9].category, 'boss');
    assert.equal(stages.filter(s => s.category === 'monster').length, 4);
    for (const cat of ['trap', 'treasure', 'recovery', 'event']) assert.ok(stages.filter(s => s.category === cat).length <= 2);
  }
});
test('all eight monster and sixteen noncombat IDs exist', () => { assert.equal(Object.keys(MONSTERS).length, 8); assert.equal(Object.keys(ROOMS).length, 16); });
test('duplicate values all cancel, all cards are consumed, valid cards deal exact damage', () => {
  const { g } = setup(); stage(g, 'armored_boar');
  const r = resolveTurn(g, submissions(g, [5, 5, 2, 3]));
  assert.deepEqual(r.cards.map(c => c.valid), [false, false, true, true]); assert.equal(r.totalDamage, 5); assert.equal(g.state.monster.hp, 995);
  for (const p of Object.values(g.state.players)) { assert.equal(p.remainingCards.length, 4); assert.equal(p.discardedCards.length, 1); }
});
test('all-equal cards cancel without damage or rewards', () => {
  const { g } = setup(); stage(g, 'armored_boar');
  const r = resolveTurn(g, submissions(g, [3, 3, 3, 3])); assert.equal(r.totalDamage, 0); assert.ok(r.cards.every(c => !c.valid));
});
test('five consumptions refill from character definition including duplicate values', () => {
  const definitions = { default_001: { ...CHARACTERS.default_001, deck: [1, 1, 3, 5, 7] } };
  const { g } = setup(0, definitions); stage(g, 'armored_boar');
  for (const value of definitions.default_001.deck) resolveTurn(g, submissions(g, [value, value, value, value]));
  for (const p of Object.values(g.state.players)) { assert.deepEqual(p.remainingCards, [1, 1, 3, 5, 7]); assert.deepEqual(p.discardedCards, []); }
});
test('deck persists when crossing combat and noncombat stages', () => {
  const { g } = setup(); stage(g, 'greedy_chest');
  resolveTurn(g, submissions(g)); assert.equal(g.stage_index, 2);
  assert.deepEqual(g.state.players['member-0'].remainingCards, [2, 3, 4, 5]);
});
test('authorization, session/turn mismatch, repeat submission, missing card and knockout are rejected', () => {
  const { g, m } = setup(); const body = { session_id: g.id, turn_index: 1, member_id: m[0].id, card_value: 3 };
  assert.doesNotThrow(() => validateSubmission(g, m[0], 'user-0', body, []));
  assert.throws(() => validateSubmission(g, m[0], 'user-1', body, []));
  assert.throws(() => validateSubmission(g, m[0], 'user-0', { ...body, turn_index: 0 }, []));
  assert.throws(() => validateSubmission(g, m[0], 'user-0', { ...body, session_id: 'wrong' }, []));
  assert.throws(() => validateSubmission(g, m[0], 'user-0', body, submissions(g)));
  assert.throws(() => validateSubmission(g, m[0], 'user-0', { ...body, card_value: 99 }, []));
  assert.throws(() => validateSubmission(g, m[0], 'user-0', { ...body, card_value: '3' }, []));
  g.state.players[m[0].id].knockedOut = true;
  assert.throws(() => validateSubmission(g, m[0], 'user-0', body, []));
  g.status = 'failed'; assert.throws(() => validateSubmission(g, m[1], 'user-1', body, []));
});
test('AI locks first; current hidden choices never enter public session state', () => {
  const { g, m } = setup(2); const automatic = openTurn(g, m, random(4));
  assert.equal(automatic.length, 2); assert.deepEqual(g.state.lockedMembers, ['member-2', 'member-3']);
  assert.ok(!JSON.stringify(g.state).includes('card_value'));
  assert.ok(automatic.every(c => g.state.players[c.member_id].remainingCards.includes(c.card_value)));
});
test('every AI personality chooses legal cards using only the public state', () => {
  for (const ai of AI_TYPES) for (let seed = 1; seed <= 40; seed++) {
    const { g } = setup(); const p = g.state.players['member-0']; p.remainingCards = [2, 2, 5];
    assert.ok(p.remainingCards.includes(chooseAI(p, g.state, ai, random(seed))));
  }
});
test('knockout auto submission consumes a card and restores HP 3 after immune turn', () => {
  const { g, m } = setup(); stage(g, 'chaos_goblin'); g.state.monster.attackIn = 1;
  g.state.players['member-1'].hp = 1;
  const r = resolveTurn(g, submissions(g, [1, 2, 3, 5]));
  assert.ok(r.effects.some(e => e.type === 'knockout')); assert.equal(g.party_knockouts, 1);
  const p = g.state.players['member-1']; assert.equal(p.hp, 0); assert.ok(p.knockedOut);
  const auto = openTurn(g, m, random(7)); assert.equal(auto.length, 1); assert.equal(auto[0].member_id, 'member-1');
  g.state.monster.attackIn = 1;
  const next = [0, 2, 3].map(i => ({ member_id: `member-${i}`, turn_index: g.turn_index, card_value: g.state.players[`member-${i}`].remainingCards[0] }));
  resolveTurn(g, [...auto, ...next]); assert.equal(p.hp, 3); assert.equal(p.knockedOut, false); assert.equal(g.party_knockouts, 1); assert.equal(p.remainingCards.length, 3);
});
test('knockout card still clashes and is consumed, but a unique knockout card never attacks', () => {
  for(const [peerValue,expectedDamage] of [[2,9],[1,7]]){
    const {g,m}=setup();stage(g,'armored_boar');
    const knocked=g.state.players['member-0'];knocked.hp=0;knocked.knockedOut=true;
    const auto=openTurn(g,m,()=>0);
    assert.equal(auto.length,1);
    assert.equal(auto[0].card_value,1);
    const rest=[peerValue,3,4].map((card_value,i)=>({member_id:`member-${i+1}`,card_value,session_id:g.id,turn_index:g.turn_index}));
    const result=resolveTurn(g,[...auto,...rest]);
    assert.equal(result.cards[0].valid,peerValue!==1);
    assert.equal(result.cards[0].damageValue,0);
    assert.equal(result.totalDamage,expectedDamage);
    assert.equal(g.state.monster.hp,1000-expectedDamage);
    assert.ok(!result.effects.some(e=>e.type==='attack'&&e.memberId==='member-0'));
    assert.equal(knocked.score,0);
    assert.equal(knocked.remainingCards.length,4);
    assert.equal(knocked.hp,3);
  }
});
test('eighth knockout immediately fails and voids score/gold for all players', () => {
  for (const count of [4, 6]) {
    const { g: safe } = setup(); stage(safe, 'chaos_goblin'); safe.state.monster.attackIn = 1; safe.party_knockouts = count;
    safe.state.players['member-1'].hp = 1;
    resolveTurn(safe, submissions(safe, [1, 2, 3, 5]));
    assert.equal(safe.party_knockouts, count + 1); assert.equal(safe.status, 'active');
  }
  const { g } = setup(); stage(g, 'chaos_goblin'); g.state.monster.attackIn = 1; g.party_knockouts = 7;
  for (const p of Object.values(g.state.players)) { p.hp = 1; p.score = 99; p.gold = 55; }
  resolveTurn(g, submissions(g, [1, 2, 3, 4]));
  assert.equal(g.status, 'failed'); assert.equal(g.party_knockouts, 8); assert.ok(g.finished_at);
  assert.ok(Object.values(g.state.players).every(p => p.score === 0 && p.gold === 0));
  assert.ok(Object.values(g.state.totalScore).every(v => v === 0));
});
test('four knocked-out humans automatically resolve once then resume selection', () => {
  const { g, m } = setup(); stage(g, 'armored_boar'); g.party_knockouts = 4;
  for (const p of Object.values(g.state.players)) { p.hp = 0; p.knockedOut = true; }
  const auto = openTurn(g, m, random(9)); const events = advanceAutomaticTurns(g, m, auto, random(10));
  assert.equal(g.turn_index, 2); assert.ok(events.some(e => e.event === 'turn_result')); assert.equal(g.state.lockedMembers.length, 0);
  assert.ok(Object.values(g.state.players).every(p => p.hp === 3 && !p.knockedOut));
});
test('last boss defeat completes expedition and suppresses attack', () => {
  const { g } = setup(); stage(g, 'execution_golem', 'boss'); g.stage_index = 10; g.state.monster.hp = 3; g.state.monster.attackIn = 1;
  const result = resolveTurn(g, submissions(g)); assert.equal(g.status, 'completed'); assert.equal(result.totalDamage, 10); assert.ok(result.stageCleared); assert.ok(!result.effects.some(e => e.type === 'damage'));
});
test('all regular/boss patterns resolve and advertise their attack intervals', () => {
  for (const id of Object.keys(MONSTERS)) for (const category of ['monster', 'boss']) {
    const { g } = setup(); stage(g, id, category); g.state.monster.attackIn = 1;
    resolveTurn(g, submissions(g, [1, 2, 4, 5]));
    assert.equal(g.state.monster.attackIn, category === 'boss' ? 2 : MONSTERS[id].interval);
    assert.ok(Object.values(g.state.players).every(p => p.hp >= 0 && p.hp <= 3));
  }
});
test('treasure selects unique high/low cards and cursed safe charges its recipient', () => {
  for (const [id, expected] of [['greedy_chest', 3], ['humble_chest', 0], ['cursed_safe', 3]]) {
    const { g } = setup(); stage(g, id); resolveTurn(g, submissions(g));
    assert.equal(g.state.players[`member-${expected}`].gold, ROOMS[id].gold);
    assert.equal(Object.values(g.state.players).filter(p => p.gold).length, 1);
    if (id === 'cursed_safe') assert.equal(g.state.players['member-3'].hp, 2);
  }
});
test('healing never exceeds max HP; healing cannot override a knockout', () => {
  const { g } = setup(); stage(g, 'healing_spring'); g.state.players['member-0'].hp = 2;
  g.state.players['member-1'].hp = 0; g.state.players['member-1'].knockedOut = true;
  resolveTurn(g, submissions(g));
  assert.equal(g.state.players['member-0'].hp, 3); assert.equal(g.state.players['member-1'].hp, 3); assert.equal(g.state.players['member-2'].hp, 3);
});
test('all sixteen event rooms handle unique and fully canceled cards and advance exactly once', () => {
  for (const id of Object.keys(ROOMS)) for (const values of [[1, 2, 3, 4], [2, 2, 2, 2]]) {
    const { g } = setup(); stage(g, id); const result = resolveTurn(g, submissions(g, values));
    assert.ok(result.stageCleared); assert.equal(g.stage_index, 2); assert.equal(g.turn_index, 2);
    assert.ok(Object.values(g.state.players).every(p => p.remainingCards.length === 4 && p.hp >= 0 && p.hp <= 3));
  }
});
test('trap and event success/failure boundaries match published rules', () => {
  const cases = [
    ['pressure_plate', [1, 1, 3, 5], true], ['pressure_plate', [1, 1, 2, 3], false],
    ['overload_device', [1, 2, 3, 5], false], ['overload_device', [1, 2, 3, 4], true],
    ['twin_statues', [1, 1, 3, 5], true], ['twin_statues', [1, 2, 3, 5], false],
    ['balance_vault', [1, 2, 3, 5], true], ['balance_vault', [1, 1, 2, 3], false],
    ['gamblers_altar', [1, 2, 3, 5], true], ['gamblers_altar', [1, 2, 3, 4], false],
    ['ancient_gate', [1, 2, 3, 4], true], ['ancient_gate', [1, 1, 3, 5], false],
    ['truce_offer', [1, 1, 2, 5], true], ['truce_offer', [1, 1, 3, 5], false],
  ];
  for (const [id, values, success] of cases) { const { g } = setup(); stage(g, id); assert.equal(feed(g, values).success, success, id); }
});
test('partial and repeated-member resolutions are rejected', () => {
  const { g } = setup(); assert.throws(() => resolveTurn(g, submissions(g).slice(0, 3)));
  const s = submissions(g); s[3].member_id = s[0].member_id; assert.throws(() => resolveTurn(g, s));
});
test('500 complete simulated expeditions keep HP, deck, knockouts and logs consistent', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const rng = random(seed), m = members(3), g = createSession('room', m, CHARACTERS, rng);
    let submitted = openTurn(g, m, rng), turns = 0;
    while (g.status === 'active' && turns++ < 350) {
      for (const member of m) if (!submitted.some(s => s.turn_index === g.turn_index && s.member_id === member.id)) {
        const p = g.state.players[member.id]; const card = chooseAI(p, g.state, 'balanced', rng);
        submitted.push({ member_id: member.id, turn_index: g.turn_index, card_value: card });
      }
      resolveTurn(g, submitted, rng);
      for (const p of Object.values(g.state.players)) {
        assert.ok(p.hp >= 0 && p.hp <= 3); assert.equal(p.remainingCards.length + p.discardedCards.length, 5);
        assert.equal(p.knockedOut, p.hp === 0);
      }
      assert.ok(g.party_knockouts <= 8); assert.ok(g.state.eventLog.length <= 100);
      if (g.status === 'active') submitted = openTurn(g, m, rng);
    }
    assert.notEqual(g.status, 'active', `Expedition ${seed} did not terminate`);
  }
});


test('lethal turn credits every valid attack and awards the highest attacker exactly +10', () => {
  const { g } = setup(); stage(g, 'armored_boar'); g.state.monster.hp = 1;
  const r = resolveTurn(g, submissions(g, [1, 2, 3, 5]).reverse());
  assert.deepEqual(r.effects.filter(e => e.type === 'attack').map(e => e.amount), [1, 2, 3, 5]);
  assert.equal(r.totalDamage, 11); assert.equal(r.monsterAfter.hp, 0);
  assert.equal(r.winnerMemberId, 'member-3');
  assert.deepEqual(r.effects.filter(e => e.type === 'kill_bonus'), [{ type: 'kill_bonus', memberId: 'member-3', score: 10, damage: 5 }]);
  assert.equal(g.state.players['member-0'].score, 3);
  assert.equal(g.state.players['member-3'].score, 17);
  assert.equal(g.state.players['member-3'].gold, 5);
});
test('canceled high cards cannot win the lethal-turn bonus; surviving enemies grant no bonus', () => {
  const { g } = setup(); stage(g, 'armored_boar'); g.state.monster.hp = 1;
  const r = resolveTurn(g, submissions(g, [5, 5, 2, 3]));
  assert.equal(r.winnerMemberId, 'member-3'); assert.equal(r.totalDamage, 5);
  assert.equal(r.effects.filter(e => e.type === 'attack').length, 2);
  const { g: alive } = setup(); stage(alive, 'armored_boar');
  const waiting = resolveTurn(alive, submissions(alive));
  assert.ok(!waiting.effects.some(e => e.type === 'kill_bonus')); assert.equal(waiting.winnerMemberId, undefined);
});
test('knockout deducts 10 score and 3 gold exactly once, including zero balances', () => {
  const { g, m } = setup(); stage(g, 'pressure_plate'); g.state.players['member-0'].hp = 1;
  const r = resolveTurn(g, submissions(g, [1, 1, 1, 1]));
  const p = g.state.players['member-0']; assert.equal(p.score, -10); assert.equal(p.gold, -3);
  assert.equal(g.state.totalScore[p.memberId], -10); assert.equal(g.state.gold[p.memberId], -3);
  assert.deepEqual(r.effects.filter(e => e.type === 'penalty'), [{ type: 'penalty', memberId: p.memberId, score: -10, gold: -3 }]);
  stage(g, 'pressure_plate');
  const auto = openTurn(g, m, () => 0);
  const next = [1,2,3].map(i => ({ member_id: 'member-' + i, card_value: 2, turn_index: g.turn_index }));
  const recovered = resolveTurn(g, [...auto, ...next]);
  assert.equal(p.hp, 3); assert.equal(p.score, -10); assert.equal(p.gold, -3);
  assert.equal(recovered.effects.filter(e => e.type === 'penalty').length, 0);
  assert.equal(recovered.effects.find(e => e.type === 'revive').hp, 3);
});
