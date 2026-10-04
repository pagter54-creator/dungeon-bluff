import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {pveGameplayPlayers} from '../src/pve-gameplay-adapter.js';
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
test('new cycle clears used markers and random peer hands remain hidden',()=>{
 const run=makeRun();run.combat.privateByPlayer.b.remainingCardIds=['b1','b2','b3'];
 assert.ok(projectRun(run,'a').combat.publicCardCycles.b.cards.every(c=>!c.used));
 run.players[1].characterId='gambler';
 const out=projectRun(run,'a');
 assert.ok(out.combat.publicCardCycles.b.cards.every(c=>c.baseNumber===null));
});
test('event selection retains desktop submit controls instead of hiding them as custom selectors',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.ok(app.includes("(selector&&!eventSelecting?'pve-selector-shell':'')"));
 assert.ok(app.includes("bundle.run.phase==='EVENT'?'pve.submitEventCard'"));
});
