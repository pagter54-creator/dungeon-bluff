import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {grantRunGold} from '../supabase/functions/game-api/pve/characters.js';

function makeRun(ids=['adventurer','adventurer','adventurer','adventurer'],flame=3,hp=200){
  const members=ids.map((character_id,i)=>({id:`p${i}`,user_id:`u${i}`,member_type:'human',character_id,seat_index:i}));
  const players=members.map(newPlayerRunState);
  const run={id:'run-005006',seed:'fixed-seed',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame,maxFlame:5,players,map:{nodes:[],edges:{}},combat:newCombatState(players,hp)};
  beginTurn(run);return run;
}
function availableByNumber(run,pid,n){
  const p=run.players.find(x=>x.playerId===pid), priv=run.combat.privateByPlayer[pid];
  return p.cardPool.find(c=>c.baseNumber===n&&priv.remainingCardIds.includes(c.id))?.id;
}
function play(run,values,skills=[false,false,false,false]){
  for(let i=0;i<4;i++){
    if(run.players[i].status==='DOWNED'||run.combat.turnSubmissions[`p${i}`]?.autoSubmitted)continue;
    const id=availableByNumber(run,`p${i}`,values[i]);assert.ok(id,`missing p${i} card ${values[i]}`);
    submitCard(run,`p${i}`,id,skills[i]);
  }
  return resolveBasicTurn(run);
}

test('PVE-005 direct damage spends one flame and forces a deterministic stunned submission next turn',()=>{
  const run=makeRun();run.players[0].hp=1;
  run.combat.monster.intent={type:'DIRECT_DAMAGE',telegraphText:'test',payload:{targetPlayerId:'p0',amount:1}};
  const r=play(run,[1,2,3,4]);
  assert.ok(r.events.some(e=>e.type==='PLAYER_DOWNED'&&e.playerId==='p0'&&e.rescued));
  assert.equal(run.flame,2);assert.equal(run.players[0].hp,1);assert.equal(run.players[0].status,'STUNNED_NEXT_TURN');
  assert.equal(run.combat.turn,2);assert.equal(run.combat.turnSubmissions.p0.autoSubmitted,true);
  const selected=run.combat.turnSubmissions.p0.cardInstanceId;
  assert.ok(run.combat.privateByPlayer.p0.remainingCardIds.includes(selected));
});

test('PVE-005 simultaneous AOE downs allocate insufficient flame by seat order',()=>{
  const run=makeRun(undefined,1);run.players[0].hp=1;run.players[1].hp=1;
  run.combat.monster.intent={type:'AOE_DAMAGE',telegraphText:'test aoe',payload:{amount:1}};
  play(run,[1,2,3,4]);
  assert.equal(run.flame,0);
  assert.equal(run.players[0].status,'STUNNED_NEXT_TURN');assert.equal(run.players[0].hp,1);
  assert.equal(run.players[1].status,'DOWNED');assert.equal(run.players[1].hp,0);
});

test('PVE-005 flame zero plus all players down ends the run',()=>{
  const run=makeRun(undefined,0);for(const p of run.players)p.hp=1;
  run.combat.monster.intent={type:'AOE_DAMAGE',telegraphText:'wipe',payload:{amount:1}};
  const r=play(run,[1,2,3,4]);
  assert.equal(run.phase,'RUN_FAILED');assert.equal(run.combat.phase,'COMBAT_END');
  assert.ok(r.events.some(e=>e.type==='RUN_FAILED'));
});

test('PVE-005 kill check skips monster action and revives previously DOWNED allies at HP 1',()=>{
  const run=makeRun(undefined,0,1);run.players[3].status='DOWNED';run.players[3].hp=0;
  run.combat.monster.intent={type:'AOE_DAMAGE',telegraphText:'must not fire',payload:{amount:99}};
  submitCard(run,'p0',availableByNumber(run,'p0',1));submitCard(run,'p1',availableByNumber(run,'p1',2));submitCard(run,'p2',availableByNumber(run,'p2',3));
  const r=resolveBasicTurn(run);
  assert.equal(run.phase,'ROOM_RESULT');assert.equal(run.players[3].status,'ACTIVE');assert.equal(run.players[3].hp,1);
  assert.equal(run.players[0].hp,3);assert.ok(!r.events.some(e=>e.type==='PLAYER_DAMAGED'));
});

