import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {vampireState,assignVampireMarks,performVampireSwap,protectVampireCollision,resolveVampireValidity,vampirePostDamage,vampirePreDown,bloodCap,cleanupVampire} from '../supabase/functions/game-api/pve/vampire-runtime.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {beginAugmentChoices,chooseAugment,AUGMENT_THRESHOLDS} from '../supabase/functions/game-api/pve/augments.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
function fixture(ids=[]){
 const players=['vampire','adventurer','adventurer','adventurer'].map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
 const run={id:'vampire-005d',seed:'vampire',rngCounter:0,version:1,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
 run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});run.combat.id='vampire-combat';run.combat.turn=1;
 const p=players[0];p.augments=ids.map(n=>'aug-'+n);
 const cards=players.map((q,i)=>({playerId:q.playerId,cardInstanceId:q.cardPool[0].id,baseNumber:i+1,workingNumber:i+1,finalNumber:i+1,valid:true,numberHistory:{}}));
 const s=vampireState(run,p);s.bound='p1';return {run,p,s,cards,rc:cards[0],other:cards[1]};
}
const valid=f=>resolveVampireValidity(f.run,f.cards);
const post=(f,amount=5)=>vampirePostDamage(f.run,f.cards,[{sourcePlayerId:'p0',amount},{sourcePlayerId:'p1',amount:5}],[],999);
const command=f=>{f.rc.bloodCommandUsed=true;f.rc.bloodCommandTargetId='p1';f.rc.dominanceBefore=2;f.rc.receivedWorkingNumber=4;f.rc.ownerPreSwapWorkingNumber=1;f.rc.targetPreSwapDuplicateCount=2;};
const pair=f=>{f.p.augments.push('aug-311');f.s.pact=2;};
const transfuse=f=>{f.p.augments.push('aug-321');f.p.publicResources.blood=4;f.other.finalNumber=2;f.run.players[1].hp=1;vampirePreDown(f.run,f.cards);};
const cases={
301:f=>{command(f);valid(f);assert.equal(f.rc.vampireBonus,2);assert.equal(f.p.publicResources.dominance,1);},
302:f=>{assignVampireMarks(f.run,f.cards,new Map([[1,[f.rc,f.other]]]));const before=structuredClone(f.s.mark);assignVampireMarks(f.run,f.cards,new Map([[1,[f.rc,f.other]]]));assert.deepEqual(f.s.mark,before);},
303:f=>{command(f);valid(f);assert.ok(f.s.reserve);},
304:f=>{command(f);valid(f);assert.equal(f.rc.vampireBonus,1);},
305:f=>{command(f);valid(f);assert.equal(f.s.commandPower,1);assert.equal(f.rc.vampireBonus,1);},
306:f=>{command(f);valid(f);assert.equal(f.rc.vampireBonus,2);},
307:f=>{command(f);f.rc.valid=false;f.rc.invalidReason='COLLISION';protectVampireCollision(f.run,f.cards);assert.equal(f.rc.valid,true);},
308:f=>{f.p.publicResources.thrallPlayerId='p1';performVampireSwap(f.run,f.p,f.rc,f.other,f.cards);assert.equal(f.p.publicResources.dominance,1);assert.ok(f.s.dominanceCharge);},
309:f=>{command(f);f.s.commandSuccesses=1;valid(f);assert.equal(f.rc.vampireBonus,4);},
310:f=>{command(f);f.s.jointCommands=1;valid(f);assert.equal(f.rc.vampireBonus,3);assert.equal(f.other.vampireBonus,3);},
311:f=>{f.s.pact=1;valid(f);assert.equal(f.s.pact,2);assert.equal(f.other.vampireBonus,1);},
312:f=>{pair(f);f.s.pact=0;valid(f);assert.equal(f.s.pact,2);},
313:f=>{pair(f);f.other.finalNumber=4;valid(f);assert.equal(f.other.vampireBonus,2);},
314:f=>{pair(f);valid(f);assert.equal(f.p.publicResources.vampireProtection,1);},
315:f=>{post(f);assert.equal(f.s.pending.pair.value,2);},
316:f=>{vampirePreDown(f.run,f.cards,[{type:'PLAYER_DAMAGED',playerId:'p0',actualDamage:1,damageType:'DIRECT'}]);assert.equal(f.run.players[1].publicResources.vampireProtection,1);},
317:f=>{pair(f);f.s.jointStreak=1;valid(f);assert.equal(f.other.vampireBonus,3);},
318:f=>{pair(f);f.s.pact=3;f.other.valid=false;valid(f);assert.equal(f.s.pact,3);},
319:f=>{pair(f);f.rc.finalNumber=4;f.other.finalNumber=5;valid(f);assert.equal(f.other.vampireBonus,4);},
320:f=>{pair(f);f.s.pact=3;post(f);assert.equal(f.s.pending.pact.value,1);},
321:f=>{post(f);assert.equal(f.p.publicResources.blood,1);},
322:f=>{post(f);assert.equal(f.p.publicResources.blood,1);},
323:f=>{transfuse(f);assert.equal(f.run.players[1].publicResources.vampireProtection,1);},
324:f=>{assert.equal(bloodCap(f.p),8);},
325:f=>{transfuse(f);assert.equal(vampireState(f.run,f.run.players[1]).pending.transfusion.value,2);},
326:f=>{post(f);assert.equal(f.p.publicResources.blood,2);},
327:f=>{f.p.publicResources.blood=4;f.run.players[1].hp=1;vampirePreDown(f.run,f.cards,[{type:'PLAYER_DAMAGED',playerId:'p1',actualDamage:1,damageType:'AOE'}]);assert.equal(f.run.players[1].hp,2);assert.equal(f.p.publicResources.blood,0);},
328:f=>{f.p.augments.push('aug-321');f.p.publicResources.blood=3;f.run.players[1].hp=1;vampirePreDown(f.run,f.cards);assert.equal(f.run.players[1].hp,2);assert.equal(f.p.publicResources.blood,0);assert.equal(bloodCap(f.p),8);},
329:f=>{transfuse(f);assert.equal(f.run.players[1].hp,2);assert.equal(f.run.players[1].publicResources.vampireProtection,1);assert.equal(vampireState(f.run,f.run.players[1]).pending.transfusion.value,2);},
330:f=>{transfuse(f);f.run.combat.turn++;post(f);assert.equal(f.p.publicResources.blood,2);assert.equal(f.s.receipts.length,0);}
};
for(let n=301;n<=330;n++)test('Vampire '+n+' actual contract positive',()=>cases[n](fixture([n])));
for(let n=301;n<=330;n++)test('Vampire '+n+' actual wrong room negative',()=>{
 const f=fixture([n]);f.run.phase='SHOP';command(f);const before=JSON.stringify({public:f.p.publicResources,hp:f.run.players.map(p=>p.hp)});
 valid(f);post(f);vampirePreDown(f.run,f.cards,[{type:'PLAYER_DAMAGED',playerId:'p1',actualDamage:1,damageType:'DIRECT'}]);
 assert.equal(JSON.stringify({public:f.p.publicResources,hp:f.run.players.map(p=>p.hp)}),before);assert.equal(f.rc.vampireBonus,undefined);
});
for(let n=301;n<=330;n++)test('Vampire '+n+' runtime contract registry, option and executable candidate',()=>{
 const id='aug-'+n,d=AUGMENT_BY_ID[id],offset=(n-301)%10;
 assert.equal(d.executable,true);assert.equal(d.characterId,'vampire');assert.equal(d.option,offset===0?1:(offset-1)%3+1);
 assert.ok(augmentCandidates('vampire',d.tier,d.build).some(x=>x.id===id));
});
test('Vampire mark target uses score not EXP; self excluded and seat ties stable',()=>{
 const f=fixture();f.p.score=999;f.run.players[1].score=5;f.run.players[1].growthExp=0;f.run.players[2].score=4;f.run.players[2].growthExp=900;
 assignVampireMarks(f.run,f.cards,new Map([[1,[f.rc,f.other]]]));assert.equal(f.s.mark.thrallPlayerId,'p1');assert.equal(f.s.mark.ownerVampireId,'p0');
});
test('Vampire reserve keeps one fresh mark once and cannot preserve same mark again',()=>{
 const f=fixture([303]);f.s.reserve={source:'aug-303',earnedSequence:0};f.p.publicResources.thrallPlayerId='p1';
 performVampireSwap(f.run,f.p,f.rc,f.other,f.cards);assert.ok(f.s.mark);assert.equal(f.s.mark.retentionUsed,true);assert.equal(f.s.reserve,null);
 f.run.combat.turn++;f.rc.cardInstanceId=f.p.cardPool[1].id;f.s.reserve={source:'aug-303',earnedSequence:0};
 performVampireSwap(f.run,f.p,f.rc,f.other,f.cards);assert.equal(f.s.mark,null);assert.equal(f.p.publicResources.thrallPlayerId,undefined);
});
test('Vampire collision owner protection keeps others invalid and spends once',()=>{
 const f=fixture([307]);command(f);f.rc.valid=false;f.rc.invalidReason='COLLISION';f.other.valid=false;f.other.invalidReason='COLLISION';protectVampireCollision(f.run,f.cards);assert.equal(f.rc.valid,true);assert.equal(f.other.valid,false);
 f.run.combat.turn++;f.rc.valid=false;f.rc.invalidReason='COLLISION';protectVampireCollision(f.run,f.cards);assert.equal(f.rc.valid,false);
});
test('Vampire Dominance charge applies only next distinct non-command valid primary and never consumes stacks',()=>{
 const f=fixture([308]);f.p.publicResources.thrallPlayerId='p1';performVampireSwap(f.run,f.p,f.rc,f.other,f.cards);valid(f);assert.equal(f.rc.vampireBonus,undefined);
 f.run.combat.turn++;f.rc.cardInstanceId=f.p.cardPool[1].id;delete f.rc.bloodCommandUsed;valid(f);assert.equal(f.rc.vampireBonus,1);assert.equal(f.p.publicResources.dominance,1);
 f.run.combat.turn++;f.rc.cardInstanceId=f.p.cardPool[2].id;delete f.rc.vampireBonus;valid(f);assert.equal(f.rc.vampireBonus,undefined);
});
test('Vampire all-full auto transfusion keeps Blood and emergency excludes lethal or DOWNED',()=>{
 const f=fixture([321,327]);f.p.publicResources.blood=6;vampirePreDown(f.run,f.cards);assert.equal(f.p.publicResources.blood,6);
 f.run.players[1].hp=0;vampirePreDown(f.run,f.cards,[{type:'PLAYER_DAMAGED',playerId:'p1',actualDamage:2,damageType:'DIRECT'}]);assert.equal(f.run.players[1].hp,0);
 f.run.players[1].hp=1;f.run.players[1].status='DOWNED';vampirePreDown(f.run,f.cards,[{type:'PLAYER_DAMAGED',playerId:'p1',actualDamage:2,damageType:'DIRECT'}]);assert.equal(f.run.players[1].hp,1);
});
test('Vampire framework survives reconnect and retries without duplicate resources',()=>{
 const f=fixture([301,303,305,311,321,322]);command(f);valid(f);post(f);const snapshot=structuredClone(f.run),before=JSON.stringify(f.p.publicResources);valid(f);post(f);assert.equal(JSON.stringify(f.p.publicResources),before);
 assert.deepEqual(snapshot.augmentFramework,f.run.augmentFramework);
 const own=projectRun(f.run,'p0'),other=projectRun(f.run,'p1');assert.equal(own.privateVampireState.commandReserve,true);assert.equal(other.privateVampireState?.commandReserve,undefined);assert.equal(other.augmentFramework,undefined);
});
for(let owners=2;owners<=3;owners++)test('Vampire '+owners+' independent marks same target, sorted swaps and cleanup',()=>{
 const f=fixture([303]);for(let i=1;i<owners;i++)f.run.players[i].characterId='vampire';f.run.players[3].score=10;
 assignVampireMarks(f.run,f.cards,new Map([[1,[f.rc,f.other]]]));
 for(let i=0;i<owners;i++){const p=f.run.players[i],s=vampireState(f.run,p);assert.equal(s.mark.ownerVampireId,p.playerId);assert.equal(s.mark.thrallPlayerId,'p3');}
 performVampireSwap(f.run,f.p,f.rc,f.cards[3],f.cards);assert.equal(vampireState(f.run,f.run.players[1]).mark.active,true);
 cleanupVampire(f.run,f.p);assert.ok(vampireState(f.run,f.run.players[1]).mark);
});
for(let b=0;b<3;b++)test('Vampire actual EXP build '+b+' stages 1 through 4',()=>{
 const f=fixture(),p=f.p;f.run.phase='ROOM_RESULT';delete f.run.combat;let build;
 for(let stage=1;stage<=4;stage++){p.growthExp=AUGMENT_THRESHOLDS[stage-1]-1;assert.equal(beginAugmentChoices(f.run),false);p.growthExp++;assert.equal(beginAugmentChoices(f.run),true);const offers=f.run.augmentChoice.offersByPlayer.p0;chooseAugment(f.run,'p0',offers[stage===1?b:0]);build||=p.augmentBuild;assert.equal(p.augmentBuild,build);}
 assert.equal(p.augments.length,4);
});
for(let b=0;b<3;b++)test('Vampire complete build '+b+' actual combat and reconnect 30 turns',()=>{
 const ids=Array.from({length:10},(_,i)=>301+b*10+i),f=fixture(ids);for(const p of f.run.players){p.hp=1000;p.maxHp=1000;}
 for(let turn=0;turn<30;turn++){
 beginTurn(f.run);f.run.combat.monster.intent={type:'CHARGE',payload:{}};for(const [i,p]of f.run.players.entries()){const priv=f.run.combat.privateByPlayer[p.playerId],id=priv.remainingCardIds.find(id=>p.cardPool.find(c=>c.id===id).baseNumber===i+1)||priv.remainingCardIds[0];submitCard(f.run,p.playerId,id,false);}
 const replay=structuredClone(f.run),a=resolveBasicTurn(f.run),bb=resolveBasicTurn(replay);assert.deepEqual(a,bb);assert.ok(f.run.combat.monster.hp>=0);assert.ok((f.p.publicResources.blood||0)<=bloodCap(f.p));
 }
});

