import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_CATALOG,startCycle} from '../supabase/functions/game-api/characters.js';
import {createSession,resolveTurn,validateSubmission} from '../supabase/functions/game-api/engine.js';
import {privateKnowledge} from '../supabase/functions/game-api/skills.js';

function fixture(characters=['vampire','mage','adventurer','rogue']){
 const members=characters.map((character_id,i)=>({id:`p${i}`,user_id:`u${i}`,member_type:'human',character_id,seat_index:i,display_name:`P${i}`}));
 const game=createSession('room',members,CHARACTER_CATALOG,()=>.35);
 game.state.currentStage={contentId:'armored_boar',category:'monster',name:'철갑 멧돼지'};
 game.state.monster={id:'armored_boar',hp:100,maxHp:100,attackIn:99};
 return {game,members};
}
function submit(game,values,skills=[]){return values.map((value,i)=>{
 const card=game.state.players[`p${i}`].cycleCards.find(c=>!c.used&&c.value===value);
 assert.ok(card,`p${i} lacks ${value}`);
 const level=skills.includes(i)&&game.state.players[`p${i}`].skillId==='amplify'?2:0;
 return {member_id:`p${i}`,card_id:card.id,card_value:value+level,turn_index:game.turn_index,use_skill:skills.includes(i),amplify_level:level};
});}

test('vampire marks highest scoring collision and privately sees only their submitted card',()=>{
 const {game}=fixture(['vampire','adventurer','adventurer','adventurer']);
 game.state.players.p1.score=3;game.state.players.p2.score=9;
 resolveTurn(game,submit(game,[2,2,2,4]));
 assert.equal(game.state.players.p0.characterRuntimeState.thrallId,'p2');
 const pending=[{member_id:'p2',card_value:4,turn_index:game.turn_index}];
 assert.deepEqual(privateKnowledge(game,'p0',pending).revealedCards,[{memberId:'p2',value:4}]);
 assert.deepEqual(privateKnowledge(game,'p1',pending).revealedCards,[]);
});

test('blood command exchanges amplified effective numbers before collision while consuming original cards',()=>{
 const {game,members}=fixture();const vampire=game.state.players.p0,mage=game.state.players.p1;
 vampire.characterRuntimeState.thrallId='p1';mage.characterRuntimeState.mana=4;
 const inputs=submit(game,[2,4,3,5],[0,1]);
 assert.doesNotThrow(()=>validateSubmission(game,members[0],'u0',{session_id:game.id,turn_index:game.turn_index,card_id:inputs[0].card_id,use_skill:true},[]));
 const result=resolveTurn(game,inputs);
 assert.equal(result.cards[0].value,6);assert.equal(result.cards[1].value,2);
 assert.equal(result.cards[0].exchangeFrom,2);assert.equal(result.cards[1].exchangeFrom,6);
 assert.equal(result.cards[0].valid,true);assert.equal(vampire.characterRuntimeState.thrallId,undefined);
 assert.equal(mage.cycleCards.find(c=>c.id===inputs[1].card_id).used,true);
 assert.equal(result.effects.filter(e=>e.type==='vampire_swap').length,1);
});

test('two blood commands resolve in seat order and equal-number exchange still spends the mark',()=>{
 const {game}=fixture(['vampire','vampire','adventurer','adventurer']);
 game.state.players.p0.characterRuntimeState.thrallId='p1';
 game.state.players.p1.characterRuntimeState.thrallId='p2';
 const result=resolveTurn(game,submit(game,[1,2,3,4],[0,1]));
 assert.deepEqual(result.cards.map(c=>c.value),[2,3,1,4]);
 assert.deepEqual(result.effects.filter(e=>e.type==='vampire_swap').map(e=>[e.sourceId,e.targetId]),[['p0','p1'],['p1','p2']]);
 assert.equal(game.state.players.p0.characterRuntimeState.thrallId,undefined);
 assert.equal(game.state.players.p1.characterRuntimeState.thrallId,undefined);
 const equal=fixture(['vampire','adventurer','adventurer','adventurer']).game;
 equal.state.players.p0.characterRuntimeState.thrallId='p1';
 const same=resolveTurn(equal,submit(equal,[2,2,3,4],[0]));
 assert.equal(same.cards[0].clashed,true);
 assert.equal(equal.state.players.p0.characterRuntimeState.thrallId,undefined);
});

test('blood command is unavailable while thrall cannot submit and preserves its mark',()=>{
 const {game,members}=fixture();game.state.players.p0.characterRuntimeState.thrallId='p1';game.state.players.p1.knockedOut=true;
 const card=game.state.players.p0.cycleCards[0];
 assert.throws(()=>validateSubmission(game,members[0],'u0',{session_id:game.id,turn_index:game.turn_index,card_id:card.id,use_skill:true},[]),/권속/);
 assert.equal(game.state.players.p0.characterRuntimeState.thrallId,'p1');
});

test('demon swordsman predation gains eight on strongest kill, four on weaker contribution and empowers once per cycle',()=>{
 const {game}=fixture(['demonsword','adventurer','adventurer','adventurer']);
 const demon=game.state.players.p0;
 game.state.monster.hp=8;
 const first=resolveTurn(game,submit(game,[4,1,2,3],[0]));
 assert.equal(first.cards[0].damageValue,5);assert.equal(demon.characterRuntimeState.predation,8);
 assert.equal(demon.activeSkillState.available,true);
 assert.equal(first.effects.find(e=>e.skillId==='predation').gain,8);
 // A new monster starts without clearing the expedition-long stack.
 game.state.monster={id:'armored_boar',hp:3,maxHp:3,attackIn:99};
 game.state.currentStage={contentId:'armored_boar',category:'monster',name:'철갑 멧돼지'};
 delete game.state.roomSummary;game.state.selectionHolds={};
 const second=resolveTurn(game,submit(game,[1,5,4,2]));
 assert.equal(second.effects.find(e=>e.skillId==='predation').gain,4);
 assert.equal(demon.characterRuntimeState.predation,12);
 startCycle(demon,CHARACTER_CATALOG.demonsword);
 assert.equal(demon.activeSkillState.available,true);
});
