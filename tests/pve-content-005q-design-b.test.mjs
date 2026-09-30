import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AUGMENT_TRIGGERS} from '../supabase/functions/game-api/pve/augment-framework.js';
import {loadAugmentContracts} from '../scripts/pve-augment-contract.mjs';

const read=name=>JSON.parse(readFileSync(new URL('../docs/'+name,import.meta.url),'utf8'));
const design=read('PVE_CONTENT_005Q_DESIGN_B.json');
const queue=read('PVE_CONTENT_005Q_DECISIONS.json');
const {sourceEntries,contracts}=loadAugmentContracts();
const expected='003 009 012 013 014 017 019 022 037 038 040 044 045 049 052 053 054 055 057 060 063 066 068 070 073 080 082 086 102 103 104 107 112 114 116 119 120 124 126 128 129 130 136 137 139 140 143 145 146 147 148 149'.split(' ').map(n=>'aug-'+n).sort();
const sourceBy=new Map(sourceEntries.map(row=>[row.augmentId,row]));
const contractBy=new Map(contracts.map(row=>[row.augmentId,row]));

test('DESIGN-B covers exactly 52 requested 005B cards and preserves BETA v0.1',()=>{
  assert.equal(design.entries.length,52);
  assert.equal(new Set(design.entries.map(row=>row.augmentId)).size,52);
  assert.deepEqual(design.entries.map(row=>row.augmentId).sort(),expected);
  assert.deepEqual(design.classes,{adventurer:8,warrior:12,rogue:8,mage:9,berserker:15});
  for(const row of design.entries){
    const source=sourceBy.get(row.augmentId);
    assert.equal(row.betaV01,source.betaValue,row.augmentId);
    assert.equal(row.sourceEffect,source.canonicalDescription,row.augmentId);
    assert.equal(row.class,source.classId,row.augmentId);
    assert.equal(row.stage,source.stage,row.augmentId);
    assert.equal(contractBy.get(row.augmentId).sourceBetaValue,source.betaValue,row.augmentId);
  }
});

test('every v0.2 card has a concrete trigger, condition, value, room matrix and tooltip',()=>{
  for(const row of design.entries){
    assert.ok(row.betaV02&&row.tooltip&&row.designRationale,row.augmentId);
    assert.ok(Array.isArray(row.trigger)&&row.trigger.length,row.augmentId);
    for(const trigger of row.trigger)assert.ok(AUGMENT_TRIGGERS.includes(trigger),row.augmentId+':'+trigger);
    assert.ok(row.condition&&!row.condition.includes('조건 달성 시'),row.augmentId);
    assert.ok(Array.isArray(row.effect)&&row.effect.length,row.augmentId);
    assert.ok(row.value&&Object.keys(row.value).length,row.augmentId);
    assert.ok(row.cap&&Object.keys(row.cap).length,row.augmentId);
    assert.ok(row.onceScope&&row.resetScope&&row.persistenceScope,row.augmentId);
    assert.deepEqual(row.roomApplicability,{COMBAT:true,EVENT:['aug-038','aug-044','aug-045'].includes(row.augmentId),REWARD:['aug-038','aug-044','aug-045'].includes(row.augmentId),SHOP:false,REST:false},row.augmentId);
    assert.equal(row.visibility,'PUBLIC',row.augmentId);
    assert.ok(row.requiredPrimitive.length&&row.telemetry.length,row.augmentId);
    assert.ok(!row.tooltip.includes('조건 달성 시'),row.augmentId);
    assert.equal(row.specStatus,'SPEC_COMPLETE',row.augmentId);
  }
});

test('005B contract overlays link v0.2 design and have zero design ambiguities',()=>{
  for(const spec of design.entries){
    const row=contractBy.get(spec.augmentId);
    assert.equal(row.status,'SPEC_COMPLETE',spec.augmentId);
    assert.deepEqual(row.ambiguities,[],spec.augmentId);
    assert.deepEqual(row.trigger,spec.trigger,spec.augmentId);
    assert.equal(row.condition.text,spec.condition,spec.augmentId);
    assert.equal(row.effect.sourceField,'BETA_V0_2_DESIGN',spec.augmentId);
    assert.equal(row.effect.text,spec.betaV02,spec.augmentId);
    assert.deepEqual(row.effect.operations,spec.effect,spec.augmentId);
    assert.deepEqual(row.cap.value,spec.cap,spec.augmentId);
    assert.equal(row.sourceBetaValue,spec.betaV01,spec.augmentId);
    assert.deepEqual(row.priorAmbiguities,spec.priorAmbiguities,spec.augmentId);
  }
  const batchB=contracts.filter(row=>['adventurer','warrior','rogue','mage','berserker'].includes(row.classId));
  assert.equal(batchB.length,150);
  assert.ok(batchB.every(row=>row.ambiguities.length===0));
  assert.equal(queue.readiness['005B'].filter(row=>row.blockers.length).length,0);
});

test('design decisions and current statuses stay traceable without runtime edits',()=>{
  assert.equal(design.originalAtomicDecisionIds.length,58);
  assert.equal(design.designNewAtomicCount,57);
  assert.deepEqual(design.overlapWithPriorAuto,['AMB-AUG-aug-107-CONDITION']);
  assert.equal(design.priorAutoAppliedIds.length,10);
  assert.equal(queue.remainingAtomicDecisionCount,112);
  assert.equal(queue.entries.length,23);
  for(const id of ['Q11','Q12','Q13','Q14','Q15'])assert.equal(queue.entries.find(q=>q.decisionId===id).selectedOption,'A');
  assert.deepEqual(queue.statusAfterDesignB,{SPEC_COMPLETE:79,SPEC_PARTIAL:200,SPEC_AMBIGUOUS:111});
  assert.deepEqual(design.statusAfterDesign,queue.statusAfterDesignB);
  assert.equal(design.readyForPveContent005BRuntime,true);
});