test('PVE-006 uses exact adventurer knight mage decks and starts mage mana / knight toughness correctly',()=>{
  const run=makeRun(['adventurer','warrior','mage','adventurer']);
  assert.deepEqual(run.players[0].cardPool.map(c=>c.baseNumber),[1,2,3,4,5]);
  assert.deepEqual(run.players[1].cardPool.map(c=>c.baseNumber),[2,3,4,5,5]);
  assert.deepEqual(run.players[2].cardPool.map(c=>c.baseNumber),[1,2,3,4,4]);
  assert.equal(run.players[1].publicResources.toughnessCharges,1);
  assert.equal(run.players[2].publicResources.mana,1);
});

test('PVE-006 knight toughness preserves immune knights and invalidates ordinary cards in the same collision group',()=>{
  const run=makeRun(['warrior','warrior','adventurer','adventurer']);
  const r=play(run,[5,5,5,1],[true,true,false,false]);
  assert.deepEqual(r.cards.map(c=>c.valid),[true,true,false,true]);
  assert.equal(r.totalDamage,11);
  assert.equal(run.players[0].publicResources.toughnessCharges,0);
  assert.equal(run.players[1].publicResources.toughnessCharges,0);
});

test('PVE-006 mage self-modify happens before collision and consumes mana',()=>{
  const run=makeRun(['mage','adventurer','adventurer','adventurer']);
  run.players[0].publicResources.mana=2;
  const r=play(run,[4,5,1,2],[true,false,false,false]);
  assert.equal(r.cards[0].workingNumber,5);assert.equal(r.cards[0].finalNumber,5);
  assert.equal(r.cards[0].valid,false);assert.equal(r.cards[1].valid,false);
  // The cast spends 2 mana to 0, then the automatically opened next turn restores +1.
  assert.equal(run.players[0].publicResources.mana,1);
});

test('PVE-006 physical card consumption resets cycle and knight gains one charge up to cap two',()=>{
  const run=makeRun(['warrior','adventurer','adventurer','adventurer']);
  const knight=run.players[0],priv=run.combat.privateByPlayer.p0;
  const sequence=[2,3,4,5,5];
  for(let turn=0;turn<5;turn++){
    const own=availableByNumber(run,'p0',sequence[turn]);assert.ok(own);
    submitCard(run,'p0',own);
    for(let i=1;i<4;i++){
      if(run.combat.turnSubmissions[`p${i}`]?.autoSubmitted)continue;
      const ppriv=run.combat.privateByPlayer[`p${i}`],id=ppriv.remainingCardIds[0];submitCard(run,`p${i}`,id);
    }
    run.combat.monster.intent={type:'CHARGE',telegraphText:'noop',payload:{}};
    resolveBasicTurn(run);
  }
  assert.equal(priv.cycleIndex,2);assert.equal(priv.spentCardIds.length,0);assert.equal(priv.remainingCardIds.length,5);
  assert.equal(knight.publicResources.toughnessCharges,2);
});

test('PVE-006 adventurer gains growth EXP only on valid attacks and gets +1 on positive run-gold grants',()=>{
  const run=makeRun();
  play(run,[1,2,4,5]);assert.equal(run.players[0].growthExp,1);
  play(run,[3,3,1,2]);assert.equal(run.players[0].growthExp,1);
  assert.equal(grantRunGold(run.players[0],1),2);assert.equal(run.players[0].runGold,2);
  assert.equal(grantRunGold(run.players[0],0),0);assert.equal(run.players[0].runGold,2);
});
