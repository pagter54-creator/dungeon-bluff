import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceParticle} from '../src/particle-time.js';
test('particle trajectory and lifetime match at 30, 60, 144 and 240 Hz',()=>{
 const samples=[30,60,144,240].map(hz=>{
  const p={x:0,y:0,vx:3,vy:-4,gravity:.13,life:48};
  for(let i=0;i<hz;i++)advanceParticle(p,1000/hz);
  return p;
 });
 for(const p of samples)for(const key of ['x','y','vy','life'])assert.ok(Math.abs(p[key]-samples[0][key])<1e-8);
});
test('zero elapsed time never advances particles and a stalled frame ages them accurately',()=>{
 const p={x:0,y:0,vx:3,vy:0,gravity:0,life:48};
 advanceParticle(p,0);assert.equal(p.life,48);
 advanceParticle(p,1000);assert.ok(p.life<0);
});
