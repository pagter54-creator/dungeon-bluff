import test from 'node:test';
import assert from 'node:assert/strict';
import {F1_MONSTER_DEFINITIONS as f1} from '../supabase/functions/game-api/pve/content-f1.js';
import {F2_MONSTER_DEFINITIONS as f2} from '../supabase/functions/game-api/pve/content-f2.js';
import {F3_MONSTER_DEFINITIONS as f3} from '../supabase/functions/game-api/pve/content-f3.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {patternRequirement,getPatternContributors} from '../supabase/functions/game-api/pve/adaptive-pattern.js';
import {prepareMonsterTurn,applyMonsterCardRules,recordMonsterDamageBatch,monsterPresentation} from '../supabase/functions/game-api/pve/monster-behavior.js';
import {resolveF3AfterDamage} from '../supabase/functions/game-api/pve/monster-behavior-f3.js';
import {cadenceTemplate} from '../supabase/functions/game-api/pve/monster-cadence.js';
import {publishMonsterIntent} from '../supabase/functions/game-api/pve/monster.js';
import {AUGMENT_DEFINITIONS} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {AUGMENT_THRESHOLDS,dueAugmentTiers,beginAugmentChoices,chooseAugment} from '../supabase/functions/game-api/pve/augments.js';
import {applyPostPlayerAttackCharacter} from '../supabase/functions/game-api/pve/characters.js';
import {instrumentCombatSource,captureResolvedTurn,flameTransition,submittedSkillOutcome} from '../scripts/pve-rebalance-measurement.mjs';
import fs from 'node:fs';
const definitions=[...Object.values(f1),...Object.values(f2),...Object.values(f3)];
function fixture(def,n=4){const players=Array.from({length:4},(_,i)=>newPlayerRunState({id:'p'+i,seat_index:i,character_id:'adventurer',member_type:'human'}));const run={id:'rebalance',seed:'rebalance',rngCounter:0,floor:def.floor,depth:1,phase:'COMBAT',flame:4,maxFlame:5,players};run.combat=newCombatState(players,def.baseHp,'NORMAL_COMBAT',def);players.slice(n).forEach(p=>{p.status='DOWNED';p.hp=0;});return run;}
const cards=n=>Array.from({length:n},(_,i)=>({playerId:'p'+i,finalNumber:i+1,valid:true}));
for(const def of definitions.filter(d=>d.mechanic?.adaptiveRequirement))for(const n of [4,3,2,1])test(`adaptive ${def.id}: ${n} contributors, success/failure and presentation`,()=>{
 const run=fixture(def,n),k=run.combat.monster.mechanic,field=k.adaptiveRequirement.field;
 const expected=field==='requiredHits'?[2,3,4,5][n-1]:['requiredValidCount','requiredDistinct'].includes(field)?Math.min(3,n):Math.ceil(k[field]*n/4);
 assert.equal(patternRequirement(run,field),expected);const base=k[field];
 prepareMonsterTurn(run,{type:'CHARGE',telegraphText:'준비',payload:{}});
 for(const success of [false,true]){
  const count=success?expected:expected-1,cs=cards(Math.min(n,count)),state=run.combat.monster.behaviorState;
  if(k.type==='DOMINION')state.meter=1;
  if(k.type==='F2_GROWTH')state.stacks.growth=0;
  if(k.type==='F2_HYDRA')state.heads=3;
  if(k.type==='DPS_WINDOW'){state.countdown=1;state.progress=0;state.cycle++;state.resolvedCycle=0;}
  if(field==='requiredSum'){cs.splice(0,cs.length,...[{playerId:'p0',finalNumber:count,valid:true}]);run.combat.monster.behaviorState.chaosRule='VALID_SUM';}
  if(field==='requiredHits'){run.combat.monster.behaviorState.progress=count;run.combat.monster.behaviorState.countdown=1;applyMonsterCardRules(run,[]);}
  else applyMonsterCardRules(run,cs);
  if(field==='minimumDamage'||field==='requiredHits')recordMonsterDamageBatch(run,field==='minimumDamage'?count:0);
  const s=run.combat.monster.behaviorState;
  if(['HUNT','PARTY_ORDER','COUNTDOWN_STRIKE'].includes(k.type))assert.equal(s.attackBlocked,success);
  if(k.type==='VALID_GUARD')assert.equal(s.guardPending,!success);
  if(k.type==='F3_CHOIR')assert.equal(s.pendingAoe,!success);
  if(k.type==='F2_CHAOS')assert.equal(s.chaosFailure,!success);
  if(k.type==='F2_MOON')assert.equal(s.thresholdPassed,success);
  if(k.type==='DOMINION')assert.equal(s.meter,success?0:2);
  if(k.type==='DPS_WINDOW')assert.equal(s.pendingFailure,!success);
  if(k.type==='F2_GROWTH')assert.equal(s.stacks.growth,success?0:1);
  if(k.type==='F2_HYDRA')assert.equal(s.heads,success?2:3);
  if(k.type==='F3_TAX'){const events=[];resolveF3AfterDamage(run,events,()=>[]);assert.equal(events.some(e=>e.type==='TAX_COLLECTED'),!success);delete s.resolvedTurn;}
  if(k.type==='F3_EXECUTION'){const events=[];resolveF3AfterDamage(run,events,()=>[]);assert.ok(events.some(e=>e.type===(success?'EXECUTION_CANCELLED':'EXECUTION_FAILED')));delete s.resolvedTurn;}
  const view=monsterPresentation(run);assert.equal(view.adaptiveRequirement.effectiveRequirement,expected);assert.equal(view.adaptiveRequirement.contributorCount,n);assert.equal(k[field],base);
 }
});

