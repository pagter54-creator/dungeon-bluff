import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/pve-blood-frenzy-exact.json',import.meta.url),'utf8'));
for(const fixture of cases)test('Blood Frenzy exact submitted snapshot '+fixture.seed+' turn '+fixture.turn,()=>{
 // Real pre-resolution state from the five baseline COST_MISMATCH reproductions.
 const run=structuredClone(fixture.run),reconnected=JSON.parse(JSON.stringify(fixture.run));
 const result=resolveBasicTurn(run),again=resolveBasicTurn(reconnected);
 assert.ok(result);assert.ok(run.combat.turn>=fixture.turn);
 for(const c of result.cards)if(c.bloodFrenzyExpectedHpCost!=null&&c.berserkerAttackHpCost!=null)assert.equal(c.berserkerAttackHpCost,c.bloodFrenzyExpectedHpCost);
 assert.deepEqual(again.cards.map(c=>[c.playerId,c.valid,c.berserkerAttackHpCost]),result.cards.map(c=>[c.playerId,c.valid,c.berserkerAttackHpCost]));
 assert.deepEqual(reconnected.players.map(p=>[p.hp,p.status]),run.players.map(p=>[p.hp,p.status]));
});
