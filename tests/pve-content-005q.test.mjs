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

test('005Q records user choices and gives every atom one category',()=>{
  assert.equal(queue.entries.length,queue.questionCount);
  assert.equal(queue.decisionCategories.length,16);
  const allCategories=new Set(queue.decisionCategories);
  for(const q of queue.entries){
    const choices={Q01:'A',Q02:'A',Q03:'A',Q04:'A',Q05:'A',Q06:'A',Q07:'B',Q08:'B',Q09:'B',Q10:'A',Q11:'A',Q12:'A',Q13:'A',Q14:'A',Q15:'A'};
    assert.equal(q.selectedOption,choices[q.decisionId]||null);
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

const expectedBatchByClass={
  adventurer:'005B',warrior:'005B',rogue:'005B',mage:'005B',berserker:'005B',
  prophet:'005C',imp:'005C',gambler:'005C',gunner:'005C',
  martial_artist:'005D',vampire:'005D',demon_swordsman:'005D',twins:'005D'
};
const sourceById=new Map(sourceEntries.map(row=>[row.augmentId,row]));
const batchOf=id=>expectedBatchByClass[sourceById.get(id)?.classId];

test('005Q uses canonical class batches with 150/120/120 unique cards',()=>{
  assert.equal(Object.keys(expectedBatchByClass).length,13);
  assert.equal(expectedBatchByClass.martial_artist,'005D');
  assert.equal(queue.readiness['005B'].length,150);
  assert.equal(queue.readiness['005C'].length,120);
  assert.equal(queue.readiness['005D'].length,120);
  const membership=new Map();
  for(const [batch,rows] of Object.entries(queue.readiness)){
    for(const row of rows){
      assert.equal(batchOf(row.augmentId),batch,row.augmentId);
      membership.set(row.augmentId,(membership.get(row.augmentId)||0)+1);
    }
  }
  assert.equal(membership.size,390);
  for(const id of sourceById.keys()) assert.equal(membership.get(id),1,id);
  for(const [classId,batch] of Object.entries(expectedBatchByClass)){
    const cards=sourceEntries.filter(row=>row.classId===classId);
    assert.equal(cards.length,30,classId);
    for(const row of cards) assert.equal(batchOf(row.augmentId),batch);
  }
});

test('005Q question batches and per-batch counts match affected card classes',()=>{
  assert.equal(queue.entries.length,23);
  const q20=queue.entries.find(row=>row.decisionId==='Q20');
  assert.deepEqual(q20.affectedBatches,['005D']);
  assert.deepEqual(q20.affectedCardsByBatch,{'005D':q20.affectedAugments.length});
  for(const q of queue.entries){
    const counts={};
    for(const id of q.affectedAugments){
      const batch=batchOf(id);
      counts[batch]=(counts[batch]||0)+1;
    }
    assert.deepEqual(q.affectedCardsByBatch,counts,q.decisionId);
    assert.deepEqual(q.affectedBatches,Object.keys(counts).sort(),q.decisionId);
  }
});

test('005Q keeps direction-only cards unresolved and applies six operational policy atoms',()=>{
  assert.equal(queue.originalAtomicDecisionCount,213);
  assert.equal(queue.entries.length,23);
  assert.equal(queue.userSelectionsApplied,10);
  assert.equal(queue.userResolvedAtomicDecisionCount,6);
  assert.equal(queue.userDirectionOnlyAtomicDecisionCount,12);
  assert.equal(queue.remainingAtomicDecisionCount,112);
  const byId=new Map(contracts.map(row=>[row.augmentId,row]));
  const designed=new Set(read('PVE_CONTENT_005Q_DESIGN_B.json').targetIds);
  const direction=queue.entries.slice(0,4);
  for(const q of direction){
    assert.equal(q.selectedOption,'A');
    assert.equal(q.selectionScope,'DIRECTION_ONLY_PENDING_BETA_V0_2');
    for(const id of q.affectedAugments){
      const row=byId.get(id);
      if(designed.has(id)){
        assert.equal(row.status,'SPEC_COMPLETE');
        assert.equal(row.effect.sourceField,'BETA_V0_2_DESIGN');
      }else{
        assert.equal(row.status,'SPEC_AMBIGUOUS');
        assert.equal(row.effect.text,row.sourceBetaValue);
        assert.equal(row.effect.executable,false);
        assert.equal(row.effect.executionStatus,'PROVENANCE_ONLY_PENDING_BETA_V0_2');
      }
      assert.equal(row.decisionOverlay[q.decisionId].selectedOption,'A');
      if(!designed.has(id)) assert.ok(row.ambiguities.length);
    }
  }
  const resolved=['aug-030','aug-211','aug-390','aug-201','aug-301'];
  for(const id of resolved){
    const row=byId.get(id);
    assert.equal(row.status,'SPEC_COMPLETE',id);
    assert.deepEqual(row.ambiguities,[],id);
    assert.ok(row.userDecisionPolicy,id);
  }
  assert.equal(byId.get('aug-030').userDecisionPolicy.relicDuplicatePolicy,'NO_DUPLICATE_GRANT');
  assert.equal(byId.get('aug-030').userDecisionPolicy.relicFullInventoryPolicy,'GRANT_FAIL_NO_REPLACE_NO_DEFER');
  assert.equal(byId.get('aug-211').userDecisionPolicy.luckChoiceTiming,'AFTER_REWARD_PRESENTATION_BEFORE_FINAL_CONFIRMATION');
  assert.equal(byId.get('aug-390').userDecisionPolicy.recoveryTargetSelection,'MOST_RECENT_SPENT_RECOVERABLE_PHYSICAL_CARD');
  assert.equal(byId.get('aug-201').userDecisionPolicy.downResolveOrder,'AFTER_SAME_RESOLVE_DEFENSE_HEAL_PROTECTION');
  assert.equal(byId.get('aug-301').userDecisionPolicy.dominanceConsumeGainOrder,'CONSUME_PREEXISTING_THEN_GAIN_NEW_IN_RESOLUTION');
  assert.deepEqual(queue.statusAfterUserSelections,{SPEC_COMPLETE:27,SPEC_PARTIAL:195,SPEC_AMBIGUOUS:168});
});
