import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS,MONSTERS } from '../supabase/functions/game-api/content.js';
import { createSession,resolveTurn,validateSubmission,openTurn } from '../supabase/functions/game-api/engine.js';
import { syncCardViews } from '../supabase/functions/game-api/characters.js';
import { privateKnowledge } from '../supabase/functions/game-api/skills.js';
import { settleExpedition,settlementPercent } from '../supabase/functions/game-api/settlement.js';
import { isShuffleTurn,selectionInfo,toggleCardSelection } from '../src/battle-rules.js';
import { panelControls } from '../src/character-ui.js';
import { cardComponent } from '../src/card-component.js';

function setup(id,category='boss'){
 const members=Array.from({length:4},(_,i)=>({id:`m${i}`,user_id:`u${i}`,character_id:'default_001',member_type:'human',seat_index:i}));
 const g=createSession('test',members,CHARACTERS,()=>.2);g.stage_index=category==='boss'?10:1;
 g.state.currentStage={category,contentId:id,name:MONSTERS[id].name};
 g.state.monster={id,hp:1000,maxHp:1000,attackIn:category==='boss'?2:3,nextAction:'normal',previousDuplicates:[]};
 return {g,members};
}
function deal(g,values){
 return values.map((value,i)=>{
  const p=g.state.players[`m${i}`];
  p.cycleCards=[value,1,2,3,4].map((v,j)=>({id:`${p.memberId}-${g.turn_index}-${j}`,value:v,used:false,slot:j}));syncCardViews(p);
  return {session_id:g.id,turn_index:g.turn_index,member_id:p.memberId,card_id:p.cycleCards[0].id,card_value:value};
 });
}
const turn=(g,values=[1,2,3,4],rng=()=>.1)=>resolveTurn(g,deal(g,values),rng);
function cast(id){const state=setup(id);state.g.state.monster.attackIn=1;state.g.state.monster.nextAction='special';return state;}

test('all eight normals attack every third turn; bosses alternate normal and special every second turn',()=>{
 for(const id of Object.keys(MONSTERS)){
  const {g:normal}=setup(id,'monster');assert.equal(MONSTERS[id].interval,3);
  assert.ok(!turn(normal).effects.some(e=>e.type==='damage'));
  assert.ok(!turn(normal).effects.some(e=>e.type==='damage'));
  const first=turn(normal);assert.equal(normal.state.monster.attackIn,3);
  if(id!=='echo_bat')assert.ok(first.effects.some(e=>e.type==='damage'&&e.amount===1));
  const {g}=setup(id);
  for(let n=1;n<=8;n++){
   for(const p of Object.values(g.state.players)){p.hp=3;p.knockedOut=false;}
   const result=turn(g);const casts=result.effects.filter(e=>e.type==='boss_special');
   assert.equal(casts.length,n===4||n===8?1:0,`${id} turn ${n}`);
   if(n===4||n===8)assert.ok(!result.effects.some(e=>e.type==='damage'));
   assert.equal(g.state.monster.attackIn,n%2?1:2);
  }
 }
});

test('boar checks next turn against 8, then blocks exactly the following turn first valid attack',()=>{
 const {g}=cast('armored_boar');turn(g);assert.equal(g.state.monster.pending.turn,g.turn_index);
 turn(g,[1,1,2,3]);assert.equal(g.state.monster.armorTurn,g.turn_index);
 const hit=turn(g);assert.deepEqual(hit.cards.map(c=>c.damageValue),[0,2,3,4]);assert.equal(hit.totalDamage,9);assert.equal(g.state.monster.armorTurn,undefined);
 assert.equal(turn(g).totalDamage,10);
 const {g:enough}=cast('armored_boar');turn(enough);turn(enough,[1,1,3,5]);assert.equal(enough.state.monster.armorTurn,undefined);
});

test('bat remembers the previous turn duplicates, reduces raw-number matches even if canceled, then expires',()=>{
 const {g}=cast('echo_bat');g.state.monster.previousDuplicates=[2];turn(g,[5,5,1,3]);
 assert.deepEqual(g.state.monster.pending.numbers,[2]);
 const clone=structuredClone(g);const next=turn(g,[2,3,4,5]);assert.equal(next.cards[0].effectValue,1);assert.equal(next.cards[0].damageValue,1);
 const canceled=turn(clone,[2,2,3,4]);assert.equal(canceled.cards[0].valid,false);assert.equal(canceled.cards[0].effectValue,1);assert.equal(canceled.totalDamage,7);
 assert.equal(turn(g,[2,3,4,5]).cards[0].effectValue,2);
});

