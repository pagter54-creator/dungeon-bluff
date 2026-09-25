import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAssetLoader} from '../src/asset-loader.js';
import {MONSTER_IMAGES} from '../src/monster-assets.js';
import {MONSTER_ATTACKS} from '../src/monster-fx.js';
import {MONSTERS} from '../supabase/functions/game-api/content.js';

test('background and foreground share requests and keep global concurrency at two',async()=>{
 let active=0,peak=0;const requests=[];
 const loader=createAssetLoader({imageFactory:()=>({set src(url){
  requests.push(url);active++;peak=Math.max(peak,active);
  setTimeout(()=>{active--;this.onload();},2);
 }})});
 const progress=[];
 const [background,foreground]=await Promise.all([loader.batch(['a','b','c']),loader.batch(['a','b','d'],{onProgress:(done,total)=>progress.push([done,total])})]);
 assert.deepEqual(background,[]);assert.deepEqual(foreground,[]);assert.equal(peak,2);
 assert.equal(requests.length,4);assert.equal(loader.ready.size,4);
 assert.deepEqual(progress.at(-1),[3,3]);await loader.load('a');assert.equal(requests.length,4);
});
test('missing and stalled images are not cached as ready and can be retried',async()=>{
 let mode='fail';
 const loader=createAssetLoader({timeout:10,imageFactory:()=>({set src(url){
  if(!url)return;if(mode==='stall')return;
  queueMicrotask(()=>mode==='fail'?this.onerror():this.onload());
 }})});
 assert.deepEqual(await loader.batch(['missing']),['missing']);assert.equal(loader.ready.size,0);
 mode='stall';assert.deepEqual(await loader.batch(['missing']),['missing']);assert.equal(loader.ready.size,0);
 mode='ok';assert.deepEqual(await loader.batch(['missing']),[]);assert.equal(loader.ready.size,1);
});
test('music is downloaded without playback and HTTP errors stay retryable',async()=>{
 let ok=false,reads=0;
 const loader=createAssetLoader({fetcher:async()=>({ok,arrayBuffer:async()=>{reads++;return new ArrayBuffer(1);}})});
 assert.deepEqual(await loader.batch(['bgm'],{audio:true}),['bgm']);assert.equal(reads,0);
 ok=true;assert.deepEqual(await loader.batch(['bgm'],{audio:true}),[]);assert.equal(reads,1);
});
test('every monster has existing PNG art and a distinct attack style',async()=>{
 const styles=new Set();
 for(const monster of Object.values(MONSTERS)){
  const bytes=await readFile(new URL(MONSTER_IMAGES[monster.shape]));assert.equal(bytes.subarray(1,4).toString(),'PNG');
  styles.add(MONSTER_ATTACKS[monster.shape].kind);
 }assert.equal(styles.size,8);
});
