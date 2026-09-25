import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_CATALOG, replenishHand, startCycle } from '../supabase/functions/game-api/characters.js';
import { CHARACTER_CATALOG as GUIDE_CATALOG } from '../src/character-guide-data.js';
import {settleGamblerHand} from '../supabase/functions/game-api/gambler-deck.js';
import {stealCardNumbers} from '../supabase/functions/game-api/imp-steal.js';
import { createSession, resolveTurn, validateSubmission, openTurn, fillAutomaticSubmissions, activateSkill } from '../supabase/functions/game-api/engine.js';
import { grantGold, resolveIncomingDamage, resolveHealingSkills, privateKnowledge, resolveClashSkills } from '../supabase/functions/game-api/skills.js';
import { chooseAI } from '../supabase/functions/game-api/ai.js';
import { cardPool, partyPanels, ownHand, activeButton, revelationGauge } from '../src/character-ui.js';
const rng = seed => () => { seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
test('home character guide matches the live character catalog',()=>{
  assert.deepEqual(GUIDE_CATALOG,CHARACTER_CATALOG);
});
function setup(ids=['adventurer','warrior','rogue','mage']) {
  const members=ids.map((character_id,i)=>({id:`p${i}`,user_id:`u${i}`,member_type:'human',character_id,seat_index:i,display_name:`Player ${i}`}));
  const g=createSession('room',members,CHARACTER_CATALOG,rng(22));
  g.state.currentStage={contentId:'armored_boar',category:'monster',name:'철갑 멧돼지'};
  g.state.monster={id:'armored_boar',hp:999,maxHp:999,attackIn:99};
  return {g,members};
}
function submit(g,values,skills=[]) {
  return values.map((value,i)=> {
    const card=g.state.players[`p${i}`].cycleCards.find(c=>!c.used&&c.value===value);
    assert.ok(card, `p${i} missing ${value}`);
    return {member_id:`p${i}`,session_id:g.id,turn_index:g.turn_index,card_id:card.id,card_value:value,use_skill:skills.includes(i)};
  });
}
function room(g,id,category) { g.state.monster=null;g.state.currentStage={contentId:id,category,name:id}; }
test('eight definitions snapshot independent skills, five instances and duplicate card slots',()=> {
  for(const id of Object.keys(CHARACTER_CATALOG)) {
    const {g}=setup([id,id,id,id]); const p=g.state.players.p0;
    assert.equal(p.cycleCards.length,id==='gambler'?2:id==='gunner'?3:id==='twins'?4:5); assert.equal(new Set(p.cycleCards.map(c=>c.id)).size,p.cycleCards.length);
    assert.equal(p.skillId,CHARACTER_CATALOG[id].definition.skill.id);
    assert.notEqual(p.character,CHARACTER_CATALOG[id]);
  }
  const {g,members}=setup(['warrior','adventurer','rogue','mage']);
  const five=g.state.players.p0.cycleCards.filter(c=>c.value===5);
  const submissions=submit(g,[5,2,3,4]);submissions[0].card_id=five[1].id;
  resolveTurn(g,submissions); assert.equal(g.state.players.p0.cycleCards.find(c=>c.id===five[0].id).used,false);
  assert.equal(g.state.players.p0.cycleCards.find(c=>c.id===five[1].id).used,true);
  assert.throws(()=>validateSubmission(g,members[0],'u0',{session_id:g.id,turn_index:g.turn_index,card_id:five[1].id},[]));
});
test('adventurer grants +1 for each positive gold reward and nothing for zero',()=> {
  const {g}=setup(); const effects=[];const context={players:g.state.players,effects};
  assert.equal(grantGold(context,'p0',2,'test'),3);assert.equal(grantGold(context,'p0',0,'none'),0);
  grantGold(context,'p0',2,'second');assert.equal(g.state.players.p0.gold,6);
  assert.equal(effects.length,2);
});
test('knight active survives raw collisions, consumes once per cycle, and no longer blocks incoming damage',()=> {
  const {g,members}=setup();const p=g.state.players.p1,effects=[];p.hp=1;
  assert.equal(resolveIncomingDamage(p,2,effects),2);
  const r=resolveTurn(g,submit(g,[3,3,3,4],[1]));
  assert.equal(r.cards[1].valid,true);assert.equal(r.cards[1].resisted,true);
  assert.equal(r.cards[0].valid,false);assert.equal(r.cards[2].valid,false);
  assert.equal(r.effects.find(e=>e.type==='attack'&&e.memberId==='p1').amount,3);
  assert.equal(p.activeSkillState.available,false);
  p.hp=3;resolveHealingSkills(p);assert.equal(p.activeSkillState.available,false);
  assert.throws(()=>validateSubmission(g,members[1],'u1',{session_id:g.id,turn_index:g.turn_index,card_id:p.cycleCards[0].id,use_skill:true},[]));
  startCycle(p,p.character);assert.equal(p.activeSkillState.available,true);
});
test('rogue gold only for unique original minimum in treasure/event',()=> {
  for(const [id,category,bonus] of [['greedy_chest','treasure',true],['suspicious_merchant','event',true],['healing_spring','recovery',true],['pressure_plate','trap',true]]) {
    const {g}=setup(['rogue','adventurer','warrior','mage']);room(g,id,category);
    const r=resolveTurn(g,submit(g,[1,2,3,4]));
    assert.equal(r.effects.some(e=>e.reason==='low_card_gold'&&e.memberId==='p0'),bonus);
    assert.equal(r.effects.filter(e=>e.reason==='low_card_gold'&&e.memberId==='p0').reduce((sum,e)=>sum+e.score,0),bonus?5:0);
    assert.equal(r.effects.filter(e=>e.reason==='low_card_gold'&&e.memberId==='p0').reduce((sum,e)=>sum+e.gold,0),bonus?2:0);
  }
  const {g}=setup(['rogue','adventurer','warrior','mage']);room(g,'greedy_chest','treasure');
  assert.ok(!resolveTurn(g,submit(g,[1,1,3,4])).effects.some(e=>e.reason==='low_card_gold'));
  const combat=setup(['rogue','adventurer','warrior','mage']);assert.ok(!resolveTurn(combat.g,submit(combat.g,[1,2,3,4])).effects.some(e=>e.reason==='low_card_gold'));
});
test('mage spends mana and changes collision number while consuming original instance',()=> {
  const {g}=setup(['mage','adventurer','warrior','rogue']),p=g.state.players.p0;p.characterRuntimeState.mana=4;
  const sub=submit(g,[4,5,3,1],[0]);sub[0].amplify_level=1;sub[0].card_value=5;
  const r=resolveTurn(g,sub);assert.equal(r.cards[0].value,5);assert.equal(r.cards[0].valid,false);assert.equal(p.characterRuntimeState.mana,2);assert.equal(p.discardedCards[0],4);
});
test('mage cycle does not refill mana and insufficient reservations are rejected',()=>{
  const {g,members}=setup(['mage','adventurer','warrior','rogue']),p=g.state.players.p0;p.characterRuntimeState.mana=1;
  startCycle(p,p.character);assert.equal(p.characterRuntimeState.mana,1);assert.equal(p.activeSkillState.available,false);
  assert.throws(()=>validateSubmission(g,members[0],'u0',{session_id:g.id,turn_index:g.turn_index,card_id:p.cycleCards[0].id,use_skill:true,amplify_level:1},[]));
});
test('berserker pays nonlethal HP for +1 on every successful combat attack, never in events',()=> {
  for(const hp of [1,2,3]) { const {g}=setup(['berserker','adventurer','warrior','rogue']);g.state.players.p0.hp=hp;
    const r=resolveTurn(g,submit(g,[4,1,2,3]));
    assert.equal(r.effects.find(e=>e.type==='attack'&&e.memberId==='p0').amount,5);
    assert.equal(r.cards[0].value,4);assert.equal(r.cards[0].effectValue,5);
    assert.equal(g.state.players.p0.hp,Math.max(1,hp-1));assert.equal(g.state.players.p0.knockedOut,false);
    assert.ok(!r.effects.some(e=>e.type==='damage'&&e.memberId==='p0'));
  }
  const {g}=setup(['berserker','adventurer','warrior','rogue']);g.state.players.p0.hp=1;room(g,'suspicious_merchant','event');
  const r=resolveTurn(g,submit(g,[4,1,2,3]));assert.equal(r.cards[0].effectValue,4);assert.equal(g.state.players.p0.gold,8);assert.equal(g.state.players.p0.hp,1);
});

test('berserker clash heals once up to two HP without lowering higher HP or reviving',()=>{
 for(const category of ['monster','event'])for(const values of [[4,4,2,3],[4,4,4,3],[4,4,4,4]])for(const hp of [0,1,2,3]){
  const {g}=setup(['berserker','adventurer','mage','rogue']);const p=g.state.players.p0;p.hp=hp;p.knockedOut=hp===0;
  if(category==='event')room(g,'suspicious_merchant','event');
  const r=resolveTurn(g,submit(g,values));
  const heals=r.effects.filter(e=>e.type==='skill'&&e.skillId==='blood_heat'&&e.phase==='clash');
  assert.equal(heals.length,hp>0&&hp<2?1:0);
  if(hp>0)assert.equal(p.hp,hp<2?hp+1:hp);
  assert.ok(!r.effects.some(e=>e.type==='skill'&&e.phase==='attack'&&e.memberId==='p0'));
 }
});

test('blocked berserker cards never spend HP; original numbers still control collisions',()=>{
 for(const kind of ['seal','devour','armor']){
  const {g}=setup(['berserker','adventurer','warrior','rogue']);g.state.currentStage.category='boss';
  if(kind==='armor')g.state.monster.armorTurn=g.turn_index;
  else g.state.monster.pending={kind,turn:g.turn_index,number:1};
  const r=resolveTurn(g,submit(g,[1,2,3,4]));assert.equal(r.cards[0].damageValue,0);assert.equal(g.state.players.p0.hp,3);
  assert.ok(!r.effects.some(e=>e.type==='skill'&&e.phase==='attack'&&e.memberId==='p0'));
 }
 const {g}=setup(['berserker','adventurer','warrior','rogue']);
 const r=resolveTurn(g,submit(g,[4,5,2,3]));assert.equal(r.cards[0].valid,true);assert.equal(r.cards[0].damageValue,5);
});
test('seer gains a stack on any collision and spends one for current-turn private knowledge',()=> {
  const {g,members}=setup(['seer','adventurer','warrior','rogue']);
  const p=g.state.players.p0;
  room(g,'suspicious_merchant','event');
  resolveTurn(g,submit(g,[3,3,3,5]));
  assert.equal(p.characterRuntimeState.revelationStacks,1);assert.equal(p.characterRuntimeState.revealTargets,undefined);
  const request={session_id:g.id,turn_index:g.turn_index};
  p.characterRuntimeState.revelationStacks=0;
  assert.throws(()=>activateSkill(g,members[0],'u0',request,[]),/1칸/);
  p.characterRuntimeState.revelationStacks=1;
  assert.equal(activateSkill(g,members[0],'u0',request,[]),true);
  assert.equal(activateSkill(g,members[0],'u0',request,[]),false);
  assert.equal(p.characterRuntimeState.revelationStacks,0);
  assert.deepEqual(p.characterRuntimeState.revealTargets,['p1','p2','p3']);
  const sub=submit(g,[1,2,5,4]);
  assert.deepEqual(privateKnowledge(g,'p0',sub.slice(1,3)).revealedCards,[{memberId:'p1',value:2},{memberId:'p2',value:5}]);
  assert.deepEqual(privateKnowledge(g,'p3',sub).revealedCards,[]);
  assert.ok(!JSON.stringify(g.state).includes('revealedCards'));
  resolveTurn(g,sub);assert.equal(p.characterRuntimeState.revealExpiresTurn,undefined);
  assert.deepEqual(privateKnowledge(g,'p0',sub).revealedCards,[]);
});
test('seer clash stacks cap at one and survive cycle changes; unique cards give none',()=> {
  for(const last of [false,true]) {
    const {g}=setup(['seer','adventurer','warrior','rogue']);const p=g.state.players.p0;
    if(last){for(const c of p.cycleCards)c.used=c.value!==5;p.remainingCards=[5];}
    p.characterRuntimeState.revelationStacks=1;
    resolveTurn(g,submit(g,last?[5,1,2,3]:[3,3,3,5]));assert.equal(p.characterRuntimeState.revealTargets,undefined);
    assert.equal(p.characterRuntimeState.revelationStacks,1);
    startCycle(p,p.character);assert.equal(p.characterRuntimeState.revelationStacks,1);
  }
});
test('imp steals numbers before collision, including newly created collisions',()=>{
  const {g}=setup(['imp','adventurer','warrior','mage']);
  const r=resolveTurn(g,submit(g,[2,2,3,4]));
  assert.deepEqual(r.cards.map(c=>c.value),[3,1,3,4]);
  assert.deepEqual(r.cards.map(c=>c.valid),[false,true,false,true]);
  assert.equal(r.effects.filter(e=>e.type==='imp_number_steal').length,1);
  assert.ok(!r.effects.some(e=>e.type==='steal'));
});
test('multiple imps use one snapshot, seat order and a zero floor without creating numbers',()=>{
  const players={p0:{skillId:'number_steal'},p1:{skillId:'number_steal'},p2:{skillId:'gold_bonus'},p3:{skillId:'amplify'}};
  const cards=['p0','p1','p2','p3'].map((memberId,i)=>({memberId,value:i===3?4:1}));
  const effects=[];stealCardNumbers(cards,players,effects,['p0','p1','p2','p3']);
  assert.deepEqual(cards.map(c=>c.value),[2,1,0,4]);
  assert.equal(effects.length,1);assert.equal(effects[0].memberId,'p0');
  assert.equal(cards.reduce((n,c)=>n+c.value,0),7);
});
test('two imps each drain the same non-imp when the target has enough value',()=>{
  const run=reverse=>{const {g}=setup(['imp','imp','adventurer','mage']);const subs=submit(g,[4,4,4,4]);return resolveTurn(g,reverse?subs.reverse():subs,rng(8));};
  for(const r of [run(false),run(true)]){
    assert.deepEqual(r.cards.map(c=>c.value),[6,6,2,2]);
    assert.equal(r.effects.filter(e=>e.type==='imp_number_steal').length,4);
    assert.ok(!r.effects.some(e=>e.type==='steal'));
  }
});
test('gambler replaces both cards every turn while conserving its deck',()=> {
  const {g}=setup(['gambler','adventurer','warrior','rogue']);const p=g.state.players.p0;const random=rng(11);const seen=new Set();
  for(let i=0;i<1000;i++) {
    const survivor={...p.cycleCards[1]};const consumed=p.cycleCards[0].id;p.cycleCards[0].used=true;
    settleGamblerHand(p,consumed,random);replenishHand(p,random);const values=p.cycleCards.map(c=>c.value);seen.add(values.join(','));
    assert.equal(values.length,2);assert.ok(values.every(v=>v>=1&&v<=7));
    
    assert.ok(!p.cycleCards.some(c=>c.id===survivor.id));
    
    assert.ok(!p.cycleCards.some(c=>c.id===consumed));assert.ok(p.cycleCards.every(c=>!c.used));
    assert.equal(p.cycleIndex,0);assert.deepEqual(p.remainingCards,values);
  }assert.ok(seen.size>30);
});
test('gambler consumes a clashed card and refills for next turn, rejecting spent IDs',()=>{
 const {g,members}=setup(['gambler','adventurer','warrior','rogue']);const p=g.state.players.p0;
 p.cycleCards=[];p.characterRuntimeState.drawPile=[7,2,1,1];p.characterRuntimeState.discardPile=[];replenishHand(p,()=>0);const old=p.cycleCards[0].id,held=p.cycleCards[1].id;
 const result=resolveTurn(g,submit(g,[1,1,3,4]),()=>.999);
 assert.equal(result.cards.find(c=>c.memberId==='p0').valid,false);
 assert.deepEqual(p.remainingCards,[2,7]);assert.ok(!p.cycleCards.some(c=>c.id===held));
 assert.ok(result.effects.some(e=>e.type==='refill'&&e.continuous&&e.replaceAll));
 assert.throws(()=>validateSubmission(g,members[0],'u0',{session_id:g.id,turn_index:g.turn_index,card_id:old},[]));
 const html=partyPanels({session:g,members,characters:Object.values(CHARACTER_CATALOG)},g.state.players,{me:members[0]});
 assert.match(html,/운명의 패 · 2장 남음/);
});

test('seer AI waits only for entitled human targets; regular AI remains locked first',()=> {
  const {g,members}=setup(['seer','adventurer','mage','gambler']);members[0].member_type='ai';members[0].ai_type='balanced';members[2].member_type='ai';members[2].ai_type='greedy';
  const p=g.state.players.p0;p.characterRuntimeState={revealTargets:['p1'],revealExpiresTurn:g.turn_index};
  const locked=openTurn(g,members,rng(4));assert.ok(!locked.some(s=>s.member_id==='p0'));assert.ok(locked.some(s=>s.member_id==='p2'));
  const c=g.state.players.p1.cycleCards[0];locked.push({member_id:'p1',turn_index:g.turn_index,card_id:c.id,card_value:c.value});
  fillAutomaticSubmissions(g,members,locked,rng(4));assert.ok(locked.some(s=>s.member_id==='p0'));
  for(let seed=1;seed<=40;seed++)assert.notEqual(chooseAI(p,g.state,'balanced',rng(seed),{p1:1}),1);
});
test('AI can play full expeditions for every character without illegal cards or stalled turns',()=> {
  for(const id of Object.keys(CHARACTER_CATALOG)) {
    const {g,members}=setup([id,'gambler','mage','seer']);g.state.monster.hp=31;g.state.monster.maxHp=31;g.state.monster.attackIn=3;
    const random=rng(123);for(const m of members){m.member_type='ai';m.ai_type='balanced';}
    for(let turn=0;turn<400&&g.status==='active';turn++) {
      const subs=openTurn(g,members,random);assert.equal(subs.length,4);resolveTurn(g,subs,random);
      for(const p of Object.values(g.state.players)){assert.equal(p.cycleCards.length,p.characterId==='gambler'?(p.characterRuntimeState.observing?1:2):p.characterId==='gunner'?3:p.characterId==='twins'?4:5);assert.ok(p.hp>=0&&p.hp<=3);}
    }assert.notEqual(g.status,'active');
  }
});
test('card pool uses all five instances; used duplicate is dimmed without revealing locked selection',()=> {
  const {g,members}=setup(['warrior','adventurer','mage','seer']);const p=g.state.players.p0;p.cycleCards[3].used=true;
  const pool=cardPool(p);assert.equal((pool.match(/data-card-instance=/g)||[]).length,5);assert.equal((pool.match(/class="pool-card [^"]*spent/g)||[]).length,1);
  const bundle={session:g,members,characters:Object.values(CHARACTER_CATALOG),privateState:{}};g.state.lockedMembers=['p0'];
  assert.ok(!partyPanels(bundle,g.state.players,{me:members[1]}).includes('선택: 5'));
  bundle.privateState={revealTargets:['p0'],revealedCards:[{memberId:'p0',value:5}]};
  assert.ok(partyPanels(bundle,g.state.players,{me:members[3]}).includes('선택: 5'));
  assert.equal((ownHand(p,{locked:false,result:null,selected:null,useSkill:false}).match(/data-card-instance=/g)||[]).length,5);
});

