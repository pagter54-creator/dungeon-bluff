import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {pveGameplayPlayers} from '../src/pve-gameplay-adapter.js';
import {cardComponent} from '../src/card-component.js';
const makeRun=()=>({
  phase:'COMBAT',players:['a','b'].map(playerId=>({playerId,characterId:'adventurer',publicResources:{},cardPool:[1,2,3].map(baseNumber=>({id:playerId+baseNumber,baseNumber}))})),
  combat:{privateByPlayer:{a:{playerId:'a',cycleIndex:2,remainingCardIds:['a2','a3'],spentCardIds:['a1']},b:{playerId:'b',cycleIndex:3,remainingCardIds:['b1','b3'],spentCardIds:['b2'],selectedCardId:'b3',skillIntent:true}},turnSubmissions:{b:{cardInstanceId:'b3'}}}
});
test('peer used and unused cards are visible without exposing pending selection or physical IDs',()=>{
 const run=makeRun(),out=projectRun(run,'a');
 assert.deepEqual(out.combat.publicCardCycles.b,{cycleIndex:3,cards:[{baseNumber:1,used:false},{baseNumber:2,used:true},{baseNumber:3,used:false}]});
 const safe=JSON.stringify(out.combat.publicCardCycles.b);
 assert.ok(!safe.includes('b3'));assert.ok(!safe.includes('selected'));assert.ok(!safe.includes('skill'));
 assert.equal(out.combat.privateByPlayer,undefined);assert.equal(out.combat.turnSubmissions,undefined);
 assert.equal(run.combat.privateByPlayer.b.selectedCardId,'b3');
 const players=pveGameplayPlayers({members:[],characters:[]},out);
 assert.deepEqual(players.b.cycleCards.map(c=>c.used),[false,true,false]);
});
test('event and persistent cycles restore peer usage after reconnect',()=>{
 const run=makeRun();run.phase='EVENT';run.cardCycles=structuredClone(run.combat.privateByPlayer);
 run.roomState={type:'EVENT',privateByPlayer:structuredClone(run.combat.privateByPlayer)};
 const out=projectRun(run,'a');
 assert.equal(out.roomState.publicCardCycles.b.cards[1].used,true);
 assert.equal(out.publicCardCycles.b.cards[1].used,true);
 const players=pveGameplayPlayers({members:[],characters:[]},out,{scope:'event'});
 assert.deepEqual(players.b.cycleCards.map(c=>c.used),[false,true,false]);
});
test('new cycle clears used markers',()=>{
 const run=makeRun();run.combat.privateByPlayer.b.remainingCardIds=['b1','b2','b3'];
 assert.ok(projectRun(run,'a').combat.publicCardCycles.b.cards.every(c=>!c.used));
});
for(const scope of ['combat','event'])test(`PVE ${scope} shows a peer gambler hand without exposing their submission or deck order`,()=>{
 const run=makeRun();run.players[1].characterId='gambler';
 run.players[1].cardPool.push({id:'b4',baseNumber:7},{id:'b5',baseNumber:2});
 const state=run.combat.privateByPlayer.b;
 Object.assign(state,{drawPileIds:['b4','b5'],discardPileIds:['b2'],sixProgress:[1],sevenProgress:[3],luck:2});
 if(scope==='event'){
  run.phase='EVENT';run.cardCycles=structuredClone(run.combat.privateByPlayer);
  run.roomState={type:'EVENT',privateByPlayer:structuredClone(run.combat.privateByPlayer),turnSubmissions:structuredClone(run.combat.turnSubmissions)};
  delete run.combat;
 }
 const before=structuredClone(run),out=projectRun(run,'a');
 const publicState=scope==='event'?out.roomState:out.combat;
 assert.deepEqual(publicState.publicCardCycles.b.cards,[{baseNumber:1,used:false},{baseNumber:3,used:false}]);
 const players=pveGameplayPlayers({members:[],characters:[]},out,{scope});
 assert.deepEqual(players.b.cycleCards.map(c=>c.value),[1,3]);
 const html=players.b.cycleCards.map(c=>cardComponent(c)).join('');
 assert.match(html,/<b>1<\/b>/);assert.match(html,/<b>3<\/b>/);
 assert.ok(!html.includes('null'));assert.ok(!html.includes('chosen'));assert.ok(!html.includes('b3'));
 assert.equal(publicState.privateByPlayer,undefined);assert.equal(publicState.turnSubmissions,undefined);
 assert.equal(out.players[1].gamblerDeck.owner,undefined);
 const peerJson=JSON.stringify(out);
 for(const id of ['b1','b2','b3','b4','b5'])assert.ok(!peerJson.includes(`"${id}"`),id);
 assert.ok(!peerJson.includes('drawPileIds'));assert.ok(!peerJson.includes('selectedCardId'));
 assert.deepEqual(run,before);
 const owner=projectRun(run,'b');
 assert.deepEqual((scope==='event'?owner.privateRoomState:owner.privateCombat).remainingCardIds,['b1','b3']);
 assert.deepEqual(owner.players[1].gamblerDeck.owner.sixProgress,[1]);
 // A replacement draw is visible after reconnect, with duplicate values kept.
 const current=scope==='event'?run.roomState.privateByPlayer.b:run.combat.privateByPlayer.b;
 current.remainingCardIds=['b2','b5'];
 const next=projectRun(run,'a'),nextState=scope==='event'?next.roomState:next.combat;
 assert.deepEqual(nextState.publicCardCycles.b.cards,[{baseNumber:2,used:false},{baseNumber:2,used:false}]);
});
test('event selection retains desktop submit controls instead of hiding them as custom selectors',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.ok(app.includes("(selector&&!eventSelecting&&!rewardSelecting?'pve-selector-shell':'')"));
 assert.ok(app.includes("bundle.run.phase==='EVENT'?'pve.submitEventCard'"));
});
