import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/prophet-vampire-fixture.mjs';
import {prophecySlot,isProphecySlot} from '../supabase/functions/game-api/prophet-vampire-core.js';
import {confirmShopCard} from '../supabase/functions/game-api/pve/rooms.js';
import {prepareFragmentCards,resetProphecyCycle,consumeFragment,fragmentRandomEligible} from '../supabase/functions/game-api/pve/prophet-vampire-rework.js';
import {createSession} from '../supabase/functions/game-api/engine.js';
import {CHARACTER_CATALOG,startCycle} from '../supabase/functions/game-api/characters.js';
for(const state of ['BASE_ZERO','PAST_FRAGMENT','USED_ZERO'])test(`006 locked shop slot ${state}, retry has no mutation`,()=>{
 const f=fixture(169);f.run.phase='SHOP';f.s.zeroState=state;f.run.roomState={type:'SHOP',cardStock:[],relicStock:[]};
 const before=structuredClone(f.run);
 for(let i=0;i<2;i++)assert.throws(()=>confirmShopCard(f.run,f.p.playerId,'invalid',prophecySlot(f.p).id),e=>e.code==='PROPHET_PROPHECY_SLOT_LOCKED');
 assert.deepEqual(f.run,before);
});
test('006 purchased zero never becomes fragment or protected slot',()=>{
 const f=fixture(169),zero=prophecySlot(f.p);f.p.cardPool.push({id:'purchased-zero',baseNumber:0,source:'SHOP'});f.s.fragment={value:5,createdTurn:1};
 const cards=[{playerId:f.p.playerId,cardInstanceId:zero.id},{playerId:f.p.playerId,cardInstanceId:'purchased-zero'}];prepareFragmentCards(f.run,cards);
 assert.equal(cards[0].isPastFragment,true);assert.equal(cards[1].isPastFragment,false);assert.equal(isProphecySlot(f.p,'purchased-zero'),false);
});
test('006 aug169 reset preserves fragment identity then restores used zero',()=>{
 const f=fixture(169),zero=prophecySlot(f.p),priv={cycleIndex:1,remainingCardIds:[zero.id],spentCardIds:f.p.cardPool.filter(c=>c.id!==zero.id).map(c=>c.id)};
 f.s.fragment={value:5,createdTurn:1};f.s.zeroState='PAST_FRAGMENT';
 assert.equal(resetProphecyCycle(f.run,f.p,priv),true);assert.equal(f.s.fragment.value,5);assert.equal(prophecySlot(f.p).id,zero.id);
 consumeFragment(f.run,f.p,{isPastFragment:true});assert.equal(f.s.zeroState,'USED_ZERO');
 priv.remainingCardIds=[];assert.equal(resetProphecyCycle(f.run,f.p,priv),true);assert.equal(f.s.zeroState,'BASE_ZERO');
 const copy=structuredClone(f.run);assert.equal(prophecySlot(copy.players[0]).id,zero.id);
});
test('006 fragment stun eligibility is unchanged without aug162',()=>{
 const f=fixture(169);f.s.fragment={value:5,createdTurn:1};assert.equal(fragmentRandomEligible(f.run,f.p,prophecySlot(f.p).id),true);
});
test('006 PvP normal reset preserves prophecy physical identity and restores zero',()=>{
 const session=createSession('test',Array.from({length:4},(_,i)=>({id:'p'+i,user_id:'u'+i,member_type:'human',character_id:i===0?'seer':'warrior',seat_index:i})),CHARACTER_CATALOG,()=>0.5),p=session.state.players.p0;
 const id=prophecySlot(p).id;assert.deepEqual(p.cycleCards.map(c=>c.value),[0,1,2,3,4]);
 p.cycleCards[0].value=5;p.characterRuntimeState.prophetCore.fragment={value:5};p.characterRuntimeState.prophetCore.zeroState='PAST_FRAGMENT';
 startCycle(p,p.character);assert.equal(prophecySlot(p).id,id);assert.equal(prophecySlot(p).value,0);assert.equal(p.characterRuntimeState.prophetCore.zeroState,'BASE_ZERO');
});
for(const valid of [true,false])test(`006 submitted fragment consumed regardless validity ${valid}`,()=>{
 const f=fixture(169),id=prophecySlot(f.p).id;f.s.fragment={value:4};consumeFragment(f.run,f.p,{cardInstanceId:id,isPastFragment:true,valid,invalidReason:valid?null:'COLLISION'});
 assert.equal(f.s.fragment,undefined);assert.equal(f.s.zeroState,'USED_ZERO');assert.equal(prophecySlot(f.p).id,id);
 const before=structuredClone(f.run);consumeFragment(f.run,f.p,{isPastFragment:true,valid});assert.deepEqual(f.run,before);
});
