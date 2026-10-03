import {beginAugmentChoices,chooseAugment,AUGMENT_THRESHOLDS} from '../supabase/functions/game-api/pve/augments.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {resolveMartial,martialPacket,martialState,prepareMartialCollision,martialCap,afterMartialDamage,cleanupMartial} from '../supabase/functions/game-api/pve/martial-runtime.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {submitCard,resolveBasicTurn,beginTurn} from '../supabase/functions/game-api/pve/combat.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
function fixture(ids=[]){
 const players=['martial_artist','adventurer','adventurer','adventurer'].map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
 const run={id:'martial-005d-a',seed:'martial',rngCounter:0,version:1,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
 run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});run.combat.id='martial-combat';run.combat.turn=1;
 const p=players[0];p.augments=ids.map(n=>'aug-'+n);p.publicResources.combo=2;p.publicResources.lastSubmittedNumber=2;
 return {run,p,s:martialState(run,p),rc:{playerId:'p0',cardInstanceId:'p0:base:4',finalNumber:4,valid:true}};
}
function go(f,skill=false){resolveMartial(f.run,f.p,f.rc,{skillIntent:skill});return f.rc;}
function consume(f){return martialPacket(f.run,f.run.players[1],{playerId:'p1',cardInstanceId:'p1:base:1',finalNumber:1,valid:true},2);}
const cases={
271:f=>{f.p.publicResources.combo=4;go(f);assert.equal(martialCap(f.p),4);assert.equal(f.rc.martialBonusDamage,1);},
272:f=>{f.rc.finalNumber=2;go(f);assert.equal(f.p.publicResources.combo,2);assert.ok(Object.keys(f.s.guards).some(x=>x.startsWith('272:')));},
273:f=>{go(f);assert.equal(f.rc.martialBonusDamage,1);},
274:f=>{f.rc.valid=false;f.rc.invalidReason='MONSTER_RULE';go(f);assert.equal(f.s.pending.value,1);},
275:f=>{go(f);assert.equal(f.s.exaltation,1);assert.equal(f.rc.martialBonusDamage,1);},
276:f=>{f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f);assert.equal(f.p.publicResources.combo,1);},
277:f=>{go(f);assert.equal(f.rc.martialBonusDamage,2);},
278:f=>{f.s.exaltation=3;go(f);assert.equal(f.s.exaltation,4);assert.equal(f.rc.martialBonusDamage,4);},
279:f=>{f.s.maxStreak=2;go(f);assert.equal(f.rc.martialExtraDamage,3);},
280:f=>{f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f);assert.equal(f.p.publicResources.combo,2);},
281:f=>{go(f);assert.equal(f.rc.martialComboBonus,0);assert.equal(f.run.combat.martialEnemy.units.length,1);assert.equal(consume(f).bonus,1);},
282:f=>{f.p.augments.push('aug-281');go(f);assert.equal(consume(f).bonus,2);},
283:f=>{f.p.augments.push('aug-281');go(f);f.run.combat.turn++;f.rc.cardInstanceId='p0:base:5';f.rc.finalNumber=5;go(f);assert.equal(consume(f).defense,1);},
284:f=>{f.p.augments.push('aug-281');go(f);consume(f);assert.equal(f.s.pending.value,1);},
285:f=>{f.p.augments.push('aug-281');go(f);f.s.consumed=1;consume(f);assert.equal(f.run.combat.martialEnemy.units.length,1);},
286:f=>{f.p.augments.push('aug-281');go(f);assert.equal(f.run.combat.martialEnemy.units.length,2);},
287:f=>{f.run.combat.martialEnemy={enemyId:'dummy',units:[],sequence:0,firstThree:true};f.s.reservation={enemyId:'dummy',afterTurn:0};f.rc.valid=false;f.rc.invalidReason='COLLISION';prepareMartialCollision(f.run,[f.rc]);assert.equal(f.rc.valid,true);assert.equal(f.s.reservation,null);},
288:f=>{f.p.augments.push('aug-281','aug-286');go(f);f.run.combat.turn++;f.rc.finalNumber=5;f.rc.cardInstanceId='p0:base:5';go(f);assert.equal(f.run.combat.martialEnemy.vulnerabilityTurn,3);f.run.combat.turn++;assert.equal(consume(f).bonus,3);},
289:f=>{f.p.augments.push('aug-281');go(f);assert.equal(consume(f).extra,3);assert.equal(f.run.combat.martialEnemy.units.length,1);},
290:f=>{f.p.augments.push('aug-281');f.p.publicResources.combo=0;go(f);f.s.consumed=1;consume(f);assert.equal(f.p.publicResources.combo,2);assert.equal(f.s.nextPair,4);},
291:f=>{go(f,true);assert.equal(f.rc.finisherBonusDamage,4);assert.equal(f.p.publicResources.combo,0);assert.equal(f.rc.martialComboBonus??0,0);},
292:f=>{f.p.publicResources.combo=4;go(f);assert.equal(f.p.publicResources.combo,5);},
293:f=>{f.rc.finalNumber=1;go(f);assert.equal(f.p.publicResources.combo,1);},
294:f=>{f.p.augments.push('aug-291');f.s.heldTurns=2;go(f,true);assert.equal(f.rc.finisherBonusDamage,5);},
295:f=>{f.p.augments.push('aug-291');f.s.qi=2;go(f,true);assert.equal(f.rc.finisherBonusDamage,8);assert.equal(f.s.qi,0);},
296:f=>{f.p.augments.push('aug-291');go(f,true);assert.equal(martialPacket(f.run,f.p,f.rc,2).penetration,1);},
297:f=>{f.p.augments.push('aug-291');go(f,true);afterMartialDamage(f.run,f.p,f.rc);assert.equal(f.p.publicResources.combo,1);},
298:f=>{f.p.augments.push('aug-291','aug-295','aug-292');f.p.publicResources.combo=5;f.s.qi=3;go(f,true);assert.equal(f.rc.finisherBonusDamage,21);assert.equal(f.rc.martialExtraDamage,5);},
299:f=>{f.p.publicResources.combo=3;f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f);assert.equal(f.p.publicResources.combo,3);},
300:f=>{f.p.augments.push('aug-291');f.p.publicResources.combo=3;go(f,true);afterMartialDamage(f.run,f.p,f.rc);assert.equal(f.p.publicResources.combo,2);}
};
for(const [id,check] of Object.entries(cases)){
 test('aug-'+id+' actual positive runtime',()=>check(fixture([Number(id)])));
 test('aug-'+id+' negative room gate is mutation-free',()=>{
 const f=fixture([Number(id)]);f.run.phase='EVENT';const before=structuredClone(f.run);go(f,true);prepareMartialCollision(f.run,[f.rc]);martialPacket(f.run,f.p,f.rc,2);afterMartialDamage(f.run,f.p,f.rc);assert.deepEqual(f.run,before);
 });
}
test('Martial thirty candidates and twelve stage slots are reachable',()=>{
 const ids=Array.from({length:30},(_,i)=>'aug-'+(271+i));assert.equal(ids.filter(id=>AUGMENT_BY_ID[id]?.executable).length,30);
 const builds=[...new Set(ids.map(id=>AUGMENT_BY_ID[id].build))];assert.equal(builds.length,3);
 for(const build of builds){assert.deepEqual([1,2,3,4].map(t=>ids.filter(id=>AUGMENT_BY_ID[id].build===build&&AUGMENT_BY_ID[id].tier===t).length),[1,3,3,3]);for(let t=1;t<=4;t++)assert.ok(augmentCandidates('martial_artist',t,build).length);}
});
for(const start of [271,281,291])test('full build '+start+' resolve/reconnect/retry',()=>{
 const f=fixture(Array.from({length:10},(_,i)=>start+i));go(f,start===291);const authoritative=structuredClone(f.run),resolved=structuredClone(f.rc);go(f,start===291);assert.deepEqual(f.run,authoritative);assert.deepEqual(f.rc,resolved);
 const clone=structuredClone(f.run);assert.deepEqual(martialState(clone,clone.players[0]),f.s);
});
test('base first attack, FINAL comparison, invalid carry, cycle carry, score isolation',()=>{
 const f=fixture();delete f.p.publicResources.lastSubmittedNumber;f.p.publicResources.combo=0;go(f);assert.equal(f.p.publicResources.combo,0);
 f.run.combat.turn++;f.rc.cardInstanceId='p0:base:5';f.rc.finalNumber=5;go(f);assert.equal(f.p.publicResources.combo,1);
 f.run.combat.turn++;f.rc.cardInstanceId='p0:base:2';f.rc.valid=false;f.rc.invalidReason='MONSTER_RULE';go(f);assert.equal(f.p.publicResources.combo,1);
 f.run.combat.turn++;f.rc.cardInstanceId='p0:base:3';f.rc.invalidReason='COLLISION';const gold=f.p.runGold,exp=f.p.growthExp,score=Number(f.p.score)||0;go(f);assert.equal(f.p.publicResources.combo,0);assert.equal(f.p.score,score-1);assert.equal(f.p.runGold,gold);assert.equal(f.p.growthExp,exp);
});
test('287 consumes reservation on noncollision attempt without protecting next attack',()=>{
 const f=fixture([287]);f.s.reservation={enemyId:'dummy',afterTurn:0};prepareMartialCollision(f.run,[f.rc]);assert.equal(f.s.reservationClaimed,true);
 f.run.combat.turn++;f.rc.valid=false;f.rc.invalidReason='COLLISION';prepareMartialCollision(f.run,[f.rc]);assert.equal(f.rc.valid,false);
});
test('Shatter ignores own supplier, caps three, packet retry does not consume twice',()=>{
 const f=fixture([281,286]);go(f);const before=f.run.combat.martialEnemy.units.length;martialPacket(f.run,f.p,f.rc,2);assert.equal(f.run.combat.martialEnemy.units.length,before);
 const a=consume(f),snapshot=structuredClone(f.run);assert.deepEqual(consume(f),a);assert.deepEqual(f.run,snapshot);
});
test('299 preservation wins over 293 and collision still loses score',()=>{
 const f=fixture([293,299]);f.p.publicResources.combo=3;f.rc.finalNumber=1;go(f);assert.equal(f.p.publicResources.combo,3);
});
test('Martial guards and reservations never appear in projection',()=>{
 const f=fixture([287]);f.s.reservation={enemyId:'dummy',afterTurn:0};f.s.guards.secret=true;
 const view=projectRun(f.run,'p1');assert.equal(view.augmentFramework,undefined);assert.equal(view.combat.martialEnemy,undefined);
});
test('Combat cleanup clears temporary state while leaving other classes intact',()=>{
 const f=fixture([295]);f.p.publicResources.qi=2;cleanupMartial(f.run,f.p);assert.equal(f.run.augmentFramework.cardState['p0:martial'],undefined);assert.equal(f.p.publicResources.qi,undefined);
});
test('Real combat pipeline applies Martial FINAL gain and primary packet damage',()=>{
 const f=fixture([273]);f.run.combat.phase='SELECTION_OPEN';f.p.publicResources.lastSubmittedNumber=2;
 for(let i=0;i<4;i++){const p=f.run.players[i],number=[4,1,2,3][i],card=p.cardPool.find(c=>c.baseNumber===number);submitCard(f.run,p.playerId,card.id);}
 const result=resolveBasicTurn(f.run),rc=result.cards.find(c=>c.playerId==='p0'),packet=result.damagePackets.find(p=>p.sourcePlayerId==='p0');
 assert.equal(rc.comboAfter,3);assert.ok(packet.amount>=8);
});