test('hunter publishes only marked submissions to every participant and removes disclosure after one turn',()=>{
 const {g}=cast('coward_hunter');g.state.players.m0.score=100;turn(g);
 const submitted=deal(g,[4,2,3,5]).slice(0,2);
 for(const id of ['m0','m1','m2','m3']){
  const knowledge=privateKnowledge(g,id,submitted);assert.deepEqual(knowledge.publicRevealTargets,['m0']);assert.deepEqual(knowledge.revealedCards,[{memberId:'m0',value:4}]);
 }
 turn(g);assert.deepEqual(privateKnowledge(g,'m1',submitted).revealedCards,[]);
 const {g:ties}=cast('coward_hunter');turn(ties,[2,2,2,2]);assert.equal(ties.state.monster.pending.targets.length,4);
});

test('golem seal consumes cards, still clashes, and cannot be bypassed by amplification',()=>{
 const {g}=cast('execution_golem');turn(g,[1,2,3,4],()=>0);assert.equal(g.state.monster.pending.number,1);assert.match(g.state.monster.statusText,/숫자 1/);
 g.state.players.m0.skillId='amplify';g.state.players.m0.skillType='active';g.state.players.m0.activeSkillState.available=true;g.state.players.m0.characterRuntimeState.mana=2;g.state.monster.pending.number=2;
 const sub=deal(g,[1,2,3,4]);sub[0].use_skill=true;sub[0].amplify_level=1;sub[0].card_value=2;const r=resolveTurn(g,sub);assert.equal(r.cards[0].effectValue,0);assert.equal(r.cards[0].damageValue,0);assert.equal(g.state.players.m0.activeSkillState.available,false);assert.equal(g.state.players.m0.discardedCards.length,1);
 const {g:dupes}=cast('execution_golem');turn(dupes,[1,2,3,4],()=>0);assert.deepEqual(turn(dupes,[1,1,3,4]).cards.map(c=>c.valid),[false,false,true,true]);
});

test('seer announces parity and floors penalties at zero while preserving collision values',()=>{
 const {g}=cast('cursed_seer');turn(g);assert.equal(g.state.monster.pending.parity,1);assert.match(g.state.monster.statusText,/홀수/);
 const r=turn(g);assert.deepEqual(r.cards.map(c=>c.damageValue),[0,2,2,4]);assert.deepEqual(r.cards.map(c=>c.value),[1,2,3,4]);
 assert.deepEqual(turn(g).cards.map(c=>c.damageValue),[1,2,3,4]);
});

test('slime eats only the smallest unique card and heals at most three before attacks, capped at max HP',()=>{
 const {g}=cast('hungry_slime');turn(g);g.state.monster.hp=990;
 const r=turn(g,[1,1,4,5]);assert.equal(r.cards[2].damageValue,0);assert.equal(r.totalDamage,5);assert.equal(g.state.monster.hp,988);assert.equal(r.effects.find(e=>e.type==='monster_heal').amount,3);
 const {g:full}=cast('hungry_slime');turn(full);full.state.monster.hp=1000;const noOver=turn(full);assert.equal(noOver.effects.find(e=>e.type==='monster_heal').amount,0);
 const {g:clash}=cast('hungry_slime');turn(clash);assert.ok(!turn(clash,[1,1,1,1]).effects.some(e=>e.type==='monster_heal'));
});

