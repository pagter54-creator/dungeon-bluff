import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_CATALOG,replenishHand,syncCardViews} from '../supabase/functions/game-api/characters.js';
import {GAMBLER_DECK,settleGamblerHand,gamblerRegistered,hideGamblerDecks} from '../supabase/functions/game-api/gambler-deck.js';
import {createSession,resolveTurn} from '../supabase/functions/game-api/engine.js';
import {cardPool,revelationGauge,activeButton} from '../src/character-ui.js';
const random=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
function game(id){
  const members=[id,'adventurer','adventurer','adventurer'].map((character_id,i)=>({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  const g=createSession('room',members,CHARACTER_CATALOG,random(5));
  g.state.currentStage={contentId:'armored_boar',category:'monster'};g.state.monster={id:'armored_boar',hp:1000,maxHp:1000,attackIn:99};
  return {g,p:g.state.players.p0};
}
const all=p=>[...p.characterRuntimeState.drawPile,...p.characterRuntimeState.discardPile,...p.cycleCards.map(c=>c.value)];
function hand(p,values){p.cycleCards=values.map((value,i)=>({id:'card-'+i,value,used:false,slot:i}));syncCardViews(p);}
function bare(){const {p}=game('gambler');Object.assign(p.characterRuntimeState,{drawPile:[],discardPile:[],sixProgress:[],sevenProgress:[]});hand(p,[]);return p;}
function submit(g,values,skill=false){return values.map((value,i)=>({member_id:'p'+i,turn_index:g.turn_index,card_value:value,card_id:g.state.players['p'+i].cycleCards.find(c=>!c.used&&c.value===value).id,use_skill:i===0&&skill}));}

test('gambler starts with eleven physical cards and no seven, two in hand, no ordinary cycle',()=>{
  const {p}=game('gambler');assert.deepEqual(all(p).sort((a,b)=>a-b),GAMBLER_DECK);
  assert.equal(p.cycleCards.length,2);assert.equal(p.characterRuntimeState.drawPile.length,9);assert.equal(p.cycleIndex,0);
  assert.ok(!all(p).includes(7));
  assert.equal(p.characterRuntimeState.observing,undefined);
});
test('only the submitted physical high card vanishes; unused high and all lows enter discard',()=>{
  for(const values of [[6,7],[7,6],[2,7],[2,4]]){
    const p=bare();hand(p,values);settleGamblerHand(p,'card-0',()=>.5);
    assert.deepEqual(p.characterRuntimeState.discardPile,values[0]>=6?values.slice(1):values);
  }
});
test('drawing across empty or one-card piles reshuffles discards without losing the first draw',()=>{
  for(const remaining of [[],[4]]){const p=bare();p.characterRuntimeState.drawPile=[...remaining];p.characterRuntimeState.discardPile=[1,2,3];
    replenishHand(p,()=>0);assert.equal(p.cycleCards.length,2);
    if(remaining.length)assert.equal(p.cycleCards[0].value,4);
    assert.deepEqual(all(p).sort(),[...remaining,1,2,3].sort());assert.equal(p.characterRuntimeState.discardPile.length,0);
  }
});
test('six and seven charge independently from distinct low submissions and reset only their own progress',()=>{
  const p=bare(),r=p.characterRuntimeState;
  for(const value of [1,1,3]){hand(p,[value]);settleGamblerHand(p,'card-0',()=>.4);}
  assert.deepEqual(r.sixProgress,[1,3]);assert.deepEqual(r.sevenProgress,[1,3]);
  hand(p,[5]);const fx=[];settleGamblerHand(p,'card-0',()=>.4,fx);
  assert.deepEqual(r.sixProgress,[]);assert.deepEqual(r.sevenProgress,[1,3,5]);assert.ok(r.discardPile.includes(6));assert.equal(p.cycleCards.length,0);assert.equal(fx[0].chargedValue,6);
  for(const value of [2,4]){hand(p,[value]);settleGamblerHand(p,'card-0',()=>.4);}
  assert.deepEqual(r.sixProgress,[2,4]);assert.deepEqual(r.sevenProgress,[]);assert.ok(r.discardPile.includes(7));
});
test('charged high cards wait in discard until the draw pile is exhausted',()=>{
  const p=bare(),r=p.characterRuntimeState;
  r.drawPile=[2,3];r.sevenProgress=[1,2,3,4];hand(p,[5]);
  settleGamblerHand(p,'card-0',()=>0);
  assert.deepEqual(r.drawPile,[2,3]);assert.ok(r.discardPile.includes(7));
  replenishHand(p,()=>0);
  assert.deepEqual(p.cycleCards.map(c=>c.value).sort(),[2,3]);
  assert.ok(!p.cycleCards.some(c=>c.value===7));
});
test('registration cap includes both piles and the hand, pauses progress, resumes without reserved charge',()=>{
  for(const high of [6,7]){const p=bare(),r=p.characterRuntimeState,key=high===6?'sixProgress':'sevenProgress';
    r.drawPile=[high];hand(p,[1,high]);assert.equal(gamblerRegistered(p,high),2);settleGamblerHand(p,'card-0');assert.deepEqual(r[key],[]);
    for(const value of [2,3,4,5]){hand(p,[value]);settleGamblerHand(p,'card-0');}assert.equal(gamblerRegistered(p,high),2);assert.deepEqual(r[key],[]);
    r.discardPile.splice(r.discardPile.indexOf(high),1);hand(p,[high]);settleGamblerHand(p,'card-0');assert.equal(gamblerRegistered(p,high),1);assert.deepEqual(r[key],[]);
    hand(p,[4]);settleGamblerHand(p,'card-0');assert.deepEqual(r[key],[4]);
  }
});
test('ten thousand turns conserve ten ordinary cards and never exceed two registered highs',()=>{
  const {p}=game('gambler'),rng=random(19);const ids=new Set();
  for(let turn=0;turn<10000;turn++){
    for(const c of p.cycleCards){assert.ok(!ids.has(c.id));ids.add(c.id);}
    settleGamblerHand(p,p.cycleCards[Math.floor(rng()*2)].id,rng);replenishHand(p,rng);
    assert.equal(p.cycleCards.length,2);
    for(let v=1;v<=5;v++)assert.equal(all(p).filter(n=>n===v).length,2);
    for(const v of [6,7])assert.ok(gamblerRegistered(p,v)<=2);
  }
});
test('collision charges normally; vampire exchange changes charge number but consumes the original physical card',()=>{
  const {g,p}=game('gambler');p.characterRuntimeState.drawPile=p.characterRuntimeState.drawPile.filter(v=>v!==7);hand(p,[2,7]);p.characterRuntimeState.sixProgress=[1,3];
  const r=resolveTurn(g,submit(g,[2,2,4,5]));assert.equal(r.cards[0].valid,false);assert.ok(r.effects.some(e=>e.chargedValue===6));
  assert.deepEqual(p.characterRuntimeState.sevenProgress,[2]);
  const second=game('gambler');hand(second.p,[7,2]);
  const vampire=second.g.state.players.p1;vampire.skillId='blood_command';vampire.characterRuntimeState.thrallId='p0';
  const before=gamblerRegistered(second.p,7),subs=submit(second.g,[7,1,3,4]);subs[1].use_skill=true;
  const swapped=resolveTurn(second.g,subs);assert.equal(swapped.cards[0].value,1);
  assert.equal(gamblerRegistered(second.p,7),before-1);assert.deepEqual(second.p.characterRuntimeState.sevenProgress,[1]);
});
test('response clones hide ordered piles in current state and every replay, revealing counts only to owner',()=>{
  const {g}=game('gambler');g.state.eventLog=[{beforePlayers:structuredClone(g.state.players),afterPlayers:structuredClone(g.state.players)}];g.state.lastResult=structuredClone(g.state.eventLog[0]);
  for(const viewer of ['p0','p1']){
    const view=structuredClone(g);hideGamblerDecks(view,viewer);
    assert.ok(!JSON.stringify(view).includes('drawPile'));assert.ok(!JSON.stringify(view).includes('discardPile'));
    for(const players of [view.state.players,view.state.lastResult.beforePlayers,view.state.eventLog[0].afterPlayers]){
      const info=players.p0.gamblerDeck;assert.equal(info.drawCount,9);
      assert.equal(Array.isArray(info.drawComposition),viewer==='p0');assert.equal(info.sixCount!==undefined,viewer==='p0');
      assert.deepEqual(info.sixProgress,[]);assert.deepEqual(info.sevenProgress,[]);
      assert.equal(typeof info.sixMax,'boolean');assert.equal(typeof info.sevenMax,'boolean');
    }
  }
  assert.equal(g.state.players.p0.characterRuntimeState.drawPile.length,9);
});
test('soul slash uses pre-attack level, grows without cap, and carries progress across level boundaries',()=>{
  for(const stacks of [0,7,8,15,16,31,39,40,80]){
    const {g,p}=game('demonsword');p.characterRuntimeState.predation=stacks;
    const r=resolveTurn(g,submit(g,[4,1,2,3],true));assert.equal(r.cards[0].damageValue,5+Math.floor(stacks/8));
    assert.equal(p.characterRuntimeState.predation,stacks+1);assert.equal(r.effects.filter(e=>e.skillId==='predation').length,1);
    assert.equal(r.effects.find(e=>e.skillId==='predation').gain,1);
    assert.match(activeButton(p,false,false),new RegExp('Lv.'+Math.floor((stacks+1)/8)));
    assert.match(revelationGauge(p),new RegExp('aria-valuenow="'+((stacks+1)%8)+'"'));
  }
});
test('kill contributions give exactly three or five including tied strongest, never stacked gains',()=>{
  for(const strongest of [false,true]){const {g,p}=game('demonsword');g.state.monster.hp=1;p.characterRuntimeState.predation=6;
    const r=resolveTurn(g,submit(g,strongest?[4,1,2,3]:[1,5,2,3]));const fx=r.effects.filter(e=>e.skillId==='predation');
    assert.equal(fx.length,1);assert.equal(fx[0].gain,strongest?8:4);assert.equal(p.characterRuntimeState.predation,strongest?14:10);
  }
  const {g,p}=game('demonsword');g.state.monster.hp=1;
  const r=resolveTurn(g,submit(g,[4,5,2,3],true));assert.deepEqual(r.winnerMemberIds,['p0','p1']);assert.equal(p.characterRuntimeState.predation,8);
});
test('no predation from collisions, sealed damage or armor-blocked damage',()=>{
  for(const kind of ['clash','seal','armor']){const {g,p}=game('demonsword');
    if(kind==='seal'){g.state.currentStage.category='boss';g.state.monster.pending={kind:'seal',number:4,turn:g.turn_index};}
    if(kind==='armor'){g.state.currentStage.category='boss';g.state.monster.armorTurn=g.turn_index;}
    const r=resolveTurn(g,submit(g,kind==='clash'?[4,4,2,3]:kind==='armor'?[1,2,3,4]:[4,1,2,3]));
    assert.equal(p.characterRuntimeState.predation,0,kind);assert.ok(!r.effects.some(e=>e.skillId==='predation'),kind);
  }
});
test('event valid cards grant one predation, including a level-up that refreshes a spent Soul Slash',()=>{
  for(const [stacks,valid,expected,ready] of [[6,true,7,false],[7,true,8,true],[7,false,7,false]]){
    const {g,p}=game('demonsword');g.state.monster=null;g.state.currentStage={contentId:'suspicious_merchant',category:'event'};
    p.characterRuntimeState.predation=stacks;p.activeSkillState.available=false;
    const r=resolveTurn(g,submit(g,valid?[4,1,2,3]:[4,4,2,3]));
    assert.equal(p.characterRuntimeState.predation,expected);
    assert.equal(p.activeSkillState.available,ready);
    assert.equal(r.effects.filter(e=>e.skillId==='predation').length,valid?1:0);
    if(valid)assert.equal(r.effects.find(e=>e.skillId==='predation').gain,1);
  }
  const {g,p}=game('demonsword');g.state.monster=null;g.state.currentStage={contentId:'suspicious_merchant',category:'event'};
  p.knockedOut=true;p.hp=0;
  const r=resolveTurn(g,submit(g,[4,1,2,3]));
  assert.equal(p.characterRuntimeState.predation,0);assert.ok(!r.effects.some(e=>e.skillId==='predation'));
});
test('a strongest kill level-up reactivates Soul Slash after using it in the same cycle',()=>{
  const {g,p}=game('demonsword');g.state.monster.hp=1;p.characterRuntimeState.predation=7;
  const r=resolveTurn(g,submit(g,[4,1,2,3],true));
  assert.equal(r.cards[0].damageValue,5);
  assert.equal(p.characterRuntimeState.predation,15);
  assert.equal(p.activeSkillState.available,true);
});
test('gambler UI has two pile controls and two cards; opponents cannot inspect composition',()=>{
  const {g}=game('gambler');const own=structuredClone(g);hideGamblerDecks(own,'p0');
  const html=cardPool(own.state.players.p0,{own:true});assert.equal((html.match(/class="gambler-pile"/g)||[]).length,2);assert.equal((html.match(/data-card-instance=/g)||[]).length,2);
  assert.match(revelationGauge(own.state.players.p0),/charge-dice/);
  const other=structuredClone(g);hideGamblerDecks(other,'p1');assert.match(cardPool(other.state.players.p0),/data-pile="draw" disabled/);
  assert.match(revelationGauge(other.state.players.p0),/charge-dice/);
  assert.equal(other.state.players.p0.gamblerDeck.drawComposition,undefined);
});