const negative={
301:f=>{command(f);f.rc.valid=false;valid(f);assert.equal(f.p.publicResources.dominance,0);},
302:f=>{assignVampireMarks(f.run,f.cards,new Map());assert.equal(f.s.mark,null);},
303:f=>{command(f);f.other.valid=false;valid(f);assert.equal(f.s.reserve,null);},
304:f=>{command(f);f.rc.receivedWorkingNumber=1;valid(f);assert.equal(f.rc.vampireBonus,undefined);},
305:f=>{command(f);f.rc.valid=false;valid(f);assert.equal(f.s.commandPower,0);},
306:f=>{command(f);f.rc.targetPreSwapDuplicateCount=1;valid(f);assert.equal(f.rc.vampireBonus,undefined);},
307:f=>{command(f);f.rc.valid=false;f.rc.invalidReason='MONSTER_RULE';protectVampireCollision(f.run,f.cards);assert.equal(f.rc.valid,false);},
308:f=>{valid(f);assert.equal(f.s.dominanceCharge,null);},
309:f=>{command(f);valid(f);assert.equal(f.rc.vampireBonus,undefined);},
310:f=>{command(f);valid(f);assert.equal(f.other.vampireBonus,undefined);},
311:f=>{f.rc.valid=false;f.other.valid=false;valid(f);assert.equal(f.s.pact,0);},
312:f=>{pair(f);f.other.valid=false;valid(f);assert.equal(f.s.pact,1);},
313:f=>{pair(f);valid(f);assert.equal(f.other.vampireBonus,1);},
314:f=>{pair(f);f.other.finalNumber=4;valid(f);assert.equal(f.p.publicResources.vampireProtection,undefined);},
315:f=>{vampirePostDamage(f.run,f.cards,[{sourcePlayerId:'p1',amount:3}],[],999);assert.equal(f.s.pending.pair,undefined);},
316:f=>{vampirePreDown(f.run,f.cards,[{type:'PLAYER_DAMAGED',playerId:'p0',actualDamage:0,damageType:'DIRECT'}]);assert.equal(f.run.players[1].publicResources.vampireProtection,undefined);},
317:f=>{pair(f);valid(f);assert.equal(f.other.vampireBonus,1);},
318:f=>{pair(f);f.s.pact=3;f.rc.valid=false;f.other.valid=false;valid(f);assert.equal(f.s.pact,2);},
319:f=>{pair(f);valid(f);assert.equal(f.other.vampireBonus,1);},
320:f=>{pair(f);f.s.pact=2;post(f);assert.equal(f.s.pending.pact,undefined);},
321:f=>{f.rc.valid=false;post(f);assert.equal(f.p.publicResources.blood,0);},
322:f=>{post(f,3);assert.equal(f.p.publicResources.blood,0);},
323:f=>{vampirePreDown(f.run,f.cards);assert.equal(f.p.publicResources.vampireProtection,undefined);},
324:f=>{f.p.augments=[];assert.equal(bloodCap(f.p),6);},
325:f=>{vampirePreDown(f.run,f.cards);assert.equal(vampireState(f.run,f.run.players[1]).pending.transfusion,undefined);},
326:f=>{vampirePostDamage(f.run,f.cards,[],[],1);assert.equal(f.p.publicResources.blood,0);},
327:f=>{f.p.publicResources.blood=4;f.run.players[1].hp=0;vampirePreDown(f.run,f.cards,[{type:'PLAYER_DAMAGED',playerId:'p1',actualDamage:3,damageType:'DIRECT'}]);assert.equal(f.p.publicResources.blood,4);assert.equal(f.run.players[1].hp,0);},
328:f=>{f.p.augments.push('aug-321');f.p.publicResources.blood=2;f.run.players[1].hp=1;vampirePreDown(f.run,f.cards);assert.equal(f.run.players[1].hp,1);assert.equal(f.p.publicResources.blood,2);},
329:f=>{vampirePreDown(f.run,f.cards);assert.equal(vampireState(f.run,f.run.players[1]).pending.transfusion,undefined);},
330:f=>{transfuse(f);f.run.combat.turn++;f.other.valid=false;post(f);assert.equal(f.p.publicResources.blood,1);assert.equal(f.s.receipts.length,1);}
};
for(let n=301;n<=330;n++)test('Vampire '+n+' actual contract negative predicate',()=>negative[n](fixture([n])));
for(let n=301;n<=330;n++)test('Vampire '+n+' actual acquisition through offered stage',()=>{
 const f=fixture(),p=f.p,d=AUGMENT_BY_ID['aug-'+n];f.run.phase='ROOM_RESULT';delete f.run.combat;
 p.augmentBuild=d.tier===1?null:d.build;p.persistentCharacterState.augmentTiers=Array.from({length:d.tier-1},(_,i)=>i+1);p.growthExp=AUGMENT_THRESHOLDS[d.tier-1];
 assert.equal(beginAugmentChoices(f.run),true);assert.ok(f.run.augmentChoice.offersByPlayer.p0.includes(d.id));chooseAugment(f.run,'p0',d.id);assert.ok(p.augments.includes(d.id));assert.equal(p.augments.filter(x=>x===d.id).length,1);
});

