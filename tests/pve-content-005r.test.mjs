import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadAugmentContracts} from '../scripts/pve-augment-contract.mjs';

const {sourceEntries,resolutionEntries,contracts}=loadAugmentContracts();
const read=name=>JSON.parse(readFileSync(new URL('../docs/'+name,import.meta.url),'utf8'));
const conditionAudit=read('PVE_CONTENT_005R_CONDITION_AUDIT.json');
const decisions=read('PVE_CONTENT_005R_DECISIONS.json');
const qdecisions=read('PVE_CONTENT_005Q_DECISIONS.json');
const designB=read('PVE_CONTENT_005Q_DESIGN_B.json');
const auto=read('PVE_CONTENT_005Q_AUTO_RESOLVED.json');
const executable=read('PVE_CONTENT_005R_EXECUTABLE_AUDIT.json');
const graph=read('PVE_CONTENT_005R_DEPENDENCIES.json');

test('005R overlays preserve all BETA source IDs, text, values and limits',()=>{
  assert.equal(contracts.length,390);
  for(let i=0;i<390;i++){
    const source=sourceEntries[i],overlay=resolutionEntries[i],row=contracts[i];
    assert.equal(row.augmentId,'aug-'+String(i+1).padStart(3,'0'));
    assert.equal(overlay.augmentId,source.augmentId);
    assert.equal(row.sourceBetaValue,source.betaValue);
    assert.equal(row.sourceLimit,source.limit);
    assert.equal(row.sourceDescription,source.canonicalDescription);
    if(designB.targetIds.includes(row.augmentId)) assert.equal(row.effect?.sourceField,'BETA_V0_2_DESIGN',row.augmentId);
    else assert.equal(row.effect?.text,source.betaValue,row.augmentId);
    assert.equal(row.limit,source.limit,row.augmentId);
    assert.equal(row.sourceRecord,source);
    assert.ok(Array.isArray(row.trigger)||row.trigger===null,row.augmentId);
    assert.ok(row.onceScope&&row.resetScope&&row.persistenceScope&&row.visibility,row.augmentId);
    assert.ok(Array.isArray(row.requiredPrimitive)&&row.requiredPrimitive.length,row.augmentId);
    assert.ok(Array.isArray(row.testRequirements)&&row.testRequirements.length,row.augmentId);
    assert.deepEqual(Object.keys(row.roomApplicability).sort(),['COMBAT','EVENT','REST','REWARD','SHOP']);
    for(const room of Object.values(row.roomApplicability)){
      assert.ok(room&&Object.hasOwn(room,'value')&&Object.hasOwn(room,'basis'),row.augmentId);
      assert.ok([true,false,null].includes(room.value),row.augmentId);
    }
  }
});

test('005R status and high-risk review remain explicit',()=>{
  const count=status=>contracts.filter(row=>row.status===status).length;
  assert.deepEqual([count('SPEC_COMPLETE'),count('SPEC_PARTIAL'),count('SPEC_AMBIGUOUS')],[79,200,111]);
  const high=contracts.filter(row=>row.highRisk);
  assert.equal(high.length,27);
  assert.deepEqual(high.map(row=>row.status).reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{}),
    {SPEC_COMPLETE:27});
  for(const row of high){
    assert.ok(row.highRiskGuard&&row.highRiskTest,row.augmentId);
    assert.ok(row.testRequirements.length>=3,row.augmentId);
  }
  assert.ok(contracts.filter(row=>Object.values(row.roomApplicability).every(room=>room.value!==null)).length===387);
});

test('113 vague conditions are audited without silently deciding unknowns',()=>{
  assert.equal(conditionAudit.count,113);
  assert.equal(conditionAudit.entries.length,113);
  assert.equal(new Set(conditionAudit.entries.map(row=>row.augmentId)).size,113);
  const counts=conditionAudit.entries.reduce((a,row)=>(a[row.resolution]=(a[row.resolution]||0)+1,a),{});
  assert.deepEqual(counts,{STILL_AMBIGUOUS:79,RESOLVED_BY_CONTEXT:22,RESOLVED_BY_CLASS_RULE:12});
  assert.equal(conditionAudit.summary.RESOLVED_BY_GLOBAL_POLICY||0,0);
  for(const row of conditionAudit.entries){
    const contract=contracts.find(x=>x.augmentId===row.augmentId);
    assert.ok(contract);
    if(row.resolution==='STILL_AMBIGUOUS') assert.equal(row.resolvedCondition,null);
  }
});

test('every unresolved atomic question appears once in the user decision queue',()=>{
  const decided=qdecisions.entries.filter(row=>row.selectionScope==='OPERATIONAL_POLICY').flatMap(row=>row.atomicDecisionIds);
  const appliedAuto=auto.entries.filter(row=>designB.priorAutoAppliedIds.includes(row.augmentId)).map(row=>row.atomicDecisionId);
  const expected=[...contracts.flatMap(row=>row.ambiguities||[]),...decided,...designB.originalAtomicDecisionIds,...appliedAuto].sort();
  const listed=decisions.entries.flatMap(group=>group.perCard.flatMap(card=>card.unresolved)).sort();
  assert.equal(decisions.decisionGroups,19);
  assert.equal(decisions.entries.length,19);
  assert.equal(decisions.coveredAugmentIds,191);
  assert.equal(decisions.unresolvedAtomicItems,213);
  assert.deepEqual(listed,expected);
  assert.equal(new Set(decisions.entries.flatMap(group=>group.augmentIds)).size,191);
  for(const group of decisions.entries){
    assert.ok(group.question&&group.options?.length>=2);
    assert.deepEqual(group.augmentIds,group.perCard.map(row=>row.augmentId));
  }
});

test('19 executable rows have a documented comparison and no runtime mutation',()=>{
  assert.equal(executable.summary.total,19);
  assert.equal(executable.entries.length,19);
  assert.equal(executable.summary.match,12);
  assert.equal(executable.summary.mismatchValue,2);
  assert.equal(executable.summary.mismatchTrigger,1);
  assert.equal(executable.summary.mismatchRoom,6);
  for(const row of executable.entries){
    assert.ok(contracts.some(x=>x.augmentId===row.augmentId));
    assert.ok(row.findings.length&&row.evidence);
    assert.equal(row.runtimeChange,'DEFER_TO_005F_OR_CLASS_BATCH');
  }
});

test('framework dependency graph is closed and acyclic',()=>{
  const nodes=new Map(graph.nodes.map(node=>[node.id,node]));
  assert.equal(nodes.size,graph.nodes.length);
  assert.equal(graph.nodes.length,12);
  const seen=new Set(),active=new Set();
  const visit=id=>{
    assert.ok(nodes.has(id),id);
    assert.ok(!active.has(id),'cycle at '+id);
    if(seen.has(id)) return;
    active.add(id);
    for(const dependency of nodes.get(id).dependsOn) visit(dependency);
    active.delete(id);
    seen.add(id);
  };
  for(const id of nodes.keys()) visit(id);
  assert.equal(graph.readiness.frameworkReady,true);
  assert.equal(graph.readiness.cardBatchReady,false);
  const counts={};
  for(const row of contracts) for(const primitive of row.requiredPrimitive)
    counts[primitive]=(counts[primitive]||0)+1;
  assert.deepEqual(graph.primitiveCandidateCounts,counts);
});
