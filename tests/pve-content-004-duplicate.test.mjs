import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';

function make(){
 const players=['imp','imp','adventurer','adventurer'].map((character_id,i)=>newPlayerRunState({id:'p'+i,character_id,member_type:'human',seat_index:i}));
 const run={id:'two-imps',seed:'two-imps',rngCounter:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,players,combat:newCombatState(players,100)};
 beginTurn(run);return run;
}
test('C07 duplicate Imps resolve sequentially by seat, conserve actual steals, and never reduce a victim below zero',()=>{
 const run=make();
 for(const p of run.players)submitCard(run,p.playerId,p.cardPool.find(c=>c.baseNumber===2).id);
 const r=resolveBasicTurn(run);
 assert.deepEqual(r.cards.map(c=>c.finalNumber),[4,2,1,1]);
 assert.equal(r.mutationEvents.filter(e=>e.effectId==='imp-steal'&&e.actualAmount>0).length,2);
 assert.deepEqual(r.mutationEvents.filter(e=>e.effectId==='imp-steal-summary').map(e=>e.totalActuallyStolen),[2]);
 assert.ok(r.cards.every(c=>c.finalNumber>=0));
});
