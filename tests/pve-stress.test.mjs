import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  STRESS_SCENARIOS,StressHardFailure,assertRunInvariants,replayScenario,runT14,
  scenarioAvailability,semanticFingerprint,skippedScenarioReport,t14GoldenComparable
} from '../scripts/pve-stress-lib.mjs';

const golden=JSON.parse(fs.readFileSync(new URL('./fixtures/pve-stress-t14-golden.json',import.meta.url),'utf8'));

test('PVE stress scenario availability SKIPs missing characters/build effects instead of substituting them',()=>{
  const status=Object.fromEntries(STRESS_SCENARIOS.map(s=>[s.id,scenarioAvailability(s)]));
  assert.equal(status.T14.available,true);
  for(const id of ['T00','T05','T09','T02','T03','T04','T06'])assert.equal(status[id].available,false,id);
  assert.ok(status.T00.missingCharacters.includes('rogue'));
  assert.ok(status.T09.missingCharacters.includes('prophet'));
  assert.ok(status.T05.missingCharacters.includes('vampire'));
  assert.ok(skippedScenarioReport().some(x=>x.scenarioId==='T06'));
});

test('PVE stress T14 executes all six Flame/wipe ordering fixtures without hard failure',()=>{
  const result=runT14('unit-t14');
  assert.equal(result.status,'PASS');
  assert.equal(result.cases.length,6);
  assert.deepEqual(result.cases.map(x=>x.id),['T14-1','T14-2','T14-3','T14-4','T14-5','T14-6']);
});

test('PVE stress T14 same-seed replay is deterministic',()=>{
  const a=replayScenario('T14','golden-t14-seed');
  const b=replayScenario('T14','golden-t14-seed');
  assert.equal(a.replayFingerprint,b.replayFingerprint);
  assert.equal(semanticFingerprint(t14GoldenComparable(a)),semanticFingerprint(t14GoldenComparable(b)));
});

test('PVE stress T14 golden preserves the current boundary-resolution contract',()=>{
  const result=replayScenario('T14','golden-t14-seed');
  assert.deepEqual(t14GoldenComparable(result),golden);
});

test('PVE stress invariant checker hard-fails duplicate physical card zones',()=>{
  const result=runT14('invariant-control');
  assert.equal(result.status,'PASS');
  const fake={
    flame:1,maxFlame:5,phase:'COMBAT',
    players:[{playerId:'p0',hp:3,maxHp:3,runGold:0,growthExp:0,publicResources:{},engravings:{},cardPool:[{id:'c1',baseNumber:1}],status:'ACTIVE'}],
    combat:{turn:1,privateByPlayer:{p0:{playerId:'p0',remainingCardIds:['c1'],spentCardIds:['c1']}},turnSubmissions:{}},
    roomState:null
  };
  assert.throws(()=>assertRunInvariants(fake),e=>e instanceof StressHardFailure&&e.code==='CARD_DUPLICATION');
});