for(const cls of ['imp','prophet','gambler','gunner','mage','warrior'])test('Vampire actual mixed pipeline '+cls+' reconnect preserves physical ownership',()=>{
 const f=fixture([301,303,307,308]),p=f.run.players[1];p.characterId=cls;
 if(cls==='gambler')p.augments=['aug-211'];
 f.run.combat=newCombatState(f.run.players,999,'NORMAL_COMBAT');f.run.combat.id='mixed-'+cls;
 beginTurn(f.run);f.run.combat.monster.intent={type:'CHARGE',payload:{}};
 f.p.publicResources.thrallPlayerId='p1';
 const before=f.run.players.map(p=>p.cardPool.map(c=>c.id));
 for(const [i,p]of f.run.players.entries()){const priv=f.run.combat.privateByPlayer[p.playerId],id=priv.remainingCardIds[Math.min(i,priv.remainingCardIds.length-1)];submitCard(f.run,p.playerId,id,i===0);}
 const replay=structuredClone(f.run),a=resolveBasicTurn(f.run),b=resolveBasicTurn(replay);assert.deepEqual(a,b);
 assert.deepEqual(f.run.players.map(p=>p.cardPool.map(c=>c.id)),before);
 const phases=a.phaseTrace;assert.ok(phases.indexOf('PRE_COLLISION_SWAP')<phases.indexOf('PRE_COLLISION_STEAL'));
});
test('Vampire command reserve cap one and Dominance four latch never duplicates',()=>{
 const f=fixture([308]),target=f.other;
 for(let turn=1;turn<=4;turn++){f.run.combat.turn=turn;f.rc.cardInstanceId=f.p.cardPool[(turn-1)%5].id;f.p.publicResources.thrallPlayerId='p1';performVampireSwap(f.run,f.p,f.rc,target,f.cards);}
 assert.equal(f.p.publicResources.dominance,4);assert.equal(f.s.dominanceFour,true);assert.ok(f.s.reserve);assert.equal(typeof f.s.reserve,'object');
});
test('Vampire target DOWNED clears mark and Pact binding after reconnect without reselecting',()=>{
 const f=fixture([302,311]);f.p.publicResources.thrallPlayerId='p1';f.s.pact=3;f.run.players[1].status='DOWNED';
 valid(f);assert.equal(f.s.mark,null);assert.equal(f.s.bound,null);assert.equal(f.s.pact,0);assert.equal(f.p.publicResources.thrallPlayerId,undefined);
});
test('Vampire 325/329 damage receipts merge to two, heal remains one',()=>{
 const f=fixture([321,325,329]);f.p.publicResources.blood=4;f.run.players[1].hp=1;vampirePreDown(f.run,f.cards);assert.equal(f.run.players[1].hp,2);
 const target=vampireState(f.run,f.run.players[1]);assert.equal(target.pending.transfusion.value,2);
 f.run.combat.turn++;valid(f);assert.equal(f.other.vampireBonus,2);valid(f);assert.equal(f.other.vampireBonus,2);
});

test('Vampire emergency transfusion precedes auto transfusion and resolves owner seats once',()=>{
 const f=fixture([321,327]);f.p.publicResources.blood=4;f.p.hp=1;f.run.players[1].hp=1;
 vampirePreDown(f.run,f.cards,[{type:'PLAYER_DAMAGED',playerId:'p1',actualDamage:1,damageType:'DIRECT'}]);assert.equal(f.run.players[1].hp,2);assert.equal(f.p.hp,1);assert.equal(f.p.publicResources.blood,0);
});
test('Vampire pending protection reduces DIRECT only and clears at Combat end',()=>{
 const f=fixture([314,311]);valid(f);const before=projectRun(f.run,'p1');assert.equal(before.augmentFramework,undefined);
 cleanupVampire(f.run,f.p);assert.equal(f.p.publicResources.pact,undefined);assert.equal(f.p.publicResources.vampireProtection,undefined);assert.equal(f.run.augmentFramework.cardState['p0:vampire'],undefined);
});
