import test from 'node:test';
import assert from 'node:assert/strict';
import {setKnockoutPose,showPlayerPose} from '../src/player-pose-fx.js';
import {skinIllustration} from '../src/skins.js';
test('knockout replaces one base image, survives rerender and stale damage restoration, then revives',async()=>{
 const old=globalThis.Image;
 globalThis.Image=class{set src(url){queueMicrotask(()=>url.includes('missing')?this.onerror():this.onload());}};
 const base={src:'standing.png',style:{},animate:()=>({finished:Promise.resolve()})};
 const frame={dataset:{standingSrc:'standing.png',damageSrc:new URL('../skin image/berserker0_D.png',import.meta.url).href},isConnected:true,querySelector:()=>base};
 const panel={querySelector:()=>frame};
 try {
  const restore=await showPlayerPose(panel,'damage');assert.equal(base.src,frame.dataset.damageSrc);
  await setKnockoutPose(panel,true);await restore();assert.equal(base.src,frame.dataset.damageSrc);
  await setKnockoutPose(panel,true);assert.equal(base.src,frame.dataset.damageSrc);
  assert.match(skinIllustration('berserker',null,true),/class="player-illustration-base" src="[^\"]*berserker0_D.png"/);
  await setKnockoutPose(panel,false);assert.equal(base.src,'standing.png');
  frame.dataset.damageSrc='https://example.test/missing_D.png';await setKnockoutPose(panel,true);assert.equal(base.src,'standing.png');
 }finally{globalThis.Image=old;}
});
