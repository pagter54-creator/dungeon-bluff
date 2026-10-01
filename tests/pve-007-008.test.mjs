import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {activateImmediateCharacterSkill} from '../supabase/functions/game-api/pve/characters.js';
import {AUGMENT_DEFINITIONS} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {beginAugmentChoices,chooseAugment,dueAugmentTiers} from '../supabase/functions/game-api/pve/augments.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';

function makeRun(ids=['adventurer','adventurer','adventurer','adventurer'],options={}){
  const members=ids.map((character_id,i)=>({
    id:`p${i}`,user_id:options.ai?.includes(i)?null:`u${i}`,
    member_type:options.ai?.includes(i)?'ai':'human',character_id,seat_index:i
  }));
  const players=members.map(newPlayerRunState);
  const run={id:'run-007008',seed:options.seed||'fixed-007008',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:3,maxFlame:5,players,map:{nodes:[],edges:{}},combat:newCombatState(players,options.hp||500)};
  beginTurn(run);return run;
}
function priv(run,pid){return run.combat.privateByPlayer[pid];}
function availableByNumber(run,pid,n){
  const p=run.players.find(x=>x.playerId===pid);
  return p.cardPool.find(c=>c.baseNumber===n&&priv(run,pid).remainingCardIds.includes(c.id))?.id;
}
function submitNumber(run,pid,n,skill=false){
  const id=availableByNumber(run,pid,n);assert.ok(id,`missing ${pid} card ${n}`);
  submitCard(run,pid,id,skill);return id;
}
function submitUniquePeers(run,exclude){
  const used=new Set([exclude]);
  for(let i=1;i<4;i++){
    const p=run.players[i], ids=priv(run,p.playerId).remainingCardIds;
    const card=ids.map(id=>p.cardPool.find(c=>c.id===id)).find(c=>c&&!used.has(c.baseNumber));
    assert.ok(card,`no unique peer card for p${i}`);
    used.add(card.baseNumber);submitCard(run,p.playerId,card.id);
  }
}

test('PVE-007 gunner full burst uses only the selected card for collision and converts remaining cards to follow-up packets',()=>{
  const run=makeRun(['gunner','adventurer','adventurer','adventurer']);
  submitNumber(run,'p0',1,true);
  submitNumber(run,'p1',2);submitNumber(run,'p2',4);submitNumber(run,'p3',5);
  const result=resolveBasicTurn(run);
  const gunnerPackets=result.damagePackets.filter(x=>x.sourcePlayerId==='p0');
  assert.deepEqual(gunnerPackets.map(x=>[x.amount,x.followUp]),[[1,false],[2,true],[3,true]]);
  assert.equal(result.totalDamage,17);
  assert.equal(priv(run,'p0').cycleIndex,2);
  assert.equal(priv(run,'p0').remainingCardIds.length,3);
  assert.equal(run.players[0].publicResources.fullBurstReady,false);
  assert.equal(run.players[0].publicResources.burstReadyCycle,3);
});

test('PVE-007 gunner collision creates no follow-up, deals one self damage, and shortens recharge to the next cycle',()=>{
  const run=makeRun(['gunner','adventurer','adventurer','adventurer']);
  submitNumber(run,'p0',1,true);submitNumber(run,'p1',1);submitNumber(run,'p2',3);submitNumber(run,'p3',4);
  const result=resolveBasicTurn(run);
  assert.equal(result.damagePackets.some(x=>x.sourcePlayerId==='p0'),false);
  assert.equal(result.events.some(x=>x.type==='FULL_BURST_MISFIRE'&&x.playerId==='p0'),true);
  assert.equal(run.players[0].hp,2);
  assert.equal(priv(run,'p0').remainingCardIds.length,2);
  assert.equal(run.players[0].publicResources.fullBurstReady,false);
  assert.equal(run.players[0].publicResources.burstReadyCycle,2);
  assert.throws(()=>submitCard(run,'p0',priv(run,'p0').remainingCardIds[0],true),/재충전/);
  // Simulate the rest of the current three-card cycle being consumed normally.
  priv(run,'p0').spentCardIds.push(...priv(run,'p0').remainingCardIds.slice(0,1));
  priv(run,'p0').remainingCardIds=priv(run,'p0').remainingCardIds.slice(1);
  const last=priv(run,'p0').remainingCardIds[0];submitCard(run,'p0',last);
  submitUniquePeers(run,run.players[0].cardPool.find(c=>c.id===last).baseNumber);
  resolveBasicTurn(run);
  assert.equal(priv(run,'p0').cycleIndex,2);
  assert.equal(run.players[0].publicResources.fullBurstReady,true);
});

