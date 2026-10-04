import {augmentUi} from '../src/pve-ui-catalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {twinsState,twinsTurnStart,activateTwins,twinsResolve,twinsAfterSpend,twinsCycleComplete,twinsTurnEnd,twinsAfterHpDamage,twinsIncomingProtection,cleanupTwins} from '../supabase/functions/game-api/pve/twins-runtime.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {beginAugmentChoices,chooseAugment,AUGMENT_THRESHOLDS} from '../supabase/functions/game-api/pve/augments.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {activateImmediateCharacterSkill,isCardSelectableForCharacter,onTurnStartCharacter} from '../supabase/functions/game-api/pve/characters.js';
import {recoverSeerPhysicalCard} from '../supabase/functions/game-api/pve/seer-runtime.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
function fixture(ids=[]){
 const players=['twins','adventurer','adventurer','adventurer'].map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
 players[0].augments=ids.map(n=>'aug-'+n);
 const run={id:'twins-005d',seed:'twins',rngCounter:0,version:1,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
 run.combat=newCombatState(players,999,'NORMAL_COMBAT');run.combat.id='twins-combat';run.combat.turn=1;run.combat.phase='SELECTION_OPEN';
 const p=players[0],priv=run.combat.privateByPlayer.p0;p.publicResources.parity=1;const s=twinsState(run,p);s.cycle=priv.cycleIndex||1;
 const rc={playerId:'p0',cardInstanceId:p.cardPool[0].id,baseNumber:1,workingNumber:1,finalNumber:1,valid:true};
 return {run,p,s,priv,rc};
}
const valid=f=>twinsResolve(f.run,f.p,f.rc,[]);
const celestial=(f,kind)=>{f.p.augments.push('aug-371');f.s.special=kind;};
const acro=f=>{f.p.augments.push('aug-381');activateTwins(f.run,f.p);};
const spent=f=>{const id=f.p.cardPool[1].id;f.priv.remainingCardIds=f.priv.remainingCardIds.filter(x=>x!==id);f.priv.spentCardIds.push(id);return id;};
const cases={
361:f=>{f.s.previousValid=true;valid(f);assert.equal(f.rc.twinsBaseBonus,3);},
362:f=>{f.s.streak=2;valid(f);assert.equal(f.rc.twinsBonus,1);},
363:f=>{f.s.streak=3;f.s.previousValid=true;f.rc.valid=false;f.rc.invalidReason='COLLISION';valid(f);assert.equal(f.s.streak,3);assert.equal(f.rc.valid,false);},
364:f=>{spent(f);f.s.streak=1;valid(f);twinsAfterSpend(f.run,f.p,f.rc);assert.equal(f.priv.spentCardIds.length,0);},
365:f=>{f.s.streak=2;valid(f);assert.equal(f.s.nextValid,2);assert.equal(f.rc.twinsBonus,0);},
366:f=>{f.s.previousFinal=4;valid(f);assert.equal(f.rc.twinsBonus,2);},
367:f=>{f.p.hp=1;twinsCycleComplete(f.run,f.p);assert.equal(f.p.hp,2);assert.equal(f.s.nextCycle,2);},
368:f=>{f.s.attempts=4;twinsCycleComplete(f.run,f.p);assert.equal(f.s.performance,true);},
369:f=>{f.priv.remainingCardIds=[f.rc.cardInstanceId];valid(f);assert.equal(f.rc.twinsBonus,4);},
370:f=>{spent(f);f.s.streak=3;valid(f);twinsAfterSpend(f.run,f.p,f.rc);assert.equal(f.priv.spentCardIds.length,0);},
371:f=>{valid(f);assert.equal(f.rc.twinsBaseBonus,0);assert.equal(f.s.sun,3);assert.equal(f.s.moon,1);},
372:f=>{celestial(f,'SUN');f.run.players[1].hp=1;f.run.players[2].hp=2;valid(f);assert.equal(f.run.players[1].hp,2);assert.equal(f.run.players[2].publicResources.twinsProtection,1);},
373:f=>{celestial(f,'MOON');valid(f);assert.equal(f.rc.twinsBonus,6);},
374:f=>{celestial(f,'MOON');twinsTurnEnd(f.run,f.p);assert.equal(f.s.inertia,true);f.run.combat.turn++;valid(f);assert.equal(f.s.sun,4);},
375:f=>{celestial(f,'SUN');twinsTurnEnd(f.run,f.p);f.run.combat.turn++;twinsAfterHpDamage(f.run,[{type:'PLAYER_DAMAGED',playerId:'p1',actualDamage:1}]);assert.equal(f.run.players[1].publicResources.twinsProtection,1);assert.equal(f.s.sunWindow,null);},
376:f=>{celestial(f,'MOON');twinsTurnEnd(f.run,f.p);f.run.combat.turn++;valid(f);assert.equal(f.rc.twinsBonus,1);},
377:f=>{f.p.augments.push('aug-371');f.s.lastEclipse='SUN';f.s.pendingEclipse={kind:'MOON',turn:1};twinsTurnStart(f.run,f.p);assert.equal(f.s.flow,1);},
378:f=>{celestial(f,'SUN');f.run.players[1].hp=1;f.run.players[2].hp=1;valid(f);assert.equal(f.run.players[1].hp,2);assert.equal(f.run.players[2].hp,2);assert.equal(f.p.publicResources.twinsProtection,1);},
379:f=>{celestial(f,'MOON');f.rc.finalNumber=5;valid(f);assert.equal(f.rc.twinsBonus,8);assert.equal(f.rc.twinsExtra,3);},
380:f=>{f.p.augments.push('aug-371');f.s.lastEclipse='SUN';f.s.pendingEclipse={kind:'MOON',turn:1};twinsTurnStart(f.run,f.p);valid(f);assert.equal(f.s.ring,1);assert.equal(f.rc.twinsBonus,5);},
381:f=>{acro(f);valid(f);assert.equal(f.rc.twinsBonus,2);assert.equal(f.p.publicResources.acrobaticsRechargeProgress,1);},
382:f=>{acro(f);valid(f);assert.equal(f.rc.twinsBonus,4);},
383:f=>{acro(f);f.s.postValid=1;valid(f);assert.equal(f.rc.twinsBonus,2);},
384:f=>{acro(f);f.rc.valid=false;f.rc.invalidReason='COLLISION';valid(f);assert.equal(f.p.publicResources.acrobaticsRechargeProgress,1);},
385:f=>{acro(f);valid(f);f.run.combat.turn++;valid(f);assert.equal(f.p.publicResources.acrobaticsReady,true);assert.equal(f.p.publicResources.acrobaticsRechargeProgress,2);},
386:f=>{f.priv.remainingCardIds=f.priv.remainingCardIds.slice(0,2);acro(f);valid(f);assert.equal(f.rc.twinsBonus,4);},
387:f=>{acro(f);f.s.previousPrinted=0;f.s.alternating=1;valid(f);assert.equal(f.rc.twinsBonus,4);},
388:f=>{acro(f);f.s.postStreak=2;valid(f);assert.equal(f.p.publicResources.acrobaticsReady,true);assert.equal(f.s.nextEncore,2);},
389:f=>{f.priv.remainingCardIds=f.priv.remainingCardIds.slice(0,1);acro(f);valid(f);assert.equal(f.rc.twinsBonus,8);},
390:f=>{acro(f);const id=spent(f);f.s.postAttempts=2;valid(f);twinsAfterSpend(f.run,f.p,f.rc);assert.ok(f.priv.remainingCardIds.includes(id));assert.equal(f.p.publicResources.acrobaticsRechargeProgress,2);}
};
for(let n=361;n<=390;n++)test('Twins '+n+' actual contract positive',()=>cases[n](fixture([n])));
const negative={
361:f=>{valid(f);assert.equal(f.rc.twinsBaseBonus,2);},
362:f=>{valid(f);assert.equal(f.rc.twinsBonus,0);},
363:f=>{f.s.collisions=1;f.s.streak=3;f.rc.valid=false;f.rc.invalidReason='COLLISION';valid(f);assert.equal(f.s.streak,0);},
364:f=>{spent(f);valid(f);twinsAfterSpend(f.run,f.p,f.rc);assert.equal(f.priv.spentCardIds.length,1);},
365:f=>{valid(f);assert.equal(f.s.nextValid,0);},
366:f=>{f.s.previousFinal=2;valid(f);assert.equal(f.rc.twinsBonus,0);},
367:f=>{f.s.collisions=1;f.p.hp=1;twinsCycleComplete(f.run,f.p);assert.equal(f.p.hp,1);},
368:f=>{f.s.attempts=4;f.s.allValid=false;twinsCycleComplete(f.run,f.p);assert.equal(f.s.performance,false);},
369:f=>{valid(f);assert.equal(f.rc.twinsBonus,0);},
370:f=>{spent(f);valid(f);twinsAfterSpend(f.run,f.p,f.rc);assert.equal(f.priv.spentCardIds.length,1);},
371:f=>{f.rc.valid=false;valid(f);assert.equal(f.s.sun,2);},
372:f=>{celestial(f,'SUN');f.rc.valid=false;f.run.players[1].hp=1;valid(f);assert.equal(f.run.players[1].hp,1);},
373:f=>{celestial(f,'SUN');valid(f);assert.equal(f.rc.twinsBonus,0);},
374:f=>{valid(f);assert.equal(f.s.inertia,false);},
375:f=>{f.s.sunWindow={start:2,end:3};twinsAfterHpDamage(f.run,[{type:'PLAYER_DAMAGED',playerId:'p1',actualDamage:1}]);assert.equal(f.run.players[1].publicResources.twinsProtection,undefined);},
376:f=>{valid(f);assert.equal(f.rc.twinsBonus,0);},
377:f=>{f.s.lastEclipse='SUN';f.s.pendingEclipse={kind:'SUN',turn:1};twinsTurnStart(f.run,f.p);assert.equal(f.s.flow,0);},
378:f=>{celestial(f,'SUN');f.s.firstSunUsed=true;f.run.players[1].hp=1;f.run.players[2].hp=1;valid(f);assert.equal(f.run.players[2].hp,1);},
379:f=>{celestial(f,'MOON');f.s.firstMoonUsed=true;f.rc.finalNumber=5;valid(f);assert.equal(f.rc.twinsBonus,4);assert.equal(f.rc.twinsExtra,0);},
380:f=>{f.s.lastEclipse='SUN';f.s.pendingEclipse={kind:'SUN',turn:1};twinsTurnStart(f.run,f.p);assert.equal(f.s.ring,0);},
381:f=>{acro(f);f.rc.valid=false;valid(f);assert.equal(f.p.publicResources.acrobaticsRechargeProgress,0);},
382:f=>{acro(f);f.s.postValid=1;valid(f);assert.equal(f.rc.twinsBonus,0);},
383:f=>{acro(f);f.s.postValid=2;valid(f);assert.equal(f.rc.twinsBonus,0);},
384:f=>{acro(f);f.rc.valid=false;f.rc.invalidReason='MONSTER_RULE';valid(f);assert.equal(f.p.publicResources.acrobaticsRechargeProgress,0);},
385:f=>{acro(f);valid(f);assert.equal(f.p.publicResources.acrobaticsReady,false);},
386:f=>{acro(f);valid(f);assert.equal(f.rc.twinsBonus,2);},
387:f=>{acro(f);f.s.previousPrinted=1;f.s.alternating=1;valid(f);assert.equal(f.rc.twinsBonus,2);},
388:f=>{acro(f);f.s.encoreProcs=2;f.s.postStreak=2;valid(f);assert.equal(f.s.nextEncore,0);},
389:f=>{acro(f);valid(f);assert.equal(f.rc.twinsBonus,2);},
390:f=>{acro(f);spent(f);f.s.postAttempts=2;f.s.postAll=false;valid(f);twinsAfterSpend(f.run,f.p,f.rc);assert.equal(f.priv.spentCardIds.length,1);}
};
for(let n=361;n<=390;n++)test('Twins '+n+' condition negative',()=>negative[n](fixture([n])));
for(let n=361;n<=390;n++)test('Twins '+n+' secondary Combat effects reject other rooms',()=>{
 for(const phase of ['EVENT','REWARD_ROOM','SHOP','REST']){const f=fixture([n]);f.run.phase=phase;const before=JSON.stringify(f.p.publicResources);valid(f);twinsAfterSpend(f.run,f.p,f.rc);twinsCycleComplete(f.run,f.p);assert.equal(JSON.stringify(f.p.publicResources),before);assert.equal(f.rc.twinsBonus,undefined);}
});
for(let n=361;n<=390;n++)test('Twins '+n+' registered executable candidate option',()=>{const d=AUGMENT_BY_ID['aug-'+n],offset=(n-361)%10;assert.equal(d.executable,true);assert.equal(d.characterId,'twins');assert.equal(d.option,offset===0?1:(offset-1)%3+1);assert.ok(augmentCandidates('twins',d.tier,d.build).some(x=>x.id===d.id));});
for(let n=361;n<=390;n++)test('Twins '+n+' actual offered acquisition',()=>{const f=fixture(),d=AUGMENT_BY_ID['aug-'+n];f.run.phase='ROOM_RESULT';delete f.run.combat;f.p.augmentBuild=d.tier===1?null:d.build;f.p.persistentCharacterState.augmentTiers=Array.from({length:d.tier-1},(_,i)=>i+1);f.p.growthExp=AUGMENT_THRESHOLDS[d.tier-1];assert.equal(beginAugmentChoices(f.run),true);assert.ok(f.run.augmentChoice.offersByPlayer.p0.includes(d.id));chooseAugment(f.run,'p0',d.id);assert.ok(f.p.augments.includes(d.id));});
test('Twins printed eligibility precedes later final number changes',()=>{
 const f=fixture();assert.equal(isCardSelectableForCharacter(f.p,f.p.cardPool[0]),true);assert.equal(isCardSelectableForCharacter(f.p,f.p.cardPool[1]),false);
 assert.throws(()=>submitCard(f.run,'p0',f.p.cardPool[1].id),/홀짝/);assert.equal(f.run.combat.turnSubmissions.p0,undefined);submitCard(f.run,'p0',f.p.cardPool[0].id);f.rc.finalNumber=2;valid(f);assert.equal(f.rc.valid,true);
});
test('Twins reconnect never reseeds parity or resets Sun Moon guards',()=>{
 const f=fixture([371]);delete f.p.publicResources.parity;twinsTurnStart(f.run,f.p);const n=f.run.rngCounter,parity=f.p.publicResources.parity;twinsTurnStart(f.run,f.p);assert.equal(f.run.rngCounter,n);assert.equal(f.p.publicResources.parity,parity);
 const clone=structuredClone(f.run);onTurnStartCharacter(clone.players[0],clone);assert.equal(clone.rngCounter,n);
});
test('Twins deterministic starvation flips once without RNG',()=>{
 const f=fixture(),n=f.run.rngCounter;f.priv.remainingCardIds=[f.p.cardPool[1].id];twinsTurnStart(f.run,f.p);assert.equal(f.p.publicResources.parity,0);twinsTurnStart(f.run,f.p);assert.equal(f.p.publicResources.parity,0);assert.equal(f.run.rngCounter,n);
});
test('Twins Acrobatics preserves IDs clears selection and uses one deliberate flip',()=>{
 const f=fixture();spent(f);f.priv.selectedCardId=f.p.cardPool[0].id;const ids=f.p.cardPool.map(c=>c.id);activateTwins(f.run,f.p);assert.deepEqual(f.priv.remainingCardIds,ids);assert.equal(f.priv.selectedCardId,undefined);assert.equal(f.p.publicResources.parity,0);assert.throws(()=>activateTwins(f.run,f.p),/재충전/);twinsTurnEnd(f.run,f.p);assert.equal(f.p.publicResources.parity,1);twinsTurnEnd(f.run,f.p);assert.equal(f.p.publicResources.parity,1);
});
test('Twins 365 consuming pending damage cannot rearm on same root',()=>{
 const f=fixture([365]);f.s.streak=3;f.s.nextValid=2;valid(f);assert.equal(f.rc.twinsBonus,2);assert.equal(f.s.nextValid,0);valid(f);assert.equal(f.s.streak,4);assert.equal(f.rc.twinsBonus,2);
});
test('Twins eclipse waits next turn then resets even on invalid',()=>{
 const f=fixture([371]);f.s.sun=3;f.s.moon=1;valid(f);assert.equal(f.s.pendingEclipse.kind,'SUN');assert.equal(f.s.special,null);twinsTurnEnd(f.run,f.p);f.run.combat.turn++;twinsTurnStart(f.run,f.p);assert.equal(f.s.special,'SUN');f.rc.valid=false;valid(f);twinsTurnEnd(f.run,f.p);assert.equal(f.s.sun,2);assert.equal(f.s.moon,2);
});
test('Twins 390 most recent eligibility excludes current and never reruns root',()=>{
 const f=fixture([381,390]);acro(f);const a=spent(f),b=f.p.cardPool[2].id;f.priv.remainingCardIds=f.priv.remainingCardIds.filter(x=>x!==b);f.priv.spentCardIds.push(b);f.s.spentById[a]=4;f.s.spentById[b]=5;f.s.spentSequence=5;f.s.postAttempts=2;valid(f);
 f.priv.remainingCardIds=f.priv.remainingCardIds.filter(x=>x!==f.rc.cardInstanceId);f.priv.spentCardIds.push(f.rc.cardInstanceId);twinsAfterSpend(f.run,f.p,f.rc);assert.ok(f.priv.remainingCardIds.includes(b));assert.ok(f.priv.spentCardIds.includes(f.rc.cardInstanceId));const before=JSON.stringify(f.priv);twinsAfterSpend(f.run,f.p,f.rc);assert.equal(JSON.stringify(f.priv),before);
});
test('Twins Seer recovery ignores current parity and preserves instance',()=>{
 const f=fixture();f.run.players[1].characterId='prophet';const id=spent(f);const r=recoverSeerPhysicalCard(f.run,f.run.players[1],f.p,id,{rootActionId:'real-seer',recoveryMode:'ALLY'});assert.equal(r.applied,true);assert.equal(isCardSelectableForCharacter(f.p,f.p.cardPool.find(c=>c.id===id)),false);assert.equal(f.p.publicResources.acrobaticsReady,true);
});
test('Twins direct protection handles DIRECT only and cleanup removes Combat state',()=>{
 const f=fixture();f.p.publicResources.twinsProtection=1;const a={amount:2};assert.equal(twinsIncomingProtection(f.p,a,'AOE'),0);assert.equal(twinsIncomingProtection(f.p,a,'DIRECT'),1);assert.equal(a.amount,1);cleanupTwins(f.run,f.p);assert.equal(f.run.augmentFramework.cardState['p0:twins'],undefined);
});
for(const start of [361,371,381])test('Twins full ten card build actual pipeline reconnect '+start,()=>{
 const f=fixture(Array.from({length:10},(_,i)=>start+i));
 for(let turn=0;turn<20;turn++){
 beginTurn(f.run);f.run.combat.monster.intent={type:'CHARGE',payload:{}};
 if(f.p.publicResources.acrobaticsReady&&turn%4===0)activateImmediateCharacterSkill(f.run,f.p);
 for(const [i,p] of f.run.players.entries()){const z=f.run.combat.privateByPlayer[p.playerId],ids=z.remainingCardIds.filter(id=>isCardSelectableForCharacter(p,p.cardPool.find(c=>c.id===id)));submitCard(f.run,p.playerId,ids[Math.min(i,ids.length-1)]);}
 const clone=structuredClone(f.run),a=resolveBasicTurn(f.run),b=resolveBasicTurn(clone);assert.deepEqual(a,b);
 for(const p of f.run.players){const z=f.run.combat.privateByPlayer[p.playerId],all=[...z.remainingCardIds,...z.spentCardIds];assert.equal(new Set(all).size,all.length);assert.ok(all.every(id=>p.cardPool.some(c=>c.id===id)));}
 }
});
for(const start of [361,371,381])test('Twins EXP stage one through four '+start,()=>{
 const f=fixture();delete f.run.combat;f.run.phase='ROOM_RESULT';
 for(let stage=1;stage<=4;stage++){f.p.growthExp=AUGMENT_THRESHOLDS[stage-1];beginAugmentChoices(f.run);const id='aug-'+(start+(stage===1?0:1+(stage-2)*3));assert.ok(f.run.augmentChoice.offersByPlayer.p0.includes(id));chooseAugment(f.run,'p0',id);assert.equal(f.run.phase,'ROOM_RESULT');}
 assert.equal(f.p.augments.length,4);
});
for(const cls of ['mage','imp','vampire','prophet','gambler','martial_artist'])test('Twins mixed authoritative pipeline '+cls,()=>{
 const f=fixture([361,365,370]);f.run.players[1].characterId=cls;f.run.combat=newCombatState(f.run.players,999,'NORMAL_COMBAT');f.run.combat.id='mixed-'+cls;beginTurn(f.run);f.run.combat.monster.intent={type:'CHARGE',payload:{}};
 for(const [i,p] of f.run.players.entries()){const z=f.run.combat.privateByPlayer[p.playerId],ids=z.remainingCardIds.filter(id=>isCardSelectableForCharacter(p,p.cardPool.find(c=>c.id===id)));submitCard(f.run,p.playerId,ids[Math.min(i,ids.length-1)]);}
 const clone=structuredClone(f.run);assert.deepEqual(resolveBasicTurn(f.run),resolveBasicTurn(clone));
});

test('Twins owner counters and physical zones never leak to other players',()=>{const f=fixture([381]);acro(f);valid(f);const own=projectRun(f.run,'p0'),other=projectRun(f.run,'p1');assert.equal(own.privateTwinsState.validStreak,1);assert.equal(other.privateTwinsState,undefined);assert.equal(other.privateCombat.remainingCardIds.some(id=>id.startsWith('p0:')),false);assert.equal(other.augmentFramework,undefined);assert.equal(other.players[0].cardPool.some(c=>c.id),false);});
test('Twins two owners keep parity resources Acrobatics and recovery independent',()=>{const f=fixture([381]),q=f.run.players[1];q.characterId='twins';q.augments=['aug-371'];q.publicResources.parity=0;q.publicResources.acrobaticsReady=true;activateTwins(f.run,f.p);assert.equal(q.publicResources.parity,0);assert.equal(q.publicResources.acrobaticsReady,true);assert.notEqual(twinsState(f.run,q),f.s);assert.equal(twinsState(f.run,q).sun,2);});
test('Twins all thirty readable Korean names and tooltips',()=>{for(let n=361;n<=390;n++){const d=AUGMENT_BY_ID['aug-'+n],ui=augmentUi(d.id,d.tier);assert.equal(ui.name,d.name);assert.equal(ui.build,d.build);assert.ok(ui.description.length>10);assert.equal(ui.description.includes('"op"'),false);}});

test('Twins 390 qualified empty pool still grants progress, excludes VANISHED and wrong owner',()=>{
 const f=fixture([381,390]);acro(f);f.s.postAttempts=2;valid(f);twinsAfterSpend(f.run,f.p,f.rc);assert.equal(f.p.publicResources.acrobaticsRechargeProgress,2);
 const g=fixture([381,390]);acro(g);const id=spent(g);g.p.cardPool.find(c=>c.id===id).tags=['VANISHED_SOURCE'];g.priv.spentCardIds.push(g.run.players[1].cardPool[0].id);g.s.postAttempts=2;valid(g);twinsAfterSpend(g.run,g.p,g.rc);assert.equal(g.priv.remainingCardIds.includes(id),false);assert.equal(g.p.publicResources.acrobaticsRechargeProgress,2);
});
test('Twins 390 counts first three attempts rather than first three successes',()=>{
 const f=fixture([381,390]);acro(f);spent(f);
 f.rc.valid=false;f.rc.invalidReason='COLLISION';valid(f);
 for(let turn=2;turn<=4;turn++){f.run.combat.turn=turn;f.rc.valid=true;delete f.rc.invalidReason;valid(f);twinsAfterSpend(f.run,f.p,f.rc);}
 assert.equal(f.priv.spentCardIds.length,1);assert.equal(f.s.postAttempts,4);assert.equal(f.s.postAll,false);
});
test('Twins 388 activation-local latch allows two activations but no third Combat proc',()=>{
 const f=fixture([381,388]);acro(f);f.s.postStreak=2;valid(f);assert.equal(f.s.encoreProcs,1);f.run.combat.turn++;activateTwins(f.run,f.p);f.s.postStreak=2;valid(f);assert.equal(f.s.encoreProcs,2);
 f.run.combat.turn++;activateTwins(f.run,f.p);f.s.postStreak=2;valid(f);assert.equal(f.s.encoreProcs,2);assert.equal(f.p.publicResources.acrobaticsReady,false);
});
test('Twins 364 and 370 empty eligibility do not spend once guard or RNG',()=>{
 const f=fixture([364,370]);f.s.streak=3;valid(f);const n=f.run.rngCounter;twinsAfterSpend(f.run,f.p,f.rc);assert.equal(f.run.rngCounter,n);assert.equal(Object.keys(f.s.guards).some(k=>k.includes('364')||k.includes('370')),false);
});
test('Twins Combat-only Sun/Moon state is not initialized in Event or Reward',()=>{
 for(const phase of ['EVENT','REWARD_ROOM']){const f=fixture([371,381]);f.run.phase=phase;delete f.run.augmentFramework;twinsTurnStart(f.run,f.p);twinsTurnEnd(f.run,f.p);assert.equal(f.run.augmentFramework,undefined);assert.equal(f.p.publicResources.sun,undefined);}
});

test('Twins actual Vampire swap changes FINAL parity without invalidating legal printed submission',()=>{
 const f=fixture([361]);f.run.players[1].characterId='vampire';f.run.players[1].augments=['aug-301'];f.run.combat=newCombatState(f.run.players,999,'NORMAL_COMBAT');f.run.combat.id='printed-swap';beginTurn(f.run);f.p.publicResources.parity=1;f.run.players[1].publicResources.thrallPlayerId='p0';f.run.combat.monster.intent={type:'CHARGE',payload:{}};
 for(const [i,p] of f.run.players.entries()){const id=p.cardPool.find(c=>c.baseNumber===i+1).id;submitCard(f.run,p.playerId,id,i===1);}
 const result=resolveBasicTurn(f.run),card=result.cards.find(c=>c.playerId==='p0');assert.equal(card.baseNumber,1);assert.equal(card.finalNumber,2);assert.equal(card.valid,true);assert.equal(result.collisionResolutionPasses,1);
});
test('Twins 390 recovery precedes natural cycle completion and avoids current card',()=>{
 const f=fixture([381,390]);acro(f);f.s.postAttempts=2;f.s.postAll=true;const old=spent(f);f.priv.remainingCardIds=[f.rc.cardInstanceId];valid(f);f.priv.remainingCardIds=[];f.priv.spentCardIds.push(f.rc.cardInstanceId);twinsAfterSpend(f.run,f.p,f.rc);assert.deepEqual(f.priv.remainingCardIds,[old]);assert.ok(f.priv.spentCardIds.includes(f.rc.cardInstanceId));assert.equal(f.priv.cycleIndex,2);
});
test('Twins printed eligibility treats explicit BASE zero and six as even',()=>{
 const f=fixture();f.p.publicResources.parity=0;assert.equal(isCardSelectableForCharacter(f.p,{baseNumber:0}),true);assert.equal(isCardSelectableForCharacter(f.p,{baseNumber:6}),true);f.p.publicResources.parity=1;assert.equal(isCardSelectableForCharacter(f.p,{baseNumber:6}),false);
});
test('Twins final submit prohibits Acrobatics and does not change pool or parity',()=>{
 const f=fixture();submitCard(f.run,'p0',f.rc.cardInstanceId);const before=JSON.stringify(f.priv),parity=f.p.publicResources.parity;assert.throws(()=>activateImmediateCharacterSkill(f.run,f.p),/확정/);assert.equal(JSON.stringify(f.priv),before);assert.equal(f.p.publicResources.parity,parity);
});
