import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {applyRogue,rogueArmorPenetration} from '../supabase/functions/game-api/pve/rogue-runtime.js';
import {ROGUE_CONTRACTS} from '../supabase/functions/game-api/pve/rogue-contracts.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {beginAugmentChoices,chooseAugment} from '../supabase/functions/game-api/pve/augments.js';

function fixture(ids=[]){
  const chars=['rogue','adventurer','warrior','mage'];
  const players=chars.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  const p=players[0];p.augments=[...ids];
  const run={id:'rogue-005b',seed:'rogue-005b',rngCounter:0,version:1,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});
  run.combat.id='rogue-combat';
  const priv=run.combat.privateByPlayer[p.playerId];
  const fire=(trigger,resolved={},extra={})=>applyRogue(run,trigger,{player:p,resolved,privateState:priv,...extra});
  return {run,p,players,priv,fire};
}
function card(p,n,exclude=null){return p.cardPool.find(c=>c.baseNumber===n&&c.id!==exclude);}
function resolved(p,n,{valid=true,soloLowest=false,id=null}={}){const c=id?cardById(p,id):card(p,n);return {valid,soloLowest,finalNumber:n,cardInstanceId:c?.id||id||('virtual-'+n)};}
function cardById(p,id){return p.cardPool.find(c=>c.id===id);}
function spend(priv,id){priv.remainingCardIds=priv.remainingCardIds.filter(x=>x!==id);if(!priv.spentCardIds.includes(id))priv.spentCardIds.push(id);}
function damage(fire,r,amount=5,extra={}){const d={amount},followUps=[];fire('BEFORE_DAMAGE',r,{damage:d,followUps,...extra});return {damage:d,followUps};}

test('Rogue runtime registry is exact 30/30 executable with 1/3/3/3 stages per archetype',()=>{
  const ids=Array.from({length:30},(_,i)=>'aug-'+String(61+i).padStart(3,'0'));
  assert.equal(Object.keys(ROGUE_CONTRACTS).length,30);
  for(const id of ids){assert.equal(AUGMENT_BY_ID[id].executable,true,id);assert.equal(AUGMENT_BY_ID[id].characterId,'rogue',id);}
  for(const build of ['비열한 일격','독 묻은 칼날','그림자 도약']){
    assert.equal(augmentCandidates('rogue',1).filter(x=>x.build===build).length,1);
    for(const tier of [2,3,4])assert.equal(augmentCandidates('rogue',tier,build).length,3);
  }
});