test('PVE-007 twins parity is deterministic, rejects the wrong parity, adds +2 valid damage, then alternates',()=>{
  const a=makeRun(['twins','adventurer','adventurer','adventurer'],{seed:'same'});
  const b=makeRun(['twins','adventurer','adventurer','adventurer'],{seed:'same'});
  assert.equal(a.players[0].publicResources.parity,b.players[0].publicResources.parity);
  const parity=a.players[0].publicResources.parity;
  const good=parity?1:2, bad=parity?2:1;
  assert.throws(()=>submitNumber(a,'p0',bad),/홀짝/);
  submitNumber(a,'p0',good);submitUniquePeers(a,good);
  const result=resolveBasicTurn(a), card=result.cards.find(x=>x.playerId==='p0');
  const packet=result.damagePackets.find(x=>x.sourcePlayerId==='p0'&&!x.followUp);
  assert.equal(card.valid,true);assert.equal(packet.amount,good+2);
  assert.equal(a.players[0].publicResources.parity,1-parity);
});

test('PVE-007 twins acrobatics immediately resets the private cycle, flips parity, and recharges only after that cycle completes',()=>{
  const run=makeRun(['twins','adventurer','adventurer','adventurer']);
  const p=run.players[0],startParity=p.publicResources.parity;
  const first=startParity?1:2;submitNumber(run,'p0',first);submitUniquePeers(run,first);resolveBasicTurn(run);
  assert.equal(priv(run,'p0').spentCardIds.length,1);
  const beforeSkillParity=p.publicResources.parity;
  const event=activateImmediateCharacterSkill(run,p);
  assert.equal(event.type,'ACROBATICS_USED');
  assert.equal(priv(run,'p0').cycleIndex,2);assert.equal(priv(run,'p0').spentCardIds.length,0);assert.equal(priv(run,'p0').remainingCardIds.length,4);
  assert.equal(p.publicResources.parity,1-beforeSkillParity);assert.equal(p.publicResources.acrobaticsReady,false);
  assert.throws(()=>activateImmediateCharacterSkill(run,p),/완주/);
  // Leave exactly one legal card in the acrobatics-created cycle and resolve it.
  const legal=priv(run,'p0').remainingCardIds.map(id=>p.cardPool.find(c=>c.id===id)).find(c=>c.baseNumber%2===p.publicResources.parity);
  priv(run,'p0').spentCardIds=priv(run,'p0').remainingCardIds.filter(id=>id!==legal.id);
  priv(run,'p0').remainingCardIds=[legal.id];
  submitCard(run,'p0',legal.id);submitUniquePeers(run,legal.baseNumber);resolveBasicTurn(run);
  assert.equal(priv(run,'p0').cycleIndex,3);assert.equal(p.publicResources.acrobaticsReady,true);
});

test('PVE-008 catalog provides three build starters and three same-build choices for each supported vertical-slice class',()=>{
  for(const id of ['adventurer','warrior','mage','gunner','twins']){
    const rows=AUGMENT_DEFINITIONS.filter(x=>x.characterId===id);
    assert.equal(rows.length,30);
    assert.equal(rows.filter(x=>x.tier===1).length,3);
    for(const build of new Set(rows.map(x=>x.build)))for(const tier of [2,3,4])assert.equal(rows.filter(x=>x.build===build&&x.tier===tier).length,3);
  }
});

