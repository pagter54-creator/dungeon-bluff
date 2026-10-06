import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../../supabase/functions/game-api/pve/model.js';
import * as R from '../../supabase/functions/game-api/pve/prophet-vampire-rework.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../../supabase/functions/game-api/pve/augment-catalog.js';
import {projectRun} from '../../supabase/functions/game-api/pve/projection.js';
export function fixture(n){
 const ps=[n<200?'prophet':'vampire','adventurer','adventurer','adventurer'].map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
 ps[0].augments=['aug-'+n];const run={id:'core-contract',seed:'fixed',rngCounter:0,version:1,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players:ps};run.combat=newCombatState(ps,999);run.combat.id='combat';run.combat.phase='SELECTION_OPEN';
 const cards=ps.map((p,i)=>({playerId:p.playerId,cardInstanceId:p.cardPool[0].id,baseNumber:i+1,workingNumber:i+1,finalNumber:i+1,valid:true}));
 return {run,p:ps[0],s:R.coreState(run,ps[0]),cards,rc:cards[0],ally:ps[1],events:[],damage:{amount:2}};
}
export const valid=f=>R.afterValidity(f.run,f.cards,f.events);
export const gain=f=>R.prophetGain(f.run,f.p,1,'gain',f.events);
export const damage=f=>R.beforePrimaryDamage(f.run,f.p,f.rc,f.damage);
export const post=f=>R.afterDamageBatch(f.run,f.cards,[{sourcePlayerId:'p0',amount:4}],f.events);
export const end=f=>R.endCoreTurn(f.run,f.events);
export const command=f=>Object.assign(f.rc,{bloodCommandUsed:true,bloodCommandTargetId:'p1',dominanceBefore:2,swapBonusBefore:0,ownerPreSwapWorkingNumber:1,finalNumber:4});
export const failed=f=>{for(const c of f.cards.slice(1,3))Object.assign(c,{valid:false,invalidReason:'COLLISION',finalNumber:3});};
export const fragment=f=>{f.s.fragment={value:5,createdTurn:1,actionId:'fragment'};f.rc.isPastFragment=true;f.rc.finalNumber=5;};
export const cases={
151:{act:gain,read:f=>f.p.publicResources.revelation,want:2,without:1},
152:{setup:f=>f.p.publicResources.revelation=3,act:damage,read:f=>f.damage.amount,want:3,without:2},
153:{setup:f=>f.p.publicResources.revelation=6,act:gain,read:f=>f.p.publicResources.revelation,want:7,without:6},
154:{setup:f=>{f.p.publicResources.revelation=3;f.cards[2].finalNumber=2;},act:f=>R.beforeCollision(f.run,f.cards),read:f=>f.p.publicResources.revelation,want:6,without:5},
155:{setup:f=>f.p.publicResources.revelation=6,act:f=>R.activateFragment(f.run,f.p),read:f=>f.p.publicResources.revelation,want:1,without:0,noRetry:true},
156:{setup:f=>{f.p.publicResources.revelation=3;f.s.streak=1;},act:f=>{post(f);end(f);},read:f=>f.p.publicResources.revelation,want:4,without:3},
157:{setup:f=>{f.s.previousCount=2;f.cards[2].finalNumber=2;},act:f=>R.beforeCollision(f.run,f.cards),read:f=>f.p.publicResources.revelation,want:3,without:2},
158:{setup:f=>f.p.publicResources.revelation=2,act:f=>{},read:f=>projectRun(f.run,'p0').privateRevelation.active,want:true,without:false},
159:{setup:f=>f.p.publicResources.revelation=3,act:damage,read:f=>[f.damage.amount,f.p.publicResources.revelation],want:[3,2],without:[2,3]},
160:{setup:f=>f.p.publicResources.revelation=6,act:f=>R.activateFragment(f.run,f.p),read:f=>f.s.visibilityHeldTurn,want:1,without:undefined,noRetry:true},
161:{setup:fragment,act:damage,read:f=>f.damage.amount,want:3,without:2},
162:{setup:fragment,act:f=>{},read:f=>R.fragmentRandomEligible(f.run,f.p,f.p.cardPool[0].id),want:false,without:true},
163:{setup:f=>{f.p.publicResources.revelation=6;R.activateFragment(f.run,f.p);f.cards[1].finalNumber=5;},act:f=>R.captureFragments(f.run,f.cards),read:f=>f.p.publicResources.revelation,want:1,without:0},
164:{setup:fragment,act:valid,read:f=>f.s.nextGainBonus,want:1,without:undefined},
165:{setup:fragment,act:valid,read:f=>f.s.fragment.firstBonus,want:1,without:undefined},
166:{setup:f=>{fragment(f);Object.assign(f.rc,{valid:false,invalidReason:'COLLISION'});},act:valid,read:f=>f.p.publicResources.revelation||0,want:6,without:0},
167:{setup:f=>{fragment(f);f.cards[1].finalNumber=5;f.run.combat._pvCards=f.cards;},act:damage,read:f=>f.damage.amount,want:3,without:2},
168:{setup:fragment,act:valid,read:f=>!!f.s.discount,want:true,without:false},
169:{setup:f=>{fragment(f);const z=f.run.combat.privateByPlayer.p0;z.remainingCardIds=[f.p.cardPool[0].id];z.spentCardIds=f.p.cardPool.slice(1).map(c=>c.id);},act:f=>R.resetProphecyCycle(f.run,f.p,f.run.combat.privateByPlayer.p0),read:f=>f.run.combat.privateByPlayer.p0.cycleIndex,want:2,without:1},
170:{setup:fragment,act:f=>R.consumeFragment(f.run,f.p,f.rc),read:f=>f.s.nextGainBonus,want:2,without:undefined},
171:{setup:f=>{fragment(f);f.ally.hp=1;},act:valid,read:f=>f.ally.hp,want:2,without:1},
172:{setup:failed,act:f=>f.packets=R.derivedProphetPackets(f.run,f.cards),read:f=>f.packets.length,want:2,without:0,derived:true},
173:{setup:f=>{failed(f);f.ally.hp=1;},act:valid,read:f=>f.ally.hp,want:2,without:1},
174:{setup:f=>{f.cards[1].finalNumber=1;f.cards[2].finalNumber=4;},act:valid,read:f=>R.coreState(f.run,f.ally).directReduction,want:1,without:undefined},
175:{setup:f=>f.s.pairStreak={p1:1,p2:1,p3:1},act:valid,read:f=>f.rc.seerRuntimeBonus||0,want:3,without:0},
176:{setup:f=>{failed(f);f.p.publicResources.revelation=3;},act:valid,read:f=>R.coreState(f.run,f.ally).pendingDamage,want:1,without:0},
177:{setup:failed,act:f=>f.packets=R.derivedProphetPackets(f.run,f.cards),read:f=>f.packets.length,want:2,without:0,derived:true},
178:{setup:f=>{f.s.collisionCount=3;f.ally.hp=1;},act:f=>{valid(f);end(f);},read:f=>f.ally.hp,want:2,without:1},
179:{setup:f=>{failed(f);f.p.publicResources.revelation=3;},act:valid,read:f=>R.coreState(f.run,f.ally).directReduction,want:1,without:undefined},
180:{setup:failed,act:f=>{valid(f);post(f);},read:f=>R.coreState(f.run,f.ally).pendingDamage,want:1,without:0},
301:{setup:command,act:valid,read:f=>f.p.publicResources.dominance||0,want:1,without:0},
302:{act:valid,read:f=>f.p.publicResources.dominance||0,want:1,without:0},
303:{setup:f=>f.cards[2].finalNumber=2,act:valid,read:f=>f.s.thrallChoice?.candidates,want:['p1','p2'],without:undefined},
304:{setup:command,act:valid,read:f=>f.p.publicResources.dominance||0,want:1,without:0},
305:{setup:command,act:valid,read:f=>f.s.swapBonus,want:1,without:undefined},
306:{setup:command,act:valid,read:f=>f.rc.vampireBonus,want:3,without:2},
307:{act:valid,read:f=>f.s.swapBonus,want:1,without:undefined},
308:{setup:f=>{f.p.augments.push('aug-302');f.p.publicResources.dominance=2;},act:valid,read:f=>f.p.publicResources.dominance,want:3,without:2},
309:{setup:f=>{command(f);f.cards.slice(1).forEach(c=>c.valid=false);},act:valid,read:f=>!!f.s.recoveryMark,want:true,without:false},
310:{setup:command,act:valid,read:f=>f.s.echo?.targetId,want:'p1',without:undefined},
311:{act:valid,read:f=>f.p.publicResources.blood||0,want:1,without:0},
312:{setup:f=>f.rc.finalNumber=5,act:valid,read:f=>f.p.publicResources.blood||0,want:1,without:0},
313:{act:post,read:f=>f.p.publicResources.blood||0,want:1,without:0},
314:{setup:f=>f.p.publicResources.blood=3,act:damage,read:f=>f.damage.amount,want:3,without:2},
315:{setup:f=>f.p.publicResources.blood=2,act:damage,read:f=>[f.damage.amount,f.p.publicResources.blood],want:[4,0],without:[2,2]},
316:{setup:command,act:valid,read:f=>f.p.publicResources.blood||0,want:2,without:0},
317:{setup:f=>{f.p.augments.push('aug-315');f.p.publicResources.blood=2;f.rc.newThrall=true;},act:damage,read:f=>f.p.publicResources.blood,want:1,without:0},
318:{setup:f=>{f.p.augments.push('aug-315');f.p.publicResources.blood=6;},act:damage,read:f=>[f.damage.amount,f.p.publicResources.blood],want:[6,3],without:[4,4]},
319:{setup:f=>{f.p.augments.push('aug-311');f.p.publicResources.blood=6;},act:valid,read:f=>f.p.publicResources.blood,want:7,without:6},
320:{setup:f=>{f.p.augments.push('aug-315');f.p.publicResources.blood=2;command(f);f.rc.newThrall=true;},act:damage,read:f=>f.damage.amount,want:7,without:4},
321:{setup:f=>{f.p.publicResources.blood=4;f.ally.hp=1;},act:f=>R.afterIncomingCoreDamage(f.run,f.ally,{actualDamage:1,damageType:'DIRECT'}),read:f=>[f.ally.hp,f.p.publicResources.blood],want:[2,0],without:[1,4]},
322:{setup:f=>{f.p.augments.push('aug-321');f.p.publicResources.blood=3;f.ally.hp=1;},act:f=>R.afterIncomingCoreDamage(f.run,f.ally,{actualDamage:1,damageType:'DIRECT'}),read:f=>[f.ally.hp,f.p.publicResources.blood],want:[2,0],without:[1,3]},
323:{setup:f=>{f.p.publicResources.thrallPlayerId='p1';f.ally.hp=2;},act:f=>R.afterIncomingCoreDamage(f.run,f.ally,{actualDamage:1,damageType:'DIRECT'}),read:f=>f.p.publicResources.blood||0,want:1,without:0},
324:{setup:f=>{f.p.augments.push('aug-311');f.p.publicResources.blood=6;},act:valid,read:f=>f.p.publicResources.blood,want:7,without:6},
325:{setup:f=>{f.p.augments.push('aug-321');f.p.publicResources.blood=4;f.ally.hp=1;},act:f=>R.transfusion(f.run,f.p,f.ally),read:f=>R.coreState(f.run,f.ally).pendingDamage,want:2,without:0},
326:{setup:f=>{f.p.augments.push('aug-321');f.p.publicResources.blood=4;f.ally.hp=1;},act:f=>R.transfusion(f.run,f.p,f.ally),read:f=>R.coreState(f.run,f.ally).directReduction,want:1,without:undefined},
327:{setup:f=>{f.p.publicResources.blood=4;f.ally.hp=0;},act:f=>R.afterIncomingCoreDamage(f.run,f.ally,{actualDamage:3,damageType:'AOE'}),read:f=>[f.ally.hp,f.p.publicResources.blood],want:[1,0],without:[0,4]},
328:{setup:f=>f.p.publicResources.thrallPlayerId='p1',act:valid,read:f=>f.p.publicResources.blood||0,want:1,without:0},
329:{setup:f=>{f.p.augments.push('aug-321');f.p.publicResources.blood=4;f.ally.hp=1;},act:f=>R.transfusion(f.run,f.p,f.ally),read:f=>[f.ally.hp,R.coreState(f.run,f.ally).pendingDamage,R.coreState(f.run,f.ally).directReduction],want:[2,2,1],without:[2,0,undefined]},
330:{setup:f=>{f.s.receipts=[{targetId:'p1',turn:0,consumed:false}];},act:post,read:f=>f.p.publicResources.blood||0,want:1,without:0}
};