test('positive aug-061 consumes prior sneaky stacks exactly once on solo-lowest success',()=>{
  const {run,p,fire}=fixture(['aug-061']);p.publicResources.sneakyStack=2;
  const r=resolved(p,1,{soloLowest:true});fire('CARD_VALIDATED',r);const out=damage(fire,r);
  assert.equal(out.damage.amount,7);assert.equal(p.publicResources.sneakyStack,0);
  assert.ok(run.augmentFramework.telemetry.some(x=>x.augmentId==='aug-061'&&x.successCount===1));
});
test('positive aug-062 adds one only on FINAL_NUMBER 1 solo-lowest',()=>{
  const {p,fire}=fixture(['aug-062']);const r=resolved(p,1,{soloLowest:true});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,6);
});
test('positive aug-063 uses the immediately previous valid FINAL_NUMBER',()=>{
  const {run,p,fire}=fixture(['aug-063']);fire('CARD_VALIDATED',resolved(p,4,{valid:true}));run.combat.turn=2;const r=resolved(p,1,{soloLowest:true});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,6);
});
test('positive aug-064 recovers the same used 1/3 physical card once per cycle',()=>{
  const {p,priv,fire}=fixture(['aug-064']);const c=card(p,1),r=resolved(p,1,{soloLowest:true,id:c.id});fire('CARD_VALIDATED',r);spend(priv,c.id);fire('TURN_END',{},{});assert.ok(priv.remainingCardIds.includes(c.id));assert.ok(!priv.spentCardIds.includes(c.id));
});
test('positive aug-065 builds critical stacks and applies stack damage',()=>{
  const {run,p,fire}=fixture(['aug-065']);let r=resolved(p,1,{soloLowest:true});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,6);run.combat.turn=2;r=resolved(p,3,{soloLowest:true});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,7);
});
test('positive aug-066 rewards only the next-turn higher valid number',()=>{
  const {run,p,fire}=fixture(['aug-066']);fire('CARD_VALIDATED',resolved(p,1,{soloLowest:true}));run.combat.turn=2;const r=resolved(p,4,{valid:true});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,7);
});
test('positive aug-067 arms one nonstacking next-direct-damage reduction',()=>{
  const {run,p,fire}=fixture(['aug-067']);fire('CARD_VALIDATED',resolved(p,1,{soloLowest:true}));assert.ok(run.augmentFramework.statuses.some(x=>x.sourceId==='aug-067'&&x.targetId===p.playerId));
});
test('positive aug-068 adds four at sneaky two before base sneaky consumption',()=>{
  const {run,p,fire}=fixture(['aug-061','aug-068']);p.publicResources.sneakyStack=2;const r=resolved(p,1,{soloLowest:true});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,11);assert.equal(p.publicResources.sneakyStack,0);assert.ok(run.augmentFramework.telemetry.some(x=>x.augmentId==='aug-068'));
});
test('positive aug-069 deterministically recovers the lowest spent physical card',()=>{
  const {p,priv,fire}=fixture(['aug-069']);const low=card(p,1),high=card(p,5);spend(priv,high.id);spend(priv,low.id);fire('CARD_VALIDATED',resolved(p,3,{soloLowest:true}));fire('TURN_END');assert.ok(priv.remainingCardIds.includes(low.id));assert.ok(priv.spentCardIds.includes(high.id));
});
test('positive aug-070 gives +4 from the third consecutive solo-lowest success',()=>{
  const {run,p,fire}=fixture(['aug-070']);for(let t=1;t<=3;t++){run.combat.turn=t;const r=resolved(p,t===2?3:1,{soloLowest:true});fire('CARD_VALIDATED',r);const out=damage(fire,r);assert.equal(out.damage.amount,t===3?9:5);}
});