test('measurement retains accepted skill intent after submissions clear, including invalid skillUsed=false',()=>{
 const submissions={p0:{skillIntent:true},p1:{skillIntent:true}},result={cards:[{playerId:'p0',valid:false,skillUsed:false},{playerId:'p1',valid:true}]};
 const captured=captureResolvedTurn(result,submissions,{type:'CHARGE'},null);delete submissions.p0;
 assert.equal(submittedSkillOutcome(captured.cards[0]),'FAILURE');assert.equal(submittedSkillOutcome(captured.cards[1]),'SUCCESS');
 assert.equal(result.cards[0].diagnosticSkillIntent,undefined);
});
test('measurement counts Flame transitions once, including a gain and rescue in one step',()=>{
 const log=[[4,3],[3,2],[2,3],[3,2],[2,0]].map(([a,b])=>flameTransition(a,b));
 assert.equal(log.reduce((n,x)=>n+x.spent,0),5);assert.equal(log.reduce((n,x)=>n+x.gained,0),1);
 assert.deepEqual(flameTransition(2,2),{before:2,after:2,spent:0,gained:0});
});
test('measurement observes every result site before recursive beginTurn without changing source result construction',()=>{
 const raw=fs.readFileSync(new URL('../supabase/functions/game-api/pve/combat.js',import.meta.url),'utf8'),s=instrumentCombatSource(raw);
 assert.equal((s.match(/__balanceObserve\?/g)||[]).length,4);
 assert.ok(s.indexOf('measuredSubmissions=structuredClone')<s.indexOf('c.turnSubmissions={}'));
 assert.match(s,/c.publicTurnResult=buildTurnResult\(\);globalThis.__balanceObserve\?\.\(run,c.publicTurnResult,measuredSubmissions,measuredAdaptive\);\s*recordCombatTurnTelemetry\(run,c.publicTurnResult\);\s*c.turn\+=1;beginTurn\(run\)/);
 assert.equal((s.match(/c.publicTurnResult=buildTurnResult/g)||[]).length,(raw.match(/c.publicTurnResult=buildTurnResult/g)||[]).length);
});
test('contributors exclude downed and disabled submissions, including stunned auto-submissions, and execution progress survives 4→3',()=>{const r=fixture(f3.f3_execution_golem);r.combat.monster.behaviorState.progress=2;assert.equal(patternRequirement(r,'requiredHits'),5);r.players[3].status='DOWNED';assert.equal(patternRequirement(r,'requiredHits'),4);assert.equal(r.combat.monster.behaviorState.progress,2);r.players[2].status='STUNNED_NEXT_TURN';assert.equal(getPatternContributors(r).length,3);r.players[2].canSubmitCard=false;assert.equal(getPatternContributors(r).length,2);assert.equal(patternRequirement(r,'requiredHits'),3);assert.deepEqual(monsterPresentation(JSON.parse(JSON.stringify(r))),monsterPresentation(r));});
test('every roster action adds exactly one charge before each harmful base action',()=>{for(const def of definitions){const old=def.pattern,harm=old.filter(a=>['DIRECT_DAMAGE','AOE_DAMAGE'].includes(a.type)).length,length=old.length+harm;const sequence=Array.from({length},(_,i)=>cadenceTemplate(def,i+1));assert.equal(sequence.filter(a=>a.cadenceTelegraph).length,harm);assert.equal(sequence.filter(a=>['DIRECT_DAMAGE','AOE_DAMAGE'].includes(a.type)).length,harm);for(let i=0;i<sequence.length;i++)if(['DIRECT_DAMAGE','AOE_DAMAGE'].includes(sequence[i].type))assert.equal(sequence[i-1].cadenceTelegraph,true);assert.deepEqual(cadenceTemplate(def,length+1),sequence[0]);}});
test('cadence extra charge survives reconnect, does not consume target RNG, and keeps mask clock',()=>{const r=fixture(Object.values(f1).find(d=>d.name==='성문 경비견')),counter=r.rngCounter;assert.equal(publishMonsterIntent(r).type,'CHARGE');assert.equal(r.rngCounter,counter);assert.deepEqual(publishMonsterIntent(JSON.parse(JSON.stringify(r))),r.combat.monster.intent);r.combat.turn=2;assert.equal(publishMonsterIntent(r).type,'DIRECT_DAMAGE');const q=fixture(f3.f3_masked_queen),seen=[];for(let t=1;t<=5;t++){q.combat.turn=t;publishMonsterIntent(q);seen.push(q.combat.monster.behaviorState.mask);}assert.deepEqual(seen,['SILENCE','SILENCE','GREED','GREED','HUMILITY']);});
test('threshold boundaries and ordered multiple tier acquisition survive JSON reconnect',()=>{assert.deepEqual(AUGMENT_THRESHOLDS,[30,100,250,500]);for(let i=0;i<4;i++){const p=newPlayerRunState({id:'p',seat_index:0,character_id:'adventurer'});p.augmentBuild=AUGMENT_DEFINITIONS.find(a=>a.characterId==='adventurer').build;p.persistentCharacterState.augmentTiers=Array.from({length:i},(_,j)=>j+1);p.growthExp=AUGMENT_THRESHOLDS[i]-1;assert.ok(!dueAugmentTiers(p).includes(i+1));p.growthExp++;assert.ok(dueAugmentTiers(p).includes(i+1));}let r=fixture(Object.values(f1).find(d=>d.name==='성문 경비견'));r.phase='ROOM_RESULT';r.players[0].growthExp=500;beginAugmentChoices(r);let count=0;while(r.phase==='AUGMENT_CHOICE'){r=JSON.parse(JSON.stringify(r));const pid=Object.keys(r.augmentChoice.offersByPlayer)[0],id=r.augmentChoice.offersByPlayer[pid][0];chooseAugment(r,pid,id);count++;if(r.phase!=='AUGMENT_CHOICE')beginAugmentChoices(r);}assert.equal(count,4);assert.deepEqual(r.players[0].persistentCharacterState.augmentTiers,[1,2,3,4]);});
for(const [snapshot,heal,cost] of [[1,1,0],[2,0,1],[1,0,0],[3,1,1]])test(`Blood Frenzy canonical HP ${snapshot}, intermediate heal ${heal}, replay guard`,()=>{const p=newPlayerRunState({id:'p',seat_index:0,character_id:'berserker'});p.augments=['aug-121'];p.hp=snapshot+heal;const r={players:[p],combat:{id:'cost',turn:1}},resolved={playerId:'p',valid:true,berserkerExpectedHpCost:cost,bloodFrenzyExpectedHpCost:cost};const events=[];assert.equal(applyPostPlayerAttackCharacter(r,resolved,events),cost);assert.equal(p.hp,Math.max(1,snapshot+heal-cost));assert.equal(applyPostPlayerAttackCharacter(r,resolved,events),0);assert.equal(events.filter(e=>e.type==='BERSERKER_ATTACK_HP_COST').length,1);});