test('goblin validates two distinct instances, randomly submits one, consumes only it and supports one remaining card',()=>{
 const {g,members}=cast('chaos_goblin');turn(g);deal(g,[1,2,3,4]);assert.equal(isShuffleTurn(g),true);
 const p=g.state.players.m0,ids=[p.cycleCards[0].id,p.cycleCards[1].id];
 const body={session_id:g.id,turn_index:g.turn_index,card_ids:ids};
 assert.equal(validateSubmission(g,members[0],'u0',body,[],()=>0).id,ids[0]);assert.equal(validateSubmission(g,members[0],'u0',body,[],()=>.99).id,ids[1]);
 for(const card_ids of [[ids[0]],[ids[0],ids[0]],[ids[0],'forged'],[...ids,'third']])assert.throws(()=>validateSubmission(g,members[0],'u0',{...body,card_ids},[]));
 const submitted=Object.values(g.state.players).map((x,i)=>({member_id:x.memberId,turn_index:g.turn_index,card_id:x.cycleCards[0].id,card_value:x.cycleCards[0].value}));resolveTurn(g,submitted);
 assert.equal(p.cycleCards.find(c=>c.id===ids[0]).used,true);assert.equal(p.cycleCards.find(c=>c.id===ids[1]).used,false);
 const one=cast('chaos_goblin');turn(one.g);const only=one.g.state.players.m0;only.cycleCards.forEach((c,i)=>{c.used=i!==0;});syncCardViews(only);
 assert.equal(validateSubmission(one.g,one.members[0],'u0',{session_id:one.g.id,turn_index:one.g.turn_index,card_ids:[only.cycleCards[0].id]},[]).id,only.cycleCards[0].id);
 one.members.forEach(m=>{m.member_type='ai';m.user_id=null;m.ai_type='balanced';});assert.equal(openTurn(one.g,one.members,()=>.3).length,4);
});

test('mimic bait grants 3G and overrides the next basic attack target once',()=>{
 const {g}=cast('greed_mimic');g.state.players.m0.score=100;turn(g);
 turn(g,[1,2,3,5]);assert.equal(g.state.players.m3.gold,3);assert.deepEqual(g.state.monster.greedTargets,['m3']);
 const attack=turn(g);assert.deepEqual(attack.effects.filter(e=>e.type==='damage').map(e=>e.memberId),['m3']);assert.equal(g.state.monster.greedTargets,undefined);
 g.state.monster.attackIn=1;g.state.monster.nextAction='normal';assert.deepEqual(turn(g).effects.filter(e=>e.type==='damage').map(e=>e.memberId),['m0']);
});

test('lethal damage prevents scheduled specials and surviving next-turn states do not leak into a new stage',()=>{
 const {g}=cast('execution_golem');g.state.monster.hp=1;const r=turn(g);assert.equal(g.status,'completed');assert.ok(!r.effects.some(e=>e.type==='boss_special'));assert.equal(g.state.settlement.percent,100);
});

test('wipeout settlement covers each stage, floors rewards once and clamps negative balances',()=>{
 for(let stage=1;stage<=10;stage++){
  const {g}=setup('chaos_goblin');g.stage_index=stage;g.state.monster.attackIn=1;g.party_knockouts=7;
  for(const p of Object.values(g.state.players)){p.hp=1;p.score=99;p.gold=57;}
  turn(g);const percent=stage<5?0:(stage-3)*10;assert.equal(g.status,'failed');assert.equal(g.state.settlement.percent,percent);
  for(const [id,p] of Object.entries(g.state.players)){
   const raw=g.state.settlement.players[id];assert.equal(p.score,Math.floor(Math.max(0,raw.rawScore)*percent/100));assert.equal(p.gold,Math.floor(Math.max(0,raw.rawGold)*percent/100));
  }
  const saved=JSON.stringify(g.state.settlement);settleExpedition(g);assert.equal(JSON.stringify(g.state.settlement),saved);
 }
 const {g}=setup('chaos_goblin');g.status='failed';g.state.players.m0.score=-5;g.state.players.m0.gold=-2;settleExpedition(g);assert.equal(g.state.players.m0.score,0);assert.equal(g.state.players.m0.gold,0);assert.equal(settlementPercent('completed',10),100);
});

test('both desktop and mobile controls require the same number of selections during shuffle',()=>{
 const p={cycleCards:[{id:'a',value:2},{id:'b',value:2},{id:'c',value:5}]};
 let selected=toggleCardSelection(null,'a',true);assert.equal(selectionInfo(p,selected,true).ready,false);
 assert.match(panelControls(p,{selected,twoCards:true}),/data-unavailable="true"/);
 selected=toggleCardSelection(selected,'b',true);assert.equal(selectionInfo(p,selected,true).ready,true);
 assert.match(panelControls(p,{selected,twoCards:true}),/data-unavailable="false"/);assert.match(cardComponent(p.cycleCards[1],{selected,own:true}),/chosen selected/);
 selected=toggleCardSelection(selected,'a',true);assert.deepEqual(selected,['b']);
 p.cycleCards[0].used=true;p.cycleCards[2].used=true;assert.equal(selectionInfo(p,selected,true).ready,true);
});
