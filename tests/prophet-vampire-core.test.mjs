import test from 'node:test';
import assert from 'node:assert/strict';
import {collisionParticipants,revelationGain,armPastFragment,capturePastFragment,consumePastFragment,lowestValidThrall,revelationVisible,PROPHET_CARD_POOL} from '../supabase/functions/game-api/prophet-vampire-core.js';
test('shared Prophet collision count includes immune and invalid participants, not groups',()=>{
 for(const [numbers,count] of [[[2,2,4,5],2],[[3,3,3,1],3],[[1,1,4,4],4],[[2,2,2,2],4]])assert.equal(collisionParticipants(numbers.map((value,i)=>({value,valid:i===0,collisionImmune:i===0}))).length,count);
 assert.deepEqual(PROPHET_CARD_POOL,[0,1,2,3,4]);
});
test('authoritative Revelation receipt clamps, retries and reconnects without double gain',()=>{
 const s={revelation:0};revelationGain(s,4,{eventId:'a'});revelationGain(s,4,{eventId:'a'});assert.equal(s.revelation,4);
 const restored=structuredClone(s);assert.equal(revelationGain(restored,4,{eventId:'a'}).applied,false);
 revelationGain(restored,4,{eventId:'b',max:8});assert.equal(restored.revelation,8);
});
test('Fragment captures highest other final value even collision-invalid, remembers no identity',()=>{
 const s={revelation:6};assert.equal(armPastFragment(s,{actionId:'a'}),true);assert.equal(s.revelation,0);
 assert.equal(armPastFragment(s,{actionId:'a'}),false);
 const f=capturePastFragment(s,'owner',[{playerId:'owner',finalNumber:12},{playerId:'other',finalNumber:7,valid:false}],{turn:2});
 assert.equal(f.value,7);assert.equal(f.targetPlayerId,undefined);
 assert.throws(()=>armPastFragment(s,{actionId:'b'}),/이미/);
 const restored=structuredClone(s);assert.equal(consumePastFragment(restored).value,7);assert.equal(restored.zeroState,'USED_ZERO');assert.equal(consumePastFragment(restored),null);
});
test('Thrall requires owner VALID and chooses lowest other eligible VALID, seeded tie selector',()=>{
 const cards=[{playerId:'v',finalNumber:5,valid:true},{playerId:'a',finalNumber:1,valid:false},{playerId:'b',finalNumber:2,valid:true},{playerId:'c',finalNumber:2,valid:true}];
 assert.deepEqual(lowestValidThrall('v',cards,{choose:ids=>ids[1]}),{targetId:'c',candidates:['b','c'],number:2});
 cards[0].valid=false;assert.equal(lowestValidThrall('v',cards,{choose:ids=>ids[0]}).targetId,null);
});
test('visibility threshold and explicit current-turn retention do not carry next turn',()=>{
 assert.equal(revelationVisible({revelation:3}),true);assert.equal(revelationVisible({revelation:2}),false);
 assert.equal(revelationVisible({revelation:2},{threshold:2}),true);
 assert.equal(revelationVisible({revelation:0,visibilityHeldTurn:4},{turn:4}),true);
 assert.equal(revelationVisible({revelation:0,visibilityHeldTurn:4},{turn:5}),false);
});