const negatives={
271:f=>{f.p.publicResources.combo=3;go(f);assert.equal(f.rc.martialBonusDamage,0);},
272:f=>{f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f);assert.equal(f.p.publicResources.combo,0);},
273:f=>{f.p.publicResources.combo=0;go(f);assert.equal(f.rc.martialBonusDamage,0);},
274:f=>{f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f);assert.equal(f.s.pending,null);},
275:f=>{f.s.exaltation=2;f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f);assert.equal(f.s.exaltation,0);assert.equal(f.rc.martialBonusDamage,0);},
276:f=>{f.p.publicResources.combo=1;f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f);assert.equal(f.p.publicResources.combo,0);},
277:f=>{f.p.publicResources.lastSubmittedNumber=3;go(f);assert.equal(f.rc.martialBonusDamage,0);},
278:f=>{f.p.publicResources.combo=0;go(f);assert.equal(f.s.exaltation,0);},
279:f=>{f.s.maxStreak=1;go(f);assert.equal(f.rc.martialExtraDamage,0);},
280:f=>{f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f);f.p.publicResources.combo=0;cleanupMartial(f.run,f.p);assert.equal(f.p.publicResources.combo,0);},
281:f=>{go(f);const before=f.run.combat.martialEnemy.units.length;assert.equal(martialPacket(f.run,f.p,f.rc,2).bonus,0);assert.equal(f.run.combat.martialEnemy.units.length,before);},
282:f=>{f.p.augments.push('aug-281');go(f);assert.equal(martialPacket(f.run,f.p,f.rc,2).bonus,0);},
283:f=>{f.p.augments.push('aug-281');go(f);assert.equal(consume(f).defense,2);},
284:f=>{f.p.augments.push('aug-281');go(f);martialPacket(f.run,f.p,f.rc,2);assert.equal(f.s.pending,null);},
285:f=>{f.p.augments.push('aug-281');go(f);consume(f);assert.equal(f.run.combat.martialEnemy.units.length,0);},
286:f=>{f.p.augments.push('aug-281');f.p.publicResources.combo=0;go(f);assert.equal(f.run.combat.martialEnemy.units.length,1);},
287:f=>{f.s.reservation={enemyId:'dummy',afterTurn:0};const ally={playerId:'p1',valid:false,invalidReason:'COLLISION'};prepareMartialCollision(f.run,[ally]);assert.equal(ally.valid,false);},
288:f=>{f.run.combat.martialEnemy={enemyId:'dummy',units:[],sequence:0,firstThree:true,vulnerabilityTurn:2};assert.equal(consume(f).bonus,0);},
289:f=>{f.p.augments.push('aug-281');f.p.publicResources.combo=0;go(f);assert.equal(consume(f).extra,0);assert.equal(f.run.combat.martialEnemy.units.length,0);},
290:f=>{f.p.augments.push('aug-281');go(f);const before=f.p.publicResources.combo;consume(f);assert.equal(f.p.publicResources.combo,before);},
291:f=>{f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f,true);assert.equal(f.p.publicResources.combo,2);assert.equal(f.rc.finisherBonusDamage,0);assert.equal(f.run.combat.privateByPlayer.p0.finisherUsedCycle,1);},
292:f=>{const clone=structuredClone(f.run);martialState(clone,clone.players[0]);assert.equal(clone.players[0].publicResources.combo,2);},
293:f=>{go(f);assert.equal(f.p.publicResources.combo,3);},
294:f=>{f.p.augments.push('aug-291');f.s.heldTurns=1;go(f,true);assert.equal(f.rc.finisherBonusDamage,4);},
295:f=>{f.p.augments.push('aug-291');f.s.qi=2;f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f,true);assert.equal(f.s.qi,2);},
296:f=>{go(f);assert.equal(martialPacket(f.run,f.p,f.rc,3).penetration,0);},
297:f=>{go(f);afterMartialDamage(f.run,f.p,f.rc);assert.equal(f.p.publicResources.combo,3);},
298:f=>{f.p.augments.push('aug-291','aug-295');f.p.publicResources.combo=4;f.s.qi=3;go(f,true);assert.equal(f.rc.martialExtraDamage,0);},
299:f=>{f.p.publicResources.combo=3;f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f);f.run.combat.turn++;f.rc.cardInstanceId='p0:base:3';go(f);assert.equal(f.p.publicResources.combo,0);},
300:f=>{f.p.augments.push('aug-291');f.rc.valid=false;f.rc.invalidReason='COLLISION';go(f,true);afterMartialDamage(f.run,f.p,f.rc);assert.equal(f.p.publicResources.combo,2);}
};
for(const [id,check] of Object.entries(negatives))test('aug-'+id+' DESIGN-D condition negative',()=>check(fixture([Number(id)])));
for(const character of ['imp','warrior','mage','vampire','gunner','prophet'])test('Martial cross-class '+character+' actual pipeline and reconnect',()=>{
 const f=fixture([273]);const other=newPlayerRunState({id:'p1',user_id:'u1',character_id:character,member_type:'human',seat_index:1});f.run.players[1]=other;
 f.run.combat=newCombatState(f.run.players,999,'NORMAL_COMBAT');f.run.combat.id='mixed-'+character;beginTurn(f.run);
 for(let i=0;i<4;i++){
 const p=f.run.players[i],number=[4,character==='warrior'?5:1,2,3][i],card=p.cardPool.find(c=>c.baseNumber===number);
 if(character==='mage'&&i===1)p.publicResources.mana=2;
 if(character==='vampire'&&i===1)p.publicResources.thrallPlayerId='p2';
 submitCard(f.run,p.playerId,card.id,i===1&&['mage','vampire','gunner'].includes(character));
 }
 f.run.combat.monster.intent={type:'CHARGE',payload:{}};
 const clone=structuredClone(f.run),a=resolveBasicTurn(f.run),b=resolveBasicTurn(clone);assert.deepEqual(a,b);
 assert.deepEqual(a.phaseTrace.slice(1,5),['PRE_COLLISION_SELF_MODIFY','PRE_COLLISION_SWAP','PRE_COLLISION_STEAL','FINAL_NUMBER_REVEAL']);
 for(const rc of a.cards){assert.equal(rc.finalNumber,rc.numberHistory.finalNumber);if(rc.playerId==='p0')assert.equal(rc.comboAfter,f.run.players[0].publicResources.combo);}
});

