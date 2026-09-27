import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {main as stressMain} from '../scripts/pve-stress.mjs';
import {
  STRESS_SCENARIOS,StressHardFailure,assertRunInvariants,replayScenario,runT00,runT14,CANONICAL_RULES,
  scenarioAvailability,semanticFingerprint,skippedScenarioReport,t14GoldenComparable,assertNoHiddenInfo
} from '../scripts/pve-stress-lib.mjs';

const golden=JSON.parse(fs.readFileSync(new URL('./fixtures/pve-stress-t14-golden.json',import.meta.url),'utf8'));

test('PVE stress scenario availability activates T00 only when its four builds are executable',()=>{
  const status=Object.fromEntries(STRESS_SCENARIOS.map(s=>[s.id,scenarioAvailability(s)]));
  assert.equal(status.T00.available,true);
  assert.equal(status.T14.available,true);
  assert.equal(status.T05.available,true);
  assert.equal(status.T09.available,true);
  for(const id of ['T02','T03','T04','T06'])assert.equal(status[id].available,false,id);
  assert.deepEqual(status.T00.missingCharacters,[]);
  assert.deepEqual(status.T00.missingBuildEffects,[]);
  assert.deepEqual(status.T09.missingCharacters,[]);
  assert.deepEqual(status.T09.missingCapabilities,[]);
  assert.ok(skippedScenarioReport().some(x=>x.scenarioId==='T06'));
});

test('PVE stress T00 reference runner executes three deterministic F1 encounters with executable effects',()=>{
  const result=runT00('unit-t00-reference');
  assert.equal(result.status,'PASS');
  assert.equal(result.combats.length,3);
  assert.deepEqual(result.combats.map(x=>x.roomType),['NORMAL_COMBAT','ELITE_COMBAT','BOSS']);
  for(const id of ['aug-001-veteran-valid','aug-031-toughness-cap','aug-061-sneaky-success','aug-091-mana-cap']){
    assert.ok((result.effectTriggerCounts[id]||0)>=1,id);
  }
  assert.ok((result.expGainByCharacter.adventurer||0)>=1);
  assert.ok(result.referenceTurns.length>0);
  assert.ok(result.referenceCommunication.intentCount>0);
  assert.ok(result.referenceCommunication.collisionRateAfterNegotiation<=result.referenceCommunication.collisionRateBeforeNegotiation);
  for(const turn of result.referenceTurns)for(const record of turn.records){
    assert.equal(Object.hasOwn(record,'cardInstanceId'),false);
    assert.ok(Array.isArray(record.availableNumbers));
    assert.ok(Array.isArray(record.preferredNumbers));
    assert.equal(typeof record.negotiationChanged,'boolean');
    assert.equal(typeof record.actualCollision,'boolean');
  }
});

test('PVE stress T00 same-seed replay is deterministic',()=>{
  const a=replayScenario('T00','golden-t00-seed');
  const b=replayScenario('T00','golden-t00-seed');
  assert.equal(a.replayFingerprint,b.replayFingerprint);
});

test('PVE canonical rule registry contains RULE-01 through RULE-05',()=>{
  assert.deepEqual(CANONICAL_RULES.map(x=>x.id),['RULE-01','RULE-02','RULE-03','RULE-04','RULE-05']);
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

test('PVE stress invariant checker hard-fails hidden submissions and invalid resource caps',()=>{
  const run=runT14('invariant-resource-control');assert.equal(run.status,'PASS');
  const fakeView={players:[{playerId:'p0',cardPool:[]}],combat:{turnSubmissions:{p0:{cardInstanceId:'secret'}}}};
  assert.throws(()=>assertNoHiddenInfo(fakeView,'p0'),e=>e instanceof StressHardFailure&&e.code==='HIDDEN_INFORMATION_LEAK');
  const fake={flame:1,maxFlame:5,phase:'COMBAT',players:[{playerId:'p0',hp:3,maxHp:3,runGold:0,growthExp:0,publicResources:{mana:5},engravings:{},cardPool:[],status:'ACTIVE'}],combat:{turn:1,privateByPlayer:{p0:{playerId:'p0',remainingCardIds:[],spentCardIds:[]}},turnSubmissions:{}}};
  assert.throws(()=>assertRunInvariants(fake),e=>e instanceof StressHardFailure&&e.code==='INVALID_RESOURCE');
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


test('PVE stress CLI writes required JSON and seed CSV outputs',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pve-stress-'));
  const code=await stressMain(['--scenario','T14','--seed','cli-golden-seed','--output',dir]);
  assert.equal(code,0);
  for(const name of [
    'pve_stress_summary.json','pve_failed_seeds.json','pve_stress_seeds.csv',
    'pve_skipped_scenarios.json','pve_spec_ambiguities.json','pve_canonical_rules.json'
  ])assert.equal(fs.existsSync(path.join(dir,name)),true,name);
  assert.equal(fs.existsSync(path.join(dir,'scenarios','T14.csv')),true);
  const summary=JSON.parse(fs.readFileSync(path.join(dir,'pve_stress_summary.json'),'utf8'));
  assert.equal(summary.hardFailCount,0);
  assert.equal(summary.scenarios[0].scenarioId,'T14');
  const failed=JSON.parse(fs.readFileSync(path.join(dir,'pve_failed_seeds.json'),'utf8'));
  assert.deepEqual(failed,[]);
});

test('PVE stress T05 CLI emits mutation history and fixture artifacts',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pve-stress-t05-'));
  const code=await stressMain(['--scenario','T05','--seed','cli-t05-seed','--output',dir]);
  assert.equal(code,0);
  for(const name of ['pve_number_mutation_turns.jsonl','pve_t05_fixtures.json'])assert.equal(fs.existsSync(path.join(dir,name)),true,name);
  const fixtures=JSON.parse(fs.readFileSync(path.join(dir,'pve_t05_fixtures.json'),'utf8'));
  assert.equal(fixtures.scenarioId,'T05');
  assert.ok(fixtures.fixtures.length>=8);
});

test('PVE stress T00 CLI emits turn-level reference communication telemetry',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pve-stress-reference-'));
  const code=await stressMain(['--scenario','T00','--seed','cli-reference-seed','--output',dir]);
  assert.equal(code,0);
  const file=path.join(dir,'pve_reference_turns.jsonl');
  assert.equal(fs.existsSync(file),true);
  const rows=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(rows.length>0);
  assert.equal(rows[0].scenarioId,'T00');
  assert.ok(rows[0].records.every(x=>Array.isArray(x.availableNumbers)&&Array.isArray(x.preferredNumbers)));
});
