import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
import {beginAugmentChoices,chooseAugment,AUGMENT_THRESHOLDS} from '../supabase/functions/game-api/pve/augments.js';
import {SEER_CONTRACTS} from '../supabase/functions/game-api/pve/seer-contracts.js';
import {IMP_CONTRACTS} from '../supabase/functions/game-api/pve/imp-contracts.js';
import {GAMBLER_CONTRACTS} from '../supabase/functions/game-api/pve/gambler-contracts.js';
import {GUNNER_CONTRACTS} from '../supabase/functions/game-api/pve/gunner-contracts.js';
import {PVE_EXECUTABLE_AUGMENT_UI} from '../src/pve-ui-catalog.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {setGamblerDrawPreference} from '../supabase/functions/game-api/pve/gambler.js';
import {cleanupSeerCombat,scopedSeerState,applySeerRuntime} from '../supabase/functions/game-api/pve/seer-runtime.js';
import {initializeImpCombat,cleanupImpCombat} from '../supabase/functions/game-api/pve/imp-runtime.js';
import {cleanupGamblerCombat} from '../supabase/functions/game-api/pve/gambler.js';
import {applyOwnedEffects} from '../supabase/functions/game-api/pve/effects.js';
const contracts={...SEER_CONTRACTS,...IMP_CONTRACTS,...GAMBLER_CONTRACTS,...GUNNER_CONTRACTS};
const ids=Array.from({length:120},(_,i)=>'aug-'+String(151+i).padStart(3,'0'));
const classes=['prophet','imp','gambler','gunner'];
function make(characters,seed='005c-final',buildIndex=0){
 const players=characters.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,seat_index:i,member_type:'human'}));
 for(const p of players){
  const first=augmentCandidates(p.characterId,1)[buildIndex];
  if(first){p.augmentBuild=first.build;p.augments=Object.values(AUGMENT_BY_ID).filter(c=>c.characterId===p.characterId&&c.build===first.build&&c.executable).map(c=>c.id);}
  p.hp=100;p.maxHp=100;
 }
 const run={id:'005c-final',seed,rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,currentRoomNodeId:'node',players,flame:5,maxFlame:5};
 run.combat=newCombatState(players,99999,'NORMAL_COMBAT',{id:'passive',name:'passive',tier:'NORMAL',baseHp:99999,pattern:[{type:'CHARGE',payload:{}}]});
 run.combat.id='005c-final-combat';beginTurn(run);return run;
}
function validateZones(run){
 const all=run.players.flatMap(p=>p.cardPool.map(c=>c.id));assert.equal(new Set(all).size,all.length);
 for(const p of run.players){
  const st=run.combat.privateByPlayer[p.playerId];
  const zones=p.characterId==='gambler'?[st.drawPileIds,st.remainingCardIds,st.discardPileIds,st.vanishedCardIds]:[st.remainingCardIds,st.spentCardIds];
  const physical=zones.flat();assert.equal(new Set(physical).size,physical.length,p.playerId+' one zone per ID');
  assert.deepEqual(new Set(physical),new Set(p.cardPool.map(c=>c.id)));
  if(p.characterId==='gambler')assert.ok(st.history.length<=48);
 }
}
function turns(run,count){
 const outcomes=[];
 for(let t=0;t<count;t++){
  assert.equal(run.phase,'COMBAT');
  for(const p of run.players){
   const st=run.combat.privateByPlayer[p.playerId];
   while(st.drawChoicePending)setGamblerDrawPreference(run,p,st,st.drawChoicePending==='AUG_230'?[1,3,5]:'LOW');
   if(!run.combat.turnSubmissions[p.playerId]){
    const selected=t===0&&p.characterId==='gunner'?st.remainingCardIds.at(-1):st.remainingCardIds[0];
    submitCard(run,p.playerId,selected,p.characterId==='gunner'&&p.publicResources.fullBurstReady===true);
   }
  }
  run.combat.monster.intent={type:'CHARGE',payload:{}};
  const result=resolveBasicTurn(run);assert.equal(result.cards.length,4);
  assert.equal(new Set(result.cards.map(c=>c.playerId)).size,4);
  assert.equal(new Set(result.damagePackets.map(p=>p.damageEventId)).size,result.damagePackets.length);
  validateZones(run);
  const spectator=projectRun(run,null);assert.equal(spectator.privateCombat,null);assert.equal(spectator.augmentFramework,undefined);
  for(const p of run.players){
   const owner=projectRun(run,p.playerId);
   assert.equal(owner.privateCombat.playerId,p.playerId);
   if(p.characterId==='gambler')assert.ok(owner.players.find(x=>x.playerId===p.playerId).gamblerDeck.owner);
   for(const other of run.players.filter(x=>x.playerId!==p.playerId)){
    const publicPlayer=owner.players.find(x=>x.playerId===other.playerId);
    assert.equal(publicPlayer.cardPool.some(c=>c.id),false);
    if(other.characterId==='gambler')assert.equal(publicPlayer.gamblerDeck.owner,undefined);
   }
  }
  outcomes.push(result);
 }
 return outcomes;
}
test('005C FINAL exact 120 / global270 / all390 executable276 accounting',()=>{
 assert.deepEqual(Object.keys(contracts).sort(),ids);assert.equal(new Set(ids).size,120);
 for(const id of ids){assert.equal(AUGMENT_BY_ID[id].executable,true);assert.equal(EXECUTABLE_AUGMENT_RUNTIME[id].executable,true);assert.ok(EXECUTABLE_AUGMENT_RUNTIME[id].specialHandlers?.length);}
 assert.equal(Object.keys(EXECUTABLE_AUGMENT_RUNTIME).filter(id=>+id.slice(4)<=150).length,150);
 assert.equal(Object.keys(EXECUTABLE_AUGMENT_RUNTIME).filter(id=>+id.slice(4)<=270).length,270);
 assert.equal(Object.values(EXECUTABLE_AUGMENT_RUNTIME).filter(x=>x.executable).length,276);
 for(const character of classes){
  const line=ids.map(id=>AUGMENT_BY_ID[id]).filter(c=>c.characterId===character);
  assert.equal(line.length,30);assert.deepEqual([1,2,3,4].map(t=>line.filter(c=>c.tier===t).length),[3,9,9,9]);
  assert.equal(new Set(line.map(c=>c.build)).size,3);for(const build of new Set(line.map(c=>c.build)))assert.equal(line.filter(c=>c.build===build).length,10);
 }
});
for(const id of ids)test('005C FINAL actual offer/acquisition/retry '+id,()=>{
 const def=AUGMENT_BY_ID[id];
 const p=newPlayerRunState({id:'p0',user_id:'u0',character_id:def.characterId,seat_index:0,member_type:'human'});
 if(def.tier>1){const first=augmentCandidates(def.characterId,1).find(c=>c.build===def.build);p.augments=[first.id];p.augmentBuild=def.build;p.persistentCharacterState.augmentTiers=Array.from({length:def.tier-1},(_,i)=>i+1);}
 p.growthExp=AUGMENT_THRESHOLDS[def.tier-1];
 const run={id:'offer-'+id,seed:'offer-'+id,rngCounter:0,version:0,phase:'ROOM_RESULT',floor:1,players:[p]};
 assert.equal(beginAugmentChoices(run),true);assert.ok(run.augmentChoice.offersByPlayer.p0.includes(id));
 assert.ok(run.augmentChoice.offersByPlayer.p0.every(x=>AUGMENT_BY_ID[x].tier===def.tier&&(def.tier===1||AUGMENT_BY_ID[x].build===def.build)));
 const restored=structuredClone(run);chooseAugment(restored,'p0',id);
 const after=structuredClone(restored);assert.throws(()=>chooseAugment(restored,'p0',id));assert.deepEqual(restored,after);
 assert.equal(restored.players[0].augments.filter(x=>x===id).length,1);
 assert.equal(beginAugmentChoices(restored),false);
 assert.equal(restored.players[0].augmentBuild,def.build);
});
for(const character of classes)for(let buildIndex=0;buildIndex<3;buildIndex++)test('005C FINAL four actual EXP stages '+character+' build '+buildIndex,()=>{
 const p=newPlayerRunState({id:'p0',character_id:character,seat_index:0,member_type:'human'});
 const run={id:'growth-'+character,seed:'growth-'+character,rngCounter:0,version:0,phase:'ROOM_RESULT',floor:1,players:[p]};
 let build=null;
 for(let stage=1;stage<=4;stage++){
  p.growthExp=AUGMENT_THRESHOLDS[stage-1]-1;assert.equal(beginAugmentChoices(run),false);
  p.growthExp++;assert.equal(beginAugmentChoices(run),true);
  const offers=run.augmentChoice.offersByPlayer.p0;assert.equal(offers.length,3);
  const selected=stage===1?offers[buildIndex]:offers[0];chooseAugment(run,'p0',selected);
  build ||= p.augmentBuild;assert.equal(p.augmentBuild,build);
 }
 assert.equal(p.augments.length,4);assert.deepEqual(p.persistentCharacterState.augmentTiers,[1,2,3,4]);
});
test('005C FINAL AI all classes advances all four stages deterministically',()=>{
 function execute(){
  const players=classes.map((character_id,i)=>newPlayerRunState({id:'p'+i,character_id,seat_index:i,member_type:'ai'}));
  const run={id:'AI',seed:'005c-final-ai',rngCounter:0,version:0,phase:'ROOM_RESULT',floor:1,players};
  for(const p of players)p.growthExp=750;for(let boundary=0;boundary<4;boundary++)beginAugmentChoices(run);assert.equal(run.phase,'ROOM_RESULT');
  for(const p of players){assert.equal(p.augments.length,4);assert.ok(p.augments.every(id=>AUGMENT_BY_ID[id].build===p.augmentBuild));}
  return run;
 }
 assert.deepEqual(execute(),execute());
});
const replayState=run=>JSON.parse(JSON.stringify(run,(key,value)=>key==='submittedAt'?undefined:value));
const parties=[
 ['prophet','imp','gambler','gunner'],['prophet','imp','warrior','gunner'],
 ['mage','imp','gambler','gunner'],['prophet','rogue','gambler','gunner'],
 ['warrior','imp','gambler','gunner']
];
for(const [i,party] of parties.entries())for(let build=0;build<3;build++)test('005C FINAL mixed matrix '+String.fromCharCode(65+i)+' full builds '+build+' pending-submit reconnect',()=>{
 const a=make(party,'mixed-'+i+'-'+build,build);const first=a.players[0];
 submitCard(a,first.playerId,a.combat.privateByPlayer[first.playerId].remainingCardIds[0]);
 const b=structuredClone(a);
 assert.deepEqual(turns(a,16),turns(b,16));assert.deepEqual(replayState(a),replayState(b));
});
for(const character of classes)test('005C FINAL two '+character+' full owners isolated across 24 turns and reconnect',()=>{
 const a=make([character,character,'adventurer','mage'],'double-'+character);
 a.players[1].augments=augmentCandidates(character,1).slice(1,2).flatMap(c=>Object.values(AUGMENT_BY_ID).filter(d=>d.characterId===character&&d.build===c.build).map(d=>d.id));
 const b=structuredClone(a);
 assert.notEqual(a.combat.privateByPlayer.p0,a.combat.privateByPlayer.p1);
 assert.deepEqual(turns(a,24),turns(b,24));assert.deepEqual(replayState(a),replayState(b));
});
test('005C FINAL 120 tooltips equal runtime contract overlays',()=>{
 for(const id of ids){
  const rt=EXECUTABLE_AUGMENT_RUNTIME[id],contract=contracts[id],expected=rt.tooltipBetaV02||rt.tooltip||contract.tooltipBetaV02||contract.tooltip;
  assert.equal(PVE_EXECUTABLE_AUGMENT_UI[id].description,expected,id);
 }
 assert.equal(GUNNER_CONTRACTS['aug-248'].damageTaxonomy,'EXTRA_DAMAGE_COMPONENT');
 for(const id of ['aug-248','aug-253'])assert.equal(GUNNER_CONTRACTS[id].executionRuleSource,'USER_CONFIRMED_005C_D_PATCH');
});
test('005C FINAL immutable source and golden git blob hashes',()=>{
 const hashes={
 'docs/PVE_CONTENT_005Q_DESIGN_C.json':'4b9b2dab17d0a0138abde0aa97a999a39b83a8d4',
 'docs/PVE_CONTENT_005Q_DECISIONS.json':'12e1370373c45b29c7680bb8b041b3951e82d6aa',
 'supabase/functions/game-api/pve/augment-catalog.js':'d4f8ca0e0f6b4235e4f995b1575f272aba0fbc15',
 'tests/fixtures/pve-stress-t02-golden.json':'7bdf1e13333d0c5ab6f4bd293f762059d18b9794',
 'tests/fixtures/pve-stress-t06-golden.json':'25cf1ab9dc82865e4ccdd543f9a427871697d0d7'
 };
 for(const [path,hash] of Object.entries(hashes)){const b=fs.readFileSync(new URL('../'+path,import.meta.url));assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),hash,path);}
});