test('positive aug-071 applies poison one with max-three source attribution',()=>{
  const {run,p,fire}=fixture(['aug-071']);fire('CARD_VALIDATED',resolved(p,1,{soloLowest:true}));const ps=run.augmentFramework.roguePoison.p0;assert.equal(ps.stacks,1);assert.equal(ps.ownerId,'p0');assert.equal(ps.cap,3);
});
test('positive aug-072 applies two poison on final-number-one solo-lowest once per cycle',()=>{
  const {run,p,fire}=fixture(['aug-071','aug-072']);fire('CARD_VALIDATED',resolved(p,1,{soloLowest:true}));assert.equal(run.augmentFramework.roguePoison.p0.stacks,2);
});
test('positive aug-073 recovers the exact poison-applying physical card',()=>{
  const {p,priv,fire}=fixture(['aug-071','aug-073']);const c=card(p,1),r=resolved(p,1,{soloLowest:true,id:c.id});fire('CARD_VALIDATED',r);spend(priv,c.id);fire('TURN_END');assert.ok(priv.remainingCardIds.includes(c.id));
});
test('positive aug-074 poisoned target grants attacker a one-shot next-valid bonus',()=>{
  const {run,p,players,fire}=fixture(['aug-071','aug-074']);run.augmentFramework={roguePoison:{p0:{ownerId:'p0',sourceAugmentId:'aug-071',targetId:'dummy',stacks:1,cap:3,hitProgress:0}},rogue:{},once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};
  const ally=players[1],r={valid:true,finalNumber:3,cardInstanceId:ally.cardPool[0].id},d1={amount:3},q1=[];applyRogue(run,'BEFORE_DAMAGE',{player:ally,resolved:r,damage:d1,followUps:q1});
  const d2={amount:3},q2=[];applyRogue(run,'BEFORE_DAMAGE',{player:ally,resolved:r,damage:d2,followUps:q2});assert.equal(d2.amount,4);
});
test('positive aug-075 poison explosion weakens defense in pre-mitigation phase',()=>{
  const {run,players}=fixture(['aug-071','aug-075']);run.augmentFramework.roguePoison={p0:{ownerId:'p0',sourceAugmentId:'aug-071',targetId:'dummy',stacks:1,cap:3,hitProgress:1}};
  const ally=players[1],r={valid:true,finalNumber:3,cardInstanceId:ally.cardPool[0].id},d={amount:3},q=[];applyRogue(run,'BEFORE_DAMAGE',{player:ally,resolved:r,damage:d,followUps:q});assert.equal(rogueArmorPenetration(run,ally,r,2),1);
});
test('positive aug-076 poison explosion arms all allies next-valid +1',()=>{
  const {run,players}=fixture(['aug-071','aug-076']);run.augmentFramework.roguePoison={p0:{ownerId:'p0',sourceAugmentId:'aug-071',targetId:'dummy',stacks:1,cap:3,hitProgress:1}};
  const a=players[1],r={valid:true,finalNumber:3,cardInstanceId:a.cardPool[0].id},d={amount:3},q=[];applyRogue(run,'BEFORE_DAMAGE',{player:a,resolved:r,damage:d,followUps:q});
  const b=players[2],rb={valid:true,finalNumber:4,cardInstanceId:b.cardPool[0].id},db={amount:4},qb=[];applyRogue(run,'BEFORE_DAMAGE',{player:b,resolved:rb,damage:db,followUps:qb});assert.equal(db.amount,5);
});
test('positive aug-077 consumes poison three into a seven-damage explosion',()=>{
  const {run,players}=fixture(['aug-071','aug-077']);run.augmentFramework.roguePoison={p0:{ownerId:'p0',sourceAugmentId:'aug-071',targetId:'dummy',stacks:3,cap:3,hitProgress:1}};
  const a=players[1],r={valid:true,finalNumber:3,cardInstanceId:a.cardPool[0].id},d={amount:3},q=[];applyRogue(run,'BEFORE_DAMAGE',{player:a,resolved:r,damage:d,followUps:q});assert.equal(q[0].amount,7);assert.equal(run.augmentFramework.roguePoison.p0.stacks,0);
});
test('positive aug-078 creates nine-damage poison burst and one defense-nullify charge',()=>{
  const {run,players}=fixture(['aug-071','aug-078']);run.augmentFramework.roguePoison={p0:{ownerId:'p0',sourceAugmentId:'aug-071',targetId:'dummy',stacks:3,cap:3,hitProgress:1,defenseNullifyCharges:0}};
  const a=players[1],r={valid:true,finalNumber:3,cardInstanceId:a.cardPool[0].id},d={amount:3},q=[];applyRogue(run,'BEFORE_DAMAGE',{player:a,resolved:r,damage:d,followUps:q});assert.equal(q[0].amount,9);assert.equal(rogueArmorPenetration(run,a,r,3),3);
});
test('positive aug-079 adds one while poison remains at two or more',()=>{
  const {run,players}=fixture(['aug-071','aug-079']);run.augmentFramework.roguePoison={p0:{ownerId:'p0',sourceAugmentId:'aug-071',targetId:'dummy',stacks:2,cap:3,hitProgress:0}};
  const a=players[1],r={valid:true,finalNumber:3,cardInstanceId:a.cardPool[0].id},d={amount:3},q=[];applyRogue(run,'BEFORE_DAMAGE',{player:a,resolved:r,damage:d,followUps:q});assert.equal(d.amount,4);
});
test('positive aug-080 recovers deterministic low BASE card and retains poison one after explosion',()=>{
  const {run,p,players,priv,fire}=fixture(['aug-071','aug-080']);const c=card(p,1);fire('CARD_VALIDATED',resolved(p,1,{soloLowest:true,id:c.id}));spend(priv,c.id);fire('TURN_END');assert.ok(priv.remainingCardIds.includes(c.id));
  const ps=run.augmentFramework.roguePoison.p0;ps.stacks=1;ps.hitProgress=1;const a=players[1],r={valid:true,finalNumber:3,cardInstanceId:a.cardPool[0].id},d={amount:3},q=[];applyRogue(run,'BEFORE_DAMAGE',{player:a,resolved:r,damage:d,followUps:q});assert.equal(ps.stacks,1);
});

