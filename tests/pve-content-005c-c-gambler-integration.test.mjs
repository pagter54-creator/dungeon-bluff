import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {GAMBLER_CONTRACT_IDS,GAMBLER_CONTRACTS} from '../supabase/functions/game-api/pve/gambler-contracts.js';
import {addGamblerLuck,freshGamblerState,prepareGamblerAllIn,finalizeGamblerAllIn,settleGamblerHand,applyGamblerValidated,setGamblerDrawPreference} from '../supabase/functions/game-api/pve/gambler.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';

function make(ids=['gambler','prophet','imp','mage'],augments=[],seed='gambler-int-seed'){
  const players=ids.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  players[0].augments=[...augments];
  const run={id:'gambler-int',seed,rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'gambler-node',players};
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
  assert.equal(a.luck,1);assert.equal(b.luck,0);assert.notEqual(a.remainingCardIds,b.remainingCardIds);
  const snap=structuredClone(run);
  assert.deepEqual(snap.combat.privateByPlayer.p0.remainingCardIds,a.remainingCardIds);
  assert.deepEqual(snap.combat.privateByPlayer.p1.remainingCardIds,b.remainingCardIds);
  const owner=projectRun(run,'p0'),ally=projectRun(run,'p1');
  assert.equal(owner.privateCombat.playerId,'p0');assert.equal(ally.privateCombat.playerId,'p1');
  assert.equal(owner.players.find(p=>p.playerId==='p0').gamblerDeck.owner.luck,1);
  assert.equal(ally.players.find(p=>p.playerId==='p0').gamblerDeck.owner,undefined);
});


test('005C-C room isolation: aug-231 settles both cards in Event, combat-only Gambler augments stay dormant',()=>{
  const {run,players}=make(['gambler','prophet','imp','mage'],['aug-231','aug-232','aug-212']);
  const p=players[0],state=priv(run,p),ids=[...state.remainingCardIds],card=p.cardPool.find(c=>c.id===ids[0]);
  run.phase='EVENT';delete run.combat;run.roomState={type:'EVENT',privateByPlayer:{p0:state}};
  const resolved={playerId:'p0',cardInstanceId:ids[0],baseNumber:card.baseNumber,workingNumber:card.baseNumber,finalNumber:card.baseNumber,valid:true};
  const pending=prepareGamblerAllIn(run,p,state,{cardInstanceId:ids[0]},resolved);assert.ok(pending);assert.equal(pending.cardIds.length,2);
  assert.equal(applyGamblerValidated(run,p,state,{...resolved,baseNumber:6,finalNumber:6}),0);
  finalizeGamblerAllIn(run,p,state,resolved);
  settleGamblerHand(run,p,state,ids[0],resolved.finalNumber,{rootActionId:'event-isolation'});
  assert.equal(state.remainingCardIds.length,1);
  assert.ok(pending.cardIds.every(id=>state.discardPileIds.includes(id)||state.vanishedCardIds.includes(id)));
});

function exactGamblerSnapshot(run){
  const state=priv(run,run.players[0]);return {
    zones:[state.drawPileIds,state.remainingCardIds,state.discardPileIds,state.vanishedCardIds],
    history:state.history,sixProgress:state.sixProgress,sevenProgress:state.sevenProgress,
    shuffleCount:state.shuffleCount,drawCount:state.drawCount,unlockSerial:state.unlockSerial,
    pendingAllIn:state.pendingAllIn,telemetry:state.telemetry,rngCounter:run.rngCounter
  };
}
function executeFullBuild(run,turns){
  for(const player of run.players){player.hp=100;player.maxHp=100;}
  const summaries=[];
  for(let turn=0;turn<turns;turn++){
    assert.equal(run.phase,'COMBAT');
    for(const player of run.players){
      const state=priv(run,player);
      if(player.characterId==='gambler'){
        while(state.drawChoicePending){
          setGamblerDrawPreference(run,player,state,state.drawChoicePending==='AUG_230'?[1,3,5]:'LOW');
        }
        assert.equal(state.usesStandardCycle,false);
        const ids=[...state.drawPileIds,...state.remainingCardIds,...state.discardPileIds,...state.vanishedCardIds];
        assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,player.cardPool.length);
        assert.ok(state.vanishedCardIds.every(id=>!state.drawPileIds.includes(id)));
      }
      if(!run.combat.turnSubmissions[player.playerId])submitCard(run,player.playerId,state.remainingCardIds[0]);
    }
    // A passive monster isolates player runtime without balance/golden changes.
    run.combat.monster.intent={type:'CHARGE',payload:{},telegraphText:'wait'};
    const result=resolveBasicTurn(run);assert.ok(result);
    const g=result.cards.find(card=>card.playerId==='p0');
    if(g.allIn){
      assert.equal(result.cards.filter(card=>g.allInCardIds.slice(1).includes(card.cardInstanceId)).length,0);
      const packet=result.damagePackets.find(p=>p.sourcePlayerId==='p0'&&!p.followUp);
      if(g.valid){assert.ok(packet.tags.includes('SET_DAMAGE'));assert.ok(packet.amount>=0);}
    }
    const snapshot=exactGamblerSnapshot(run);assert.ok(snapshot.history.length<=48);
    const spectator=projectRun(run,null);assert.equal(spectator.privateCombat,null);
    assert.equal(spectator.players[0].gamblerDeck.owner,undefined);
    summaries.push({snapshot,result:result.cards.map(c=>({playerId:c.playerId,valid:c.valid,finalNumber:c.finalNumber,damage:c.damage})),totalDamage:result.totalDamage});
  }
  return summaries;
}

for(const build of ['운명의 승부사','카드 카운터','올인']){
  test('005C-C full '+build+' build executes 12 mixed-party turns and reconnect replay exactly',()=>{
    const ids=GAMBLER_CONTRACT_IDS.filter(id=>GAMBLER_CONTRACTS[id].archetype===build);
    const {run}=make(['gambler','prophet','imp','mage'],ids);
    const reconnected=structuredClone(run);
    assert.deepEqual(executeFullBuild(run,12),executeFullBuild(reconnected,12));
  });
}

test('005C-C deterministic replay stress: 100 seeds x three complete builds x 12 turns',()=>{
  for(let seed=0;seed<100;seed++){
    for(const build of ['운명의 승부사','카드 카운터','올인']){
      const ids=GAMBLER_CONTRACT_IDS.filter(id=>GAMBLER_CONTRACTS[id].archetype===build);
      const a=make(['gambler','prophet','imp','mage'],ids,'005C-C-replay-'+seed).run;
      const b=make(['gambler','prophet','imp','mage'],ids,'005C-C-replay-'+seed).run;
      assert.deepEqual(executeFullBuild(a,12),executeFullBuild(b,12),build+' seed '+seed);
    }
  }
});