test('005C FINAL Seer completed combat claims expire per owner before serial reuse',()=>{
 const run=make(['prophet','prophet','imp','gunner']);
 const s=scopedSeerState(run,run.players[0]);s.activationSerial=1;
 run.augmentFramework.seer||={recoveredCards:{},buffs:[],applied:{},sequence:0};
 run.augmentFramework.seer.applied={'p0:aug-169:revelation:1:valid-bonus':true,'p1:aug-169:revelation:1:valid-bonus':true};
 cleanupSeerCombat(run,run.players[0]);
 assert.equal(run.augmentFramework.seer.applied['p0:aug-169:revelation:1:valid-bonus'],undefined);
 assert.equal(run.augmentFramework.seer.applied['p1:aug-169:revelation:1:valid-bonus'],true);
 assert.equal(scopedSeerState(run,run.players[0]).activationSerial,0);
});

test('005C FINAL stale prediction cancels on origin combat/room change and cannot resolve in Event',()=>{
 for(const mode of ['COMBAT','ROOM','EVENT']){
  const run=make(['prophet','imp','gambler','gunner']),p=run.players[0],s=scopedSeerState(run,p);
  p.augments=['aug-171'];s.prediction={id:'stale',status:'ARMED',type:'NUMBER_VALID',number:1,targetTurn:run.combat.turn,originCombatId:run.combat.id,originRoomId:run.currentRoomNodeId};
  if(mode==='COMBAT')run.combat.id='new';if(mode==='ROOM')run.currentRoomNodeId='new';if(mode==='EVENT')run.phase='EVENT';
  const before=p.growthExp;
  applySeerRuntime(run,'CARD_VALIDATED',{player:p,resolved:{valid:true,finalNumber:1},cards:[{playerId:p.playerId,valid:true,finalNumber:1}]});
  assert.equal(s.prediction.status,'CANCELLED');assert.equal(s.foresight,0);assert.equal(p.growthExp,before);
 }
});
test('005C FINAL repeated 80 combats clear transient ledgers and retain only bounded diagnostics',()=>{
 const run=make(['prophet','imp','gambler','gunner']);
 run.players[1].augments=['aug-198'];
 for(let combat=0;combat<80;combat++){
  run.combat.id='repeat-'+combat;
  for(let n=0;n<30;n++)initializeImpCombat(run,run.players[1]);
  run.combat.privateByPlayer.p2.processedActions['old:'+combat]=true;
  run.augmentFramework.seer||={recoveredCards:{},buffs:[],applied:{},sequence:0};
  run.augmentFramework.seer.applied['p0:old:'+combat]=true;
  cleanupSeerCombat(run,run.players[0]);cleanupImpCombat(run,run.players[1]);cleanupGamblerCombat(run,run.players[2]);
  applyOwnedEffects(run,'COMBAT_END',{player:run.players[3]});
  assert.equal(Object.keys(run.augmentFramework.seer.applied).length,0);
  assert.equal(Object.keys(run.augmentFramework.imp.mischief).length,0);
  assert.equal(Object.keys(run.combat.privateByPlayer.p2.processedActions).length,0);
  assert.equal(Object.keys(run.augmentFramework.cardState['p3:gunner'].burstActions).length,0);
  assert.ok(run.combat.privateByPlayer.p2.history.length<=48);
  assert.ok(run.augmentFramework.imp.telemetry.length<=2048);assert.ok(run.augmentFramework.telemetry.length<=2048);
 }
 assert.equal(run.augmentFramework.telemetryTotals['aug-198:COMBAT_START'].triggerCount,2400);
});