test('positive aug-081 jump uses FINAL_NUMBER difference three and adds two',()=>{
  const {run,p,fire}=fixture(['aug-081']);fire('CARD_VALIDATED',resolved(p,1));run.combat.turn=2;const r=resolved(p,4);fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,7);
});
test('positive aug-082 low-to-high jump adds one',()=>{
  const {run,p,fire}=fixture(['aug-082']);fire('CARD_VALIDATED',resolved(p,1));run.combat.turn=2;const r=resolved(p,4);fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,6);
});
test('positive aug-083 high-to-low jump arms the following valid attack',()=>{
  const {run,p,fire}=fixture(['aug-083']);fire('CARD_VALIDATED',resolved(p,5));run.combat.turn=2;let r=resolved(p,1);fire('CARD_VALIDATED',r);run.combat.turn=3;r=resolved(p,3);fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,6);
});
test('positive aug-084 rewards immediately consecutive valid jumps',()=>{
  const {run,p,fire}=fixture(['aug-084']);fire('CARD_VALIDATED',resolved(p,1));run.combat.turn=2;fire('CARD_VALIDATED',resolved(p,4));run.combat.turn=3;const r=resolved(p,1);fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,6);
});
test('positive aug-085 stacks consecutive leap damage independently',()=>{
  const {run,p,fire}=fixture(['aug-085']);fire('CARD_VALIDATED',resolved(p,1));run.combat.turn=2;let r=resolved(p,4);fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,6);run.combat.turn=3;r=resolved(p,1);fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,7);
});
test('positive aug-086 preserves generic leap chain on first failure of a cycle',()=>{
  const {run,p,fire}=fixture(['aug-086']);fire('CARD_VALIDATED',resolved(p,1));run.combat.turn=2;fire('CARD_VALIDATED',resolved(p,4));assert.equal(run.augmentFramework.rogue.p0.leapChain,1);run.combat.turn=3;fire('CARD_VALIDATED',resolved(p,3,{valid:false}));assert.equal(run.augmentFramework.rogue.p0.leapChain,1);assert.equal(run.augmentFramework.rogue.p0.protected086Cycle,1);
});
test('positive aug-087 exact four-point great leap adds four',()=>{
  const {run,p,fire}=fixture(['aug-087']);fire('CARD_VALIDATED',resolved(p,1));run.combat.turn=2;const r=resolved(p,5);fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,9);
});
test('positive aug-088 alternating jump direction adds three',()=>{
  const {run,p,fire}=fixture(['aug-088']);fire('CARD_VALIDATED',resolved(p,1));run.combat.turn=2;fire('CARD_VALIDATED',resolved(p,5));run.combat.turn=3;const r=resolved(p,1);fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,8);
});
test('positive aug-089 1-to-5 great leap adds eight',()=>{
  const {run,p,fire}=fixture(['aug-089']);fire('CARD_VALIDATED',resolved(p,1));run.combat.turn=2;const r=resolved(p,5);fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,13);
});
test('positive aug-090 recovers the physical departure card after a successful jump',()=>{
  const {run,p,priv,fire}=fixture(['aug-090']);const from=card(p,1),to=card(p,5);fire('CARD_VALIDATED',resolved(p,1,{id:from.id}));spend(priv,from.id);run.combat.turn=2;fire('CARD_VALIDATED',resolved(p,5,{id:to.id}));fire('TURN_END');assert.ok(priv.remainingCardIds.includes(from.id));
});

