import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  replayScenario,t06GoldenComparable,semanticFingerprint,scenarioAvailability,skippedScenarioReport,STRESS_SCENARIOS,SPEC_AMBIGUITIES
} from '../scripts/pve-stress-lib.mjs';
import {AUGMENT_BY_ID} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {PVE_CHARACTER_DEFS} from '../supabase/functions/game-api/pve/characters.js';
import {PVE_RESOURCE_DEFS} from '../supabase/functions/game-api/pve/resources.js';

let cached=null;
const run=()=>cached??=replayScenario('T06','unit-t06-recovery');
const fixture=(r,id)=>{const f=r.fixtures.find(x=>x.id===id);assert.ok(f,id);return f;};

test('T06 is ACTIVE and the full eight-scenario suite has no SKIP',()=>{
  const def=STRESS_SCENARIOS.find(x=>x.id==='T06'),a=scenarioAvailability(def);
  assert.equal(a.available,true);assert.deepEqual(a.missingCharacters,[]);assert.deepEqual(a.missingBuildEffects,[]);assert.deepEqual(a.missingCapabilities,[]);
  for(const id of ['T00','T02','T03','T04','T05','T06','T09','T14'])assert.equal(scenarioAvailability(STRESS_SCENARIOS.find(x=>x.id===id)).available,true,id);
  assert.deepEqual(skippedScenarioReport(),[]);
});

test('T06 locks canonical Tier-I recovery-loop character decks and BETA configs',()=>{
  assert.deepEqual(PVE_CHARACTER_DEFS.prophet.deck,[1,2,3,4,5]);
  assert.deepEqual(PVE_CHARACTER_DEFS.gunner.deck,[1,2,3]);
  assert.deepEqual(PVE_CHARACTER_DEFS.twins.deck,[1,2,3,4]);
  assert.deepEqual(PVE_CHARACTER_DEFS.demon_swordsman.deck,[1,2,3,4,4]);
  assert.deepEqual(AUGMENT_BY_ID['aug-161'].config,{recoverCount:1,targetMode:'EXPLICIT_ALLY',recoverableSources:['BASE'],excludeTemporary:true});
  assert.deepEqual(AUGMENT_BY_ID['aug-241'].config,{expandedDeck:[1,2,2,3]});
  assert.deepEqual(AUGMENT_BY_ID['aug-381'].config,{rechargeValidAttacks:3,postAcrobaticsFirstValidBonusDamage:2});
  assert.deepEqual(AUGMENT_BY_ID['aug-331'].config,{extraDevourOnValidGhostSlash:1,levelThreshold:8});
  assert.equal(PVE_RESOURCE_DEFS.devour.resetScope,'RUN');
  assert.equal(PVE_RESOURCE_DEFS.ghostSlashLevel.resetScope,'RUN');
  assert.equal(PVE_RESOURCE_DEFS.acrobaticsRechargeProgress.resetScope,'COMBAT');
});

