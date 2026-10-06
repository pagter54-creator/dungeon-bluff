import {fixture as replacementFixture,cases as replacementCases} from './helpers/prophet-vampire-fixture.mjs';
import {augmentUi} from '../src/pve-ui-catalog.js';
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
// Previous pact/reserve effects are superseded; retain acquisition and mixed-class pipeline regression.
for(let n=301;n<=330;n++){
 test('Vampire replacement '+n+' actual contract',()=>{const f=replacementFixture(n),c=replacementCases[n];c.setup?.(f);c.act(f);assert.deepEqual(c.read(f),c.want);});
 test('Vampire replacement '+n+' absent-owner contract',()=>{const f=replacementFixture(n),c=replacementCases[n];f.p.augments=[];c.setup?.(f);c.act(f);assert.deepEqual(c.read(f),c.without);});
 test('Vampire '+n+' registry and readable tooltip',()=>{const d=AUGMENT_BY_ID['aug-'+n];assert.equal(d.executable,true);assert.ok(augmentCandidates('vampire',d.tier,d.build).some(x=>x.id===d.id));assert.equal(augmentUi(d.id,d.tier).name,d.name);});
}
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