test('negative Rogue conditions reject ties, invalids, poison overflow and wrong recovery number',()=>{
  const {run,p,priv,fire}=fixture(['aug-062','aug-071','aug-072','aug-073','aug-081']);
  let r=resolved(p,1,{soloLowest:false});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r).damage.amount,5);
  r=resolved(p,1,{valid:false,soloLowest:false});fire('CARD_VALIDATED',r);assert.equal(run.augmentFramework.roguePoison?.p0?.stacks??0,0);
  run.augmentFramework.roguePoison={p0:{ownerId:'p0',sourceAugmentId:'aug-071',targetId:'dummy',stacks:3,cap:3,hitProgress:0}};fire('CARD_VALIDATED',resolved(p,1,{soloLowest:true}));assert.equal(run.augmentFramework.roguePoison.p0.stacks,3);
  const four=card(p,4);fire('CARD_VALIDATED',resolved(p,4,{soloLowest:true,id:four.id}));spend(priv,four.id);fire('TURN_END');assert.ok(priv.spentCardIds.includes(four.id));
});
test('negative Rogue combat-only damage and poison do not leak into Event or Reward',()=>{
  for(const phase of ['EVENT','REWARD_ROOM']){
    const {run,p}=fixture(['aug-061','aug-071','aug-081']);run.phase=phase;run.combat=null;run.roomState={attempt:1,privateByPlayer:{p0:{cycleIndex:1,remainingCardIds:p.cardPool.map(c=>c.id),spentCardIds:[]}}};
    const r={valid:true,soloLowest:true,finalNumber:1,cardInstanceId:p.cardPool[0].id},d={amount:5},q=[];applyRogue(run,'CARD_VALIDATED',{player:p,resolved:r,privateState:run.roomState.privateByPlayer.p0});applyRogue(run,'BEFORE_DAMAGE',{player:p,resolved:r,damage:d,followUps:q,privateState:run.roomState.privateByPlayer.p0});assert.equal(d.amount,5);assert.equal(run.augmentFramework?.roguePoison?.p0?.stacks??0,0);
  }
});
test('negative aug-086 protects only the first leap-chain break in a cycle',()=>{
  const {run,p,fire}=fixture(['aug-086']);fire('CARD_VALIDATED',resolved(p,1));run.combat.turn=2;fire('CARD_VALIDATED',resolved(p,4));run.combat.turn=3;fire('CARD_VALIDATED',resolved(p,3,{valid:false}));assert.equal(run.augmentFramework.rogue.p0.leapChain,1);run.combat.turn=4;fire('CARD_VALIDATED',resolved(p,3,{valid:false}));assert.equal(run.augmentFramework.rogue.p0.leapChain,0);
});
test('Rogue reconnect preserves sneaky, poison, leap and recovery state without exposing another hand',()=>{
  const {run,p,priv,fire}=fixture(['aug-061','aug-071','aug-086']);p.publicResources.sneakyStack=1;fire('CARD_VALIDATED',resolved(p,1,{soloLowest:true}));run.combat.turn=2;fire('CARD_VALIDATED',resolved(p,5));run.augmentFramework.roguePoison.p0.stacks=3;const saved=structuredClone(run);
  assert.equal(saved.augmentFramework.roguePoison.p0.stacks,3);assert.equal(saved.augmentFramework.rogue.p0.leapChain,1);assert.ok(Array.isArray(saved.combat.privateByPlayer.p0.remainingCardIds));assert.equal(saved.augmentFramework.rogue.p1,undefined);
});
for(const spec of [
  {line:'비열한 일격',ids:['aug-061','aug-062','aug-065','aug-068']},
  {line:'독 묻은 칼날',ids:['aug-071','aug-072','aug-075','aug-078']},
  {line:'그림자 도약',ids:['aug-081','aug-082','aug-085','aug-089']}
])test('full Rogue archetype build '+spec.line+' acquires Stage 1 through 4',()=>{
  const p=newPlayerRunState({id:'p0',user_id:'u0',character_id:'rogue',member_type:'human',seat_index:0});p.growthExp=750;
  const run={id:'rogue-build-'+spec.ids[0],seed:'build',rngCounter:0,version:1,phase:'ROOM_RESULT',floor:1,players:[p],map:{depthCount:8}};
  assert.equal(beginAugmentChoices(run,'ROOM_RESULT'),true);
  for(let tier=1;tier<=4;tier++){
    const offer=run.augmentChoice.offersByPlayer.p0;assert.equal(offer.length,3);assert.ok(offer.includes(spec.ids[tier-1]));if(tier>1)assert.ok(offer.every(id=>AUGMENT_BY_ID[id].build===spec.line));chooseAugment(run,'p0',spec.ids[tier-1]);
  }
  assert.deepEqual(p.augments,spec.ids);assert.deepEqual(p.persistentCharacterState.augmentTiers,[1,2,3,4]);
});
test('Rogue candidate acquisition survives reconnect and keeps exact Stage-1 offer',()=>{
  const p=newPlayerRunState({id:'p0',user_id:'u0',character_id:'rogue',member_type:'human',seat_index:0});p.growthExp=50;
  const run={id:'rogue-acquire',seed:'acquire',rngCounter:0,version:1,phase:'ROOM_RESULT',floor:1,players:[p],map:{depthCount:8}};
  beginAugmentChoices(run,'ROOM_RESULT');assert.deepEqual(run.augmentChoice.offersByPlayer.p0,['aug-061','aug-071','aug-081']);chooseAugment(run,'p0','aug-071');const saved=structuredClone(run);assert.ok(saved.players[0].augments.includes('aug-071'));assert.equal(saved.augmentFramework.acquired['p0:aug-071'].augmentId,'aug-071');
});