test('T06 F1-F26 cover recovery, cycle reset, Full Burst, Acrobatics, Ghost Slash and recursion guards',()=>{
  const r=run();
  assert.equal(r.fixtures.length,26);
  assert.deepEqual(r.fixtures.map(x=>x.id),[
    'F1_SEER_ALLY_RECOVERY','F2_NO_CARD_DUPLICATION','F3_RECOVERY_NO_AUTO_USE','F4_RECOVERED_CARD_NORMAL_REUSE',
    'F5_SAME_CARD_SECOND_RECOVERY','F6_FULL_BURST_RESET','F7_FULL_BURST_THEN_RECOVERY_BOUNDARY','F8_RECOVERY_FULL_BURST_BOUNDARY',
    'F9_NEW_CYCLE_EXCLUDED_FROM_OLD_BURST','F10_TWINS_BASE_PARITY','F11_TWINS_ACROBATICS_RESET','F12_ACROBATICS_NO_DUPLICATION',
    'F13_ACROBATICS_RECHARGE_REJECTION','F14_RECOVERY_BEFORE_ACROBATICS','F15_ACROBATICS_BEFORE_RECOVERY','F16_GHOST_SLASH_REACTIVATION',
    'F17_NO_AUTO_GHOST_SLASH','F18_GHOST_SLASH_NEXT_ACTION_REUSE','F19_NO_REACTIVATION_RECURSION','F20_FULL_MIXED_RECOVERY_CHAIN',
    'F21_RECOVERY_RESET_RECOVERY','F22_SAME_ROOT_ACTION_CHAIN_BOUND','F23_CARD_OWNERSHIP_INVARIANT','F24_COMBAT_END_CLEANUP',
    'F25_DETERMINISTIC_RECOVERED_CARD','F26_ACTION_CEILING_TRAP'
  ]);
  const f1=fixture(r,'F1_SEER_ALLY_RECOVERY');assert.equal(f1.recovery.fromZone,'SPENT');assert.equal(f1.recovery.toZone,'REMAINING');assert.equal(f1.recovery.cardInstanceId,f1.cardId);assert.equal(f1.recovery.actorId,'p0');assert.equal(f1.recovery.targetPlayerId,'p1');
  assert.equal(fixture(r,'F2_NO_CARD_DUPLICATION').zoneCardCount,4);
  const f3=fixture(r,'F3_RECOVERY_NO_AUTO_USE');assert.equal(f3.monsterHpBefore,f3.monsterHpAfter);
  const f4=fixture(r,'F4_RECOVERED_CARD_NORMAL_REUSE');assert.ok(f4.zones.p1.spent.includes(f4.cardId));
  const f5=fixture(r,'F5_SAME_CARD_SECOND_RECOVERY');assert.equal(f5.recovery.cardInstanceId,f5.cardId);
  const f6=fixture(r,'F6_FULL_BURST_RESET');assert.equal(f6.result.events.filter(e=>e.type==='CYCLE_RESET'&&e.playerId==='p1'&&e.resetReason==='FULL_BURST').length,1);assert.equal(f6.result.packets.filter(p=>p.sourcePlayerId==='p1').length,4);
  const f7=fixture(r,'F7_FULL_BURST_THEN_RECOVERY_BOUNDARY');assert.equal(f7.code,'SKILL_NOT_READY');assert.equal(f7.stateUnchanged,true);
  const f8=fixture(r,'F8_RECOVERY_FULL_BURST_BOUNDARY');assert.equal(f8.result.packets.filter(p=>p.sourcePlayerId==='p1'&&p.sourceCardId===f8.cardId).length,1);
  const f9=fixture(r,'F9_NEW_CYCLE_EXCLUDED_FROM_OLD_BURST');assert.equal(new Set(f9.result.packets.filter(p=>p.sourcePlayerId==='p1').map(p=>p.sourceCardId)).size,4);
  assert.equal(fixture(r,'F10_TWINS_BASE_PARITY').rejected,true);
  const f11=fixture(r,'F11_TWINS_ACROBATICS_RESET');assert.equal(f11.reset.resetReason,'ACROBATICS');assert.equal(f11.reset.nextCycleId,f11.reset.previousCycleId+1);assert.equal(f11.reset.parityAfter,1-f11.reset.parityBefore);
  assert.equal(fixture(r,'F12_ACROBATICS_NO_DUPLICATION').zoneCardCount,4);
  assert.equal(fixture(r,'F13_ACROBATICS_RECHARGE_REJECTION').code,'SKILL_NOT_READY');
  assert.equal(fixture(r,'F15_ACROBATICS_BEFORE_RECOVERY').code,'SKILL_NOT_READY');
  const f16=fixture(r,'F16_GHOST_SLASH_REACTIVATION');assert.equal(f16.resources.p3.ghostSlashLevel,1);assert.equal(f16.resources.p3.ghostSlashReady,true);assert.equal(f16.result.events.filter(e=>e.type==='GHOST_SLASH_REACTIVATED').length,1);
  const f17=fixture(r,'F17_NO_AUTO_GHOST_SLASH');assert.equal(f17.result.events.filter(e=>e.type==='GHOST_SLASH_USED').length,0);assert.equal(f17.result.packets.filter(p=>p.sourcePlayerId==='p3').length,1);
  assert.equal(fixture(r,'F18_GHOST_SLASH_NEXT_ACTION_REUSE').result.events.filter(e=>e.type==='GHOST_SLASH_USED').length,1);
  const f19=fixture(r,'F19_NO_REACTIVATION_RECURSION');assert.equal(f19.result.events.filter(e=>e.type==='GHOST_SLASH_USED').length,1);assert.equal(f19.result.events.filter(e=>e.type==='GHOST_SLASH_REACTIVATED').length,1);assert.equal(f19.result.packets.filter(p=>p.sourcePlayerId==='p3').length,1);
  const f20=fixture(r,'F20_FULL_MIXED_RECOVERY_CHAIN');for(const type of ['FATE_MANIPULATOR_USED','CARD_RECOVERED','ACROBATICS_USED','GHOST_SLASH_LEVEL_UP','GHOST_SLASH_REACTIVATED'])assert.ok(f20.orderedTypes.includes(type),type);
  const f21=fixture(r,'F21_RECOVERY_RESET_RECOVERY');assert.notEqual(f21.firstRoot,f21.secondRoot);
  const f22=fixture(r,'F22_SAME_ROOT_ACTION_CHAIN_BOUND');assert.ok(f22.maxDepth<=4);assert.ok(f22.maxDerived<=24);
  const f23=fixture(r,'F23_CARD_OWNERSHIP_INVARIANT');assert.equal(f23.ownerId,'p1');
  const f24=fixture(r,'F24_COMBAT_END_CLEANUP');assert.equal(f24.resources.p2.acrobaticsRechargeProgress,null);assert.equal(f24.resources.p3.ghostSlashReady,null);assert.ok(f24.resources.p3.devour>=8);
  assert.ok(fixture(r,'F25_DETERMINISTIC_RECOVERED_CARD').recoveredCardId);
  const f26=fixture(r,'F26_ACTION_CEILING_TRAP');assert.equal(f26.guardCode,'ACTION_CHAIN_CEILING_EXCEEDED');assert.equal(f26.ceiling,24);
});

