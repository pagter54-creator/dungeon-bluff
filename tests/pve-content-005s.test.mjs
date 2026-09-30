import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const batches=['005b','005c','005d'].map(batch=>JSON.parse(readFileSync(new URL('../docs/pve-augment-beta-'+batch+'.json',import.meta.url),'utf8')));
const entries=batches.flatMap(batch=>batch.entries);
const classes=['adventurer','warrior','rogue','mage','berserker','prophet','imp','gambler','gunner','martial_artist','vampire','demon_swordsman','twins'];
const id=n=>'aug-'+String(n).padStart(3,'0');

test('CONTENT-005S imports all 390 exact stable slots without inventing source cells',()=>{
  assert.equal(entries.length,390);
  assert.equal(new Set(entries.map(x=>x.augmentId)).size,390);
  assert.deepEqual(batches.map(x=>x.entries.length),[150,120,120]);
  assert.ok(batches.every(x=>x.sourceSha256==='53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a'));
  for(let i=0;i<entries.length;i++){
    const x=entries[i],within=i%30,offset=within%10;
    assert.equal(x.augmentId,id(i+1));
    assert.equal(x.classId,classes[Math.floor(i/30)]);
    assert.equal(x.stage,offset===0?1:offset<=3?2:offset<=6?3:4);
    assert.equal(x.source.number,i+1);
    assert.equal(x.source.row,i+2);
    assert.equal(x.reconciliation,'MATCHED');
    assert.ok(x.name&&x.archetype&&x.canonicalDescription&&x.betaValue&&x.limit&&x.telemetry,x.augmentId);
    assert.equal(x.source.betaStatus,'BETA v0.1');
    assert.ok(['EXECUTABLE','DATA_ONLY','MISSING'].includes(x.priorRuntimeStatus));
    assert.equal(x.contractStatus,'SPEC_INCOMPLETE');
    for(const key of x.unresolvedFields)assert.equal(x[key],null,x.augmentId+':'+key);
  }
  assert.equal(entries.filter(x=>x.priorRuntimeStatus==='EXECUTABLE').length,19);
  assert.equal(entries.filter(x=>x.priorRuntimeStatus==='DATA_ONLY').length,198);
  assert.equal(entries.filter(x=>x.priorRuntimeStatus==='MISSING').length,173);
});

test('CONTENT-005S forecasts 130 conceptual candidate pools with three cards each',()=>{
  const pools=new Map();
  for(const x of entries){
    const key=x.classId+':'+x.stage+':'+(x.stage===1?'ALL':x.archetype);
    pools.set(key,(pools.get(key)||0)+1);
  }
  assert.equal(pools.size,130);
  assert.ok([...pools.values()].every(n=>n===3));
  assert.equal(entries.filter(x=>x.highRisk).length,27);
});

test('CONTENT-005S preserves selected hard BETA numbers and flags unresolved triggers',()=>{
  const byId=Object.fromEntries(entries.map(x=>[x.augmentId,x]));
  for(const [n,fragment] of [[71,'최대 3'],[231,'두 카드 숫자 합'],[261,'0~3'],[291,'1당 추가 피해 +2'],[321,'혈액 4 소비'],[351,'포식 6 도달'],[381,'추가 피해 +2']]){
    assert.ok(byId[id(n)].betaValue.includes(fragment),id(n));
  }
  assert.ok(entries.every(x=>x.trigger===null&&x.unresolvedFields.includes('trigger')));
});
