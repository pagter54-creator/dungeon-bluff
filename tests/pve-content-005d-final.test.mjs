import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {AUGMENT_DEFINITIONS,AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
import {augmentUi} from '../src/pve-ui-catalog.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {activateImmediateCharacterSkill,isCardSelectableForCharacter} from '../supabase/functions/game-api/pve/characters.js';
import {beginAugmentChoices,chooseAugment,AUGMENT_THRESHOLDS} from '../supabase/functions/game-api/pve/augments.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {ghostGain,ghostState} from '../supabase/functions/game-api/pve/ghost-runtime.js';
import {vampireState,assignVampireMarks,performVampireSwap,protectVampireCollision} from '../supabase/functions/game-api/pve/vampire-runtime.js';
import {martialState,prepareMartialCollision} from '../supabase/functions/game-api/pve/martial-runtime.js';
import {twinsState} from '../supabase/functions/game-api/pve/twins-runtime.js';
function fixture(classes=['martial_artist','vampire','demon_swordsman','twins'],equipped=[[],[],[],[]]){
 const players=classes.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
 for(let i=0;i<4;i++)players[i].augments=equipped[i];
 const run={id:'final-005d',seed:'final',rngCounter:0,version:1,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
 run.combat=newCombatState(players,999,'NORMAL_COMBAT');run.combat.id='final-combat';beginTurn(run);return run;
}
const ids=(start,count=10)=>Array.from({length:count},(_,i)=>'aug-'+(start+i));
function turn(run,{skill=false,collision=false}={}){
 run.combat.monster.intent={type:'CHARGE',payload:{}};
 for(const [i,p] of run.players.entries()){
 const z=run.combat.privateByPlayer[p.playerId],legal=z.remainingCardIds.filter(id=>isCardSelectableForCharacter(p,p.cardPool.find(c=>c.id===id)));
 const id=legal[Math.min(collision?0:i,legal.length-1)];submitCard(run,p.playerId,id,skill&&i===0);
 }
 const clone=structuredClone(run),a=resolveBasicTurn(run),b=resolveBasicTurn(clone);assert.deepEqual(a,b);
 return a;
}
test('005D FINAL global registry exactly390 unique executable handlers; new120 complete',()=>{
 assert.equal(AUGMENT_DEFINITIONS.length,390);assert.equal(Object.keys(EXECUTABLE_AUGMENT_RUNTIME).length,390);assert.equal(new Set(AUGMENT_DEFINITIONS.map(d=>d.id)).size,390);
 for(let n=1;n<=390;n++){const id='aug-'+String(n).padStart(3,'0'),d=AUGMENT_BY_ID[id];assert.equal(d.executable,true,id);assert.ok(d.effects.length||d.specialHandlers.length,id);assert.ok(augmentCandidates(d.characterId,d.tier,d.build).some(x=>x.id===id),'candidate '+id);}
});
for(let n=271;n<=390;n++)test('005D FINAL '+n+' source identity candidates scopes UI complete',()=>{
 const id='aug-'+n,d=AUGMENT_BY_ID[id];assert.equal(d.executable,true);assert.ok(augmentCandidates(d.characterId,d.tier,d.build).some(x=>x.id===id));assert.ok(d.roomApplicability.COMBAT);assert.ok(d.stateType);assert.ok(d.reconnectRule);assert.ok(d.idempotencyRule);
 const ui=augmentUi(id,d.tier);assert.equal(ui.name,d.name);assert.equal(ui.build,d.build);assert.ok(ui.description.length>10);assert.equal(ui.description.includes('"op"'),false);
});
for(const [cls,start] of [['martial_artist',271],['martial_artist',281],['martial_artist',291],['vampire',301],['vampire',311],['vampire',321],['demon_swordsman',331],['demon_swordsman',341],['demon_swordsman',351],['twins',361],['twins',371],['twins',381]])test('005D FINAL full ten-card build authoritative turns '+start,()=>{
 const run=fixture([cls,'adventurer','adventurer','adventurer'],[ids(start),[],[],[]]);
 for(let i=0;i<16;i++){
 const p=run.players[0];if(cls==='demon_swordsman'&&start===351&&p.publicResources.transformationPending&&!p.publicResources.transformationActive)activateImmediateCharacterSkill(run,p);
 if(cls==='twins'&&p.publicResources.acrobaticsReady&&i%5===0)activateImmediateCharacterSkill(run,p);
 const skill=cls==='demon_swordsman'&&start!==351&&p.publicResources.ghostSlashReady||cls==='martial_artist'&&start===291&&p.publicResources.combo>0&&run.combat.privateByPlayer.p0.finisherUsedCycle!==run.combat.privateByPlayer.p0.cycleIndex;
 turn(run,{skill});
 for(const q of run.players){const z=run.combat.privateByPlayer[q.playerId],all=[...z.remainingCardIds,...z.spentCardIds];assert.equal(new Set(all).size,all.length);assert.ok(all.every(id=>q.cardPool.some(c=>c.id===id)));assert.ok(q.hp>0);}
 }
});
for(const start of [271,281,291,301,311,321,331,341,351,361,371,381])test('005D FINAL real EXP four-stage acquisition '+start,()=>{
 const cls=AUGMENT_BY_ID['aug-'+start].characterId,run=fixture([cls,'adventurer','adventurer','adventurer']);delete run.combat;run.phase='ROOM_RESULT';const p=run.players[0];
 for(let stage=1;stage<=4;stage++){p.growthExp=AUGMENT_THRESHOLDS[stage-1];beginAugmentChoices(run);const id='aug-'+(start+(stage===1?0:1+(stage-2)*3));chooseAugment(run,'p0',id);assert.ok(p.augments.includes(id));assert.equal(run.phase,'ROOM_RESULT');}
 assert.equal(p.augments.length,4);
});
for(const [classes,builds] of [
 [['martial_artist','imp','warrior','gunner'],[281,181,31,241]],
 [['vampire','imp','prophet','gambler'],[301,181,161,211]],
 [['demon_swordsman','prophet','gunner','berserker'],[351,161,261,121]],
 [['twins','mage','imp','vampire'],[371,111,181,301]],
 [['twins','prophet','gambler','martial_artist'],[381,161,231,271]]
])test('005D FINAL mixed phase pipeline '+classes.join('/'),()=>{
 const run=fixture(classes,builds.map(n=>ids(n,4)));
 for(let i=0;i<15;i++){
 const p=run.players[0];if(p.characterId==='twins'&&p.publicResources.acrobaticsReady&&i%4===0)activateImmediateCharacterSkill(run,p);
 if(p.characterId==='demon_swordsman'&&p.publicResources.transformationPending&&!p.publicResources.transformationActive)activateImmediateCharacterSkill(run,p);
 const result=turn(run);const phases=result.phaseTrace;
 assert.ok(phases.indexOf('PRE_COLLISION_SELF_MODIFY')<phases.indexOf('PRE_COLLISION_SWAP'));assert.ok(phases.indexOf('PRE_COLLISION_SWAP')<phases.indexOf('PRE_COLLISION_STEAL'));assert.ok(phases.indexOf('FINAL_NUMBER_REVEAL')<phases.indexOf('COLLISION_RESOLVE'));assert.ok(phases.indexOf('VALIDITY_DERIVE')<phases.indexOf('DAMAGE_BUILD'));
 assert.equal(result.collisionResolutionPasses,1);assert.equal(result.postCollisionEffectPasses,1);
 }
});
for(const [cls,start] of [['martial_artist',271],['vampire',301],['demon_swordsman',351],['twins',381]])test('005D FINAL two '+cls+' owners keep resources counters and physical zones separate',()=>{
 const run=fixture([cls,cls,'adventurer','adventurer'],[ids(start),ids(start),[],[]]);
 for(let i=0;i<8;i++){turn(run);const a=projectRun(run,'p0'),b=projectRun(run,'p1');assert.ok(a.privateCombat.remainingCardIds.every(id=>id.startsWith('p0:')));assert.ok(b.privateCombat.remainingCardIds.every(id=>id.startsWith('p1:')));assert.equal(a.augmentFramework,undefined);assert.equal(b.augmentFramework,undefined);}
});
test('005D FINAL retry and reconnect never duplicate Devour transform pool Reserve or parity',()=>{
 const run=fixture(['demon_swordsman','vampire','twins','adventurer'],[ids(351),ids(301),ids(381),[]]),p=run.players[0];
 ghostGain(run,p,7,[],{rootActionId:'same',reason:'fixture'});ghostGain(run,p,7,[],{rootActionId:'same',reason:'fixture'});assert.equal(p.publicResources.devour,7);
 activateImmediateCharacterSkill(run,p);const pool=p.cardPool.map(c=>c.id),fuel=p.publicResources.devour;assert.throws(()=>activateImmediateCharacterSkill(run,p),/이미/);assert.deepEqual(p.cardPool.map(c=>c.id),pool);assert.equal(p.publicResources.devour,fuel);
 const s=vampireState(run,run.players[1]);s.reserve={source:'fixture'};const own=projectRun(run,'p1'),other=projectRun(run,'p2');assert.equal(own.privateVampireState.commandReserve,true);assert.equal(other.privateVampireState,undefined);
 const clone=structuredClone(run);assert.deepEqual(projectRun(run,'p0'),projectRun(clone,'p0'));assert.equal(clone.players[2].publicResources.parity,run.players[2].publicResources.parity);
});
for(const killed of [false,true])test('005D FINAL new-class Flame0 full wipe '+(killed?'boss-kill failure priority':'normal failure'),()=>{
 const run=fixture();run.floor=3;run.flame=0;run.combat.roomType=killed?'BOSS':'NORMAL_COMBAT';run.combat.monster.hp=killed?1:999;
 run.combat.monster.intent={type:'AOE_DAMAGE',payload:{amount:99}};const numbers=[1,2,3,4];run.players[3].publicResources.parity=0;
 for(const [i,p] of run.players.entries()){const id=run.combat.privateByPlayer[p.playerId].remainingCardIds.find(id=>p.cardPool.find(c=>c.id===id).baseNumber===numbers[i]);submitCard(run,p.playerId,id);if(killed)p.hp=0;}
 const result=resolveBasicTurn(run);assert.equal(run.phase,'RUN_FAILED');assert.equal(run.players.every(p=>p.status==='DOWNED'),true);assert.equal(run.players.reduce((sum,p)=>sum+p.runGold,0),0);assert.equal(run.finalSummary,undefined);assert.ok(result.events.some(e=>e.type==='RUN_FAILED'));if(killed){assert.ok(run.combat.monster.hp<=0,'boss actually killed in the same resolve');assert.equal(run.flame,0);assert.equal(result.events.some(e=>e.source==='BOSS_CLEAR'),false);}
});

test('005D FINAL bounded Ghost/Twins root journals and physical recovery sequence over400 turns',()=>{
 const run=fixture(['demon_swordsman','twins','adventurer','adventurer'],[['aug-341'],['aug-381','aug-390'],[],[]]);
 for(let t=1;t<=400;t++){
 run.combat.monster.hp=999;
 if(run.players[1].publicResources.acrobaticsReady&&t%4===0)activateImmediateCharacterSkill(run,run.players[1]);
 ghostGain(run,run.players[0],1,[],{rootActionId:'root:'+t,reason:'stress'});
 turn(run);
 const g=ghostState(run,run.players[0]),s=twinsState(run,run.players[1]);
 assert.ok(Object.keys(g.processed).length<=8,'ghost processed '+Object.keys(g.processed).length);assert.ok(Object.keys(g.guards).length<=16,'ghost guards '+Object.keys(g.guards).length);assert.ok(Object.keys(s.spentById).length<=run.players[1].cardPool.length,'twins spent journal '+Object.keys(s.spentById).length);assert.ok(Object.keys(s.processed).length<=8,'twins processed '+Object.keys(s.processed).length);assert.ok(Object.keys(s.guards).length<=16,'twins guards '+Object.keys(s.guards).length);
 }
 assert.ok(run.players[0].publicResources.devour<6);assert.ok(run.players[0].publicResources.ghostSlashLevel>0);
});

// Explicit USER_CONFIRMED D01-D07 regression cases remain separate from registry counts.
test('005D FINAL D01 aug287 owner collision reservation is consumed once',()=>{
 const run=fixture(['martial_artist','adventurer','adventurer','adventurer'],[['aug-281','aug-287'],[],[],[]]),s=martialState(run,run.players[0]);
 run.combat.martialEnemy={enemyId:'dummy',units:[],sequence:0,firstThree:true};s.reservation={enemyId:run.combat.monster.id,afterTurn:0};
 const rc={playerId:'p0',cardInstanceId:'p0:base:1',valid:false,invalidReason:'COLLISION'};
 prepareMartialCollision(run,[rc]);assert.equal(rc.valid,true);assert.equal(s.reservation,null);
 run.combat.turn++;const next={...rc,valid:false,invalidReason:'COLLISION'};prepareMartialCollision(run,[next]);assert.equal(next.valid,false);
});
test('005D FINAL D02 two Vampires independently mark the same ally and consume only their own',()=>{
 const run=fixture(['vampire','vampire','adventurer','adventurer']);run.players[2].score=9;
 const cards=run.players.map((p,i)=>({playerId:p.playerId,cardInstanceId:p.cardPool[0].id,workingNumber:i+1,valid:false,invalidReason:'COLLISION'}));
 assignVampireMarks(run,cards,new Map([[1,cards]]));const a=vampireState(run,run.players[0]),b=vampireState(run,run.players[1]);
 assert.equal(a.mark.ownerVampireId,'p0');assert.equal(b.mark.ownerVampireId,'p1');assert.equal(a.mark.thrallPlayerId,'p2');assert.equal(b.mark.thrallPlayerId,'p2');
 const other=structuredClone(b.mark);performVampireSwap(run,run.players[0],cards[0],cards[2],cards);assert.equal(a.mark,null);assert.deepEqual(b.mark,other);
});
test('005D FINAL D03 Devour overflow carry and same root retry preserve independent Slash level',()=>{
 const run=fixture(['demon_swordsman','adventurer','adventurer','adventurer']),p=run.players[0];p.publicResources.devour=7;const level=p.publicResources.ghostSlashLevel;
 ghostGain(run,p,3,[],{rootActionId:'D03',reason:'fixture'});assert.equal(p.publicResources.devour,2);assert.equal(p.publicResources.ghostSlashLevel,level+1);
 const state=structuredClone(p.publicResources);ghostGain(run,p,3,[],{rootActionId:'D03',reason:'fixture'});assert.deepEqual(p.publicResources,state);
});
test('005D FINAL D04 printed parity accepts subsequent Vampire FINAL parity change',()=>{
 const run=fixture(['twins','vampire','adventurer','adventurer'],[['aug-361'],['aug-301'],[],[]]);run.players[0].publicResources.parity=1;run.players[1].publicResources.thrallPlayerId='p0';run.combat.monster.intent={type:'CHARGE',payload:{}};
 const illegal=run.players[0].cardPool.find(c=>c.baseNumber===2);assert.throws(()=>submitCard(run,'p0',illegal.id));
 for(const [i,q] of run.players.entries())submitCard(run,q.playerId,q.cardPool.find(c=>c.baseNumber===i+1).id,i===1);
 const rc=resolveBasicTurn(run).cards.find(c=>c.playerId==='p0');assert.equal(rc.baseNumber,1);assert.equal(rc.finalNumber,2);assert.equal(rc.valid,true);
});
test('005D FINAL D05 Command Reserve retains fresh mark once and Dominance caps4 once',()=>{
 const run=fixture(['vampire','adventurer','adventurer','adventurer'],[['aug-303','aug-308'],[],[],[]]),p=run.players[0],s=vampireState(run,p);
 s.reserve={source:'aug-303',earnedSequence:0};p.publicResources.thrallPlayerId='p1';
 const cards=run.players.map((q,i)=>({playerId:q.playerId,cardInstanceId:q.cardPool[0].id,workingNumber:i+1,valid:true}));
 performVampireSwap(run,p,cards[0],cards[1],cards);assert.equal(s.mark.retentionUsed,true);assert.equal(s.reserve,null);
 for(let t=2;t<=4;t++){run.combat.turn=t;cards[0].cardInstanceId=p.cardPool[(t-1)%p.cardPool.length].id;p.publicResources.thrallPlayerId='p1';performVampireSwap(run,p,cards[0],cards[1],cards);}
 assert.equal(p.publicResources.dominance,4);assert.equal(s.dominanceFour,true);assert.equal(s.reserve?.source,'aug-308');
 run.combat.turn=5;cards[0].cardInstanceId=p.cardPool[4%p.cardPool.length].id;p.publicResources.thrallPlayerId='p1';performVampireSwap(run,p,cards[0],cards[1],cards);assert.equal(s.reserve,null);assert.equal(s.mark.retentionUsed,true);assert.equal(p.publicResources.dominance,4);
});
test('005D FINAL D06 aug307 protects command owner only and only once per Combat',()=>{
 const run=fixture(['vampire','adventurer','adventurer','adventurer'],[['aug-307'],[],[],[]]);
 const a={playerId:'p0',cardInstanceId:'p0:base:1',bloodCommandUsed:true,valid:false,invalidReason:'COLLISION'},b={playerId:'p1',valid:false,invalidReason:'COLLISION'};
 protectVampireCollision(run,[a,b]);assert.equal(a.valid,true);assert.equal(b.valid,false);
 run.combat.turn++;a.valid=false;a.invalidReason='COLLISION';protectVampireCollision(run,[a,b]);assert.equal(a.valid,false);
});
test('005D FINAL D07 transformation requires manual selection activation and new physical pool',()=>{
 const run=fixture(['demon_swordsman','adventurer','adventurer','adventurer'],[['aug-351'],[],[],[]]),p=run.players[0],old=p.cardPool.map(c=>c.id);
 ghostGain(run,p,7,[],{rootActionId:'D07',reason:'fixture'});assert.equal(p.publicResources.transformationActive,false);assert.equal(p.publicResources.transformationPending,true);
 activateImmediateCharacterSkill(run,p);assert.equal(p.publicResources.devour,1);assert.equal(p.publicResources.transformationActive,true);assert.deepEqual(p.cardPool.map(c=>c.baseNumber),[2,4,5,6]);assert.equal(p.cardPool.some(c=>old.includes(c.id)),false);
 const clone=structuredClone(run);assert.deepEqual(projectRun(run,'p0'),projectRun(clone,'p0'));assert.throws(()=>activateImmediateCharacterSkill(run,p),/이미/);
});
