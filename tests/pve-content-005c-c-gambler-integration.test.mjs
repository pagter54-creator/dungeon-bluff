import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {GAMBLER_CONTRACT_IDS,GAMBLER_CONTRACTS} from '../supabase/functions/game-api/pve/gambler-contracts.js';
import {addGamblerLuck} from '../supabase/functions/game-api/pve/gambler.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';

function make(ids=['gambler','prophet','imp','mage'],augments=[]){
  const players=ids.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  players[0].augments=[...augments];
  const run={id:'gambler-int',seed:'gambler-int-seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'gambler-node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});
  run.combat.id='gambler-int-combat';beginTurn(run);return {run,players,p:players[0]};
}
const priv=(run,p)=>run.combat.privateByPlayer[p.playerId];
const first=(run,p)=>priv(run,p).remainingCardIds[0];

test('005C-C registry/candidates are exactly Gambler aug-211..240 with 3/9/9/9 and 3x10 archetypes',()=>{
  assert.deepEqual(GAMBLER_CONTRACT_IDS,[...Array(30)].map((_,i)=>'aug-'+String(211+i).padStart(3,'0')));
  const defs=GAMBLER_CONTRACT_IDS.map(id=>AUGMENT_BY_ID[id]);assert.ok(defs.every(Boolean));assert.ok(defs.every(x=>x.executable===true));
  assert.deepEqual([1,2,3,4].map(t=>defs.filter(x=>x.tier===t).length),[3,9,9,9]);
  const builds=[...new Set(defs.map(x=>x.build))];assert.deepEqual(new Set(builds),new Set(['운명의 승부사','카드 카운터','올인']));
  assert.ok(builds.every(b=>defs.filter(x=>x.build===b).length===10));
  for(const contract of Object.values(GAMBLER_CONTRACTS)){
    const candidates=augmentCandidates('gambler',contract.stage,contract.stage===1?undefined:contract.archetype);
    assert.ok(candidates.some(x=>x.id===contract.augmentId),contract.augmentId+' must be candidate-reachable');
  }
});

test('005C-C all three full archetype lines expose every Stage2-4 continuation as executable',()=>{
  const defs=GAMBLER_CONTRACT_IDS.map(id=>AUGMENT_BY_ID[id]);
  for(const build of ['운명의 승부사','카드 카운터','올인']){
    const line=defs.filter(x=>x.build===build);assert.equal(line.length,10);
    for(const tier of [1,2,3,4]){
      const expected=line.filter(x=>x.tier===tier).map(x=>x.id).sort();
      const actual=augmentCandidates('gambler',tier,tier===1?undefined:build).filter(x=>x.build===build&&x.executable===true).map(x=>x.id).sort();
      assert.deepEqual(actual,expected,build+' tier '+tier);
    }
  }
});

test('005C-C mixed Gambler + Seer + Imp + Mage combat keeps All-In partner out of collision participants',()=>{
  const {run,players}=make(['gambler','prophet','imp','mage'],['aug-231']);
  const gamblerHand=[...priv(run,players[0]).remainingCardIds];assert.equal(gamblerHand.length,2);
  const judgment=gamblerHand[0],partner=gamblerHand[1];
  submitCard(run,'p0',judgment);
  for(let i=1;i<players.length;i++)submitCard(run,'p'+i,first(run,players[i]));
  const out=resolveBasicTurn(run),g=out.cards.find(x=>x.playerId==='p0');
  assert.ok(g);assert.equal(g.allIn,true);assert.deepEqual(new Set(g.allInCardIds),new Set([judgment,partner]));
  assert.equal(out.cards.filter(x=>x.cardInstanceId===partner).length,0);
  assert.equal(out.cards.length,4);
});

test('005C-C two Gamblers keep exact deck, history and Luck state isolated across reconnect/projection',()=>{
  const {run,players}=make(['gambler','gambler','prophet','imp']);
  const a=priv(run,players[0]),b=priv(run,players[1]);
  addGamblerLuck(run,players[0],a,'isolation');
  assert.equal(a.luck,1);assert.equal(b.luck,0);assert.notDeepEqual(a.remainingCardIds,b.remainingCardIds);
  const snap=structuredClone(run);
  assert.deepEqual(snap.combat.privateByPlayer.p0.remainingCardIds,a.remainingCardIds);
  assert.deepEqual(snap.combat.privateByPlayer.p1.remainingCardIds,b.remainingCardIds);
  const owner=projectRun(run,'p0'),ally=projectRun(run,'p1');
  assert.equal(owner.privateCombat.playerId,'p0');assert.equal(ally.privateCombat.playerId,'p1');
  assert.equal(owner.players.find(p=>p.playerId==='p0').gamblerDeck.owner.luck,1);
  assert.equal(ally.players.find(p=>p.playerId==='p0').gamblerDeck.owner,undefined);
});