test('T06 fixed semantic golden fingerprint is deterministic',()=>{
  const golden=JSON.parse(fs.readFileSync(new URL('./fixtures/pve-stress-t06-golden.json',import.meta.url),'utf8'));
  const r=replayScenario('T06',golden.seed);
  const current=t06GoldenComparable(r);
  // USER_CONFIRMED_005C_FINAL_PATCH / SEER_COMBAT_START_REVELATION_1.
  // Preserve the immutable historical golden and prove that ONLY these five
  // untouched-Seer initial-resource observations changed from0 to1.
  const bootstrapOnly=new Set([
    'F6_FULL_BURST_RESET','F11_TWINS_ACROBATICS_RESET','F16_GHOST_SLASH_REACTIVATION',
    'F18_GHOST_SLASH_NEXT_ACTION_REUSE','F19_NO_REACTIVATION_RECURSION'
  ]);
  const historical=structuredClone(current);
  assert.equal(historical.fixtures.filter(f=>bootstrapOnly.has(f.id)).length,5);
  for(const f of historical.fixtures)if(bootstrapOnly.has(f.id)){
    assert.equal(f.resources.p0.revelation,1,f.id+' confirmed initial resource');
    f.resources.p0.revelation=0;
  }
  assert.equal(semanticFingerprint(historical),golden.fingerprint,'all unaffected semantics equal immutable historical golden');
  assert.equal(semanticFingerprint(current),'a622988f744176176663eaffa83b5f891e8ab925058d5bc9d508192e711d6a1c','confirmed bootstrap overlay fingerprint');
  const b=replayScenario('T06',golden.seed);
  assert.equal(r.replayFingerprint,b.replayFingerprint);
  assert.deepEqual(t06GoldenComparable(r),t06GoldenComparable(b));
});

test('T06 stress metrics keep recovery chains finite and compare Recovery vs Steady',()=>{
  const r=run(),m=r.recoveryMetrics,c=r.comparison;
  assert.equal(r.status,'PASS');assert.equal(r.combats.length,3);assert.deepEqual(r.combats.map(x=>x.roomType),['NORMAL_COMBAT','ELITE_COMBAT','BOSS']);
  for(const k of ['duplicatePhysicalCardViolations','invalidZoneTransitions','actionCeilingHits','recursiveRecoveryAttempts','recursiveCycleResetAttempts','recursiveSkillReactivationAttempts','deterministicReplayMismatch'])assert.equal(m[k],0,k);
  assert.ok(m.maxRecoveryChainDepth<=4);assert.ok(m.maxDerivedEventsPerRootAction<=24);assert.ok(m.totalCardRecoveries>0);assert.ok(m.allyCardRecoveries>0);assert.ok(m.cycleResets>0);assert.ok(m.fullBurstCycleResets>0);assert.ok(m.acrobaticsCycleResets>0);assert.ok(m.ghostSlashReactivations>0);
  for(const k of ['recoveryDpt','steadyDpt','dptRatio','recoveryTurns','steadyTurns','recoveryCardReuseRatio','steadyCardReuseRatio'])assert.ok(Number.isFinite(c[k]),k);
});

test('T06 reports unresolved cross-cycle and Twins recovery semantics instead of silently changing base rules',()=>{
  for(const id of ['AMB-T06-RECOVER-PREVIOUS-CYCLE-CARD','AMB-T06-TWINS-RECOVERY-CYCLE-COMPLETION'])assert.ok(SPEC_AMBIGUITIES.some(x=>x.id===id),id);
});
