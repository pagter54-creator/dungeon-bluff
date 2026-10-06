import {augmentUi} from '../src/pve-ui-catalog.js';
import {recoverPhysicalCard} from '../supabase/functions/game-api/pve/augment-framework.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {ghostState,ghostGain,ghostThreshold,ghostResolve,ghostPostDamage,ghostTurnEnd,activateGhostTransformation,ghostCycleExit,cleanupGhost} from '../supabase/functions/game-api/pve/ghost-runtime.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {beginAugmentChoices,chooseAugment,AUGMENT_THRESHOLDS} from '../supabase/functions/game-api/pve/augments.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {activateImmediateCharacterSkill,initializeCombatCharacter,onValidAttack} from '../supabase/functions/game-api/pve/characters.js';
function fixture(ids=[]){
 const players=['demon_swordsman','adventurer','adventurer','adventurer'].map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
 const run={id:'ghost-005d',seed:'ghost',rngCounter:0,version:1,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
 players[0].augments=ids.map(n=>'aug-'+n);run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});run.combat.id='ghost-combat';run.combat.turn=1;run.combat.phase='SELECTION_OPEN';
 const p=players[0],cards=players.map((q,i)=>({playerId:q.playerId,cardInstanceId:q.cardPool[0].id,baseNumber:i+1,workingNumber:i+1,finalNumber:i+1,valid:true,numberHistory:{}})),s=ghostState(run,p);
 return {run,p,s,cards,rc:cards[0],priv:run.combat.privateByPlayer.p0};
}
const valid=(f,slash=false)=>ghostResolve(f.run,f.p,f.rc,{skillIntent:slash},[]);
const post=(f,amount=5)=>ghostPostDamage(f.run,f.cards,[{sourcePlayerId:'p0',amount,followUp:false},{sourcePlayerId:'p1',amount:3,followUp:false}],[]);
const fuel=f=>{if(!f.p.augments.includes('aug-351'))f.p.augments.push('aug-351');f.p.publicResources.devour=7;f.p.publicResources.transformationPending=true;return activateGhostTransformation(f.run,f.p);};
const exit=f=>{fuel(f);f.priv.spentCardIds=[...f.priv.remainingCardIds];f.priv.remainingCardIds=[];ghostCycleExit(f.run,f.p,f.priv);};
const cases={
331:f=>{valid(f,true);post(f);assert.equal(f.p.publicResources.devour,2);},
332:f=>{valid(f);post(f);assert.equal(f.p.publicResources.devour,2);},
333:f=>{f.run.combat.monster.hp=0;valid(f);post(f);assert.equal(f.p.publicResources.ghostSlashLevel,1);assert.equal(f.p.publicResources.devour,3);},
334:f=>{valid(f,true);post(f);assert.equal(f.p.publicResources.devour,3);},
335:f=>{ghostGain(f.run,f.p,11);assert.equal(f.p.publicResources.ghostSlashLevel,1);assert.equal(f.p.publicResources.devour,3);},
336:f=>{f.run.combat.monster.hp=400;valid(f,true);post(f);assert.equal(f.rc.ghostBonus,2);assert.equal(f.p.publicResources.devour,2);},
337:f=>{valid(f,true);post(f);assert.deepEqual(f.s.windows.normal,{damage:2,start:2,end:3});},
338:f=>{ghostGain(f.run,f.p,8);assert.equal(f.p.publicResources.devour,2);assert.equal(f.p.publicResources.ghostSlashLevel,1);},
339:f=>{f.run.combat.monster.hp=200;valid(f,true);assert.equal(f.rc.ghostBonus,5);f.run.combat.monster.hp=0;post(f);assert.equal(f.p.publicResources.devour,3);},
340:f=>{f.p.publicResources.ghostSlashLevel=3;valid(f);assert.equal(f.rc.ghostBonus,2);},
341:f=>{assert.equal(ghostThreshold(f.run,f.p),6);ghostGain(f.run,f.p,6);assert.equal(f.p.publicResources.ghostSlashLevel,1);},
342:f=>{assert.equal(ghostThreshold(f.run,f.p),5);ghostGain(f.run,f.p,5);assert.equal(f.p.publicResources.ghostSlashLevel,1);},
343:f=>{f.p.persistentCharacterState.ghostHunger.noGain=2;valid(f,true);post(f);assert.equal(f.p.persistentCharacterState.ghostHunger.noGain,0);},
344:f=>{ghostGain(f.run,f.p,8);assert.deepEqual(f.s.windows.level,{damage:1,start:2,end:3});},
345:f=>{ghostGain(f.run,f.p,3);assert.equal(f.s.effectiveLevel,1);valid(f,true);assert.equal(f.rc.ghostSlashBonusDamage,2);assert.equal(f.p.publicResources.ghostSlashLevel,0);},
346:f=>{f.p.augments.push('aug-342');f.p.publicResources.ghostSlashLevel=2;f.p.persistentCharacterState.ghostHunger.noGain=1;ghostTurnEnd(f.run,f.p);assert.equal(f.p.publicResources.ghostSlashLevel,1);assert.equal(f.s.nextValid,1);},
347:f=>{valid(f,true);post(f);assert.equal(f.p.publicResources.devour,4);},
348:f=>{assert.equal(ghostThreshold(f.run,f.p),4);ghostGain(f.run,f.p,4);assert.equal(f.p.publicResources.ghostSlashLevel,1);},
349:f=>{valid(f,true);post(f,6);assert.equal(f.p.publicResources.devour,4);},
350:f=>{ghostGain(f.run,f.p,8);assert.equal(f.s.madness,1);f.run.combat.turn++;valid(f);assert.equal(f.rc.ghostBonus,1);},
351:f=>{fuel(f);assert.equal(f.p.publicResources.devour,1);assert.equal(f.p.publicResources.transformationActive,true);assert.deepEqual(f.p.cardPool.map(c=>c.baseNumber),[2,4,5,6]);},
352:f=>{f.p.augments.push('aug-351');valid(f);post(f);assert.equal(f.p.publicResources.devour,2);},
353:f=>{fuel(f);valid(f);assert.equal(f.rc.ghostBonus,2);assert.equal(f.s.firstTransformed,false);},
354:f=>{f.p.augments.push('aug-351');f.s.normalStreak=1;valid(f);post(f);assert.equal(f.p.publicResources.devour,2);},
355:f=>{fuel(f);assert.deepEqual(f.p.cardPool.map(c=>c.baseNumber),[2,3,4,5,6]);},
356:f=>{fuel(f);valid(f);assert.equal(f.s.dance,1);assert.equal(f.rc.ghostBonus,2);},
357:f=>{exit(f);assert.equal(f.p.publicResources.devour,2);assert.equal(f.p.publicResources.transformationActive,false);},
358:f=>{fuel(f);assert.deepEqual(f.p.cardPool.map(c=>c.baseNumber),[3,4,5,6,6]);assert.equal(new Set(f.p.cardPool.map(c=>c.id)).size,5);},
359:f=>{fuel(f);f.s.transformedStreak=2;valid(f);assert.equal(f.rc.ghostExtra,3);},
360:f=>{exit(f);assert.equal(f.s.exitCharges,2);valid(f);assert.equal(f.rc.ghostBonus,2);assert.equal(f.s.exitCharges,1);}
};
for(let n=331;n<=360;n++)test('Ghost '+n+' actual contract positive',()=>cases[n](fixture([n])));
const negative={
331:f=>{valid(f);post(f);assert.equal(f.p.publicResources.devour,1);},
332:f=>{valid(f,true);post(f);assert.equal(f.p.publicResources.devour,1);},
333:f=>{valid(f);post(f);assert.equal(f.p.publicResources.devour,1);},
334:f=>{valid(f);post(f);assert.equal(f.p.publicResources.devour,1);},
335:f=>{ghostGain(f.run,f.p,7);assert.equal(f.p.publicResources.ghostSlashLevel,0);assert.equal(f.p.publicResources.devour,7);},
336:f=>{valid(f,true);post(f);assert.equal(f.rc.ghostBonus,0);assert.equal(f.p.publicResources.devour,1);},
337:f=>{valid(f);post(f);assert.equal(f.s.windows.normal,undefined);},
338:f=>{ghostGain(f.run,f.p,7);assert.equal(f.p.publicResources.devour,7);},
339:f=>{valid(f,true);assert.equal(f.rc.ghostBonus,0);},
340:f=>{f.p.publicResources.ghostSlashLevel=2;valid(f);assert.equal(f.rc.ghostBonus,0);},
341:f=>{f.run.phase='EVENT';assert.equal(ghostThreshold(f.run,f.p),8);},
342:f=>{f.run.phase='EVENT';assert.equal(ghostThreshold(f.run,f.p),8);},
343:f=>{f.rc.valid=false;valid(f,true);post(f);assert.equal(f.p.publicResources.devour,0);},
344:f=>{ghostGain(f.run,f.p,7);assert.equal(f.s.windows.level,undefined);},
345:f=>{ghostGain(f.run,f.p,2);assert.equal(f.s.effectiveLevel,0);},
346:f=>{f.p.augments.push('aug-342');f.p.persistentCharacterState.ghostHunger.noGain=1;ghostTurnEnd(f.run,f.p);assert.equal(f.s.nextValid,0);},
347:f=>{valid(f);post(f);assert.equal(f.p.publicResources.devour,1);},
348:f=>{ghostGain(f.run,f.p,3);assert.equal(f.p.publicResources.ghostSlashLevel,0);},
349:f=>{valid(f,true);post(f,5);assert.equal(f.p.publicResources.devour,1);},
350:f=>{ghostGain(f.run,f.p,7);assert.equal(f.s.madness,0);},
351:f=>{assert.throws(()=>activateGhostTransformation(f.run,f.p),/포식/);assert.equal(f.p.publicResources.transformationActive,false);},
352:f=>{valid(f);post(f);assert.equal(f.p.publicResources.devour,1);},
353:f=>{valid(f);assert.equal(f.rc.ghostBonus,0);},
354:f=>{f.p.augments.push('aug-351');valid(f);post(f);assert.equal(f.p.publicResources.devour,1);},
355:f=>{f.p.augments.push('aug-351');assert.throws(()=>activateGhostTransformation(f.run,f.p),/포식/);assert.equal(f.p.cardPool.some(c=>c.source==='DEMON_TRANSFORM'),false);},
356:f=>{valid(f);assert.equal(f.s.dance,0);assert.equal(f.rc.ghostBonus,0);},
357:f=>{assert.equal(ghostCycleExit(f.run,f.p,f.priv),false);assert.equal(f.p.publicResources.devour,0);},
358:f=>{f.p.augments.push('aug-351');assert.throws(()=>activateGhostTransformation(f.run,f.p),/포식/);assert.equal(f.p.cardPool.length,5);},
359:f=>{fuel(f);valid(f);assert.equal(f.rc.ghostExtra,0);},
360:f=>{valid(f);assert.equal(f.s.exitCharges,0);assert.equal(f.rc.ghostBonus,0);}
};
for(let n=331;n<=360;n++)test('Ghost '+n+' actual condition negative',()=>negative[n](fixture([n])));
for(let n=331;n<=360;n++)test('Ghost '+n+' Combat secondary effects reject Shop/Rest/Event/Reward',()=>{
 for(const phase of ['SHOP','REST','EVENT','REWARD_ROOM']){const f=fixture([n]);f.run.phase=phase;const before=JSON.stringify(f.p.publicResources);valid(f,true);post(f);ghostTurnEnd(f.run,f.p);assert.equal(JSON.stringify(f.p.publicResources),before);assert.equal(f.rc.ghostBonus,undefined);}
});
for(let n=331;n<=360;n++)test('Ghost '+n+' executable candidate and option identity',()=>{
 const d=AUGMENT_BY_ID['aug-'+n],offset=(n-331)%10;assert.equal(d.executable,true);assert.equal(d.characterId,'demon_swordsman');assert.equal(d.option,offset===0?1:(offset-1)%3+1);assert.ok(augmentCandidates(d.characterId,d.tier,d.build).some(x=>x.id===d.id));
});
for(let n=331;n<=360;n++)test('Ghost '+n+' acquired from actual offered stage',()=>{
 const f=fixture(),p=f.p,d=AUGMENT_BY_ID['aug-'+n];f.run.phase='ROOM_RESULT';delete f.run.combat;p.augmentBuild=d.tier===1?null:d.build;p.persistentCharacterState.augmentTiers=Array.from({length:d.tier-1},(_,i)=>i+1);p.growthExp=AUGMENT_THRESHOLDS[d.tier-1];
 assert.equal(beginAugmentChoices(f.run),true);assert.ok(f.run.augmentChoice.offersByPlayer.p0.includes(d.id));chooseAugment(f.run,'p0',d.id);assert.ok(p.augments.includes(d.id));
});
test('Ghost D03 overflow carries, multiple levels reactivate exactly once, retry is idempotent',()=>{
 const f=fixture(),e=[];f.p.publicResources.devour=7;f.p.publicResources.ghostSlashReady=false;ghostGain(f.run,f.p,18,e,{rootActionId:'atomic',reason:'gain'});assert.equal(f.p.publicResources.devour,1);assert.equal(f.p.publicResources.ghostSlashLevel,3);assert.equal(e.filter(x=>x.type==='GHOST_SLASH_LEVEL_UP').length,3);assert.equal(e.filter(x=>x.type==='GHOST_SLASH_REACTIVATED').length,1);ghostGain(f.run,f.p,18,e,{rootActionId:'atomic',reason:'gain'});assert.equal(f.p.publicResources.devour,1);
});
test('Ghost 338 bonus conversion has no recursive carry loop',()=>{
 const f=fixture([338,348]);ghostGain(f.run,f.p,8);assert.equal(f.p.publicResources.ghostSlashLevel,3);assert.equal(f.p.publicResources.devour,0);
});
test('Ghost hunger counters freeze in Event/Reward and level zero never emits drop rewards',()=>{
 const f=fixture([341,346,350]);f.p.persistentCharacterState.ghostHunger.noGain=2;f.run.phase='EVENT';ghostTurnEnd(f.run,f.p);assert.equal(f.p.persistentCharacterState.ghostHunger.noGain,2);f.run.phase='COMBAT';ghostTurnEnd(f.run,f.p);assert.equal(f.s.madness,0);assert.equal(f.s.nextValid,0);
});
test('Ghost hunger cannot recompute a dropped level from persistent Devour',()=>{
 const f=fixture([342]);f.p.publicResources.devour=4;f.p.publicResources.ghostSlashLevel=2;f.p.persistentCharacterState.ghostHunger.noGain=1;ghostTurnEnd(f.run,f.p);assert.equal(f.p.publicResources.ghostSlashLevel,1);initializeCombatCharacter(f.p);assert.equal(f.p.publicResources.ghostSlashLevel,1);assert.equal(f.p.publicResources.devour,4);
});
test('Ghost invalid Slash preserves armed use and invalid first transformed card preserves first-valid bonus',()=>{
 const f=fixture([353]);f.rc.valid=false;valid(f,true);assert.equal(f.p.publicResources.ghostSlashReady,true);fuel(f);valid(f);assert.equal(f.s.firstTransformed,true);
});
test('Ghost transformation is manual after resolution, costs exactly six and excludes final submit',()=>{
 const f=fixture([351]);ghostGain(f.run,f.p,7);ghostTurnEnd(f.run,f.p);assert.equal(f.p.publicResources.transformationActive,false);assert.equal(f.p.publicResources.transformationPending,true);fuel(f);assert.equal(f.p.publicResources.devour,1);assert.throws(()=>activateGhostTransformation(f.run,f.p),/이미/);
 const g=fixture([351]);g.p.publicResources.devour=7;g.run.combat.turnSubmissions.p0={};assert.throws(()=>activateGhostTransformation(g.run,g.p),/확정/);assert.equal(g.p.publicResources.devour,7);
});
test('Ghost transformation replaces normal cycle and normal exit never restores deleted physical cards',()=>{
 const f=fixture([351,357,360]),old=f.p.cardPool.map(c=>c.id);fuel(f);const transformed=f.p.cardPool.map(c=>c.id);assert.ok(transformed.every(id=>!old.includes(id)));f.priv.remainingCardIds=[];ghostCycleExit(f.run,f.p,f.priv);assert.ok(f.p.cardPool.every(c=>!old.includes(c.id)&&!transformed.includes(c.id)));assert.equal(f.priv.spentCardIds.length,0);assert.equal(f.p.publicResources.devour,2);assert.equal(f.s.exitCharges,2);
});
test('Ghost recovered transformed physical card delays exhaustion and keeps the same identity',()=>{
 const f=fixture([351]);fuel(f);const id=f.priv.remainingCardIds[0];f.priv.spentCardIds=[...f.priv.remainingCardIds];f.priv.remainingCardIds=[id];f.priv.spentCardIds=f.priv.spentCardIds.filter(x=>x!==id);assert.equal(ghostCycleExit(f.run,f.p,f.priv),false);assert.ok(f.p.cardPool.some(c=>c.id===id));f.priv.remainingCardIds=[];assert.equal(ghostCycleExit(f.run,f.p,f.priv),true);
});
test('Ghost Combat end cleans temporary cards and transformation fuel; normal Devour/level persist',()=>{
 const f=fixture([351,357,360]);fuel(f);cleanupGhost(f.run,f.p);assert.equal(f.p.publicResources.devour,0);assert.equal(f.p.cardPool.some(c=>c.source==='DEMON_TRANSFORM'),false);assert.equal(f.run.augmentFramework.cardState['p0:ghost'],undefined);
 const g=fixture();g.p.publicResources.devour=7;g.p.publicResources.ghostSlashLevel=2;cleanupGhost(g.run,g.p);assert.equal(g.p.publicResources.devour,7);assert.equal(g.p.publicResources.ghostSlashLevel,2);
});
test('Ghost owner-only transformation readiness and server guards never leak',()=>{
 const f=fixture([351]);ghostGain(f.run,f.p,7);const own=projectRun(f.run,'p0'),other=projectRun(f.run,'p1');assert.equal(own.privateGhostState.transformationReady,true);assert.equal(other.players[0].publicResources.transformationPending,undefined);assert.equal(other.augmentFramework,undefined);assert.equal(other.players[0].cardPool.some(c=>c.id),false);
});
for(const start of [331,341,351])test('Ghost full ten-card build actual pipeline reconnect and physical zones '+start,()=>{
 const f=fixture(Array.from({length:10},(_,i)=>start+i));
 for(let turn=0;turn<15;turn++){
 beginTurn(f.run);f.run.combat.monster.intent={type:'CHARGE',payload:{}};
 if(start===351&&f.p.publicResources.transformationPending&&!f.p.publicResources.transformationActive)activateImmediateCharacterSkill(f.run,f.p);
 for(const [i,p] of f.run.players.entries()){const ids=f.run.combat.privateByPlayer[p.playerId].remainingCardIds;submitCard(f.run,p.playerId,ids[Math.min(i,ids.length-1)],i===0&&start!==351&&p.publicResources.ghostSlashReady);}
 const restored=structuredClone(f.run),a=resolveBasicTurn(f.run),b=resolveBasicTurn(restored);assert.deepEqual(a,b);
 for(const p of f.run.players){const z=f.run.combat.privateByPlayer[p.playerId],all=[...z.remainingCardIds,...z.spentCardIds];assert.equal(new Set(all).size,all.length);assert.ok(all.every(id=>p.cardPool.some(c=>c.id===id)));}
 }
});
for(const cls of ['imp','prophet','gunner','berserker'])test('Ghost mixed actual pipeline with '+cls,()=>{
 const f=fixture([331,334,338]),q=f.run.players[1];q.characterId=cls;f.run.combat=newCombatState(f.run.players,999,'NORMAL_COMBAT');f.run.combat.id='mixed-'+cls;beginTurn(f.run);f.run.combat.monster.intent={type:'CHARGE',payload:{}};
 for(const [i,p] of f.run.players.entries()){const ids=f.run.combat.privateByPlayer[p.playerId].remainingCardIds;submitCard(f.run,p.playerId,ids[Math.min(i,ids.length-1)],i===0);}
 const restored=structuredClone(f.run),a=resolveBasicTurn(f.run),b=resolveBasicTurn(restored);assert.deepEqual(a,b);assert.ok(a.phaseTrace.indexOf('PRE_COLLISION_SWAP')<a.phaseTrace.indexOf('PRE_COLLISION_STEAL'));
});