test('PVE-008 offers only executable augments and skips thresholds with no runtime',()=>{
  const run=makeRun(['adventurer','warrior','mage','gunner'],{ai:[2]});
  run.phase='MAP_VOTE';run.players[0].growthExp=800;run.players[1].growthExp=160;run.players[2].growthExp=50;run.players[3].growthExp=49;
  assert.deepEqual(dueAugmentTiers(run.players[0]),[1]);
  assert.equal(beginAugmentChoices(run,'MAP_VOTE'),true);assert.equal(run.phase,'AUGMENT_CHOICE');
  assert.deepEqual(run.augmentChoice.pendingByPlayer.p0,[1]);
  assert.deepEqual(run.augmentChoice.offersByPlayer.p0,['aug-001','aug-011','aug-021']);
  assert.equal(run.players[2].augments.length,1);assert.equal(run.augmentChoice.pendingByPlayer.p2.length,0);
  assert.throws(()=>chooseAugment(run,'p0','aug-002'),/제시된/);
  chooseAugment(run,'p0','aug-001');
  assert.equal(run.players[0].augmentBuild,'노련한 탐험가');
  assert.deepEqual(run.players[0].augments,['aug-001']);
});

test('PVE-008 waits for every human queue, auto-picks AI deterministically, and resumes only after all choices finish',()=>{
  const make=()=>{
    const run=makeRun(['adventurer','warrior','mage','gunner'],{ai:[2],seed:'augment-seed'});
    run.phase='MAP_VOTE';run.players[0].growthExp=800;run.players[1].growthExp=160;run.players[2].growthExp=800;
    beginAugmentChoices(run,'MAP_VOTE');return run;
  };
  const a=make(),b=make();
  assert.deepEqual(a.players[2].augments,b.players[2].augments);
  assert.equal(a.players[2].augments.length,1);
  chooseAugment(a,'p0','aug-001');
  assert.equal(a.phase,'AUGMENT_CHOICE');
  chooseAugment(a,'p1','aug-031');assert.equal(a.phase,'MAP_VOTE');
  assert.equal(a.augmentChoice,undefined);
});

test('PVE-008 viewer projection exposes only the viewer offer while keeping selected augments public',()=>{
  const run=makeRun(['adventurer','warrior','mage','gunner']);
  run.phase='ROOM_RESULT';run.players[0].growthExp=50;run.players[1].growthExp=50;
  beginAugmentChoices(run,'ROOM_RESULT');
  const view=projectRun(run,'p0'),raw=JSON.stringify(view);
  assert.deepEqual(view.privateAugmentOffer,{tier:1,augmentIds:['aug-001','aug-011','aug-021']});
  assert.deepEqual(view.augmentChoice.pendingPlayerIds.sort(),['p0','p1']);
  assert.equal(raw.includes('offersByPlayer'),false);assert.equal(raw.includes('pendingByPlayer'),false);
  chooseAugment(run,'p1','aug-031');
  const view2=projectRun(run,'p0');
  assert.deepEqual(view2.players.find(p=>p.playerId==='p1').augments,['aug-031']);
});

test('PVE-008 combat integration gates room result when a valid attack crosses the 50 EXP threshold',()=>{
  const run=makeRun(['adventurer','adventurer','adventurer','adventurer'],{hp:1});
  run.players[0].growthExp=49;
  submitNumber(run,'p0',1);submitNumber(run,'p1',2);submitNumber(run,'p2',3);submitNumber(run,'p3',4);
  resolveBasicTurn(run);
  assert.equal(run.players[0].growthExp,50);
  assert.equal(run.phase,'AUGMENT_CHOICE');
  assert.deepEqual(run.augmentChoice.pendingByPlayer.p0,[1]);
  assert.deepEqual(run.augmentChoice.offersByPlayer.p0,['aug-001','aug-011','aug-021']);
});
