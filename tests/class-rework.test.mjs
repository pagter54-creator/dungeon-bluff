import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_CATALOG,startCycle,replenishHand,syncCardViews} from '../supabase/functions/game-api/characters.js';
import {createSession,openTurn,fillAutomaticSubmissions,resolveTurn,validateSubmission} from '../supabase/functions/game-api/engine.js';
import {activateRevelation,privateKnowledge,submissionValue} from '../supabase/functions/game-api/skills.js';
import {revelationGauge,nextAmplifyLevel,cardPool,activeButton} from '../src/character-ui.js';
function setup(id){const members=[id,'adventurer','adventurer','adventurer'].map((character_id,i)=>({id:'p'+i,user_id:'u'+i,member_type:'human',character_id}));const g=createSession('room',members,CHARACTER_CATALOG,()=>.31);g.state.currentStage={contentId:'armored_boar',category:'monster'};g.state.monster={id:'armored_boar',hp:999,maxHp:999,attackIn:99};return {g,members,p:g.state.players.p0};}
function submit(g,values,level=0,skill=false){return values.map((v,i)=>{const p=g.state.players['p'+i],c=p.cycleCards.find(c=>!c.used&&c.value===v);assert.ok(c,`missing ${i}:${v}`);const s={session_id:g.id,turn_index:g.turn_index,member_id:p.memberId,card_id:c.id,use_skill:i===0&&(skill||level>0),amplify_level:i===0?level:0};s.card_value=submissionValue(p,c,s);return s;});}
function resetOthers(g){for(let i=1;i<4;i++)startCycle(g.state.players['p'+i],g.state.players['p'+i].character);}
test('new decks and initial resources, turn opening is idempotent and mana caps at four',()=>{
 assert.deepEqual(CHARACTER_CATALOG.seer.deck,[1,2,3,4,5]);assert.deepEqual(CHARACTER_CATALOG.mage.deck,[1,2,3,4,4]);assert.deepEqual(CHARACTER_CATALOG.warrior.deck,[2,3,4,5,5]);
 const {g,p,members}=setup('mage');assert.equal(p.characterRuntimeState.mana,0);openTurn(g,members);assert.equal(p.characterRuntimeState.mana,1);fillAutomaticSubmissions(g,members,[]);assert.equal(p.characterRuntimeState.mana,1);
 for(let i=0;i<7;i++){g.turn_index++;openTurn(g,members);}assert.equal(p.characterRuntimeState.mana,4);
 const knight=setup('warrior');assert.equal(knight.p.characterRuntimeState.toughnessCharges,1);
});
test('revelation restores actual used instances, can restore the same instance again, and never double-spends',()=>{
 const {g,p}=setup('seer'),c=p.cycleCards[1];c.used=true;syncCardViews(p);p.characterRuntimeState.revelationStacks=1;
 assert.equal(activateRevelation(g,p,()=>0),true);assert.equal(c.used,false);assert.ok(p.remainingCards.includes(2));assert.equal(p.characterRuntimeState.revelationStacks,0);assert.equal(activateRevelation(g,p),false);
 c.used=true;g.turn_index++;p.characterRuntimeState.revelationStacks=1;activateRevelation(g,p,()=>0);assert.equal(c.used,false);
});
test('revelation without spent cards reveals normally; cast turns gain only on collision',()=>{
 for(const clash of [false,true]){const {g,p}=setup('seer');p.characterRuntimeState.revelationStacks=1;activateRevelation(g,p);assert.equal(p.cycleCards.length,5);const s=submit(g,[1,clash?1:2,3,4]);assert.equal(privateKnowledge(g,'p0',s).revealedCards.length,3);resolveTurn(g,s);assert.equal(p.characterRuntimeState.revelationStacks,clash?1:0);}
});
test('ordinary revelation clash gains a stack, duplicate-number instances restore independently',()=>{
 const {g,p}=setup('seer');resolveTurn(g,submit(g,[1,1,3,4]));assert.equal(p.characterRuntimeState.revelationStacks,1);
 p.cycleCards=[{id:'one',value:2,used:true},{id:'two',value:2,used:true}];p.characterRuntimeState.revelationStacks=1;activateRevelation(g,p,()=>.99);assert.equal(p.cycleCards[0].used,true);assert.equal(p.cycleCards[1].used,false);
});
test('gunner misfire knocks out once, penalizes once, skips next selection and then revives',()=>{
 const {g,p,members}=setup('gunner');p.hp=1;p.score=20;p.gold=10;const r=resolveTurn(g,submit(g,[1,1,3,4],0,true));assert.equal(p.hp,0);assert.equal(p.knockedOut,true);assert.equal(p.score,10);assert.equal(p.gold,7);assert.equal(r.effects.filter(e=>e.type==='knockout').length,1);
 assert.throws(()=>validateSubmission(g,members[0],'u0',{session_id:g.id,turn_index:g.turn_index,card_id:p.cycleCards[1].id},[]));resetOthers(g);const automatic=openTurn(g,members,()=>0);assert.equal(automatic.length,1);const rest=submit(g,[2,1,3,4]).slice(1);resolveTurn(g,[...automatic,...rest]);assert.equal(p.hp,3);assert.equal(p.knockedOut,false);
});
test('gunner success and noncollision seal do not cost HP; each new cycle grants use',()=>{
 const {g,p}=setup('gunner');resolveTurn(g,submit(g,[1,2,3,4],0,true));assert.equal(p.hp,3);assert.equal(p.cycleIndex,2);assert.equal(p.activeSkillState.available,true);
 resetOthers(g);g.state.currentStage.category='boss';g.state.monster.pending={kind:'seal',number:1,turn:g.turn_index};resolveTurn(g,submit(g,[1,2,3,4],0,true));assert.equal(p.hp,3);
});
test('rogue lowest combat card fixes damage at five, duplicates do not trigger',()=>{
 for(const lowest of [1,4]){const {g,p}=setup('rogue');const r=resolveTurn(g,submit(g,[lowest,5,5,5]));assert.equal(r.cards[0].damageValue,5);assert.equal(p.score,5);assert.equal(p.gold,0);}
 const {g}=setup('rogue');const r=resolveTurn(g,submit(g,[1,1,3,4]));assert.ok(!r.effects.some(e=>e.type==='attack'&&e.memberId==='p0'));
});
test('mage reservation cycle refunds without mutation and previews selected actual number',()=>{
 for(const mana of [2,3,4]){let level=nextAmplifyLevel(mana,0);assert.equal(level,1);level=nextAmplifyLevel(mana,level);assert.equal(level,mana===4?2:0);if(mana===4)assert.equal(nextAmplifyLevel(mana,level),0);}
 const {p}=setup('mage');p.characterRuntimeState.mana=4;const selected=p.cycleCards[3].id;assert.match(cardPool(p,{own:true,selected,useSkill:2}),/<b>6<\/b>/);assert.match(activeButton(p,2,false),/마나 0\/4/);assert.match(activeButton(p,0,false),/마나 4\/4/);assert.equal(p.characterRuntimeState.mana,4);
});
test('amplified six drives collision, monster pattern and consumption of original four',()=>{
 const {g,p}=setup('mage');p.characterRuntimeState.mana=4;g.state.currentStage.contentId='chaos_goblin';g.state.monster.id='chaos_goblin';g.state.monster.attackIn=1;
 const r=resolveTurn(g,submit(g,[4,1,2,3],2));assert.equal(r.cards[0].value,6);assert.equal(r.cards[0].damageValue,6);assert.equal(p.hp,2);assert.equal(p.characterRuntimeState.mana,0);assert.deepEqual(p.discardedCards,[4]);
});
test('knight can store two charges, spend twice in same cycle, and caps charge at two',()=>{
 const {g,p}=setup('warrior');startCycle(p,p.character);startCycle(p,p.character);assert.equal(p.characterRuntimeState.toughnessCharges,2);
 for(const value of [2,3]){resetOthers(g);const r=resolveTurn(g,submit(g,[value,value,4,5],0,true));assert.equal(r.cards[0].valid,true);assert.equal(r.cards[1].valid,false);}
 assert.equal(p.characterRuntimeState.toughnessCharges,0);assert.equal(p.activeSkillState.available,false);startCycle(p,p.character);assert.equal(p.characterRuntimeState.toughnessCharges,1);
});
test('adventurer bonus changes score only, never damage or kill leadership',()=>{
 const {g,p}=setup('adventurer');const r=resolveTurn(g,submit(g,[4,1,2,3]));assert.equal(p.score,5);assert.equal(r.cards[0].damageValue,4);assert.equal(r.totalDamage,10);assert.equal(g.state.monster.hp,989);
});