for(const start of [331,341,351])test('Ghost actual EXP stage progression and queued choices '+start,()=>{
 const f=fixture(),p=f.p;delete f.run.combat;f.run.phase='ROOM_RESULT';
 for(let stage=1;stage<=4;stage++){
 p.growthExp=AUGMENT_THRESHOLDS[stage-1];assert.equal(beginAugmentChoices(f.run),true);
 const id='aug-'+(start+(stage===1?0:1+(stage-2)*3));
 assert.ok(f.run.augmentChoice.offersByPlayer.p0.includes(id));chooseAugment(f.run,'p0',id);
 assert.equal(f.run.phase,'ROOM_RESULT');assert.deepEqual(p.persistentCharacterState.augmentTiers,Array.from({length:stage},(_,i)=>i+1));assert.equal(p.augments.filter(x=>x===id).length,1);
 }
 assert.equal(p.augments.length,4);
});
test('Ghost generic physical recovery preserves transformed ID and rejects deleted pools',()=>{
 const f=fixture([351]);f.run.players[1].characterId='prophet';fuel(f);const id=f.priv.remainingCardIds.shift();f.priv.spentCardIds.push(id);
 const r=recoverPhysicalCard(f.run,f.p,id,{rootActionId:'seer-real',recoveryMode:'ALLY'});assert.equal(r.applied,true);assert.ok(f.priv.remainingCardIds.includes(id));assert.equal(ghostCycleExit(f.run,f.p,f.priv),false);
 assert.equal(recoverPhysicalCard(f.run,f.p,id,{rootActionId:'seer-real',recoveryMode:'ALLY'}).applied,false);
 f.priv.remainingCardIds=[];ghostCycleExit(f.run,f.p,f.priv);assert.equal(recoverPhysicalCard(f.run,f.p,id).applied,false);
});
test('Ghost two owners keep Devour thresholds hunger and physical pools independent',()=>{
 const f=fixture([351]);const q=f.run.players[1];q.characterId='demon_swordsman';q.augments=['aug-341'];q.publicResources.devour=0;q.publicResources.ghostSlashLevel=0;
 ghostGain(f.run,q,8);assert.equal(q.publicResources.devour,2);assert.equal(q.publicResources.ghostSlashLevel,1);fuel(f);assert.equal(q.publicResources.transformationActive,undefined);
 assert.ok(f.p.cardPool.every(c=>c.id.startsWith('p0:')));assert.notEqual(ghostState(f.run,q),f.s);
});
test('Ghost fixed windows expire and invalid attacks preserve next-valid charges',()=>{
 const f=fixture([337,346]);valid(f,true);post(f);f.run.combat.turn=2;f.s.nextValid=1;f.rc.valid=false;valid(f);assert.equal(f.s.nextValid,1);
 f.run.combat.turn=4;f.rc.valid=true;valid(f);assert.equal(f.rc.ghostBonus,1);assert.equal(f.s.windows.normal,undefined);
});
test('Ghost all thirty readable Korean UI descriptions match identity',()=>{
 for(let n=331;n<=360;n++){const d=AUGMENT_BY_ID['aug-'+n],ui=augmentUi(d.id,d.tier);assert.equal(ui.name,d.name);assert.equal(ui.build,d.build);assert.ok(ui.description.length>10);assert.equal(ui.description.includes('"op"'),false);}
});