test('two active knights can both resist a collision, while a boss seal still suppresses their effect',()=>{
 for(const seal of [false,true]){
  const {g}=setup(['warrior','warrior','seer','imp']);
  if(seal){g.state.currentStage.category='boss';g.state.monster.pending={kind:'seal',turn:g.turn_index,number:3};}
  const r=resolveTurn(g,submit(g,[3,3,3,3],[0,1]));
  assert.deepEqual(r.cards.map(c=>c.valid),[true,true,false,false]);
  assert.deepEqual(r.cards.slice(0,2).map(c=>c.damageValue),seal?[0,0]:[3,3]);
  assert.equal(g.state.players.p2.characterRuntimeState.revelationStacks,1);
 }
 const {g}=setup(['warrior','adventurer','mage','imp']);room(g,'suspicious_merchant','event');
 const r=resolveTurn(g,submit(g,[3,3,2,4],[0]));
 assert.equal(r.cards[0].valid,true);assert.equal(g.state.players.p0.gold,6);
});

test('revelation activation is owned, turn-scoped, before submission, and cannot be smuggled into use_skill',()=>{
 const {g,members}=setup(['seer','warrior','mage','imp']);const p=g.state.players.p0;
 p.characterRuntimeState.revelationStacks=2;
 const body={session_id:g.id,turn_index:g.turn_index,card_id:p.cycleCards[0].id};
 assert.throws(()=>activateSkill(g,members[0],'u1',body,[]),/자신/);
 assert.throws(()=>activateSkill(g,members[0],'u0',{...body,turn_index:99},[]),/턴/);
 assert.throws(()=>activateSkill(g,members[0],'u0',body,[{member_id:'p0',turn_index:g.turn_index}]),/제출 전/);
 assert.throws(()=>validateSubmission(g,members[0],'u0',{...body,use_skill:true},[]),/스킬/);
 p.knockedOut=true;assert.throws(()=>activateSkill(g,members[0],'u0',body,[]));p.knockedOut=false;
 assert.equal(p.characterRuntimeState.revelationStacks,2);
 activateSkill(g,members[0],'u0',body,[]);
 assert.equal(p.characterRuntimeState.revelationStacks,0);
 const sub=submit(g,[1,2,3,4]);
 assert.equal(privateKnowledge(g,'p0',sub).revealedCards.length,3);
 assert.equal(privateKnowledge(g,'p1',sub).revealedCards.length,0);
 resolveTurn(g,sub);assert.equal(privateKnowledge(g,'p0',sub).revealedCards.length,0);
});

