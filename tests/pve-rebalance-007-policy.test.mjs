import test from 'node:test';import assert from 'node:assert/strict';
import {selectCoop,jointSearch} from '../scripts/black-choir-policy.mjs';
import fs from 'node:fs/promises';import crypto from 'node:crypto';import {gunzipSync} from 'node:zlib';
const cards=[1,2,3].map(n=>({cardId:String(n),finalNumber:n,expectedDamage:n,cost:0}));
const input={pattern:'F3_CHOIR',otherPoolCompositions:[[1,2,3]],required:3};
test('007 non-Choir preserves exact baseline object',()=>{const baseline={id:4};assert.equal(selectCoop({...input,pattern:'OTHER',baseline},cards),baseline);});
test('007 public policy never reads hidden selection or remaining hands',()=>{const x={...input};for(const k of ['hiddenSelected','remainingHands','privateByPlayer'])Object.defineProperty(x,k,{get(){throw Error('HIDDEN');}});assert.ok(selectCoop(x,cards));});
test('007 deterministic reservation avoids duplicate bucket',()=>{const a=selectCoop(input,cards,[{bucket:3}]);assert.notEqual(a.finalNumber,3);assert.deepEqual(a,selectCoop(input,cards,[{bucket:3}]));});
const evaluate=p=>({distinct:new Set(p).size,valid:p.length,damage:p.reduce((a,b)=>a+b,0),cost:0});
test('007 oracle finds simple three distinct witness',()=>{assert.equal(jointSearch([[1],[2],[3]],evaluate,3).classification,'LEGAL_SOLUTION_EXISTS');});
test('007 oracle NO_LEGAL only exhaustive deterministic search',()=>{const r=jointSearch([[1,2],[1,2]],evaluate,3);assert.equal(r.classification,'NO_LEGAL_SOLUTION');assert.equal(r.checked,4);assert.equal(r.incomplete,false);});
test('007 capped search never claims NO_LEGAL',()=>{assert.equal(jointSearch([Array(30).fill(1),Array(30).fill(1)],evaluate,3).classification,'SEARCH_INCOMPLETE');});
test('007 RNG dependent search never claims impossibility',()=>{assert.equal(jointSearch([[1]],()=>({rngDependent:true}),3).classification,'RNG_DEPENDENT');});
test('007 capped witness remains legal without claiming global optimality',()=>{const r=jointSearch([[1,2,3],[1,2,3],[1,2,3]],evaluate,3,6);assert.equal(r.classification,'LEGAL_SOLUTION_EXISTS');assert.equal(r.incomplete,true);});
test('007 fixture preserves 25 compatible empirical entries and exact runtime hash',async()=>{
  const fixture=JSON.parse(gunzipSync(await fs.readFile(new URL('../scripts/fixtures/rebalance006-f3-entries.json.gz',import.meta.url))));assert.equal(fixture.entries.length,25);
  const dir=new URL('../supabase/functions/game-api/pve/',import.meta.url),hash=crypto.createHash('sha256');
  for(const file of (await fs.readdir(dir)).filter(x=>x.endsWith('.js')).sort()){hash.update(file);hash.update(await fs.readFile(new URL(file,dir)));}
  assert.equal(hash.digest('hex'),fixture.runtimeHash);
  for(const entry of fixture.entries){assert.equal(entry.run.floor,3);assert.equal(entry.run.players.length,4);assert.ok(entry.run.roomId);assert.ok(entry.run.map.nodes.some(n=>n.type==='NORMAL_COMBAT'));}
});
