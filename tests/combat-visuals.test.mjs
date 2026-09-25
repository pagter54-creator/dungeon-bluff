import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { flipRevealCard } from '../src/card-reveal-fx.js';
import { characterAttackOrigin } from '../src/character-fx.js';
import { projectileFlight } from '../src/combat-impact.js';

test('submitted card flips face down first, then reveals its number to every player',async()=>{
 const calls=[];let number='?';const classes=new Set();
 const card={
  animate(frames,options){calls.push({frames,options,number,revealed:classes.has('revealed')});return {finished:Promise.resolve(),cancel(){}};},
  querySelector(){return {set textContent(value){number=value;}};},
  classList:{add(value){classes.add(value);}}
 };
 await flipRevealCard(card,{value:7});
 assert.equal(calls.length,2);
 assert.equal(calls[0].number,'?');assert.equal(calls[0].revealed,false);
 assert.equal(calls[1].number,7);assert.equal(calls[1].revealed,true);
 assert.match(calls[0].frames.at(-1).transform,/rotateY\(88deg\)/);
 assert.match(calls[1].frames.at(-1).transform,/rotateY\(0\) scale\(1\)/);
 const css=await readFile(new URL('../src/battle-layout.css',import.meta.url),'utf8');
 assert.match(css,/\.party-grid \.reveal-card\.revealed \.reveal-value\{display:block\}/);
});

test('attack starts within the character artwork, above the card panel',()=>{
 const art={getBoundingClientRect:()=>({left:100,top:200,width:240,height:300})};
 const panel={querySelector:selector=>selector==='.player-art-stage .player-illustration'?art:null};
 assert.deepEqual(characterAttackOrigin(panel),{x:220,y:329});
 assert.equal(characterAttackOrigin({querySelector:()=>null}),null);
});

test('projectile trails follow the same path and are removed only after arrival',async()=>{
 const ghosts=[];let arrive,finished=false;
 const frames=[{transform:'translate(0,0)',opacity:1},{transform:'translate(400px,-300px)',opacity:1}];
 const element={
  parentNode:{insertBefore(ghost){ghosts.push(ghost);}},
  cloneNode(){return {classList:{add(){}},animate(path,options){this.path=path;this.options=options;return {finished:Promise.resolve(),cancel(){}};},getAnimations(){return [];},remove(){this.removed=true;}};},
  animate(path){assert.equal(path,frames);return {finished:new Promise(resolve=>{arrive=resolve;}),cancel(){}};}
 };
 const flight=projectileFlight(element,frames,{duration:600}).then(()=>{finished=true;});
 assert.equal(ghosts.length,3);assert.equal(finished,false);
 for(const ghost of ghosts){assert.equal(ghost.path.at(-1).transform,frames.at(-1).transform);assert.ok(ghost.path[0].opacity<1);assert.ok(!ghost.removed);}
 arrive();await flight;assert.equal(finished,true);assert.ok(ghosts.every(g=>g.removed));
});
