import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverGameBackgrounds,backgroundForSession } from '../src/game-background.js';

test('numbered expedition backgrounds are discovered until the first missing file',async()=>{
 const requests=[];
 const backgrounds=await discoverGameBackgrounds(async(url,options)=>{
  requests.push({url,method:options.method});
  return {ok:!/background4\.png$/.test(url)};
 });
 assert.equal(backgrounds.length,3);
 assert.deepEqual(requests.map(request=>request.method),['HEAD','HEAD','HEAD','HEAD']);
 assert.match(backgrounds[2],/background3\.png$/);
 assert.equal(backgroundForSession('run-1',backgrounds),backgroundForSession('run-1',backgrounds));
 assert.equal(backgroundForSession('run-1',[]),null);
});
