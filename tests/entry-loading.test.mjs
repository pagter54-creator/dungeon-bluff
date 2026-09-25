import test from 'node:test';
import assert from 'node:assert/strict';
import {entryAssetPlan,loadEntryAssets} from '../src/battle-loading.js';
import {assetLoader} from '../src/asset-loader.js';
import {beginEntryLoading,finishEntryLoading,lobbyReady} from '../supabase/functions/game-api/entry-loading.js';
const session=()=>({state:{players:{a:{characterId:'vampire',loadout:{equipped_character_skins:{vampire:'vampire1'}}},b:{characterId:'demonsword'}},entryAssets:['armored_boar','healing_spring'],stageOrder:[]}});
test('entry assets contain only selected standing/attack/damage art and this expedition encounters',()=>{
 const plan=entryAssetPlan(session());assert.equal(plan.required.length,4);assert.equal(plan.poses.length,4);
 assert.ok(plan.required.some(url=>url.endsWith('vampire1.png')));assert.ok(plan.poses.some(url=>url.endsWith('vampire1_A.png')));
 assert.ok(!plan.required.some(url=>url.endsWith('vampire0.png')));
});
test('entry download uses two workers; absent poses fall back but network failures block acknowledgement',async()=>{
 const original=assetLoader.load,oldFetch=globalThis.fetch;let active=0,max=0;
 try{
  assetLoader.load=async url=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;if(url.endsWith('vampire1_A.png'))throw Error('missing');};
  globalThis.fetch=async()=>({status:404});await loadEntryAssets(session());assert.equal(max,2);
  assetLoader.load=async()=>{throw Error('network');};globalThis.fetch=async()=>({status:503});
  await assert.rejects(loadEntryAssets(session()),/불러오지 못했습니다/);
 }finally{assetLoader.load=original;globalThis.fetch=oldFetch;}
});
test('entry gate waits for humans and automatically releases a seat converted to AI',()=>{
 const g=session(),members=[{id:'a',member_type:'human'},{id:'b',member_type:'human'},{id:'c',member_type:'ai'},{id:'d',member_type:'ai'}];
 beginEntryLoading(g);g.state.entryLoading.ready.push('a');assert.equal(finishEntryLoading(g,members),false);
 members[1].member_type='ai';assert.equal(finishEntryLoading(g,members),true);assert.equal(g.state.needsOpenTurn,true);
 assert.equal(lobbyReady({member_type:'ai'}),true);assert.equal(lobbyReady({member_type:'human'}),false);
});
