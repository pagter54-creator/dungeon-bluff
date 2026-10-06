import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/prophet-vampire-fixture.mjs';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {activateImmediateCharacterSkill} from '../supabase/functions/game-api/pve/characters.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import * as R from '../supabase/functions/game-api/pve/prophet-vampire-rework.js';
const id=(p,n)=>p.cardPool.find(c=>c.baseNumber===n).id;
for(const onlyFragment of [true,false])test(`aug162 stun fallback only when Fragment is the sole remaining card: ${onlyFragment}`,()=>{
 const {run,p}=fixture(162);const zero=id(p,0),other=id(p,1),priv=run.combat.privateByPlayer.p0;
 const s=R.coreState(run,p);s.fragment={value:5,createdTurn:1,actionId:'protected-fragment'};
 priv.remainingCardIds=onlyFragment?[zero]:[zero,other];priv.spentCardIds=p.cardPool.map(c=>c.id).filter(x=>!priv.remainingCardIds.includes(x));p.status='STUNNED_NEXT_TURN';
 const restored=structuredClone(run);beginTurn(run);beginTurn(restored);
 assert.equal(run.combat.turnSubmissions.p0.cardInstanceId,onlyFragment?zero:other);
 assert.equal(restored.combat.turnSubmissions.p0.cardInstanceId,run.combat.turnSubmissions.p0.cardInstanceId);
 const selected=run.combat.turnSubmissions.p0.cardInstanceId;beginTurn(run);assert.equal(run.combat.turnSubmissions.p0.cardInstanceId,selected);
 assert.equal(R.coreState(run,p).fragment.value,5);assert.equal(priv.remainingCardIds.filter(x=>x===zero).length,1);
});
function play(run,numbers){run.combat.monster.intent={type:'CHARGE',payload:{}};run.players.forEach((p,i)=>submitCard(run,p.playerId,id(p,numbers[i])));return resolveBasicTurn(run);}
for(const start of [151,161,171])test('new Prophet build '+start+' real collision and reconnect pipeline',()=>{
 const {run,p}=fixture(start);p.augments=Array.from({length:10},(_,i)=>'aug-'+(start+i));beginTurn(run);
 const restore=structuredClone(run),result=play(run,[0,2,2,4]),result2=play(restore,[0,2,2,4]);assert.deepEqual(result,result2);assert.equal(p.publicResources.revelation,2);assert.equal(result.collisionResolutionPasses,1);assert.equal(result.postCollisionEffectPasses,1);
 assert.equal(projectRun(run,'p1').privateProphetState,undefined);assert.equal(projectRun(run,'p0').privateProphetState.threshold,start===151?2:3);
});
test('Fragment captures other final number, rearms exact zero slot and consumes on later action',()=>{
 const {run,p}=fixture(161);p.augments=[];beginTurn(run);p.publicResources.revelation=6;const zero=id(p,0);activateImmediateCharacterSkill(run,p);
 play(run,[0,2,3,4]);assert.equal(R.coreState(run,p).fragment.value,4);assert.ok(run.combat.privateByPlayer.p0.remainingCardIds.includes(zero));
 const restored=structuredClone(run);assert.equal(projectRun(restored,'p0').privateProphetState.fragment.value,4);
 play(run,[0,1,2,3]);assert.equal(R.coreState(run,p).fragment,undefined);assert.ok(run.combat.privateByPlayer.p0.spentCardIds.includes(zero));
});
test('automatic Revelation owner-only printed numbers, no pending choice or modifier leak',()=>{
 const {run,p}=fixture(151);p.augments=[];beginTurn(run);p.publicResources.revelation=3;
 submitCard(run,'p1',id(run.players[1],2));const a=projectRun(run,'p0'),b=projectRun(run,'p2');assert.deepEqual(a.privateRevelation.revealedCards,[{memberId:'p1',value:2}]);assert.equal(b.privateRevelation,undefined);assert.equal(a.combat.turnSubmissions,undefined);
});