for(const start of [271,281,291])test('Martial actual full build thirty-turn lifecycle '+start,()=>{
 const f=fixture(Array.from({length:10},(_,i)=>start+i));for(const p of f.run.players){p.hp=1000;p.maxHp=1000;}
 beginTurn(f.run);
 for(let t=0;t<30;t++){
  const used=new Set();
  for(const p of f.run.players){
   const priv=f.run.combat.privateByPlayer[p.playerId],id=priv.remainingCardIds.find(id=>!used.has(p.cardPool.find(c=>c.id===id).baseNumber))||priv.remainingCardIds[0];used.add(p.cardPool.find(c=>c.id===id).baseNumber);
   const use=p.playerId==='p0'&&start===291&&(p.publicResources.combo||0)>0&&priv.finisherUsedCycle!==priv.cycleIndex;
   submitCard(f.run,p.playerId,id,use);
  }
  f.run.combat.monster.intent={type:'CHARGE',payload:{}};
  const clone=structuredClone(f.run);assert.deepEqual(resolveBasicTurn(f.run),resolveBasicTurn(clone));
  const s=martialState(f.run,f.p);assert.ok(Object.keys(s.guards).length<=60);assert.ok(Object.keys(s.results).length<=1);assert.ok(f.run.combat.martialEnemy.units.length<=3);
 }
 assert.ok(f.run.combat.privateByPlayer.p0.cycleIndex>=6);
});
for(let buildIndex=0;buildIndex<3;buildIndex++)test('Martial actual EXP stage1 through4 '+buildIndex,()=>{
 const p=newPlayerRunState({id:'p0',character_id:'martial_artist',seat_index:0,member_type:'human'});
 const run={id:'martial-growth',seed:'martial-growth',rngCounter:0,version:0,phase:'ROOM_RESULT',floor:1,players:[p]};
 let build=null;
 for(let stage=1;stage<=4;stage++){
  p.growthExp=AUGMENT_THRESHOLDS[stage-1]-1;assert.equal(beginAugmentChoices(run),false);
  p.growthExp++;assert.equal(beginAugmentChoices(run),true);const offers=run.augmentChoice.offersByPlayer.p0;assert.equal(offers.length,3);
  chooseAugment(run,'p0',offers[stage===1?buildIndex:0]);build||=p.augmentBuild;assert.equal(p.augmentBuild,build);
 }
 assert.deepEqual(p.persistentCharacterState.augmentTiers,[1,2,3,4]);assert.equal(p.augments.length,4);
});
for(let n=271;n<=300;n++)test('Martial actual offer/acquisition/retry aug-'+n,()=>{
 const id='aug-'+n,def=AUGMENT_BY_ID[id],p=newPlayerRunState({id:'p0',character_id:'martial_artist',seat_index:0,member_type:'human'});
 if(def.tier>1){p.augments=[augmentCandidates('martial_artist',1).find(c=>c.build===def.build).id];p.augmentBuild=def.build;p.persistentCharacterState.augmentTiers=Array.from({length:def.tier-1},(_,i)=>i+1);}
 p.growthExp=AUGMENT_THRESHOLDS[def.tier-1];const run={id:'acquire-'+id,seed:id,rngCounter:0,version:0,phase:'ROOM_RESULT',floor:1,players:[p]};
 assert.equal(beginAugmentChoices(run),true);assert.ok(run.augmentChoice.offersByPlayer.p0.includes(id));chooseAugment(run,'p0',id);const after=structuredClone(run);assert.throws(()=>chooseAugment(run,'p0',id));assert.deepEqual(run,after);
});
for(const room of ['EVENT','REWARD_ROOM','SHOP','REST'])test('Martial thirty cards isolate room '+room,()=>{
 const f=fixture(Array.from({length:30},(_,i)=>271+i));f.run.phase=room;const before=structuredClone(f.run);go(f,true);prepareMartialCollision(f.run,[f.rc]);martialPacket(f.run,f.p,f.rc,2);afterMartialDamage(f.run,f.p,f.rc);assert.deepEqual(f.run,before);
});
test('Martial telemetry is once per effect root and private guards stay hidden',()=>{
 const f=fixture([273]);go(f);const count=f.run._telemetryPending.filter(x=>x.logType==='EFFECT'&&x.payload.effect_id==='aug-273').length;assert.equal(count,1);go(f);assert.equal(f.run._telemetryPending.filter(x=>x.logType==='EFFECT'&&x.payload.effect_id==='aug-273').length,1);
 const view=projectRun(f.run,'p1');assert.equal(view._telemetryPending,undefined);
});
