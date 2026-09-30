import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadAugmentContracts} from '../scripts/pve-augment-contract.mjs';

const read=name=>JSON.parse(readFileSync(new URL('../docs/'+name,import.meta.url),'utf8'));
const prior=read('PVE_CONTENT_005R_DECISIONS.json');
const queue=read('PVE_CONTENT_005Q_DECISIONS.json');
const auto=read('PVE_CONTENT_005Q_AUTO_RESOLVED.json');
const {sourceEntries,contracts}=loadAugmentContracts();

test('005Q accounts for all 19 bundles and exactly 213 original atoms',()=>{
  assert.equal(prior.entries.length,19);
  assert.equal(queue.originalBundleCount,19);
  assert.equal(queue.originalAtomicDecisionCount,213);
  const expected=prior.entries.flatMap(g=>g.perCard.flatMap(c=>c.unresolved)).sort();
  const actual=[...auto.entries.map(e=>e.atomicDecisionId),...queue.entries.flatMap(q=>q.atomicDecisionIds)].sort();
  assert.equal(expected.length,213);
  assert.equal(new Set(actual).size,213);
  assert.deepEqual(actual,expected);
  assert.deepEqual(new Set(queue.entries.map(q=>q.sourceBundle)),new Set(prior.entries.map(g=>g.decisionId)));
});

test('005Q automatic entries quote a real BETA row without changing it',()=>{
  assert.equal(auto.count,auto.entries.length);
  const byId=new Map(sourceEntries.map(row=>[row.augmentId,row]));
  for(const item of auto.entries){
    const row=byId.get(item.augmentId);
    assert.ok(row,item.augmentId);
    assert.equal(item.field,'condition');
    assert.equal(item.resolvedValue,row.betaValue);
    assert.equal(item.sourceReference.row,row.source.row);
    assert.ok(item.reason&&item.sourcePolicy);
  }
});

test('005Q leaves every user choice open and every atom with one category',()=>{
  assert.equal(queue.entries.length,queue.questionCount);
  assert.equal(queue.decisionCategories.length,16);
  const allCategories=new Set(queue.decisionCategories);
  for(const q of queue.entries){
    assert.equal(q.selectedOption,null);
    assert.ok(q.options.length>=2);
    assert.ok(q.question&&q.affectedAugments.length);
    assert.equal(new Set(q.atomicDecisionIds).size,q.atomicDecisionIds.length);
    assert.deepEqual(Object.keys(q.atomicCategories).sort(),[...q.atomicDecisionIds].sort());
    for(const category of Object.values(q.atomicCategories)) assert.ok(allCategories.has(category));
    for(const id of q.affectedAugments) assert.ok(sourceEntries.some(row=>row.augmentId===id));
  }
});

test('005Q readiness covers 390 stable IDs and preserves source values',()=>{
  assert.equal(contracts.length,390);
  const ids=sourceEntries.map(row=>row.augmentId);
  const states=Object.values(queue.readiness).flat();
  assert.equal(states.length,390);
  assert.deepEqual(states.map(x=>x.augmentId).sort(),[...ids].sort());
  for(let i=0;i<390;i++){
    assert.equal(sourceEntries[i].augmentId,'aug-'+String(i+1).padStart(3,'0'));
    assert.equal(contracts[i].sourceBetaValue,sourceEntries[i].betaValue);
  }
  assert.equal(Object.values(queue.statusAfterAuto).reduce((a,b)=>a+b,0),390);
  assert.equal(queue.readyForUserAugmentDecisions,false);
});