test('AI seer waiting for a human releases its card when the human seer activates revelation',()=>{
 const {g,members}=setup(['seer','seer','mage','imp']);
 members[1].member_type='ai';members[1].ai_type='balanced';
 for(const id of ['p0','p1'])g.state.players[id].characterRuntimeState.revelationStacks=2;
 const submissions=openTurn(g,members,rng(2));assert.equal(submissions.length,0);
 activateSkill(g,members[0],'u0',{session_id:g.id,turn_index:g.turn_index},submissions);
 fillAutomaticSubmissions(g,members,submissions,rng(2));
 assert.equal(submissions.length,1);assert.equal(submissions[0].member_id,'p1');
 assert.equal(privateKnowledge(g,'p0',submissions).revealedCards.length,1);
 assert.equal(fillAutomaticSubmissions(g,members,submissions,rng(2)),false);
});

test('skill controls label knight and seer correctly and show one filled segment without visible stack digits',()=>{
 const {g}=setup(['seer','warrior','mage','imp']);const p=g.state.players.p0;
 p.characterRuntimeState.revelationStacks=1;
 const gauge=revelationGauge(p);
 assert.equal((gauge.match(/class="revelation-pip/g)||[]).length,1);
 assert.equal((gauge.match(/revelation-pip filled/g)||[]).length,1);
 assert.match(activeButton(p,false,false),/activate-revelation/);
 assert.match(activeButton(g.state.players.p1,true,false),/강인함/);
 assert.ok(!activeButton(g.state.players.p1,true,false).includes('증폭'));
 assert.equal(p.character.display_name,'예언가');
});

test('gunner burst consumes all three cards, preserves collision number, and recharges each cycle',()=>{
 const {g}=setup(['gunner','mage','mage','mage']),p=g.state.players.p0;
 const first=submit(g,[1,2,3,4],[0]);validateSubmission(g,{id:'p0',user_id:'u0',member_type:'human'},'u0',first[0],[]);
 const r=resolveTurn(g,first);assert.equal(r.cards[0].value,1);assert.equal(r.cards[0].effectValue,6);assert.equal(r.cards[0].damageValue,6);
 assert.equal(p.cycleIndex,2);assert.deepEqual(p.remainingCards,[1,2,3]);assert.equal(p.activeSkillState.available,true);
 startCycle(p,p.character);assert.equal(p.cycleIndex,3);assert.equal(p.activeSkillState.available,true);
});
test('gunner failed burst spends cooldown but consumes only chosen card; noncombat uses summed effect',()=>{
 let {g}=setup(['gunner','mage','mage','mage']),p=g.state.players.p0;
 let r=resolveTurn(g,submit(g,[1,1,3,4],[0]));assert.equal(r.cards[0].valid,false);assert.deepEqual(p.remainingCards,[2,3]);assert.equal(p.cycleIndex,1);assert.equal(p.activeSkillState.available,false);
 ({g}=setup(['gunner','mage','mage','mage']));room(g,'suspicious_merchant','event');
 r=resolveTurn(g,submit(g,[1,2,3,4],[0]));assert.equal(r.cards[0].effectValue,6);assert.equal(g.state.players.p0.gold,12);assert.equal(g.state.players.p0.cycleIndex,2);
});
test('fighter gains stacks before damage, retains on lower values, and resets on collision',()=>{
 const {g}=setup(['fighter','mage','mage','mage']),p=g.state.players.p0;
 const run=(value,others)=>{for(let i=1;i<4;i++)startCycle(g.state.players['p'+i],g.state.players['p'+i].character);return resolveTurn(g,submit(g,[value,...others])).cards[0].damageValue;};
 assert.equal(run(1,[2,3,4]),1);assert.equal(run(3,[1,2,4]),4);assert.equal(run(2,[1,3,4]),3);assert.equal(run(5,[1,2,3]),7);
 run(4,[4,2,3]);assert.equal(p.characterRuntimeState.comboStacks,0);
});
test('fighter stacks cap at three and reset on monster kill and noncombat',()=>{
 const {g}=setup(['fighter','mage','mage','mage']),p=g.state.players.p0;
 p.characterRuntimeState.comboStacks=3;p.characterRuntimeState.comboPrevious=1;
 let r=resolveTurn(g,submit(g,[2,1,3,4]));assert.equal(r.cards[0].damageValue,5);assert.equal(p.characterRuntimeState.comboStacks,3);
 g.state.monster.hp=1;r=resolveTurn(g,submit(g,[5,2,4,3]));assert.equal(p.characterRuntimeState.comboStacks,0);assert.equal(p.characterRuntimeState.comboPrevious,undefined);
});

test('fighter never gains or deals combo damage outside combat',()=>{
 const {g}=setup(['fighter','mage','mage','mage']),p=g.state.players.p0;
 p.characterRuntimeState.comboStacks=3;p.characterRuntimeState.comboPrevious=1;
 room(g,'suspicious_merchant','event');const r=resolveTurn(g,submit(g,[2,1,3,4]));
 assert.equal(r.cards[0].effectValue,2);assert.equal(p.gold,4);assert.equal(p.characterRuntimeState.comboStacks,0);assert.equal(p.characterRuntimeState.comboPrevious,undefined);
});

test('fighter clash costs exactly one point at any stack count only in combat and remembers the card',()=>{
 for(const stacks of [0,1,3])for(const category of ['monster','event']){
  const {g}=setup(['fighter','mage','mage','mage']),p=g.state.players.p0;p.score=10;p.characterRuntimeState.comboStacks=stacks;
  if(category==='event')room(g,'ancient_gate','event');
  const r=resolveTurn(g,submit(g,[3,3,3,3]));const penalties=r.effects.filter(e=>e.reason==='combo_clash');
  assert.equal(penalties.length,category==='monster'?1:0);assert.equal(p.score,category==='monster'?9:10);assert.equal(p.characterRuntimeState.comboStacks,0);
  if(category==='monster')assert.equal(p.characterRuntimeState.comboPrevious,3);
 }
});
test('every tied highest attacker gets the full normal or boss kill score; gold is not multiplied',()=>{
 for(const boss of [false,true]){
  const {g}=setup(['berserker','warrior','adventurer','rogue']);g.state.monster.hp=1;if(boss)g.state.currentStage.category='boss';
  const r=resolveTurn(g,submit(g,[4,5,1,3]));const bonuses=r.effects.filter(e=>e.type==='kill_bonus');
  assert.deepEqual(bonuses.map(e=>e.memberId).sort(),['p0','p1']);assert.ok(bonuses.every(e=>e.score===(boss?20:10)));
  assert.equal(r.afterPlayers.p0.score,5+(boss?20:10)+2);assert.equal(r.afterPlayers.p1.score,5+(boss?20:10)+2);
 }
});
test('gunner failed burst is available in the very next cycle',()=>{
 const {g}=setup(['gunner','mage','mage','mage']),p=g.state.players.p0;
 resolveTurn(g,submit(g,[1,1,3,4],[0]));assert.equal(p.characterRuntimeState.burstReadyCycle,2);assert.equal(p.activeSkillState.available,false);
 startCycle(p,p.character);assert.equal(p.activeSkillState.available,true);
});
test('berserker knockout adds exactly three score penalty and preserves gold penalty',()=>{
 const {g}=setup(['berserker','mage','mage','mage']),p=g.state.players.p0;p.hp=1;
 g.state.currentStage.contentId='execution_golem';g.state.monster.attackIn=1;
 const r=resolveTurn(g,submit(g,[5,1,2,3]));const penalties=r.effects.filter(e=>e.type==='penalty'&&e.memberId==='p0');
 assert.equal(penalties.length,1);assert.equal(penalties[0].score,-13);assert.equal(penalties[0].gold,-3);assert.equal(p.knockedOut,true);
});
